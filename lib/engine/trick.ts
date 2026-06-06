import { Card, PlayedCard, Rank, Suit, TrumpMode } from "./types";

// Stärke-Reihenfolgen innerhalb einer Farbe (höhere Zahl = stärker).

/** Trumpf-Farbe: Buur > Nell > Ass > König > Dame > 10 > 8 > 7 > 6. */
const TRUMP_ORDER: Record<Rank, number> = {
  bauer: 9,
  "9": 8,
  ass: 7,
  koenig: 6,
  dame: 5,
  "10": 4,
  "8": 3,
  "7": 2,
  "6": 1,
};

/** Normal / Obenabe: Ass > König > Dame > Bauer > 10 > 9 > 8 > 7 > 6. */
const HIGH_ORDER: Record<Rank, number> = {
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

/** Undenufe: 6 > 7 > 8 > 9 > 10 > Bauer > Dame > König > Ass. */
const LOW_ORDER: Record<Rank, number> = {
  "6": 9,
  "7": 8,
  "8": 7,
  "9": 6,
  "10": 5,
  bauer: 4,
  dame: 3,
  koenig: 2,
  ass: 1,
};

function isTrump(card: Card, trump: TrumpMode): boolean {
  return trump.type === "suit" && card.suit === trump.suit;
}

/**
 * Ermittelt den Gewinner eines vollständig (oder teilweise) gelegten Stichs.
 * Gibt den Spielerindex der gewinnenden Karte zurück.
 *
 * Die zuerst gelegte Karte bestimmt die angespielte Farbe.
 */
export function trickWinner(cards: PlayedCard[], trump: TrumpMode): number {
  if (cards.length === 0) {
    throw new Error("Ein leerer Stich hat keinen Gewinner.");
  }
  const ledSuit: Suit = cards[0].card.suit;

  if (trump.type === "suit") {
    const trumps = cards.filter((pc) => isTrump(pc.card, trump));
    if (trumps.length > 0) {
      return best(trumps, (c) => TRUMP_ORDER[c.rank]);
    }
    const followers = cards.filter((pc) => pc.card.suit === ledSuit);
    return best(followers, (c) => HIGH_ORDER[c.rank]);
  }

  const followers = cards.filter((pc) => pc.card.suit === ledSuit);
  const order = trump.type === "undenufe" ? LOW_ORDER : HIGH_ORDER;
  return best(followers, (c) => order[c.rank]);
}

/** Liefert den player-Index der stärksten Karte gemäss Bewertungsfunktion. */
function best(cards: PlayedCard[], strength: (c: Card) => number): number {
  let winner = cards[0];
  for (const pc of cards) {
    if (strength(pc.card) > strength(winner.card)) {
      winner = pc;
    }
  }
  return winner.player;
}
