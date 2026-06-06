import { describe, it, expect } from "vitest";
import {
  startRound,
  playCard,
  scoreRound,
  legalMoves,
  createDeck,
  deal,
  teamOf,
  GameState,
  CompletedTrick,
  Card,
  TrumpMode,
  ROUND_TOTAL,
  MATCH_BONUS,
} from "../lib/engine";

const trump: TrumpMode = { type: "suit", suit: "herz" };

/** Spielt eine ganze Runde durch, indem immer der erste erlaubte Zug gewählt wird. */
function playOutGreedily(state: GameState): GameState {
  let s = state;
  while (!s.finished) {
    const hand = s.hands[s.toMove];
    const move = legalMoves(hand, s.currentTrick, s.trump)[0];
    s = playCard(s, s.toMove, move);
  }
  return s;
}

describe("startRound", () => {
  it("verlangt vier Hände à neun Karten", () => {
    const ok = deal(createDeck());
    expect(() => startRound(ok, trump, 0)).not.toThrow();
    const bad = ok.map((h) => h.slice(0, 8)) as typeof ok;
    expect(() => startRound(bad, trump, 0)).toThrow();
  });
});

describe("playCard", () => {
  it("lehnt einen Zug des falschen Spielers ab", () => {
    const s = startRound(deal(createDeck()), trump, 0);
    expect(() => playCard(s, 1, s.hands[1][0])).toThrow();
  });

  it("erzwingt Bedienen (Farbe bekennen)", () => {
    const hands: [Card[], Card[], Card[], Card[]] = [
      Array.from({ length: 9 }, (_, i) => ({ suit: "ecken", rank: rankAt(i) })),
      [
        { suit: "ecken", rank: "ass" }, // muss Ecken bedienen
        { suit: "schaufle", rank: "ass" }, // unerlaubt, solange Ecken da ist
        ...Array.from({ length: 7 }, (_, i) => ({
          suit: "kreuz" as const,
          rank: rankAt(i),
        })),
      ],
      Array.from({ length: 9 }, (_, i) => ({ suit: "herz", rank: rankAt(i) })),
      Array.from({ length: 9 }, (_, i) => ({ suit: "schaufle", rank: rankAt(i) })),
    ];
    let s = startRound(hands, trump, 0);
    s = playCard(s, 0, { suit: "ecken", rank: "6" }); // Ecken angespielt
    expect(() =>
      playCard(s, 1, { suit: "schaufle", rank: "ass" }),
    ).toThrow();
    expect(() => playCard(s, 1, { suit: "ecken", rank: "ass" })).not.toThrow();
  });

  it("spielt eine vollständige Runde: 9 Stiche, Hände leer", () => {
    const end = playOutGreedily(startRound(deal(createDeck()), trump, 0));
    expect(end.finished).toBe(true);
    expect(end.completedTricks).toHaveLength(9);
    for (const hand of end.hands) expect(hand).toHaveLength(0);
  });
});

describe("scoreRound", () => {
  it("Teampunkte einer normalen Runde summieren zu 157", () => {
    const end = playOutGreedily(startRound(deal(createDeck()), trump, 0));
    const result = scoreRound(end);
    expect(result.pointsByTeam[0] + result.pointsByTeam[1]).toBe(ROUND_TOTAL);
    expect(result.tricksByTeam[0] + result.tricksByTeam[1]).toBe(9);
    expect(result.match).toBeNull();
  });

  it("vergibt den Match-Bonus, wenn ein Team alle Stiche macht", () => {
    // Konstruierter Endzustand: Spieler 0 (Team 0) gewinnt alle neun Stiche.
    const tricks: CompletedTrick[] = Array.from({ length: 9 }, (_, i) => ({
      cards: [{ player: 0, card: { suit: "herz", rank: rankAt(i) } }],
      winner: 0,
      points: i === 0 ? 16 : 17, // Summe = 16 + 8*17 = 152
    }));
    const state: GameState = {
      trump,
      hands: [[], [], [], []],
      currentTrick: [],
      completedTricks: tricks,
      toMove: 0,
      leader: 0,
      finished: true,
    };
    const result = scoreRound(state);
    expect(result.match).toBe(0);
    // 152 Kartenpunkte + 5 letzter Stich + 100 Match.
    expect(result.pointsByTeam[0]).toBe(152 + 5 + MATCH_BONUS);
    expect(result.pointsByTeam[1]).toBe(0);
    expect(result.tricksByTeam).toEqual([9, 0]);
  });

  it("wirft, wenn die Runde nicht beendet ist", () => {
    const s = startRound(deal(createDeck()), trump, 0);
    expect(() => scoreRound(s)).toThrow();
  });
});

describe("teamOf", () => {
  it("0 & 2 sind Team 0, 1 & 3 sind Team 1", () => {
    expect(teamOf(0)).toBe(0);
    expect(teamOf(2)).toBe(0);
    expect(teamOf(1)).toBe(1);
    expect(teamOf(3)).toBe(1);
  });
});

function rankAt(i: number) {
  return (["6", "7", "8", "9", "10", "bauer", "dame", "koenig", "ass"] as const)[
    i
  ];
}
