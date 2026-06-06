import {
  Card,
  PlayedCard,
  TrumpMode,
  Suit,
  legalMoves,
  trickWinner,
  cardValue,
  teamOf,
} from "./engine";

/**
 * Einfache, deterministische Bot-Heuristik (kein Lernverfahren):
 *  - Anspielen: tiefste Karte, um Werte zu schonen.
 *  - Folgen: kann ich den Stich gerade an mich holen, nehme ich ihn mit der
 *    günstigsten gewinnenden Karte. Führt mein Team bereits, werfe ich tief ab.
 *    Sonst werfe ich die punktärmste Karte weg.
 */
export function chooseBotMove(
  hand: Card[],
  trick: PlayedCard[],
  trump: TrumpMode,
  player: number,
): Card {
  const options = legalMoves(hand, trick, trump);
  if (options.length === 1) return options[0];

  const cheapest = (cards: Card[]) =>
    cards.reduce((lo, c) =>
      cardValue(c, trump) < cardValue(lo, trump) ? c : lo,
    );

  // Anspielen.
  if (trick.length === 0) {
    return cheapest(options);
  }

  const myTeam = teamOf(player);
  const leadingPlayer = trickWinner(trick, trump);
  const partnerLeads = teamOf(leadingPlayer) === myTeam;

  // Welche Optionen holen den Stich (Stand jetzt) an mich?
  const winning = options.filter(
    (c) => trickWinner([...trick, { player, card: c }], trump) === player,
  );

  if (partnerLeads) {
    // Partner führt: nicht überstechen, billig abwerfen.
    return cheapest(options);
  }

  if (winning.length > 0) {
    // Stich an mich holen, möglichst günstig.
    return cheapest(winning);
  }

  // Kann nicht gewinnen: punktärmste Karte abwerfen.
  return cheapest(options);
}

/**
 * Trumpf-Entscheidung eines Bots inkl. Schieben.
 * Liefert eine Trumpf-Ansage oder "schieben" (nur wenn `canSchieben`).
 *
 * Heuristik: stärkste Farbe zählen, Buur/Nell extra gewichten. Ist die Hand
 * für eine Ansage zu schwach und Schieben noch möglich, wird geschoben.
 */
export function decideBotTrump(
  hand: Card[],
  canSchieben: boolean,
): TrumpMode | "schieben" {
  const counts: Record<Suit, number> = {
    herz: 0,
    ecken: 0,
    schaufle: 0,
    kreuz: 0,
  };
  for (const c of hand) counts[c.suit] += 1;

  let bestSuit: Suit = "herz";
  let bestCount = -1;
  (Object.keys(counts) as Suit[]).forEach((s) => {
    if (counts[s] > bestCount) {
      bestCount = counts[s];
      bestSuit = s;
    }
  });

  const hasBuur = hand.some((c) => c.suit === bestSuit && c.rank === "bauer");
  const hasNell = hand.some((c) => c.suit === bestSuit && c.rank === "9");
  const trumpStrength = bestCount + (hasBuur ? 2 : 0) + (hasNell ? 1 : 0);

  // Zu schwach für eine eigene Ansage -> schieben, falls erlaubt.
  if (canSchieben && trumpStrength < 4) {
    return "schieben";
  }
  if (bestCount >= 3) return { type: "suit", suit: bestSuit };
  return { type: "obenabe" };
}
