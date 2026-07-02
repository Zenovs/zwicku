import { Card, PlayedCard, Suit } from "./types";

/** Zwänge beim Anspielen (leerer Stich). */
export interface LeadConstraint {
  /** Erster Stich der Runde: Trumpf-Ass muss angespielt werden, falls vorhanden. */
  forceTrumpAce?: boolean;
  /** Gewinner des 1. Stichs muss Trumpf anspielen, falls möglich. */
  forceTrumpLead?: boolean;
}

/**
 * Erlaubte Karten aus der Hand.
 *
 * Anspielen (leerer Stich):
 *  - forceTrumpAce: nur das Trumpf-Ass, falls auf der Hand.
 *  - sonst forceTrumpLead: nur Trumpf, falls vorhanden.
 *  - sonst freie Wahl.
 *
 * Bedienen (Stich offen) – Reihenfolge: gleiche Lei → Trumpf → abwerfen:
 *  - Hat man die angespielte Lei, muss man sie spielen.
 *  - Sonst, hat man Trumpf, muss man Trumpf spielen.
 *  - Sonst freie Wahl (abwerfen).
 */
export function legalMoves(
  hand: Card[],
  trick: PlayedCard[],
  trump: Suit,
  lead: LeadConstraint = {},
): Card[] {
  if (trick.length === 0) {
    if (lead.forceTrumpAce) {
      const ace = hand.find((c) => c.suit === trump && c.rank === "ass");
      if (ace) return [ace];
    }
    if (lead.forceTrumpLead) {
      const trumps = hand.filter((c) => c.suit === trump);
      if (trumps.length > 0) return trumps;
    }
    return hand.slice();
  }

  const led = trick[0].card.suit;
  const sameLei = hand.filter((c) => c.suit === led);
  if (sameLei.length > 0) return sameLei;

  const trumps = hand.filter((c) => c.suit === trump);
  if (trumps.length > 0) return trumps;

  return hand.slice();
}

export function isLegalMove(
  card: Card,
  hand: Card[],
  trick: PlayedCard[],
  trump: Suit,
  lead: LeadConstraint = {},
): boolean {
  return legalMoves(hand, trick, trump, lead).some(
    (c) => c.suit === card.suit && c.rank === card.rank,
  );
}

/**
 * Chancenlose Hand: kann 100% keinen Stich machen. Garantiert nur bei drei
 * Sechsen, von denen keine Trumpf ist (6 ist überall die tiefste Karte). In
 * diesem Fall wird neu gemischt und gegeben.
 */
export function isHopeless(hand: Card[], trump: Suit): boolean {
  return hand.every((c) => c.rank === "6") && !hand.some((c) => c.suit === trump);
}
