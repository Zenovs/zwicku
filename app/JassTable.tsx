"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  startMatch,
  applyRound,
} from "@/lib/engine";
import { chooseBotMove, decideBotTrump } from "@/lib/bot";
import { PlayingCard, CardBack, SUIT_SYMBOL } from "./PlayingCard";

const HUMAN = 0;
const TARGET = 1000;
const SEAT_NAMES = ["Du", "Gegner Ost", "Partner", "Gegner West"];
const SEAT_CLASS = ["south", "east", "north", "west"] as const;

type Phase = "trump" | "play" | "roundEnd" | "matchEnd";
type Freeze = { cards: PlayedCard[]; winner: number };

const partnerOf = (p: number) => (p + 2) % 4;

function trumpLabel(t: TrumpMode): string {
  if (t.type === "obenabe") return "Obenabe";
  if (t.type === "undenufe") return "Undenufe";
  return `Trumpf ${SUIT_SYMBOL[t.suit]}`;
}

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export default function JassTable() {
  const [match, setMatch] = useState<MatchState>(() =>
    startMatch({ target: TARGET }),
  );
  const [round, setRound] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("trump");
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

  useEffect(() => {
    dealNewRound(HUMAN);
  }, [dealNewRound]);

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

  // Bot entscheidet über Trumpf bzw. Schieben.
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

  // Bots ziehen automatisch, einer pro Tick.
  useEffect(() => {
    if (phase !== "play" || !round || round.finished) return;
    if (freeze) return;
    if (round.toMove === HUMAN) return;
    const p = round.toMove;
    const id = setTimeout(() => {
      const card = chooseBotMove(
        round.hands[p],
        round.currentTrick,
        round.trump,
        p,
      );
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
    const partner = partnerOf(HUMAN);
    setSchoben(true);
    setTrumpDecider(partner);
    setHint("Du schiebst – dein Partner sagt an …");
  };

  const onHumanPlay = (card: Card) => {
    if (phase !== "play" || !round || freeze) return;
    if (round.toMove !== HUMAN) return;
    const legal = legalMoves(round.hands[HUMAN], round.currentTrick, round.trump);
    if (!legal.some((c) => sameCard(c, card))) {
      setHint("Diese Karte darfst du gerade nicht spielen (bedienen!).");
      return;
    }
    setHint("");
    applyMove(round, HUMAN, card);
  };

  const humanLegal: Card[] =
    round && phase === "play" && !freeze && round.toMove === HUMAN
      ? legalMoves(round.hands[HUMAN], round.currentTrick, round.trump)
      : [];
  const isLegal = (c: Card) => humanLegal.some((l) => sameCard(l, c));

  const centerCards: PlayedCard[] = freeze
    ? freeze.cards
    : round
      ? round.currentTrick
      : [];

  const trumpChoices: { label: string; mode: TrumpMode }[] = [
    { label: `${SUIT_SYMBOL.herz} Herz`, mode: { type: "suit", suit: "herz" } },
    { label: `${SUIT_SYMBOL.ecken} Ecken`, mode: { type: "suit", suit: "ecken" } },
    {
      label: `${SUIT_SYMBOL.schaufle} Schaufle`,
      mode: { type: "suit", suit: "schaufle" },
    },
    { label: `${SUIT_SYMBOL.kreuz} Kreuz`, mode: { type: "suit", suit: "kreuz" } },
    { label: "Obenabe", mode: { type: "obenabe" } },
    { label: "Undenufe", mode: { type: "undenufe" } },
  ];

  const humanHand = round
    ? round.hands[HUMAN]
    : pendingHands
      ? pendingHands[HUMAN]
      : [];
  const interactive =
    phase === "play" && round?.toMove === HUMAN && !freeze;

  return (
    <div className="app">
      <div className="topbar">
        <div className="title">Trumpf · Schieber-Jass</div>
        <div className="scoreboard">
          <div className="score">
            Du + Partner <b>{match.scores[0]}</b>
          </div>
          <div className="score">
            Gegner <b>{match.scores[1]}</b>
          </div>
        </div>
        {round && phase === "play" ? (
          <div className="trumpBadge">{trumpLabel(round.trump)}</div>
        ) : (
          <div className="trumpBadge">Ziel {TARGET}</div>
        )}
      </div>

      <div className="table">
        {SEAT_CLASS.map((cls, seat) => {
          const active =
            !!round && phase === "play" && !freeze && round.toMove === seat;
          const deciding = phase === "trump" && trumpDecider === seat;
          return (
            <div
              key={seat}
              className={`seat ${cls} ${active || deciding ? "active" : ""}`}
            >
              <div className="name">
                {SEAT_NAMES[seat]}
                {seat === leader && phase !== "matchEnd" ? " (Vorhand)" : ""}
              </div>
              {seat !== HUMAN && round && (
                <div className="backrow">
                  {round.hands[seat].map((_, i) => (
                    <CardBack key={i} width={26} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="center">
          {centerCards.map((pc) => {
            const slot = ["s", "e", "n", "w"][pc.player];
            return (
              <div key={pc.player} className={`slot ${slot}`}>
                <PlayingCard card={pc.card} width={48} />
              </div>
            );
          })}
        </div>

        {/* Trumpfwahl / Schieben */}
        {phase === "trump" && trumpDecider === HUMAN && (
          <div className="overlay">
            <div className="panel">
              <h2>Trumpf ansagen{schoben ? " (geschoben)" : ""}</h2>
              <p>
                {trumpDecider === leader
                  ? "Du bist Vorhand."
                  : "Dein Partner hat zu dir geschoben – jetzt sagst du an."}
              </p>
              <div className="trumpGrid">
                {trumpChoices.map((t) => (
                  <button
                    key={t.label}
                    className="btn"
                    onClick={() => onChooseTrump(t.mode)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {trumpDecider === leader && !schoben && (
                <button
                  className="btn ghost schiebenBtn"
                  onClick={onSchieben}
                >
                  ⟶ Schieben (Partner sagt an)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Rundenergebnis */}
        {phase === "roundEnd" && result && (
          <div className="overlay">
            <div className="panel">
              <h2>Runde fertig</h2>
              <p>
                Stich-Punkte: <b>Du+Partner {result.pointsByTeam[0]}</b> · Gegner{" "}
                {result.pointsByTeam[1]}
              </p>
              {result.match !== null && (
                <p>
                  🎉 Match! +100 für{" "}
                  {result.match === 0 ? "Du+Partner" : "Gegner"}
                </p>
              )}
              <p>
                Total: Du+Partner <b>{match.scores[0]}</b> · Gegner{" "}
                <b>{match.scores[1]}</b> (Ziel {TARGET})
              </p>
              <button
                className="btn"
                onClick={() => dealNewRound((leader + 1) % 4)}
              >
                Nächste Runde
              </button>
            </div>
          </div>
        )}

        {/* Matchende */}
        {phase === "matchEnd" && (
          <div className="overlay">
            <div className="panel">
              <h2>
                {match.winner === 0 ? "🏆 Ihr habt gewonnen!" : "Gegner gewinnt"}
              </h2>
              <p>
                Endstand: Du+Partner <b>{match.scores[0]}</b> · Gegner{" "}
                <b>{match.scores[1]}</b>
              </p>
              <button
                className="btn"
                onClick={() => {
                  setMatch(startMatch({ target: TARGET }));
                  dealNewRound(HUMAN);
                }}
              >
                Neues Spiel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="hint">{hint || " "}</div>
      <div className="hand">
        {humanHand.map((card) => {
          const playable = isLegal(card);
          return (
            <button
              key={`${card.suit}-${card.rank}`}
              className={`handcard ${
                interactive ? (playable ? "playable" : "dim") : ""
              }`}
              onClick={() => onHumanPlay(card)}
              disabled={!interactive}
            >
              <PlayingCard
                card={card}
                width={62}
                highlight={interactive && playable}
              />
            </button>
          );
        })}
      </div>

      <div className="footer">
        Partner sitzt gegenüber (Norden). Engine:{" "}
        <a href="https://github.com/Zenovs/trumpf">github.com/Zenovs/trumpf</a>
      </div>
    </div>
  );
}
