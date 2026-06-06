import { PlayedCard, RANK_ORDER, Suit } from "./types";

/**
 * Gewinner eines (Teil-)Stichs. Trumpf schlägt alles; sonst gewinnt die höchste
 * Karte der angespielten Lei. Rangfolge Ass hoch → 6 tief.
 */
export function trickWinner(cards: PlayedCard[], trump: Suit): number {
  if (cards.length === 0) {
    throw new Error("Ein leerer Stich hat keinen Gewinner.");
  }
  const led = cards[0].card.suit;
  const trumps = cards.filter((pc) => pc.card.suit === trump);
  const pool = trumps.length > 0 ? trumps : cards.filter((pc) => pc.card.suit === led);

  let winner = pool[0];
  for (const pc of pool) {
    if (RANK_ORDER[pc.card.rank] > RANK_ORDER[winner.card.rank]) {
      winner = pc;
    }
  }
  return winner.player;
}
