import {
  Card,
  PlayedCard,
  Suit,
  RANK_ORDER,
  legalMoves,
  trickWinner,
  LeadConstraint,
} from "./engine";

/** Grobe Handstärke (0..~) für Mitkommen/Zwack-Entscheidungen. */
export function handStrength(hand: Card[], trump: Suit): number {
  let s = 0;
  for (const c of hand) {
    if (c.suit === trump) s += 3 + RANK_ORDER[c.rank] * 0.4; // Trümpfe stark
    else s += RANK_ORDER[c.rank] * 0.25; // hohe Seitenkarten
    if (c.rank === "ass") s += 1.2;
  }
  return s;
}

/** Bot: mitkommen oder passen? */
export function botComesAlong(hand: Card[], trump: Suit): boolean {
  return handStrength(hand, trump) >= 7;
}

/** Bot (als Austeiler): vor dem Aufdecken "zwack" sagen? Blind, nur Hand bekannt. */
export function botSaysZwack(hand: Card[]): boolean {
  // Zwack ist riskant (doppelt bei null Stichen): nur mit zwei Assen/sehr hoch.
  const aces = hand.filter((c) => c.rank === "ass").length;
  const highs = hand.filter((c) => RANK_ORDER[c.rank] >= 7).length;
  return aces >= 1 && highs >= 2;
}

/**
 * Bot-Kartenwahl: gewinnt er den Stich gerade günstig, nimmt er ihn; sonst
 * wirft er möglichst tief ab. Beim Anspielen führt er seine stärkste Karte.
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

  const strength = (c: Card) => (c.suit === trump ? 100 : 0) + RANK_ORDER[c.rank];
  const lowest = (cs: Card[]) =>
    cs.reduce((lo, c) => (strength(c) < strength(lo) ? c : lo));
  const highest = (cs: Card[]) =>
    cs.reduce((hi, c) => (strength(c) > strength(hi) ? c : hi));

  if (trick.length === 0) {
    return highest(options); // anspielen: stark führen
  }

  const winning = options.filter(
    (c) => trickWinner([...trick, { player, card: c }], trump) === player,
  );
  if (winning.length > 0) return lowest(winning); // günstig stechen
  return lowest(options); // sonst tief abwerfen
}
