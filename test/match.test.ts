import { describe, it, expect } from "vitest";
import { startMatch, applyRound, RoundResult, TrumpMode } from "../lib/engine";

const trump: TrumpMode = { type: "suit", suit: "herz" };

function roundResult(team0: number, team1: number): RoundResult {
  return {
    pointsByPlayer: [team0, team1, 0, 0],
    pointsByTeam: [team0, team1],
    tricksByTeam: [5, 4],
    match: null,
  };
}

describe("Match", () => {
  it("addiert Teampunkte über mehrere Runden", () => {
    let m = startMatch({ target: 1000 });
    m = applyRound(m, trump, roundResult(100, 57));
    m = applyRound(m, trump, roundResult(80, 77));
    expect(m.scores).toEqual([180, 134]);
    expect(m.finished).toBe(false);
    expect(m.rounds).toHaveLength(2);
  });

  it("endet, sobald ein Team das Ziel erreicht", () => {
    let m = startMatch({ target: 200 });
    m = applyRound(m, trump, roundResult(157, 0));
    expect(m.finished).toBe(false);
    m = applyRound(m, trump, roundResult(100, 20));
    expect(m.finished).toBe(true);
    expect(m.winner).toBe(0);
  });

  it("wendet einen Trumpf-Faktor an", () => {
    const multiplier = (t: TrumpMode) => (t.type === "obenabe" ? 3 : 1);
    let m = startMatch({ target: 1000, multiplier });
    m = applyRound(m, { type: "obenabe" }, roundResult(100, 57));
    expect(m.scores).toEqual([300, 171]);
  });

  it("lehnt eine Runde nach Match-Ende ab", () => {
    let m = startMatch({ target: 100 });
    m = applyRound(m, trump, roundResult(157, 0));
    expect(m.finished).toBe(true);
    expect(() => applyRound(m, trump, roundResult(10, 10))).toThrow();
  });
});
