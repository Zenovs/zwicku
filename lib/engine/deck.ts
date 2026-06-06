import { Card, CARDS_PER_PLAYER, RANKS, SUITS } from "./types";

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

export interface Deal {
  /** Hände in Spielerreihenfolge, je drei Karten. */
  hands: Card[][];
  /** Aufgedeckte oberste Karte = Trumpf. */
  trumpCard: Card;
  /** Restlicher Stapel (für späteres Opinier-Nachziehen). */
  stock: Card[];
}

/**
 * Teilt für Zwicku aus: jeder Spieler drei Karten, danach wird die nächste
 * Karte als Trumpf aufgedeckt. Der Rest bleibt als Stapel liegen.
 */
export function dealZwicku(deck: Card[], players: number): Deal {
  const need = players * CARDS_PER_PLAYER + 1;
  if (deck.length < need) {
    throw new Error(
      `Deck zu klein: braucht ${need} Karten für ${players} Spieler, hat ${deck.length}.`,
    );
  }
  const hands: Card[][] = Array.from({ length: players }, () => []);
  let i = 0;
  for (let c = 0; c < CARDS_PER_PLAYER; c++) {
    for (let p = 0; p < players; p++) {
      hands[p].push(deck[i++]);
    }
  }
  const trumpCard = deck[i++];
  const stock = deck.slice(i);
  return { hands, trumpCard, stock };
}
