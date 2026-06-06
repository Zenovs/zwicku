import { TrumpMode } from "./types";
import { RoundResult } from "./game";

/**
 * Multiplikator je Trumpf-Ansage. Der Faktor ist regional eine Hausregel
 * (z. B. Obenabe/Undenufe höher gewichtet). Default ist überall 1; eine
 * konkrete Walliser Tabelle kann hier injiziert werden.
 */
export type Multiplier = (trump: TrumpMode) => number;

const NO_MULTIPLIER: Multiplier = () => 1;

export interface MatchConfig {
  /** Zielpunktzahl, ab der ein Team gewinnt (z. B. 1000 oder 2500). */
  target: number;
  /** Optionaler Trumpf-Faktor. Standard: überall 1. */
  multiplier?: Multiplier;
}

export interface MatchState {
  config: Required<MatchConfig>;
  /** Laufende Punkte je Team. */
  scores: [number, number];
  /** Bisher gespielte Runden (für Verlauf/Anzeige). */
  rounds: Array<{ trump: TrumpMode; result: RoundResult; factor: number }>;
  finished: boolean;
  /** Gewinnerteam, sobald das Ziel erreicht ist, sonst null. */
  winner: 0 | 1 | null;
}

/** Initialisiert einen Match (Spiel über mehrere Runden bis zum Ziel). */
export function startMatch(config: MatchConfig): MatchState {
  if (config.target <= 0) {
    throw new Error("target muss positiv sein.");
  }
  return {
    config: { target: config.target, multiplier: config.multiplier ?? NO_MULTIPLIER },
    scores: [0, 0],
    rounds: [],
    finished: false,
    winner: null,
  };
}

/**
 * Verrechnet eine ausgewertete Runde. Die Teampunkte werden mit dem
 * Trumpf-Faktor multipliziert und addiert. Erreicht oder übertrifft ein Team
 * das Ziel, ist der Match beendet; bei Gleichstand am Ziel gewinnt das Team
 * mit den mehr Punkten (bei exaktem Gleichstand: kein Gewinner, weiterspielen).
 */
export function applyRound(
  match: MatchState,
  trump: TrumpMode,
  result: RoundResult,
): MatchState {
  if (match.finished) {
    throw new Error("Der Match ist bereits entschieden.");
  }
  const factor = match.config.multiplier(trump);
  const scores: [number, number] = [
    match.scores[0] + result.pointsByTeam[0] * factor,
    match.scores[1] + result.pointsByTeam[1] * factor,
  ];

  const reached0 = scores[0] >= match.config.target;
  const reached1 = scores[1] >= match.config.target;

  let finished = false;
  let winner: 0 | 1 | null = null;
  if (reached0 || reached1) {
    if (scores[0] > scores[1]) {
      winner = 0;
      finished = true;
    } else if (scores[1] > scores[0]) {
      winner = 1;
      finished = true;
    }
    // Exakter Gleichstand am Ziel: unentschieden -> weiterspielen.
  }

  return {
    ...match,
    scores,
    rounds: [...match.rounds, { trump, result, factor }],
    finished,
    winner,
  };
}
