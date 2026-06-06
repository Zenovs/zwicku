// Grundtypen für den Schieber-Jass (französische Karten).

/** Die vier Farben (Walliser/Schweizer Bezeichnung der französischen Karten). */
export type Suit = "herz" | "ecken" | "schaufle" | "kreuz";

/**
 * Die neun Ränge. "bauer" = Buur (im Trumpf die stärkste Karte, 20 Punkte),
 * "9" = Nell (im Trumpf 14 Punkte).
 */
export type Rank =
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "bauer"
  | "dame"
  | "koenig"
  | "ass";

export interface Card {
  suit: Suit;
  rank: Rank;
}

/**
 * Trumpf-Modus einer Runde. Vier Farben + Obenabe (kein Trumpf, oben ist hoch)
 * + Undenufe (kein Trumpf, das 6er ist hoch).
 */
export type TrumpMode =
  | { type: "suit"; suit: Suit }
  | { type: "obenabe" }
  | { type: "undenufe" };

/** Eine im Stich liegende Karte zusammen mit dem Spieler, der sie gelegt hat. */
export interface PlayedCard {
  /** Spielerindex 0–3. Sitzordnung: 0 & 2 sind ein Team, 1 & 3 das andere. */
  player: number;
  card: Card;
}

export const SUITS: Suit[] = ["herz", "ecken", "schaufle", "kreuz"];
export const RANKS: Rank[] = [
  "6",
  "7",
  "8",
  "9",
  "10",
  "bauer",
  "dame",
  "koenig",
  "ass",
];

/** Kartenpunkte pro Runde ohne den Bonus für den letzten Stich. */
export const CARD_POINTS_TOTAL = 152;
/** Bonus für den letzten Stich. */
export const LAST_TRICK_BONUS = 5;
/** Gesamtpunkte einer normalen Runde (152 + 5). */
export const ROUND_TOTAL = CARD_POINTS_TOTAL + LAST_TRICK_BONUS; // 157
/** Zusatzbonus, wenn ein Team alle neun Stiche macht (Match / Matsch). */
export const MATCH_BONUS = 100;
