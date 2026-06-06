# zwicku

**Zwicku** – ein Kartenspiel mit französischen Spielkarten, als spielbare
**Next.js-App**. Die eigentlichen Zwicku-Regeln werden gerade ergänzt; aktuell
läuft im Hintergrund noch eine generische Stich-Engine (TypeScript, getestet),
die schrittweise auf die Zwicku-Regeln umgestellt wird.

## Projektstruktur

```
lib/engine/   reine Spiellogik (deterministisch, getestet)
lib/bot.ts    einfache Bot-Heuristik (Zug- und Trumpfwahl)
app/          Next.js-App (Spieltisch, deploybar auf Vercel)
test/         Vitest-Tests der Engine
```

## App lokal starten

```bash
npm install
npm run dev        # http://localhost:3000
```

Deployment: Die App ist eine Standard-Next.js-App und läuft ohne Anpassung auf
**Vercel** (Repo verbinden → Framework wird automatisch erkannt).

## Engine-Module (`lib/engine`)

| Modul        | Inhalt                                                                       |
| ------------ | ---------------------------------------------------------------------------- |
| `types.ts`   | Grundtypen (`Suit`, `Rank`, `Card`, `TrumpMode`, `PlayedCard`) + Konstanten. |
| `deck.ts`    | `createDeck`, `shuffle` (Fisher–Yates, injizierbarer RNG), `deal`.           |
| `scoring.ts` | `cardValue`, `trickValue` – Kartenwerte je Trumpf-Modus.                     |
| `trick.ts`   | `trickWinner` – Gewinner eines Stichs.                                       |
| `rules.ts`   | `legalMoves`, `isLegalMove` – Bedien- und Trumpfzwang inkl. Buur-Ausnahme.   |
| `game.ts`    | `startRound`, `playCard`, `scoreRound` – Zustandsmaschine einer Runde.       |
| `match.ts`   | `startMatch`, `applyRound` – Punktestand über mehrere Runden bis zum Ziel.   |

## Spielfluss

```ts
import { createDeck, shuffle, deal, startRound, playCard, scoreRound,
         startMatch, applyRound } from "trumpf";

const trump = { type: "suit", suit: "herz" } as const;
let round = startRound(deal(shuffle(createDeck())), trump, /* Vorhand */ 0);

while (!round.finished) {
  const hand = round.hands[round.toMove];
  // … Karte wählen (UI/Bot) …
  round = playCard(round, round.toMove, hand[0]);
}

const result = scoreRound(round);        // Teampunkte inkl. letzter-Stich- und Match-Bonus
let match = startMatch({ target: 1000 });
match = applyRound(match, trump, result);
```

## Spielregeln (umgesetzt)

- **Bedienen / Farbe bekennen**, **Trumpfzwang**, **Buur-Ausnahme**.
- Drei Modi: **Trumpf-Farbe**, **Obenabe**, **Undenufe** (je eigene Kartenwerte
  und Stärke-Reihenfolge).
- Rundenwertung: 152 Kartenpunkte + **5** für den letzten Stich (= 157),
  **+100** Match-Bonus, wenn ein Team alle neun Stiche macht.
- Match-Wertung mit optionalem, injizierbarem **Trumpf-Faktor** (Default 1).

## Bewusst (noch) nicht umgesetzt

- **Untertrumpf-Verbot** – regional unterschiedlich, kommt als Konfigurations-
  option, sobald die Walliser Hausregel feststeht.
- **Weis** (Stöck, Rosen usw.) und die **Schieben/Ansagen-Phase** der
  Trumpfwahl. `match.ts` verrechnet bereits fertige Rundenergebnisse; die
  Ansage-Mechanik wird darüber gesetzt.
- Fester Trumpf-Faktor je Modus – als Hausregel über `multiplier` einspeisbar.

## Entwicklung

```bash
npm install
npm test          # vitest run
npm run typecheck # tsc --noEmit
```
