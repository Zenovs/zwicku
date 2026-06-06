"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Card,
  TrumpMode,
  PlayedCard,
  GameState,
  MatchState,
  RoundResult,
  createDeck,
  shuffle,
  deal,
  startRound,
  playCard,
  scoreRound,
  legalMoves,
  cardValue,
  startMatch,
  applyRound,
} from "@/lib/engine";
import { chooseBotMove, decideBotTrump } from "@/lib/bot";
import { PlayingCard, CardBack, SUIT_SYMBOL, RANK_LABEL } from "./PlayingCard";

const HUMAN = 0;
const SEAT_NAMES = ["Du", "Gegner Ost", "Partner", "Gegner West"];
const SEAT_CLASS = ["south", "east", "north", "west"] as const;
const SUIT_NAME: Record<string, string> = {
  herz: "Herz",
  ecken: "Ecken",
  schaufle: "Schaufle",
  kreuz: "Kreuz",
};

type Phase = "setup" | "trump" | "play" | "roundEnd" | "matchEnd";
type Freeze = { cards: PlayedCard[]; winner: number };
type Settings = { target: number; learn: boolean };

const partnerOf = (p: number) => (p + 2) % 4;

function trumpLabel(t: TrumpMode): string {
  if (t.type === "obenabe") return "Obenabe";
  if (t.type === "undenufe") return "Undenufe";
  return `Trumpf ${SUIT_SYMBOL[t.suit]}`;
}

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

function cardName(c: Card): string {
  return `${RANK_LABEL[c.rank]}${SUIT_SYMBOL[c.suit]}`;
}

/** Lernmodus: erklärt, warum eine Karte gerade nicht erlaubt ist. */
function explainIllegal(card: Card, trick: PlayedCard[], trump: TrumpMode): string {
  if (trick.length === 0) return "";
  const led = trick[0].card.suit;
  if (trump.type === "suit" && led === trump.suit) {
    return "Trumpf wurde angespielt – du musst Trumpf zugeben.";
  }
  return `Du musst die angespielte Farbe (${SUIT_NAME[led]}) bedienen.`;
}

export default function JassTable() {
  const [settings, setSettings] = useState<Settings>({ target: 1000, learn: false });
  const [match, setMatch] = useState<MatchState>(() => startMatch({ target: 1000 }));
  const [round, setRound] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [leader, setLeader] = useState(HUMAN);
  const [trumpDecider, setTrumpDecider] = useState(HUMAN);
  const [schoben, setSchoben] = useState(false);
  const [pendingHands, setPendingHands] = useState<
    [Card[], Card[], Card[], Card[]] | null
  >(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [freeze, setFreeze] = useState<Freeze | null>(null);
  const [hint, setHint] = useState("");

  const finalizedRef = useRef(false);

  const dealNewRound = useCallback((nextLeader: number) => {
    const hands = deal(shuffle(createDeck()));
    finalizedRef.current = false;
    setRound(null);
    setResult(null);
    setFreeze(null);
    setLeader(nextLeader);
    setTrumpDecider(nextLeader);
    setSchoben(false);
    setPendingHands(hands);
    setPhase("trump");
    setHint(
      nextLeader === HUMAN
        ? "Du bist Vorhand – Trumpf wählen oder schieben."
        : `${SEAT_NAMES[nextLeader]} ist Vorhand …`,
    );
  }, []);

  const startGame = useCallback(() => {
    setMatch(startMatch({ target: settings.target }));
    dealNewRound(HUMAN);
  }, [settings.target, dealNewRound]);

  const beginPlay = useCallback(
    (hands: [Card[], Card[], Card[], Card[]], trump: TrumpMode, lead: number) => {
      const gs = startRound(hands, trump, lead);
      setRound(gs);
      setPhase("play");
      setHint(
        lead === HUMAN
          ? `${trumpLabel(trump)} – du spielst an.`
          : `${trumpLabel(trump)} – ${SEAT_NAMES[lead]} spielt an …`,
      );
    },
    [],
  );

  // Bot entscheidet Trumpf / Schieben.
  useEffect(() => {
    if (phase !== "trump" || !pendingHands) return;
    if (trumpDecider === HUMAN) return;
    const id = setTimeout(() => {
      const canSchieben = !schoben && trumpDecider === leader;
      const decision = decideBotTrump(pendingHands[trumpDecider], canSchieben);
      if (decision === "schieben") {
        const partner = partnerOf(trumpDecider);
        setSchoben(true);
        setTrumpDecider(partner);
        setHint(
          partner === HUMAN
            ? `${SEAT_NAMES[trumpDecider]} schiebt zu dir – du musst ansagen.`
            : `${SEAT_NAMES[trumpDecider]} schiebt zum Partner …`,
        );
      } else {
        beginPlay(pendingHands, decision, leader);
      }
    }, 800);
    return () => clearTimeout(id);
  }, [phase, pendingHands, trumpDecider, schoben, leader, beginPlay]);

  const finalizeRound = useCallback(
    (state: GameState) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;
      const r = scoreRound(state);
      const nm = applyRound(match, state.trump, r);
      setResult(r);
      setMatch(nm);
      setPhase(nm.finished ? "matchEnd" : "roundEnd");
    },
    [match],
  );

  const applyMove = useCallback(
    (state: GameState, player: number, card: Card) => {
      const next = playCard(state, player, card);
      const trickDone =
        next.completedTricks.length > state.completedTricks.length;
      setRound(next);
      if (trickDone) {
        const done = next.completedTricks[next.completedTricks.length - 1];
        setFreeze({ cards: done.cards, winner: done.winner });
      } else {
        setFreeze(null);
      }
    },
    [],
  );

  // Bots ziehen automatisch.
  useEffect(() => {
    if (phase !== "play" || !round || round.finished) return;
    if (freeze) return;
    if (round.toMove === HUMAN) return;
    const p = round.toMove;
    const id = setTimeout(() => {
      const card = chooseBotMove(round.hands[p], round.currentTrick, round.trump, p);
      applyMove(round, p, card);
    }, 650);
    return () => clearTimeout(id);
  }, [phase, round, freeze, applyMove]);

  // Abgeschlossenen Stich kurz zeigen, dann weiter / auswerten.
  useEffect(() => {
    if (!freeze || !round) return;
    const id = setTimeout(() => {
      setFreeze(null);
      if (round.finished && phase === "play") finalizeRound(round);
    }, 1100);
    return () => clearTimeout(id);
  }, [freeze, round, phase, finalizeRound]);

  const onChooseTrump = (mode: TrumpMode) => {
    if (phase !== "trump" || !pendingHands || trumpDecider !== HUMAN) return;
    beginPlay(pendingHands, mode, leader);
  };

  const onSchieben = () => {
    if (phase !== "trump" || trumpDecider !== HUMAN || schoben) return;
    setSchoben(true);
    setTrumpDecider(partnerOf(HUMAN));
    setHint("Du schiebst – dein Partner sagt an …");
  };

  const onHumanPlay = (card: Card) => {
    if (phase !== "play" || !round || freeze) return;
    if (round.toMove !== HUMAN) return;
    const legal = legalMoves(round.hands[HUMAN], round.currentTrick, round.trump);
    if (!legal.some((c) => sameCard(c, card))) {
      setHint(
        settings.learn
          ? explainIllegal(card, round.currentTrick, round.trump)
          : "Diese Karte darfst du gerade nicht spielen (bedienen!).",
      );
      return;
    }
    setHint("");
    applyMove(round, HUMAN, card);
  };

  // --- abgeleitete Werte ---
  const interactive = phase === "play" && round?.toMove === HUMAN && !freeze;
  const humanLegal: Card[] =
    round && interactive
      ? legalMoves(round.hands[HUMAN], round.currentTrick, round.trump)
      : [];
  const isLegal = (c: Card) => humanLegal.some((l) => sameCard(l, c));
  const suggestion: Card | null =
    settings.learn && interactive && round
      ? chooseBotMove(round.hands[HUMAN], round.currentTrick, round.trump, HUMAN)
      : null;

  const centerCards: PlayedCard[] = freeze
    ? freeze.cards
    : round
      ? round.currentTrick
      : [];
  const trickPoints =
    round && settings.learn
      ? centerCards.reduce((s, pc) => s + cardValue(pc.card, round.trump), 0)
      : 0;

  const trumpChoices: { label: string; mode: TrumpMode }[] = [
    { label: `${SUIT_SYMBOL.herz} Herz`, mode: { type: "suit", suit: "herz" } },
    { label: `${SUIT_SYMBOL.ecken} Ecken`, mode: { type: "suit", suit: "ecken" } },
    { label: `${SUIT_SYMBOL.schaufle} Schaufle`, mode: { type: "suit", suit: "schaufle" } },
    { label: `${SUIT_SYMBOL.kreuz} Kreuz`, mode: { type: "suit", suit: "kreuz" } },
    { label: "Obenabe", mode: { type: "obenabe" } },
    { label: "Undenufe", mode: { type: "undenufe" } },
  ];

  const humanHand = round
    ? round.hands[HUMAN]
    : pendingHands
      ? pendingHands[HUMAN]
      : [];

  // ----- Setup-Screen -----
  if (phase === "setup") {
    const targets = [500, 1000, 1500, 2500];
    return (
      <div className="app">
        <div className="setupCard">
          <div className="brand">Trumpf</div>
          <div className="brandSub">Schieber-Jass · französische Karten</div>

          <h3>Punkteziel</h3>
          <div className="segmented">
            {targets.map((t) => (
              <button
                key={t}
                className={`seg ${settings.target === t ? "on" : ""}`}
                onClick={() => setSettings((s) => ({ ...s, target: t }))}
              >
                {t}
              </button>
            ))}
          </div>

          <h3>Lernmodus</h3>
          <button
            className={`toggle ${settings.learn ? "on" : ""}`}
            onClick={() => setSettings((s) => ({ ...s, learn: !s.learn }))}
            aria-pressed={settings.learn}
          >
            <span className="knob" />
            <span className="toggleLabel">
              {settings.learn ? "An" : "Aus"}
            </span>
          </button>
          <p className="muted">
            Zeigt erlaubte Karten, Kartenwerte, einen Spieltipp und erklärt
            Regelverstösse.
          </p>

          <button className="btn big" onClick={startGame}>
            Spiel starten
          </button>
        </div>
        <div className="footer">
          Engine & Code:{" "}
          <a href="https://github.com/Zenovs/trumpf">github.com/Zenovs/trumpf</a>
        </div>
      </div>
    );
  }

  // ----- Spiel -----
  return (
    <div className="app">
      <div className="topbar">
        <button
          className="gear"
          title="Neues Spiel / Einstellungen"
          onClick={() => setPhase("setup")}
        >
          ⚙︎
        </button>
        <div className="scoreboard">
          <div className="score">
            Du + Partner <b>{match.scores[0]}</b>
          </div>
          <div className="vs">:</div>
          <div className="score">
            Gegner <b>{match.scores[1]}</b>
          </div>
        </div>
        <div className="trumpBadge">
          {round && phase === "play"
            ? trumpLabel(round.trump)
            : `Ziel ${settings.target}`}
        </div>
      </div>

      <div className="table">
        {SEAT_CLASS.map((cls, seat) => {
          const active = !!round && phase === "play" && !freeze && round.toMove === seat;
          const deciding = phase === "trump" && trumpDecider === seat;
          return (
            <div
              key={seat}
              className={`seat ${cls} ${active || deciding ? "active" : ""}`}
            >
              <div className="name">
                {SEAT_NAMES[seat]}
                {seat === leader && phase !== "matchEnd" ? " · Vorhand" : ""}
              </div>
              {seat !== HUMAN && round && (
                <div className="backrow">
                  {round.hands[seat].map((_, i) => (
                    <CardBack key={i} width={24} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="center">
          {settings.learn && centerCards.length > 0 && (
            <div className="trickPoints">{trickPoints} P</div>
          )}
          {centerCards.map((pc) => {
            const slot = ["s", "e", "n", "w"][pc.player];
            return (
              <div key={pc.player} className={`slot ${slot}`}>
                <PlayingCard card={pc.card} width={46} />
              </div>
            );
          })}
        </div>

        {phase === "trump" && trumpDecider === HUMAN && (
          <div className="overlay">
            <div className="panel">
              <h2>Trumpf ansagen{schoben ? " (geschoben)" : ""}</h2>
              <p>
                {trumpDecider === leader
                  ? "Du bist Vorhand."
                  : "Dein Partner hat zu dir geschoben."}
              </p>
              <div className="trumpGrid">
                {trumpChoices.map((t) => (
                  <button key={t.label} className="btn" onClick={() => onChooseTrump(t.mode)}>
                    {t.label}
                  </button>
                ))}
              </div>
              {trumpDecider === leader && !schoben && (
                <button className="btn ghost schiebenBtn" onClick={onSchieben}>
                  ⟶ Schieben (Partner sagt an)
                </button>
              )}
            </div>
          </div>
        )}

        {phase === "roundEnd" && result && (
          <div className="overlay">
            <div className="panel">
              <h2>Runde fertig</h2>
              <p>
                Stich-Punkte: <b>Du+Partner {result.pointsByTeam[0]}</b> · Gegner{" "}
                {result.pointsByTeam[1]}
              </p>
              {result.match !== null && (
                <p>🎉 Match! +100 für {result.match === 0 ? "euch" : "die Gegner"}</p>
              )}
              <p>
                Total: <b>{match.scores[0]}</b> : <b>{match.scores[1]}</b> (Ziel{" "}
                {settings.target})
              </p>
              <button className="btn" onClick={() => dealNewRound((leader + 1) % 4)}>
                Nächste Runde
              </button>
            </div>
          </div>
        )}

        {phase === "matchEnd" && (
          <div className="overlay">
            <div className="panel">
              <h2>{match.winner === 0 ? "🏆 Ihr habt gewonnen!" : "Gegner gewinnt"}</h2>
              <p>
                Endstand: <b>{match.scores[0]}</b> : <b>{match.scores[1]}</b>
              </p>
              <button
                className="btn"
                onClick={() => {
                  setMatch(startMatch({ target: settings.target }));
                  dealNewRound(HUMAN);
                }}
              >
                Revanche
              </button>
              <button className="btn ghost schiebenBtn" onClick={() => setPhase("setup")}>
                Einstellungen
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="hint">
        {hint || " "}
        {suggestion && (
          <span className="tip"> · 💡 Tipp: {cardName(suggestion)}</span>
        )}
      </div>

      {/* Hand – gefächert wie beim Jassen */}
      <div className="fan">
        {humanHand.map((card, i) => {
          const n = humanHand.length;
          const mid = (n - 1) / 2;
          const angle = (i - mid) * 5;
          const x = (i - mid) * 42;
          const y = (i - mid) * (i - mid) * 2.4;
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
              key={`${card.suit}-${card.rank}`}
              className={`fancard ${interactive ? (playable ? "playable" : "dim") : ""} ${
                suggest ? "suggest" : ""
              }`}
              style={style}
              onClick={() => onHumanPlay(card)}
              disabled={!interactive}
            >
              {settings.learn && round && phase === "play" && (
                <span className="ptbadge">{cardValue(card, round.trump)}</span>
              )}
              <PlayingCard card={card} width={66} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
