import { Card, RANKS, SUITS } from "./types";

/** Erzeugt ein vollständiges, geordnetes 36-Karten-Deck. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Mischt ein Deck (Fisher–Yates). Optional mit injizierbarer Zufallsquelle,
 * damit Tests deterministisch laufen können.
 */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Teilt ein 36-Karten-Deck auf vier Spieler auf (je 9 Karten).
 * Gibt vier Hände in Spielerreihenfolge zurück.
 */
export function deal(deck: Card[]): [Card[], Card[], Card[], Card[]] {
  if (deck.length !== 36) {
    throw new Error(`Deck muss 36 Karten haben, hat aber ${deck.length}.`);
  }
  const hands: Card[][] = [[], [], [], []];
  deck.forEach((card, index) => {
    hands[index % 4].push(card);
  });
  return hands as [Card[], Card[], Card[], Card[]];
}
