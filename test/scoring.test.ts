import { describe, it, expect } from "vitest";
import {
  createDeck,
  deal,
  shuffle,
  cardValue,
  CARD_POINTS_TOTAL,
  TrumpMode,
} from "../src";

describe("Deck", () => {
  it("hat genau 36 eindeutige Karten", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(36);
    const keys = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(36);
  });

  it("teilt 4 Hände à 9 Karten aus", () => {
    const hands = deal(createDeck());
    expect(hands).toHaveLength(4);
    for (const hand of hands) expect(hand).toHaveLength(9);
  });

  it("verliert beim Mischen keine Karten", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck, mulberry32(42));
    expect(shuffled).toHaveLength(36);
    const keys = new Set(shuffled.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(36);
  });
});

describe("Kartenwerte: Gesamtsumme pro Modus = 152", () => {
  const modes: TrumpMode[] = [
    { type: "suit", suit: "herz" },
    { type: "obenabe" },
    { type: "undenufe" },
  ];

  for (const mode of modes) {
    it(`Summe stimmt für ${mode.type === "suit" ? mode.suit : mode.type}`, () => {
      const total = createDeck().reduce(
        (sum, c) => sum + cardValue(c, mode),
        0,
      );
      expect(total).toBe(CARD_POINTS_TOTAL);
    });
  }
});

describe("Kartenwerte: einzelne Schlüsselkarten", () => {
  const trump: TrumpMode = { type: "suit", suit: "herz" };

  it("Buur im Trumpf = 20", () => {
    expect(cardValue({ suit: "herz", rank: "bauer" }, trump)).toBe(20);
  });
  it("Nell im Trumpf = 14", () => {
    expect(cardValue({ suit: "herz", rank: "9" }, trump)).toBe(14);
  });
  it("Bauer ausserhalb Trumpf = 2", () => {
    expect(cardValue({ suit: "ecken", rank: "bauer" }, trump)).toBe(2);
  });
  it("8er bei Obenabe = 8", () => {
    expect(cardValue({ suit: "ecken", rank: "8" }, { type: "obenabe" })).toBe(8);
  });
  it("6er bei Undenufe = 11", () => {
    expect(cardValue({ suit: "ecken", rank: "6" }, { type: "undenufe" })).toBe(
      11,
    );
  });
});

// Deterministischer PRNG für reproduzierbare Tests.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
