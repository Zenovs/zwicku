import {
  Card,
  PlayedCard,
  Suit,
  RANK_ORDER,
  legalMoves,
  trickWinner,
  LeadConstraint,
} from "./engine";

const strengthOf = (c: Card, trump: Suit) =>
  (c.suit === trump ? 100 : 0) + RANK_ORDER[c.rank];

/** Erwartete Stichzahl der Hand (grobe Schätzung, 0..3). */
export function expectedTricks(hand: Card[], trump: Suit): number {
  let t = 0;
  for (const c of hand) {
    if (c.suit === trump) {
      if (RANK_ORDER[c.rank] >= 8) t += 0.92; // Ass/König Trumpf: fast sicher
      else if (RANK_ORDER[c.rank] >= 6) t += 0.62;
      else if (RANK_ORDER[c.rank] >= 4) t += 0.4;
      else t += 0.22;
    } else if (c.rank === "ass") t += 0.62;
    else if (c.rank === "koenig") t += 0.32;
    else if (c.rank === "dame") t += 0.15;
  }
  return t;
}

/** Bot: mitkommen, wenn ~ ein Stich realistisch ist. */
export function botComesAlong(hand: Card[], trump: Suit): boolean {
  return expectedTricks(hand, trump) >= 0.9;
}

/** Bot-Austeiler: blind (ohne Trumpf) „zwack"? Nur bei sehr starker Hand. */
export function botSaysZwack(hand: Card[]): boolean {
  const high = hand.filter((c) => RANK_ORDER[c.rank] >= 8).length; // Ass/König
  const aces = hand.filter((c) => c.rank === "ass").length;
  return aces >= 1 && high >= 2;
}

/**
 * Tausch-Entscheidung: lohnt es, die aufgedeckte Trumpfkarte gegen die
 * schwächste Handkarte zu tauschen? Gibt die abzulegende Karte zurück (oder null).
 */
export function botSwapDecision(
  hand: Card[],
  trumpCard: Card,
  trump: Suit,
): Card | null {
  const worst = hand.reduce((lo, c) =>
    strengthOf(c, trump) < strengthOf(lo, trump) ? c : lo,
  );
  return strengthOf(trumpCard, trump) > strengthOf(worst, trump) + 2 ? worst : null;
}

/** Opinier: bei 3 gleichen, schwachen Karten neu ziehen versuchen. */
export function botWantsOpinier(hand: Card[], trump: Suit): boolean {
  const allSame = hand.every((c) => c.suit === hand[0].suit);
  return allSame && hand[0].suit !== trump && expectedTricks(hand, trump) < 0.8;
}

/** Nach Opinier: stärkere der beiden Hände behalten. */
export function botKeepsNew(oldHand: Card[], newHand: Card[], trump: Suit): boolean {
  return expectedTricks(newHand, trump) > expectedTricks(oldHand, trump);
}

/**
 * Kartenwahl. Anspielen: stärkste Karte (zieht Trümpfe / gewinnt). Bedienen:
 * günstig stechen wenn möglich, sonst die punktärmste Nicht-Trumpf-Karte abwerfen
 * (Trümpfe für später behalten).
 */
export function chooseBotCard(
  hand: Card[],
  trick: PlayedCard[],
  trump: Suit,
  player: number,
  lead: LeadConstraint = {},
): Card {
  const options = legalMoves(hand, trick, trump, lead);
  if (options.length === 1) return options[0];

  const str = (c: Card) => strengthOf(c, trump);
  const lowest = (cs: Card[]) => cs.reduce((lo, c) => (str(c) < str(lo) ? c : lo));
  const highest = (cs: Card[]) => cs.reduce((hi, c) => (str(c) > str(hi) ? c : hi));

  if (trick.length === 0) {
    return highest(options); // anspielen: stark
  }

  const winning = options.filter(
    (c) => trickWinner([...trick, { player, card: c }], trump) === player,
  );
  if (winning.length > 0) return lowest(winning); // günstig stechen
  return lowest(options); // sonst tief abwerfen
}
