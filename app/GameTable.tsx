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
  isHopeless,
  LeadConstraint,
} from "@/lib/engine";
import {
  botComesAlong,
  botSaysZwack,
  botSwapDecision,
  botWantsOpinier,
  botKeepsNew,
  chooseBotCard,
} from "@/lib/bot";
import { PlayingCard, CardBack, SUIT_SYMBOL, RANK_LABEL, DeckStyle } from "./PlayingCard";
import { CoinPile, SchnappsGlass, StakeCoin, formatChf } from "./Tabletop";

const HUMAN = 0;
const SCHAUFEL_LIMIT = 300; // bis 3 Franken Einsatz gilt Schaufel-Pflicht
const SUIT_NAME: Record<Suit, string> = {
  herz: "Herz",
  ecken: "Ecken",
  schaufle: "Schaufle",
  kreuz: "Kreuz",
};
const COIN_FROM: Record<string, [number, number]> = {
  south: [0, 230],
  north: [0, -210],
  east: [330, 0],
  west: [-330, 0],
  tright: [250, -160],
  tleft: [-250, -160],
};

type Phase = "setup" | "zwack" | "betting" | "opinier" | "swap" | "play" | "settle";
type Freeze = { cards: PlayedCard[]; winner: number };
type Settings = {
  players: number;
  learn: boolean;
  deck: DeckStyle;
  startBalance: number;
  schaufel: boolean;
};
type Flying = { id: number; cls: string; amount: number };
const SETTINGS_KEY = "zwicku.settings";

const sameCard = (a: Card, b: Card) => a.suit === b.suit && a.rank === b.rank;
const cardName = (c: Card) => `${RANK_LABEL[c.rank]}${SUIT_SYMBOL[c.suit]}`;
const isThreeSameLei = (hand: Card[]) =>
  hand.length === 3 && hand.every((c) => c.suit === hand[0].suit);

function names(players: number): string[] {
  const bots = ["Sepp", "Marie", "Toni", "Vreni", "Hans"];
  return ["Du", ...bots.slice(0, players - 1)];
}
function seatClasses(players: number): string[] {
  if (players === 3) return ["south", "tright", "tleft"];
  return ["south", "east", "north", "west"];
}

export default function GameTable() {
  const [settings, setSettings] = useState<Settings>({
    players: 3,
    learn: false,
    deck: "image",
    startBalance: 1000,
    schaufel: false,
  });
  const [phase, setPhase] = useState<Phase>("setup");
  const [balances, setBalances] = useState<number[]>([]);
  const [pot, setPot] = useState(0);
  const [dealer, setDealer] = useState(0);
  const [hands, setHands] = useState<Card[][]>([]);
  const [stock, setStock] = useState<Card[]>([]);
  const [trump, setTrump] = useState<Suit | null>(null);
  const [trumpCard, setTrumpCard] = useState<Card | null>(null);
  const [zwack, setZwack] = useState(false);
  const [comer, setComer] = useState<boolean[]>([]);
  const [entryStake, setEntryStake] = useState(ANTE);
  const [bettingTurn, setBettingTurn] = useState<number | null>(null);
  const [comersList, setComersList] = useState<number[]>([]);
  const [swapper, setSwapper] = useState<number | null>(null);
  const [opinier, setOpinier] = useState<{ old: Card[]; neu: Card[] } | null>(null);
  const [currentTrick, setCurrentTrick] = useState<PlayedCard[]>([]);
  const [toMove, setToMove] = useState<number | null>(null);
  const [trickNo, setTrickNo] = useState(0);
  const [openingLeader, setOpeningLeader] = useState(0);
  const [tricksByPlayer, setTricksByPlayer] = useState<number[]>([]);
  const [freeze, setFreeze] = useState<Freeze | null>(null);
  const [settleMsg, setSettleMsg] = useState<string[]>([]);
  const [hint, setHint] = useState("");
  const [flying, setFlying] = useState<Flying[]>([]);

  const coinId = useRef(0);
  const finalizedRef = useRef(false);

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
          schaufel: typeof s.schaufel === "boolean" ? s.schaufel : cur.schaufel,
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

  const spawnCoin = useCallback(
    (seat: number, amount: number) => {
      const id = ++coinId.current;
      const cls = seats[seat] ?? "south";
      setFlying((f) => [...f, { id, cls, amount }]);
      window.setTimeout(() => setFlying((f) => f.filter((c) => c.id !== id)), 680);
    },
    [seats],
  );

  // ---------------- Rundenstart ----------------
  const startRound = useCallback(
    (theDealer: number, carriedPot: number, bal: number[]) => {
      const N = settings.players;
      // Chancenlose Hand (z. B. drei Sechsen) -> neu mischen und geben.
      let deal = dealZwicku(shuffle(createDeck()), N);
      for (let t = 0; t < 40; t++) {
        if (!deal.hands.some((h) => isHopeless(h, deal.trumpCard.suit))) break;
        deal = dealZwicku(shuffle(createDeck()), N);
      }
      const fresh = carriedPot === 0;
      const stake = fresh ? ANTE : carriedPot;

      const nextBal = bal.slice();
      nextBal[theDealer] -= stake;
      const comers = new Array(N).fill(false);
      comers[theDealer] = true;

      setHands(deal.hands);
      setStock(deal.stock);
      setTrumpCard(deal.trumpCard);
      setTrump(deal.trumpCard.suit);
      setBalances(nextBal);
      setPot(carriedPot + stake);
      setEntryStake(stake);
      setComer(comers);
      setZwack(false);
      setSwapper(null);
      setOpinier(null);
      setCurrentTrick([]);
      setComersList([]);
      setTrickNo(0);
      setTricksByPlayer(new Array(N).fill(0));
      setFreeze(null);
      setSettleMsg([]);
      setToMove(null);
      finalizedRef.current = false;
      spawnCoin(theDealer, stake);

      setPhase("zwack");
      setHint(
        theDealer === HUMAN ? "Du bist Austeiler – Zwack ansagen?" : `${playerNames[theDealer]} teilt aus …`,
      );
    },
    [settings.players, playerNames, spawnCoin],
  );

  const startGame = useCallback(() => {
    const bal = new Array(settings.players).fill(settings.startBalance);
    setBalances(bal);
    setPot(0);
    setDealer(0);
    startRound(0, 0, bal);
  }, [settings.players, settings.startBalance, startRound]);

  const afterZwack = useCallback(
    (said: boolean) => {
      setZwack(said);
      const first = (dealer + 1) % settings.players;
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

  useEffect(() => {
    if (phase !== "zwack" || dealer === HUMAN) return;
    const id = setTimeout(() => afterZwack(botSaysZwack(hands[dealer] ?? [])), 800);
    return () => clearTimeout(id);
  }, [phase, dealer, hands, afterZwack]);

  // ---------------- Tausch-Phase ----------------
  const startSwap = useCallback(
    (comers: boolean[]) => {
      const N = settings.players;
      // Vorrecht: Mitkommender mit Trumpf-6, sonst Austeiler.
      let sw = dealer;
      for (let p = 0; p < N; p++) {
        if (comers[p] && (hands[p] ?? []).some((c) => c.suit === trump && c.rank === "6")) {
          sw = p;
          break;
        }
      }
      setSwapper(sw);
      setPhase("swap");
      setHint(
        sw === HUMAN
          ? "Du darfst die Trumpfkarte tauschen."
          : `${playerNames[sw]} überlegt den Tausch …`,
      );
    },
    [settings.players, dealer, hands, trump, playerNames],
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
      setHint(order[0] === HUMAN ? "Du spielst an." : `${playerNames[order[0]]} spielt an …`);
    },
    [settings.players, dealer, playerNames],
  );

  const applySwap = useCallback(
    (player: number, give: Card) => {
      const tc = trumpCard;
      if (tc) {
        setHands((h) =>
          h.map((hh, i) =>
            i === player ? [...hh.filter((c) => !sameCard(c, give)), tc] : hh,
          ),
        );
        setTrumpCard(give);
      }
      startPlay(comer);
    },
    [trumpCard, comer, startPlay],
  );

  // Bot-Tausch automatisch.
  useEffect(() => {
    if (phase !== "swap" || swapper === null || swapper === HUMAN) return;
    const p = swapper;
    const id = setTimeout(() => {
      const give = trumpCard ? botSwapDecision(hands[p] ?? [], trumpCard, trump as Suit) : null;
      if (give) applySwap(p, give);
      else startPlay(comer);
    }, 750);
    return () => clearTimeout(id);
  }, [phase, swapper, hands, trumpCard, trump, comer, applySwap, startPlay]);

  // ---------------- Wetten ----------------
  const nextBettor = useCallback(
    (from: number) => {
      const N = settings.players;
      let next = (from + 1) % N;
      while (next === dealer) next = (next + 1) % N;
      return next === (dealer + 1) % N ? null : next;
    },
    [settings.players, dealer],
  );

  const finishBettingTurn = useCallback(
    (player: number, comers: boolean[]) => {
      const next = nextBettor(player);
      if (next === null) {
        startSwap(comers);
      } else {
        setBettingTurn(next);
        setHint(
          next === HUMAN
            ? `Kommst du mit? Einsatz ${formatChf(entryStake)}`
            : `${playerNames[next]} überlegt …`,
        );
      }
    },
    [nextBettor, startSwap, entryStake, playerNames],
  );

  const comeAlong = useCallback(
    (player: number) => {
      setBalances((b) => {
        const nb = b.slice();
        nb[player] -= entryStake;
        return nb;
      });
      setPot((p) => p + entryStake);
      spawnCoin(player, entryStake);
      const comers = comer.slice();
      comers[player] = true;
      setComer(comers);
      finishBettingTurn(player, comers);
    },
    [entryStake, spawnCoin, comer, finishBettingTurn],
  );

  const passTurn = useCallback(
    (player: number) => {
      const comers = comer.slice();
      comers[player] = false;
      setComer(comers);
      finishBettingTurn(player, comers);
    },
    [comer, finishBettingTurn],
  );

  const mustCome = useCallback(
    (hand: Card[]) =>
      settings.schaufel && entryStake < SCHAUFEL_LIMIT && hand.some((c) => c.suit === "schaufle"),
    [settings.schaufel, entryStake],
  );

  // Bots wetten.
  useEffect(() => {
    if (phase !== "betting" || bettingTurn === null || bettingTurn === HUMAN) return;
    const p = bettingTurn;
    const id = setTimeout(() => {
      const hand = hands[p] ?? [];
      if (mustCome(hand)) {
        comeAlong(p);
      } else if (botWantsOpinier(hand, trump as Suit) && stock.length >= 3) {
        const neu = stock.slice(0, 3);
        setStock((s) => s.slice(3));
        if (botKeepsNew(hand, neu, trump as Suit)) {
          setHands((h) => h.map((hh, i) => (i === p ? neu : hh)));
        }
        comeAlong(p);
      } else if (botComesAlong(hand, trump as Suit)) {
        comeAlong(p);
      } else {
        passTurn(p);
      }
    }, 750);
    return () => clearTimeout(id);
  }, [phase, bettingTurn, hands, trump, stock, mustCome, comeAlong, passTurn]);

  // Opinier (Mensch)
  const startOpinier = () => {
    if (stock.length < 3) return;
    const neu = stock.slice(0, 3);
    setStock((s) => s.slice(3));
    setOpinier({ old: hands[HUMAN], neu });
    setPhase("opinier");
  };
  const chooseOpinier = (takeNew: boolean) => {
    if (takeNew && opinier) setHands((h) => h.map((hh, i) => (i === HUMAN ? opinier.neu : hh)));
    setOpinier(null);
    setPhase("betting");
    comeAlong(HUMAN);
  };

  // ---------------- Stiche ----------------
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
      const res = settle({ pot, dealer, comers: comersList, tricksByPlayer: tricks }, N);
      const bal = balances.slice();
      const msg: string[] = [];
      for (let p = 0; p < N; p++) {
        if (res.payouts[p] > 0) {
          bal[p] += res.payouts[p];
          msg.push(`${playerNames[p]}: ${tricks[p]} Stich → +${formatChf(res.payouts[p])}`);
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
      setHands((h) => h.map((hh, i) => (i === player ? hh.filter((c) => !sameCard(c, card)) : hh)));

      if (trick.length < comersList.length) {
        const idx = comersList.indexOf(player);
        setCurrentTrick(trick);
        setToMove(comersList[(idx + 1) % comersList.length]);
        return;
      }

      const winner = trickWinner(trick, trump as Suit);
      const tricks = tricksByPlayer.slice();
      tricks[winner] += 1;
      setTricksByPlayer(tricks);
      setCurrentTrick(trick);
      setFreeze({ cards: trick, winner });

      window.setTimeout(() => {
        setFreeze(null);
        if (trickNo >= 2) {
          finishRound(tricks);
        } else {
          setCurrentTrick([]);
          setTrickNo((n) => n + 1);
          setToMove(winner);
          setHint(
            winner === HUMAN ? "Du hast den Stich – du spielst an." : `${playerNames[winner]} hat den Stich.`,
          );
        }
      }, 1150);
    },
    [currentTrick, comersList, trump, tricksByPlayer, trickNo, finishRound, playerNames],
  );

  useEffect(() => {
    if (phase !== "play" || freeze || toMove === null || toMove === HUMAN) return;
    const p = toMove;
    const id = setTimeout(() => {
      const card = chooseBotCard(hands[p], currentTrick, trump as Suit, p, leadConstraint(p));
      applyPlay(p, card);
    }, 720);
    return () => clearTimeout(id);
  }, [phase, freeze, toMove, hands, currentTrick, trump, leadConstraint, applyPlay]);

  const onHumanPlay = (card: Card) => {
    if (phase !== "play" || freeze || toMove !== HUMAN) return;
    const legal = legalMoves(hands[HUMAN], currentTrick, trump as Suit, leadConstraint(HUMAN));
    if (!legal.some((c) => sameCard(c, card))) {
      setHint(illegalReason(card));
      return;
    }
    setHint("");
    applyPlay(HUMAN, card);
  };
  function illegalReason(card: Card): string {
    const lc = leadConstraint(HUMAN);
    if (currentTrick.length === 0) {
      if (lc.forceTrumpAce) return "Du hast den Trumpf-Ass – der muss angespielt werden.";
      if (lc.forceTrumpLead) return "Du hast den 1. Stich gemacht – jetzt Trumpf anspielen.";
      return "";
    }
    const led = currentTrick[0].card.suit;
    if (hands[HUMAN].some((c) => c.suit === led)) return `Du musst ${SUIT_NAME[led]} bedienen.`;
    return "Keine Lei – du musst Trumpf spielen.";
  }

  const nextRound = () => {
    const nd = (dealer + 1) % settings.players;
    setDealer(nd);
    startRound(nd, pot, balances);
  };

  // ---------------- abgeleitet ----------------
  const humanIsComer = comer[HUMAN];
  const humanTurn = phase === "play" && toMove === HUMAN && !freeze;
  const humanLegal: Card[] =
    humanTurn && hands[HUMAN] ? legalMoves(hands[HUMAN], currentTrick, trump as Suit, leadConstraint(HUMAN)) : [];
  const isLegal = (c: Card) => humanLegal.some((l) => sameCard(l, c));
  const suggestion: Card | null =
    settings.learn && humanTurn && hands[HUMAN]
      ? chooseBotCard(hands[HUMAN], currentTrick, trump as Suit, HUMAN, leadConstraint(HUMAN))
      : null;
  const centerCards = freeze ? freeze.cards : currentTrick;
  const canOpinier = phase === "betting" && bettingTurn === HUMAN && isThreeSameLei(hands[HUMAN] ?? []);
  const obligated = phase === "betting" && bettingTurn === HUMAN && mustCome(hands[HUMAN] ?? []);

  // ---------------- Setup ----------------
  if (phase === "setup") {
    return (
      <div className="app wood">
        <div className="setupCard">
          <div className="brand">Zwicku</div>
          <div className="brandSub">Stammtisch · französische Karten</div>

          <h3>Mitspieler</h3>
          <div className="segmented">
            {[3, 4].map((n) => (
              <button key={n} className={`seg ${settings.players === n ? "on" : ""}`} onClick={() => setSettings((s) => ({ ...s, players: n }))}>
                {n} Spieler
              </button>
            ))}
          </div>

          <h3>Startgeld</h3>
          <div className="segmented">
            {[500, 1000, 2000].map((b) => (
              <button key={b} className={`seg ${settings.startBalance === b ? "on" : ""}`} onClick={() => setSettings((s) => ({ ...s, startBalance: b }))}>
                {formatChf(b)}
              </button>
            ))}
          </div>

          <h3>Schaufel-Pflicht</h3>
          <button className={`toggle ${settings.schaufel ? "on" : ""}`} onClick={() => setSettings((s) => ({ ...s, schaufel: !s.schaufel }))}>
            <span className="knob" />
            <span className="toggleLabel">{settings.schaufel ? "An" : "Aus"}</span>
          </button>
          <p className="muted">Bis {formatChf(SCHAUFEL_LIMIT)} Einsatz: mit Schaufel auf der Hand muss man mitkommen.</p>

          <h3>Lernmodus</h3>
          <button className={`toggle ${settings.learn ? "on" : ""}`} onClick={() => setSettings((s) => ({ ...s, learn: !s.learn }))}>
            <span className="knob" />
            <span className="toggleLabel">{settings.learn ? "An" : "Aus"}</span>
          </button>

          <h3>Kartendesign</h3>
          <div className="segmented">
            <button className={`seg ${settings.deck === "drawn" ? "on" : ""}`} onClick={() => setSettings((s) => ({ ...s, deck: "drawn" }))}>
              Gezeichnet
            </button>
            <button className={`seg ${settings.deck === "image" ? "on" : ""}`} onClick={() => setSettings((s) => ({ ...s, deck: "image" }))}>
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
        <div className="trumpBadge">{trump ? `Trumpf ${SUIT_SYMBOL[trump]}` : "Zwicku"}</div>
      </div>

      <div className="table">
        {seats.map((cls, seat) => {
          const active =
            (phase === "play" && toMove === seat && !freeze) ||
            (phase === "betting" && bettingTurn === seat) ||
            (phase === "zwack" && dealer === seat) ||
            (phase === "swap" && swapper === seat);
          const passed = (phase === "play" || phase === "settle" || phase === "swap") && comer.length > 0 && !comer[seat];
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
                  {passed ? <span className="passed">Passe</span> : (hands[seat] ?? []).map((_, i) => <CardBack key={i} width={22} />)}
                </div>
              )}
            </div>
          );
        })}

        <div className="center">
          <div className="mat" />

          <div className="stock">
            {trumpCard && (
              <div className="trumpUnder">
                <PlayingCard card={trumpCard} width={62} deck={settings.deck} />
              </div>
            )}
            <div className="deckStack">
              <CardBack width={62} />
              <CardBack width={62} />
              <CardBack width={62} />
            </div>
            {trump && <span className="trumpTag">Trumpf · {SUIT_NAME[trump]}</span>}
          </div>

          {centerCards.map((pc) => (
            <div
              key={pc.player}
              className={`played ${seats[pc.player]} ${
                freeze && freeze.winner === pc.player ? "won" : ""
              }`}
            >
              <div className="playedInner">
                <PlayingCard card={pc.card} width={64} deck={settings.deck} />
              </div>
            </div>
          ))}

          <div className="potCoins">
            <CoinPile amount={pot} max={16} />
          </div>
        </div>

        {/* Fliegende Münzen */}
        {flying.map((f) => {
          const [sx, sy] = COIN_FROM[f.cls] ?? [0, 0];
          const st: Record<string, string | number> = { "--sx": `${sx}px`, "--sy": `${sy}px` };
          return (
            <div key={f.id} className="flyCoin" style={st}>
              <StakeCoin amount={f.amount} size={26} />
            </div>
          );
        })}

        {/* Zwack */}
        {phase === "zwack" && dealer === HUMAN && (
          <div className="overlay">
            <div className="panel">
              <h2>Austeilen</h2>
              <p>Du bist der Zwack. Blind „zwack" ansagen?</p>
              <p className="muted">Mit Zwack zahlst du doppelt, wenn du keinen Stich machst.</p>
              <div className="row">
                <button className="btn" onClick={() => afterZwack(true)}>Zwack!</button>
                <button className="btn ghost" onClick={() => afterZwack(false)}>Kein Zwack</button>
              </div>
            </div>
          </div>
        )}

        {/* Mitkommen */}
        {phase === "betting" && bettingTurn === HUMAN && (
          <div className="overlay">
            <div className="panel">
              <h2>Mitkommen?</h2>
              <p>
                Trumpf <b>{SUIT_NAME[trump as Suit]}</b> · Einsatz <b>{formatChf(entryStake)}</b> · Pot {formatChf(pot)}
              </p>
              {obligated && <p className="muted">Schaufel-Pflicht: du musst mitkommen.</p>}
              <div className="miniHand">
                {(hands[HUMAN] ?? []).map((c) => (
                  <PlayingCard key={cardName(c)} card={c} width={66} deck={settings.deck} />
                ))}
              </div>
              <div className="row">
                <button className="btn" onClick={() => comeAlong(HUMAN)}>Mitkommen</button>
                {canOpinier && (
                  <button className="btn ghost" onClick={startOpinier}>Opinier</button>
                )}
                <button className="btn ghost" disabled={obligated} onClick={() => !obligated && passTurn(HUMAN)}>
                  Passe
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Opinier */}
        {phase === "opinier" && opinier && (
          <div className="overlay">
            <div className="panel">
              <h2>Opinier</h2>
              <p className="muted">Drei gleiche Lei – alte oder neue Karten? (Du kommst dann mit.)</p>
              <div className="opinierRow">
                <div>
                  <div className="opLabel">Alt</div>
                  <div className="miniHand">
                    {opinier.old.map((c) => (
                      <PlayingCard key={"o" + cardName(c)} card={c} width={56} deck={settings.deck} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="opLabel">Neu</div>
                  <div className="miniHand">
                    {opinier.neu.map((c) => (
                      <PlayingCard key={"n" + cardName(c)} card={c} width={56} deck={settings.deck} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="row">
                <button className="btn ghost" onClick={() => chooseOpinier(false)}>Alte behalten</button>
                <button className="btn" onClick={() => chooseOpinier(true)}>Neue nehmen</button>
              </div>
            </div>
          </div>
        )}

        {/* Tausch (Mensch) */}
        {phase === "swap" && swapper === HUMAN && (
          <div className="overlay">
            <div className="panel">
              <h2>Trumpfkarte tauschen</h2>
              <p className="muted">
                {(hands[HUMAN] ?? []).some((c) => c.suit === trump && c.rank === "6")
                  ? "Du hast den Trumpf-6 (Vorrecht)."
                  : "Als Austeiler darfst du tauschen."}{" "}
                Wähle eine Karte zum Ablegen – oder verzichte.
              </p>
              <div className="swapWrap">
                <div className="swapTrump">
                  {trumpCard && <PlayingCard card={trumpCard} width={62} deck={settings.deck} />}
                  <span className="opLabel">nehmen</span>
                </div>
                <div className="miniHand">
                  {(hands[HUMAN] ?? []).map((c) => (
                    <button key={cardName(c)} className="swapPick" onClick={() => applySwap(HUMAN, c)}>
                      <PlayingCard card={c} width={56} deck={settings.deck} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="row">
                <button className="btn ghost" onClick={() => startPlay(comer)}>Verzichten</button>
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
                <p key={i} className={i === 0 ? "" : "muted"}>{m}</p>
              ))}
              <button className="btn" onClick={nextRound}>Nächste Runde</button>
            </div>
          </div>
        )}
      </div>

      <div className="hint">
        {hint || " "}
        {suggestion && <span className="tip"> · 💡 {cardName(suggestion)}</span>}
      </div>

      {humanIsComer ? (
        <div className="fan">
          {(hands[HUMAN] ?? []).map((card, i) => {
            const n = hands[HUMAN].length;
            const mid = (n - 1) / 2;
            const angle = (i - mid) * 7;
            const x = (i - mid) * 74;
            const y = (i - mid) * (i - mid) * 4;
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
                className={`fancard ${humanTurn ? (playable ? "playable" : "dim") : ""} ${suggest ? "suggest" : ""}`}
                style={style}
                onClick={() => onHumanPlay(card)}
                disabled={!humanTurn}
              >
                <PlayingCard card={card} width={114} highlight={humanTurn && playable} deck={settings.deck} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="fan idleHand">
          {phase === "play" || phase === "settle" || phase === "swap"
            ? "Du bist diese Runde nicht dabei – schau zu."
            : " "}
        </div>
      )}
    </div>
  );
}
