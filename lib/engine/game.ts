import {
  Card,
  LAST_TRICK_BONUS,
  MATCH_BONUS,
  PlayedCard,
  TrumpMode,
} from "./types";
import { isLegalMove } from "./rules";
import { trickWinner } from "./trick";
import { trickValue } from "./scoring";

/** Anzahl Spieler bzw. Karten pro Stich. */
const PLAYERS = 4;
/** Stiche pro Runde (36 Karten / 4 Spieler). */
const TRICKS_PER_ROUND = 9;

/** Ein abgeschlossener Stich mit Gewinner und Kartenpunkten (ohne Boni). */
export interface CompletedTrick {
  cards: PlayedCard[];
  winner: number;
  points: number;
}

/**
 * Vollständiger, unveränderlicher Spielzustand einer Runde. Jeder Zug erzeugt
 * über playCard einen neuen Zustand (kein In-Place-Mutieren).
 */
export interface GameState {
  trump: TrumpMode;
  /** Restliche Karten je Spieler (Index 0–3). */
  hands: Card[][];
  /** Karten des laufenden, noch unvollständigen Stichs. */
  currentTrick: PlayedCard[];
  /** Bereits abgeschlossene Stiche in Spielreihenfolge. */
  completedTricks: CompletedTrick[];
  /** Spieler, der als Nächstes legen muss. */
  toMove: number;
  /** Spieler, der den laufenden Stich angespielt hat (Vorhand des Stichs). */
  leader: number;
  /** True, sobald alle neun Stiche gespielt sind. */
  finished: boolean;
}

/** Team-Index (0 oder 1) eines Spielers. 0 & 2 -> Team 0, 1 & 3 -> Team 1. */
export function teamOf(player: number): 0 | 1 {
  return (player % 2) as 0 | 1;
}

/**
 * Startet eine Runde. `hands` muss vier Hände à neun Karten enthalten,
 * `firstLeader` ist die Vorhand (Spieler, der die erste Karte legt).
 */
export function startRound(
  hands: [Card[], Card[], Card[], Card[]],
  trump: TrumpMode,
  firstLeader = 0,
): GameState {
  if (hands.length !== PLAYERS) {
    throw new Error(`Es braucht genau ${PLAYERS} Hände.`);
  }
  for (const hand of hands) {
    if (hand.length !== TRICKS_PER_ROUND) {
      throw new Error(
        `Jede Hand muss ${TRICKS_PER_ROUND} Karten haben (gefunden: ${hand.length}).`,
      );
    }
  }
  if (firstLeader < 0 || firstLeader >= PLAYERS) {
    throw new Error(`firstLeader muss 0–${PLAYERS - 1} sein.`);
  }
  return {
    trump,
    hands: hands.map((h) => h.slice()),
    currentTrick: [],
    completedTricks: [],
    toMove: firstLeader,
    leader: firstLeader,
    finished: false,
  };
}

function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/**
 * Spielt eine Karte. Gibt einen neuen GameState zurück. Wirft, wenn der Zug
 * unzulässig ist (falscher Spieler, Karte nicht in der Hand, Regelverstoss).
 *
 * Sobald der vierte Spieler gelegt hat, wird der Stich aufgelöst: Gewinner
 * ermitteln, Punkte zählen, Gewinner führt den nächsten Stich an.
 */
export function playCard(
  state: GameState,
  player: number,
  card: Card,
): GameState {
  if (state.finished) {
    throw new Error("Die Runde ist bereits beendet.");
  }
  if (player !== state.toMove) {
    throw new Error(
      `Spieler ${player} ist nicht am Zug (erwartet: ${state.toMove}).`,
    );
  }
  const hand = state.hands[player];
  if (!hand.some((c) => sameCard(c, card))) {
    throw new Error(`Spieler ${player} hat diese Karte nicht auf der Hand.`);
  }
  if (!isLegalMove(card, hand, state.currentTrick, state.trump)) {
    throw new Error("Dieser Zug verletzt die Bedien-/Trumpfregeln.");
  }

  const hands = state.hands.map((h, i) =>
    i === player ? h.filter((c) => !sameCard(c, card)) : h.slice(),
  );
  const currentTrick = [...state.currentTrick, { player, card }];

  // Stich noch nicht voll: nächster Spieler im Uhrzeigersinn.
  if (currentTrick.length < PLAYERS) {
    return {
      ...state,
      hands,
      currentTrick,
      toMove: (player + 1) % PLAYERS,
    };
  }

  // Stich voll: auflösen.
  const winner = trickWinner(currentTrick, state.trump);
  const completed: CompletedTrick = {
    cards: currentTrick,
    winner,
    points: trickValue(currentTrick, state.trump),
  };
  const completedTricks = [...state.completedTricks, completed];
  const finished = completedTricks.length === TRICKS_PER_ROUND;

  return {
    ...state,
    hands,
    currentTrick: [],
    completedTricks,
    toMove: winner,
    leader: winner,
    finished,
  };
}

/** Ergebnis einer abgeschlossenen Runde. */
export interface RoundResult {
  /** Kartenpunkte + letzter-Stich-Bonus je Spieler. */
  pointsByPlayer: [number, number, number, number];
  /** Punkte je Team (inkl. Boni). Index 0 -> Team 0, Index 1 -> Team 1. */
  pointsByTeam: [number, number];
  /** Gewonnene Stiche je Team. */
  tricksByTeam: [number, number];
  /** Team, das alle neun Stiche machte (Match), sonst null. */
  match: 0 | 1 | null;
}

/**
 * Wertet eine beendete Runde aus: Kartenpunkte je Stich an das Team des
 * Gewinners, +5 für den letzten Stich, +100 falls ein Team alle Stiche macht.
 * Die Summe der Teampunkte beträgt 157 (bzw. 257 bei Match).
 */
export function scoreRound(state: GameState): RoundResult {
  if (!state.finished) {
    throw new Error("Runde ist noch nicht beendet.");
  }

  const pointsByPlayer: [number, number, number, number] = [0, 0, 0, 0];
  const tricksByTeam: [number, number] = [0, 0];

  state.completedTricks.forEach((trick, index) => {
    const isLast = index === state.completedTricks.length - 1;
    const bonus = isLast ? LAST_TRICK_BONUS : 0;
    pointsByPlayer[trick.winner] += trick.points + bonus;
    tricksByTeam[teamOf(trick.winner)] += 1;
  });

  const pointsByTeam: [number, number] = [
    pointsByPlayer[0] + pointsByPlayer[2],
    pointsByPlayer[1] + pointsByPlayer[3],
  ];

  let match: 0 | 1 | null = null;
  if (tricksByTeam[0] === TRICKS_PER_ROUND) {
    match = 0;
    pointsByTeam[0] += MATCH_BONUS;
  } else if (tricksByTeam[1] === TRICKS_PER_ROUND) {
    match = 1;
    pointsByTeam[1] += MATCH_BONUS;
  }

  return { pointsByPlayer, pointsByTeam, tricksByTeam, match };
}
