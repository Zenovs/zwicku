export interface SettleInput {
  /** Pot der Runde (in Rappen). */
  pot: number;
  /** Austeiler-Index (= der "Zwack"). */
  dealer: number;
  /** Spieler, die mitgekommen sind (inkl. Austeiler). */
  comers: number[];
  /** Gewonnene Stiche je Spieler (Länge = Spieleranzahl). */
  tricksByPlayer: number[];
}

export interface SettleResult {
  /** Auszahlung aus dem Pot je Spieler. */
  payouts: number[];
  /** Einzahlung (Strafe) in den neuen Pot je Spieler. */
  penalties: number[];
  /** Pot, der in die nächste Runde übertragen wird. */
  newPot: number;
  /** Geht es auf (jeder Mitgekommene ≥ 1 Stich)? Dann frischer Start. */
  gehtAuf: boolean;
}

/**
 * Abrechnung einer Zwicku-Runde:
 *  - Pot wird gedrittelt; jeder Stich-Gewinner erhält pro Stich ein Drittel.
 *  - Mitgekommener ohne Stich zahlt den Pot-Stand erneut ein (Strafe).
 *  - Der Austeiler ist der "Zwack": ohne Stich zahlt er den doppelten Pot.
 *  - Summe der Strafen bildet den Pot der nächsten Runde; ist sie 0, geht es auf.
 */
export function settle(input: SettleInput, players: number): SettleResult {
  const { pot, dealer, comers, tricksByPlayer } = input;
  const third = pot / 3;

  const payouts = new Array(players).fill(0);
  const penalties = new Array(players).fill(0);

  for (let p = 0; p < players; p++) {
    if (tricksByPlayer[p] > 0) {
      payouts[p] = third * tricksByPlayer[p];
    }
  }

  for (const p of comers) {
    if (tricksByPlayer[p] === 0) {
      penalties[p] = p === dealer ? 2 * pot : pot;
    }
  }

  const newPot = penalties.reduce((a, b) => a + b, 0);
  return { payouts, penalties, newPot, gehtAuf: newPot === 0 };
}
