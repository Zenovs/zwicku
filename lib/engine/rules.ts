import { Card, PlayedCard, TrumpMode } from "./types";

/**
 * Liefert die erlaubten Karten aus der Hand, gegeben der aktuelle (noch
 * unvollständige) Stich. Ist der Stich leer, sind alle Karten erlaubt.
 *
 * Umgesetzte Regeln:
 *  - Farbe bekennen (bedienen): Wer die angespielte Farbe hat, muss sie spielen.
 *  - Trumpfzwang: Wird Trumpf angespielt, muss Trumpf bedient werden …
 *  - … ausser der einzige Trumpf in der Hand ist der Buur – der muss nie
 *    zugegeben werden (Buur-Ausnahme).
 *  - Wer die angespielte (Nicht-Trumpf-)Farbe nicht hat, darf frei wählen
 *    (trumpfen oder abwerfen).
 *
 * NOCH NICHT umgesetzt (bewusst, siehe Konzept):
 *  - Untertrumpf-Verbot. Ist regional unterschiedlich und wird als spätere
 *    Konfigurationsoption ergänzt, sobald die Walliser Hausregel feststeht.
 */
export function legalMoves(
  hand: Card[],
  trick: PlayedCard[],
  trump: TrumpMode,
): Card[] {
  if (trick.length === 0) {
    return hand.slice();
  }

  const ledSuit = trick[0].card.suit;

  // Kein Trumpf-Modus (Obenabe / Undenufe): einfach bedienen.
  if (trump.type !== "suit") {
    const followers = hand.filter((c) => c.suit === ledSuit);
    return followers.length > 0 ? followers : hand.slice();
  }

  // Trumpf-Farbe wurde angespielt.
  if (ledSuit === trump.suit) {
    const trumps = hand.filter((c) => c.suit === trump.suit);
    if (trumps.length === 0) {
      return hand.slice();
    }
    // Buur-Ausnahme: ist der Buur der einzige Trumpf, darf frei gewählt werden.
    const onlyTrumpIsBuur =
      trumps.length === 1 && trumps[0].rank === "bauer";
    if (onlyTrumpIsBuur) {
      return hand.slice();
    }
    return trumps;
  }

  // Eine Nicht-Trumpf-Farbe wurde angespielt.
  const followers = hand.filter((c) => c.suit === ledSuit);
  if (followers.length > 0) {
    // Bedienen Pflicht – Trumpfen statt Bedienen ist nicht erlaubt.
    return followers;
  }
  // Farbe nicht vorhanden: frei wählen (trumpfen oder abwerfen).
  return hand.slice();
}

/** Prüft, ob ein bestimmter Zug erlaubt ist. */
export function isLegalMove(
  card: Card,
  hand: Card[],
  trick: PlayedCard[],
  trump: TrumpMode,
): boolean {
  return legalMoves(hand, trick, trump).some(
    (c) => c.suit === card.suit && c.rank === card.rank,
  );
}
