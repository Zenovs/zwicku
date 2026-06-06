import { describe, it, expect } from "vitest";
import {
  createDeck,
  dealZwicku,
  legalMoves,
  isLegalMove,
  trickWinner,
  settle,
  Card,
  PlayedCard,
  Suit,
} from "../lib/engine";

const trump: Suit = "herz";

describe("Deck & Geben", () => {
  it("36 eindeutige Karten", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(36);
    expect(new Set(deck.map((c) => `${c.suit}-${c.rank}`)).size).toBe(36);
  });

  it("gibt je 3 Karten und deckt einen Trumpf auf", () => {
    const { hands, trumpCard, stock } = dealZwicku(createDeck(), 3);
    expect(hands).toHaveLength(3);
    for (const h of hands) expect(h).toHaveLength(3);
    expect(trumpCard).toBeTruthy();
    // 3 Spieler * 3 + 1 Trumpf = 10 verbraucht, 26 im Stapel.
    expect(stock).toHaveLength(26);
  });
});

describe("trickWinner", () => {
  it("Trumpf schlägt die angespielte Lei", () => {
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "ecken", rank: "ass" } },
      { player: 1, card: { suit: "herz", rank: "6" } },
      { player: 2, card: { suit: "ecken", rank: "koenig" } },
    ];
    expect(trickWinner(trick, trump)).toBe(1);
  });

  it("ohne Trumpf gewinnt höchste Karte der Lei (Ass hoch)", () => {
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "ecken", rank: "koenig" } },
      { player: 1, card: { suit: "ecken", rank: "ass" } },
      { player: 2, card: { suit: "schaufle", rank: "ass" } },
    ];
    expect(trickWinner(trick, trump)).toBe(1);
  });

  it("höchster Trumpf gewinnt", () => {
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "herz", rank: "koenig" } },
      { player: 1, card: { suit: "herz", rank: "ass" } },
      { player: 2, card: { suit: "herz", rank: "10" } },
    ];
    expect(trickWinner(trick, trump)).toBe(1);
  });
});

describe("legalMoves – bedienen (Lei → Trumpf → abwerfen)", () => {
  it("muss angespielte Lei bedienen", () => {
    const hand: Card[] = [
      { suit: "ecken", rank: "7" },
      { suit: "herz", rank: "ass" },
      { suit: "schaufle", rank: "ass" },
    ];
    const trick: PlayedCard[] = [{ player: 0, card: { suit: "ecken", rank: "10" } }];
    const legal = legalMoves(hand, trick, trump);
    expect(legal).toEqual([{ suit: "ecken", rank: "7" }]);
  });

  it("ohne Lei muss Trumpf gespielt werden", () => {
    const hand: Card[] = [
      { suit: "herz", rank: "6" },
      { suit: "schaufle", rank: "ass" },
    ];
    const trick: PlayedCard[] = [{ player: 0, card: { suit: "ecken", rank: "10" } }];
    expect(legalMoves(hand, trick, trump)).toEqual([{ suit: "herz", rank: "6" }]);
  });

  it("ohne Lei und ohne Trumpf: freie Wahl (abwerfen)", () => {
    const hand: Card[] = [
      { suit: "schaufle", rank: "ass" },
      { suit: "kreuz", rank: "7" },
    ];
    const trick: PlayedCard[] = [{ player: 0, card: { suit: "ecken", rank: "10" } }];
    expect(legalMoves(hand, trick, trump)).toHaveLength(2);
  });
});

describe("legalMoves – anspielen", () => {
  it("erster Stich: Trumpf-Ass muss angespielt werden", () => {
    const hand: Card[] = [
      { suit: "herz", rank: "ass" },
      { suit: "ecken", rank: "koenig" },
      { suit: "schaufle", rank: "10" },
    ];
    const legal = legalMoves(hand, [], trump, { forceTrumpAce: true });
    expect(legal).toEqual([{ suit: "herz", rank: "ass" }]);
  });

  it("Gewinner des 1. Stichs muss Trumpf anspielen, falls möglich", () => {
    const hand: Card[] = [
      { suit: "herz", rank: "8" },
      { suit: "herz", rank: "dame" },
      { suit: "kreuz", rank: "ass" },
    ];
    const legal = legalMoves(hand, [], trump, { forceTrumpLead: true });
    expect(legal.every((c) => c.suit === "herz")).toBe(true);
    expect(legal).toHaveLength(2);
  });

  it("ohne Trumpf trotz forceTrumpLead: freie Wahl", () => {
    const hand: Card[] = [
      { suit: "ecken", rank: "8" },
      { suit: "kreuz", rank: "ass" },
    ];
    expect(legalMoves(hand, [], trump, { forceTrumpLead: true })).toHaveLength(2);
  });

  it("isLegalMove respektiert die Zwänge", () => {
    const hand: Card[] = [
      { suit: "herz", rank: "ass" },
      { suit: "ecken", rank: "koenig" },
    ];
    expect(
      isLegalMove({ suit: "ecken", rank: "koenig" }, hand, [], trump, {
        forceTrumpAce: true,
      }),
    ).toBe(false);
  });
});

describe("settle – Abrechnung", () => {
  it("3 Spieler, je 1 Stich: Pot geht gedrittelt auf", () => {
    const r = settle(
      { pot: 90, dealer: 0, comers: [0, 1, 2], tricksByPlayer: [1, 1, 1] },
      3,
    );
    expect(r.payouts).toEqual([30, 30, 30]);
    expect(r.newPot).toBe(0);
    expect(r.gehtAuf).toBe(true);
  });

  it("ein Spieler macht alle 3 Stiche: ganzer Pot", () => {
    const r = settle(
      { pot: 90, dealer: 0, comers: [0, 1, 2], tricksByPlayer: [3, 0, 0] },
      3,
    );
    expect(r.payouts[0]).toBe(90);
    // Mitgekommene ohne Stich (1,2) zahlen je den Pot ein.
    expect(r.penalties[1]).toBe(90);
    expect(r.penalties[2]).toBe(90);
    expect(r.newPot).toBe(180);
    expect(r.gehtAuf).toBe(false);
  });

  it("Austeiler ohne Stich zahlt doppelt (zwack ab)", () => {
    const r = settle(
      { pot: 60, dealer: 0, comers: [0, 1], tricksByPlayer: [0, 3] },
      3,
    );
    expect(r.payouts[1]).toBe(60);
    expect(r.penalties[0]).toBe(120); // doppelter Pot
    expect(r.newPot).toBe(120);
    expect(r.gehtAuf).toBe(false);
  });
});
