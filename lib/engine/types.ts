// Grundtypen für Zwicku (Walliser Einsatz-Stichspiel, französische Karten).

export type Suit = "herz" | "ecken" | "schaufle" | "kreuz";

/** Neun Ränge. Rangfolge Ass (hoch) → 6 (tief). */
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

/** Eine gelegte Karte mit dem Spieler, der sie gelegt hat. */
export interface PlayedCard {
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

/** Stärke innerhalb einer Farbe: Ass hoch, 6 tief (höhere Zahl = stärker). */
export const RANK_ORDER: Record<Rank, number> = {
  ass: 9,
  koenig: 8,
  dame: 7,
  bauer: 6,
  "10": 5,
  "9": 4,
  "8": 3,
  "7": 2,
  "6": 1,
};

/** Karten pro Spieler bzw. Stiche pro Runde. */
export const CARDS_PER_PLAYER = 3;
/** Pflicht-Einsatz des Austeilers zu Beginn einer frischen Runde (in Rappen). */
export const ANTE = 30;
