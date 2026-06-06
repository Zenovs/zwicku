import { describe, it, expect } from "vitest";
import { legalMoves, Card, PlayedCard, TrumpMode } from "../src";

const trump: TrumpMode = { type: "suit", suit: "herz" };

describe("legalMoves", () => {
  it("leerer Stich: alle Karten erlaubt", () => {
    const hand: Card[] = [
      { suit: "ecken", rank: "ass" },
      { suit: "herz", rank: "6" },
    ];
    expect(legalMoves(hand, [], trump)).toHaveLength(2);
  });

  it("muss angespielte Farbe bedienen", () => {
    const hand: Card[] = [
      { suit: "ecken", rank: "7" },
      { suit: "ecken", rank: "koenig" },
      { suit: "schaufle", rank: "ass" },
    ];
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "ecken", rank: "10" } },
    ];
    const legal = legalMoves(hand, trick, trump);
    expect(legal.every((c) => c.suit === "ecken")).toBe(true);
    expect(legal).toHaveLength(2);
  });

  it("Trumpfzwang: bei angespieltem Trumpf muss Trumpf gespielt werden", () => {
    const hand: Card[] = [
      { suit: "herz", rank: "ass" },
      { suit: "herz", rank: "10" },
      { suit: "ecken", rank: "ass" },
    ];
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "herz", rank: "6" } },
    ];
    const legal = legalMoves(hand, trick, trump);
    expect(legal.every((c) => c.suit === "herz")).toBe(true);
    expect(legal).toHaveLength(2);
  });

  it("Buur-Ausnahme: ist der Buur der einzige Trumpf, darf frei gewählt werden", () => {
    const hand: Card[] = [
      { suit: "herz", rank: "bauer" }, // einziger Trumpf
      { suit: "ecken", rank: "ass" },
      { suit: "schaufle", rank: "7" },
    ];
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "herz", rank: "koenig" } },
    ];
    expect(legalMoves(hand, trick, trump)).toHaveLength(3);
  });

  it("kann angespielte Farbe nicht bedienen: freie Wahl (trumpfen oder abwerfen)", () => {
    const hand: Card[] = [
      { suit: "herz", rank: "6" }, // Trumpf
      { suit: "schaufle", rank: "ass" }, // abwerfen
    ];
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "ecken", rank: "10" } },
    ];
    expect(legalMoves(hand, trick, trump)).toHaveLength(2);
  });
});
