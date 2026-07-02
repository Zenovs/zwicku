// Persistierte Zwicku-Statistik (nur für den menschlichen Spieler).

export interface Stats {
  rounds: number;
  joined: number;
  passed: number;
  tricks: number;
  potsWon: number;
  net: number; // Gewinn/Verlust in Rappen
  bestPot: number; // grösster Einzelgewinn in Rappen
}

export const emptyStats: Stats = {
  rounds: 0,
  joined: 0,
  passed: 0,
  tricks: 0,
  potsWon: 0,
  net: 0,
  bestPot: 0,
};

const KEY = "zwicku.stats";

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyStats, ...(JSON.parse(raw) as Partial<Stats>) };
  } catch {
    /* egal */
  }
  return { ...emptyStats };
}

export function saveStats(s: Stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* egal */
  }
}

/** Eine gespielte Runde aus Sicht des Menschen verbuchen. */
export function recordRound(
  s: Stats,
  opts: { joined: boolean; tricks: number; payout: number; penalty: number },
): Stats {
  const net = opts.payout - opts.penalty;
  return {
    rounds: s.rounds + 1,
    joined: s.joined + (opts.joined ? 1 : 0),
    passed: s.passed + (opts.joined ? 0 : 1),
    tricks: s.tricks + opts.tricks,
    potsWon: s.potsWon + (opts.payout > 0 ? 1 : 0),
    net: s.net + net,
    bestPot: Math.max(s.bestPot, opts.payout),
  };
}
