import { describe, it, expect } from "vitest";
import { trickWinner, PlayedCard, TrumpMode } from "../src";

describe("trickWinner (Trumpf-Farbe)", () => {
  const trump: TrumpMode = { type: "suit", suit: "herz" };

  it("Trumpf schlägt die angespielte Farbe", () => {
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "ecken", rank: "ass" } }, // angespielt
      { player: 1, card: { suit: "herz", rank: "6" } }, // tiefster Trumpf
      { player: 2, card: { suit: "ecken", rank: "koenig" } },
      { player: 3, card: { suit: "ecken", rank: "10" } },
    ];
    expect(trickWinner(trick, trump)).toBe(1);
  });

  it("Buur ist der stärkste Trumpf", () => {
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "herz", rank: "ass" } },
      { player: 1, card: { suit: "herz", rank: "9" } }, // Nell
      { player: 2, card: { suit: "herz", rank: "bauer" } }, // Buur
      { player: 3, card: { suit: "herz", rank: "koenig" } },
    ];
    expect(trickWinner(trick, trump)).toBe(2);
  });

  it("ohne Trumpf gewinnt die höchste Karte der angespielten Farbe", () => {
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "ecken", rank: "koenig" } },
      { player: 1, card: { suit: "ecken", rank: "ass" } },
      { player: 2, card: { suit: "schaufle", rank: "ass" } }, // andere Farbe
      { player: 3, card: { suit: "ecken", rank: "10" } },
    ];
    expect(trickWinner(trick, trump)).toBe(1);
  });
});

describe("trickWinner (Obenabe / Undenufe)", () => {
  it("Obenabe: Ass der angespielten Farbe gewinnt", () => {
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "kreuz", rank: "10" } },
      { player: 1, card: { suit: "kreuz", rank: "ass" } },
      { player: 2, card: { suit: "kreuz", rank: "koenig" } },
      { player: 3, card: { suit: "herz", rank: "ass" } }, // andere Farbe
    ];
    expect(trickWinner(trick, { type: "obenabe" })).toBe(1);
  });

  it("Undenufe: 6 der angespielten Farbe gewinnt", () => {
    const trick: PlayedCard[] = [
      { player: 0, card: { suit: "kreuz", rank: "ass" } },
      { player: 1, card: { suit: "kreuz", rank: "6" } },
      { player: 2, card: { suit: "kreuz", rank: "7" } },
      { player: 3, card: { suit: "kreuz", rank: "koenig" } },
    ];
    expect(trickWinner(trick, { type: "undenufe" })).toBe(1);
  });
});
