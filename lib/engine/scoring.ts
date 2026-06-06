import { Card, PlayedCard, Rank, TrumpMode } from "./types";

/** Punktwert einer einzelnen Karte abhängig vom Trumpf-Modus. */
export function cardValue(card: Card, trump: TrumpMode): number {
  if (trump.type === "suit") {
    if (card.suit === trump.suit) {
      return trumpSuitValue(card.rank);
    }
    return plainSuitValue(card.rank);
  }
  if (trump.type === "obenabe") {
    return obenabeValue(card.rank);
  }
  return undenufeValue(card.rank);
}

function trumpSuitValue(rank: Rank): number {
  switch (rank) {
    case "bauer":
      return 20; // Buur
    case "9":
      return 14; // Nell
    case "ass":
      return 11;
    case "10":
      return 10;
    case "koenig":
      return 4;
    case "dame":
      return 3;
    default:
      return 0; // 8, 7, 6
  }
}

function plainSuitValue(rank: Rank): number {
  switch (rank) {
    case "ass":
      return 11;
    case "10":
      return 10;
    case "koenig":
      return 4;
    case "dame":
      return 3;
    case "bauer":
      return 2;
    default:
      return 0; // 9, 8, 7, 6
  }
}

function obenabeValue(rank: Rank): number {
  switch (rank) {
    case "ass":
      return 11;
    case "10":
      return 10;
    case "8":
      return 8;
    case "koenig":
      return 4;
    case "dame":
      return 3;
    case "bauer":
      return 2;
    default:
      return 0; // 9, 7, 6
  }
}

function undenufeValue(rank: Rank): number {
  switch (rank) {
    case "6":
      return 11; // das 6er übernimmt die Rolle des Ass
    case "10":
      return 10;
    case "8":
      return 8;
    case "koenig":
      return 4;
    case "dame":
      return 3;
    case "bauer":
      return 2;
    default:
      return 0; // ass, 9, 7
  }
}

/** Summiert die Kartenpunkte eines abgeschlossenen Stichs. */
export function trickValue(cards: PlayedCard[], trump: TrumpMode): number {
  return cards.reduce((sum, pc) => sum + cardValue(pc.card, trump), 0);
}
