"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  Suit,
  PlayedCard,
  ANTE,
  createDeck,
  shuffle,
  dealZwicku,
  legalMoves,
  trickWinner,
  settle,
  LeadConstraint,
} from "@/lib/engine";
import {
  botComesAlong,
  botSaysZwack,
  chooseBotCard,
} from "@/lib/bot";
import { PlayingCard, CardBack, SUIT_SYMBOL, RANK_LABEL, DeckStyle } from "./PlayingCard";
import { CoinPile, SchnappsGlass, formatChf } from "./Tabletop";

const HUMAN = 0;
const SUIT_NAME: Record<Suit, string> = {
  herz: "Herz",
  ecken: "Ecken",
  schaufle: "Schaufle",
  kreuz: "Kreuz",
};

type Phase = "setup" | "zwack" | "betting" | "play" | "settle";
type Freeze = { cards: PlayedCard[]; winner: number };
type Settings = { players: number; learn: boolean; deck: DeckStyle; startBalance: number };
const SETTINGS_KEY = "zwicku.settings";

const sameCard = (a: Card, b: Card) => a.suit === b.suit && a.rank === b.rank;
const cardName = (c: Card) => `${RANK_LABEL[c.rank]}${SUIT_SYMBOL[c.suit]}`;

function names(players: number): string[] {
  const bots = ["Sepp", "Marie", "Toni", "Vreni", "Hans"];
  return ["Du", ...bots.slice(0, players - 1)];
}

/** Sitzpositionen je nach Spieleranzahl. */
function seatClasses(players: number): string[] {
  if (players === 3) return ["south", "tright", "tleft"];
  if (players === 4) return ["south", "east", "north", "west"];
  return ["south", "east", "tright", "tleft", "west"].slice(0, players);
}

export default function GameTable() {
  const [settings, setSettings] = useState<Settings>({
    players: 3,
    learn: false,
    deck: "image",
    startBalance: 1000,
  });
  const [phase, setPhase] = useState<Phase>("setup");
  const [balances, setBalances] = useState<number[]>([]);
  const [pot, setPot] = useState(0);
  const [dealer, setDealer] = useState(0);
  const [hands, setHands] = useState<Card[][]>([]);
  const [trump, setTrump] = useState<Suit | null>(null);
  const [trumpCard, setTrumpCard] = useState<Card | null>(null);
  const [zwack, setZwack] = useState(false);
  const [comer, setComer] = useState<boolean[]>([]);
  const [entryStake, setEntryStake] = useState(ANTE);
  const [bettingTurn, setBettingTurn] = useState<number | null>(null);
  const [comersList, setComersList] = useState<number[]>([]);
  const [currentTrick, setCurrentTrick] = useState<PlayedCard[]>([]);
  const [toMove, setToMove] = useState<number | null>(null);
  const [trickNo, setTrickNo] = useState(0);
  const [openingLeader, setOpeningLeader] = useState(0);
  const [tricksByPlayer, setTricksByPlayer] = useState<number[]>([]);
  const [freeze, setFreeze] = useState<Freeze | null>(null);
  const [settleMsg, setSettleMsg] = useState<string[]>([]);
  const [hint, setHint] = useState("");

  // Einstellungen laden / sichern.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Settings>;
        setSettings((cur) => ({
          players: s.players === 3 || s.players === 4 ? s.players : cur.players,
          learn: typeof s.learn === "boolean" ? s.learn : cur.learn,
          deck: s.deck === "image" || s.deck === "drawn" ? s.deck : cur.deck,
          startBalance: typeof s.startBalance === "number" ? s.startBalance : cur.startBalance,
        }));
      }
    } catch {
      /* egal */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* egal */
    }
  }, [settings]);

  const playerNames = names(settings.players);
  const seats = seatClasses(settings.players);

  // ---------------- Rundenstart ----------------
  const startRound = useCallback(
    (theDealer: number, carriedPot: number, bal: number[]) => {
      const N = settings.players;
      const { hands: dealt, trumpCard: tc } = dealZwicku(
        shuffle(createDeck()),
        N,
      );
      const fresh = carriedPot === 0;
      const stake = fresh ? ANTE : carriedPot;

      // Austeiler kommt obligatorisch mit und legt den Einsatz.
      const nextBal = bal.slice();
      nextBal[theDealer] -= stake;
      const startedPot = carriedPot + stake;
      const comers = new Array(N).fill(false);
      comers[theDealer] = true;

      setHands(dealt);
      setTrumpCard(tc);
      setTrump(tc.suit);
      setBalances(nextBal);
      setPot(startedPot);
      setEntryStake(stake);
      setComer(comers);
      setZwack(false);
      setCurrentTrick([]);
      setComersList([]);
      setTrickNo(0);
      setTricksByPlayer(new Array(N).fill(0));
      setFreeze(null);
      setSettleMsg([]);
      setToMove(null);

      // Zwack-Phase: Austeiler sagt (blind) zwack oder nicht.
      setPhase("zwack");
      setHint(
        theDealer === HUMAN
          ? "Du bist Austeiler – Zwack ansagen?"
          : `${playerNames[theDealer]} teilt aus …`,
      );
    },
    [settings.players, playerNames],
  );

  const startGame = useCallback(() => {
    const N = settings.players;
    const bal = new Array(N).fill(settings.startBalance);
    setBalances(bal);
    setPot(0);
    setDealer(0);
    startRound(0, 0, bal);
  }, [settings.players, settings.startBalance, startRound]);

  // Trumpf ist schon gesetzt; nach Zwack-Entscheid Wetten starten.
  const afterZwack = useCallback(
    (said: boolean) => {
      setZwack(said);
      const N = settings.players;
      const first = (dealer + 1) % N;
      setBettingTurn(first);
      setPhase("betting");
      setHint(
        `Trumpf: ${SUIT_NAME[trump as Suit]}. ${
          first === HUMAN ? "Kommst du mit?" : `${playerNames[first]} überlegt …`
        }`,
      );
    },
    [settings.players, dealer, trump, playerNames],
  );

  // Bot-Austeiler entscheidet Zwack automatisch.
  useEffect(() => {
    if (phase !== "zwack" || dealer === HUMAN) return;
    const id = setTimeout(() => afterZwack(botSaysZwack(hands[dealer] ?? [])), 800);
    return () => clearTimeout(id);
  }, [phase, dealer, hands, afterZwack]);

  // ---------------- Wetten (mitkommen / passen) ----------------
  const advanceBetting = useCallback(
    (from: number) => {
      const N = settings.players;
      // nächster Nicht-Austeiler nach `from`
      let next = (from + 1) % N;
      while (next === dealer) next = (next + 1) % N;
      if (next === (dealer + 1) % N) {
        // einmal herum -> Wetten beendet
        return null;
      }
      return next;
    },
    [settings.players, dealer],
  );

  const startPlay = useCallback(
    (comers: boolean[]) => {
      const N = settings.players;
      const order: number[] = [];
      for (let k = 0; k < N; k++) {
        const p = (dealer + 1 + k) % N;
        if (comers[p]) order.push(p);
      }
      setComersList(order);
      setOpeningLeader(order[0]);
      setToMove(order[0]);
      setTrickNo(0);
      setCurrentTrick([]);
      setPhase("play");
      setHint(
        order[0] === HUMAN ? "Du spielst an." : `${playerNames[order[0]]} spielt an …`,
      );
    },
    [settings.players, dealer, playerNames],
  );

  const decide = useCallback(
    (player: number, come: boolean) => {
      const comers = comer.slice();
      comers[player] = come;
      setComer(comers);
      let bal = balances;
      let p = pot;
      if (come) {
        bal = balances.slice();
        bal[player] -= entryStake;
        p = pot + entryStake;
        setBalances(bal);
        setPot(p);
      }
      const next = advanceBetting(player);
      if (next === null) {
        // Wetten fertig -> spielen (mit aktualisierten comers)
        startPlay(comers);
      } else {
        setBettingTurn(next);
        setHint(
          next === HUMAN
            ? `Kommst du mit? Einsatz ${formatChf(entryStake)}`
            : `${playerNames[next]} überlegt …`,
        );
      }
    },
    [comer, balances, pot, entryStake, advanceBetting, startPlay, playerNames],
  );

  // Bots entscheiden mitkommen/passen.
  useEffect(() => {
    if (phase !== "betting" || bettingTurn === null || bettingTurn === HUMAN) return;
    const p = bettingTurn;
    const id = setTimeout(() => {
      decide(p, botComesAlong(hands[p] ?? [], trump as Suit));
    }, 750);
    return () => clearTimeout(id);
  }, [phase, bettingTurn, hands, trump, decide]);

  // ---------------- Stiche spielen ----------------
  const leadConstraint = useCallback(
    (player: number): LeadConstraint => {
      if (currentTrick.length > 0) return {};
      if (trickNo === 0 && player === openingLeader) return { forceTrumpAce: true };
      if (trickNo === 1) return { forceTrumpLead: true };
      return {};
    },
    [currentTrick.length, trickNo, openingLeader],
  );

  const finishRound = useCallback(
    (tricks: number[]) => {
      const N = settings.players;
      const comers = comersList;
      const res = settle(
        { pot, dealer, comers, tricksByPlayer: tricks },
        N,
      );
      const bal = balances.slice();
      const msg: string[] = [];
      for (let p = 0; p < N; p++) {
        if (res.payouts[p] > 0) {
          bal[p] += res.payouts[p];
          msg.push(`${playerNames[p]}: ${tricks[p]} Stich(e) → +${formatChf(res.payouts[p])}`);
        }
      }
      for (let p = 0; p < N; p++) {
        if (res.penalties[p] > 0) {
          bal[p] -= res.penalties[p];
          const zw = p === dealer && zwack ? " (zwack ab, doppelt!)" : "";
          msg.push(`${playerNames[p]}: kein Stich → −${formatChf(res.penalties[p])}${zw}`);
        }
      }
      setBalances(bal);
      setPot(res.newPot);
      setSettleMsg(
        res.gehtAuf
          ? ["Geht auf – Pot verteilt. Neue Runde mit frischem Einsatz.", ...msg]
          : [`Pot bleibt liegen: ${formatChf(res.newPot)}.`, ...msg],
      );
      setPhase("settle");
      setHint("");
    },
    [settings.players, comersList, pot, dealer, balances, zwack, playerNames],
  );

  const applyPlay = useCallback(
    (player: number, card: Card) => {
      const trick = [...currentTrick, { player, card }];
      const newHands = hands.map((h, i) =>
        i === player ? h.filter((c) => !sameCard(c, card)) : h,
      );
      setHands(newHands);

      if (trick.length < comersList.length) {
        // nächster Mitspieler
        const idx = comersList.indexOf(player);
        setCurrentTrick(trick);
        setToMove(comersList[(idx + 1) % comersList.length]);
        return;
      }

      // Stich komplett
      const winner = trickWinner(trick, trump as Suit);
      const tricks = tricksByPlayer.slice();
      tricks[winner] += 1;
      setTricksByPlayer(tricks);
      setCurrentTrick(trick);
      setFreeze({ cards: trick, winner });

      // nach kurzer Anzeige weiter / abrechnen
      window.setTimeout(() => {
        setFreeze(null);
        if (trickNo >= 2) {
          finishRound(tricks);
        } else {
          setCurrentTrick([]);
          setTrickNo((n) => n + 1);
          setToMove(winner);
          setHint(
            winner === HUMAN
              ? "Du hast den Stich – du spielst an."
              : `${playerNames[winner]} hat den Stich.`,
          );
        }
      }, 1100);
    },
    [currentTrick, hands, comersList, trump, tricksByPlayer, trickNo, finishRound, playerNames],
  );

  // Bots spielen automatisch.
  useEffect(() => {
    if (phase !== "play" || freeze || toMove === null || toMove === HUMAN) return;
    const p = toMove;
    const id = setTimeout(() => {
      const card = chooseBotCard(
        hands[p],
        currentTrick,
        trump as Suit,
        p,
        leadConstraint(p),
      );
      applyPlay(p, card);
    }, 700);
    return () => clearTimeout(id);
  }, [phase, freeze, toMove, hands, currentTrick, trump, leadConstraint, applyPlay]);

  const onHumanPlay = (card: Card) => {
    if (phase !== "play" || freeze || toMove !== HUMAN) return;
    const legal = legalMoves(hands[HUMAN], currentTrick, trump as Suit, leadConstraint(HUMAN));
    if (!legal.some((c) => sameCard(c, card))) {
      setHint(humanIllegalReason(card));
      return;
    }
    setHint("");
    applyPlay(HUMAN, card);
  };

  function humanIllegalReason(card: Card): string {
    const lc = leadConstraint(HUMAN);
    if (currentTrick.length === 0) {
      if (lc.forceTrumpAce) return "Du hast den Trumpf-Ass – der muss angespielt werden.";
      if (lc.forceTrumpLead) return "Du hast den 1. Stich gemacht – jetzt Trumpf anspielen.";
      return "";
    }
    const led = currentTrick[0].card.suit;
    if (hands[HUMAN].some((c) => c.suit === led)) return `Du musst ${SUIT_NAME[led]} bedienen.`;
    return "Du hast die Farbe nicht – du musst Trumpf spielen.";
  }

  const nextRound = () => {
    const N = settings.players;
    const nd = (dealer + 1) % N;
    setDealer(nd);
    startRound(nd, pot, balances);
  };

  // ---------------- abgeleitet ----------------
  const humanIsComer = comer[HUMAN];
  const humanTurn = phase === "play" && toMove === HUMAN && !freeze;
  const humanLegal: Card[] =
    humanTurn && hands[HUMAN]
      ? legalMoves(hands[HUMAN], currentTrick, trump as Suit, leadConstraint(HUMAN))
      : [];
  const isLegal = (c: Card) => humanLegal.some((l) => sameCard(l, c));
  const suggestion: Card | null =
    settings.learn && humanTurn && hands[HUMAN]
      ? chooseBotCard(hands[HUMAN], currentTrick, trump as Suit, HUMAN, leadConstraint(HUMAN))
      : null;

  const centerCards = freeze ? freeze.cards : currentTrick;

  // ---------------- Setup-Screen ----------------
  if (phase === "setup") {
    return (
      <div className="app wood">
        <div className="setupCard">
          <div className="brand">Zwicku</div>
          <div className="brandSub">Stammtisch · französische Karten</div>

          <h3>Mitspieler</h3>
          <div className="segmented">
            {[3, 4].map((n) => (
              <button
                key={n}
                className={`seg ${settings.players === n ? "on" : ""}`}
                onClick={() => setSettings((s) => ({ ...s, players: n }))}
              >
                {n} Spieler
              </button>
            ))}
          </div>

          <h3>Startgeld</h3>
          <div className="segmented">
            {[500, 1000, 2000].map((b) => (
              <button
                key={b}
                className={`seg ${settings.startBalance === b ? "on" : ""}`}
                onClick={() => setSettings((s) => ({ ...s, startBalance: b }))}
              >
                {formatChf(b)}
              </button>
            ))}
          </div>

          <h3>Lernmodus</h3>
          <button
            className={`toggle ${settings.learn ? "on" : ""}`}
            onClick={() => setSettings((s) => ({ ...s, learn: !s.learn }))}
          >
            <span className="knob" />
            <span className="toggleLabel">{settings.learn ? "An" : "Aus"}</span>
          </button>
          <p className="muted">Zeigt erlaubte Karten, einen Tipp und erklärt Regeln.</p>

          <h3>Kartendesign</h3>
          <div className="segmented">
            <button
              className={`seg ${settings.deck === "drawn" ? "on" : ""}`}
              onClick={() => setSettings((s) => ({ ...s, deck: "drawn" }))}
            >
              Gezeichnet
            </button>
            <button
              className={`seg ${settings.deck === "image" ? "on" : ""}`}
              onClick={() => setSettings((s) => ({ ...s, deck: "image" }))}
            >
              Bilder
            </button>
          </div>

          <button className="btn big" onClick={startGame}>
            Zwicku starten
          </button>
        </div>
        <div className="footer">
          <a href="https://github.com/Zenovs/zwicku">github.com/Zenovs/zwicku</a>
        </div>
      </div>
    );
  }

  // ---------------- Spiel ----------------
  return (
    <div className="app wood">
      <div className="topbar">
        <button className="gear" title="Einstellungen" onClick={() => setPhase("setup")}>
          ⚙︎
        </button>
        <div className="potInfo">
          Pot <b>{formatChf(pot)}</b>
          <span className="dim"> · Einsatz {formatChf(entryStake)}</span>
        </div>
        <div className="trumpBadge">
          {trump ? `Trumpf ${SUIT_SYMBOL[trump]}` : "Zwicku"}
        </div>
      </div>

      <div className="table">
        {seats.map((cls, seat) => {
          const active =
            (phase === "play" && toMove === seat && !freeze) ||
            (phase === "betting" && bettingTurn === seat) ||
            (phase === "zwack" && dealer === seat);
          const passed = phase !== "betting" && phase !== "zwack" && comer.length > 0 && !comer[seat];
          return (
            <div key={seat} className={`seat ${cls} ${active ? "active" : ""}`}>
              <div className="seatRow">
                <SchnappsGlass size={22} />
                <div className="seatInfo">
                  <div className="name">
                    {playerNames[seat]}
                    {seat === dealer ? " · Geber" : ""}
                  </div>
                  <div className="bal">{formatChf(balances[seat] ?? 0)}</div>
                </div>
              </div>
              <div className="seatCoins">
                <CoinPile amount={balances[seat] ?? 0} max={8} size={16} />
              </div>
              {seat !== HUMAN && (
                <div className="backrow">
                  {passed ? (
                    <span className="passed">Passe</span>
                  ) : (
                    (hands[seat] ?? []).map((_, i) => <CardBack key={i} width={22} />)
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Mitte: Trumpfkarte, Pot-Münzen, aktueller Stich */}
        <div className="center">
          {trumpCard && (
            <div className="trumpCardSlot">
              <PlayingCard card={trumpCard} width={42} deck={settings.deck} />
              <span className="trumpTag">Trumpf</span>
            </div>
          )}
          <div className="potCoins">
            <CoinPile amount={pot} max={16} />
          </div>
          <div className="trickRow">
            {centerCards.map((pc) => (
              <div key={pc.player} className="trickCard">
                <PlayingCard card={pc.card} width={46} deck={settings.deck} />
                <span className="trickWho">{playerNames[pc.player]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zwack-Overlay (menschlicher Austeiler) */}
        {phase === "zwack" && dealer === HUMAN && (
          <div className="overlay">
            <div className="panel">
              <h2>Austeilen</h2>
              <p>Du bist der Zwack. Sagst du blind „zwack" an?</p>
              <p className="muted">
                Mit Zwack zahlst du doppelt, wenn du keinen Stich machst.
              </p>
              <div className="row">
                <button className="btn" onClick={() => afterZwack(true)}>
                  Zwack!
                </button>
                <button className="btn ghost" onClick={() => afterZwack(false)}>
                  Kein Zwack
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mitkommen-Overlay (Mensch am Zug) */}
        {phase === "betting" && bettingTurn === HUMAN && (
          <div className="overlay">
            <div className="panel">
              <h2>Mitkommen?</h2>
              <p>
                Trumpf <b>{SUIT_NAME[trump as Suit]}</b> · Einsatz{" "}
                <b>{formatChf(entryStake)}</b> · Pot {formatChf(pot)}
              </p>
              <div className="miniHand">
                {(hands[HUMAN] ?? []).map((c) => (
                  <PlayingCard key={cardName(c)} card={c} width={50} deck={settings.deck} />
                ))}
              </div>
              <div className="row">
                <button className="btn" onClick={() => decide(HUMAN, true)}>
                  Mitkommen
                </button>
                <button className="btn ghost" onClick={() => decide(HUMAN, false)}>
                  Passe
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Abrechnung */}
        {phase === "settle" && (
          <div className="overlay">
            <div className="panel">
              <h2>Abrechnung</h2>
              {settleMsg.map((m, i) => (
                <p key={i} className={i === 0 ? "" : "muted"}>
                  {m}
                </p>
              ))}
              <button className="btn" onClick={nextRound}>
                Nächste Runde
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="hint">
        {hint || " "}
        {suggestion && <span className="tip"> · 💡 {cardName(suggestion)}</span>}
      </div>

      {/* Eigene Hand */}
      {humanIsComer ? (
        <div className="fan">
          {(hands[HUMAN] ?? []).map((card, i) => {
            const n = hands[HUMAN].length;
            const mid = (n - 1) / 2;
            const angle = (i - mid) * 6;
            const x = (i - mid) * 60;
            const y = (i - mid) * (i - mid) * 3;
            const playable = isLegal(card);
            const suggest = suggestion ? sameCard(card, suggestion) : false;
            const style: Record<string, string | number> = {
              "--x": `${x}px`,
              "--y": `${y}px`,
              "--a": `${angle}deg`,
              zIndex: i,
            };
            return (
              <button
                key={cardName(card)}
                className={`fancard ${humanTurn ? (playable ? "playable" : "dim") : ""} ${
                  suggest ? "suggest" : ""
                }`}
                style={style}
                onClick={() => onHumanPlay(card)}
                disabled={!humanTurn}
              >
                <PlayingCard card={card} width={96} highlight={humanTurn && playable} deck={settings.deck} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="fan idleHand">
          {phase === "play" || phase === "settle"
            ? "Du bist diese Runde nicht dabei – schau zu."
            : " "}
        </div>
      )}
    </div>
  );
}
