"use client";

import { useState } from "react";
import { Card, Suit, Rank } from "@/lib/engine";

export type DeckStyle = "drawn" | "image";

/** Dateipfad einer Karte im Bild-Deck: /cards/<farbe>-<rang>.gif */
export function cardImageSrc(card: Card): string {
  return `/cards/${card.suit}-${card.rank}.gif`;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  herz: "♥",
  ecken: "♦",
  schaufle: "♠",
  kreuz: "♣",
};
export const RED_SUITS: Suit[] = ["herz", "ecken"];
export const RANK_LABEL: Record<Rank, string> = {
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  bauer: "B",
  dame: "D",
  koenig: "K",
  ass: "A",
};

const NUMBER_RANKS: Rank[] = ["6", "7", "8", "9", "10"];

// --- Farbsymbole als SVG-Pfade (im Raster ~[-10,10], Mitte = Ursprung) ---

function SuitShape({ suit, fill }: { suit: Suit; fill: string }) {
  switch (suit) {
    case "herz":
      return (
        <path
          d="M0 7.5 C0 7.5 9.5 0.5 9.5 -5 C9.5 -9.3 4.3 -10.3 0 -5 C-4.3 -10.3 -9.5 -9.3 -9.5 -5 C-9.5 0.5 0 7.5 0 7.5 Z"
          fill={fill}
        />
      );
    case "ecken":
      return <path d="M0 -10 L8 0 L0 10 L-8 0 Z" fill={fill} />;
    case "schaufle":
      return (
        <path
          d="M0 -10 C0 -10 9.5 -1.5 9.5 3.2 C9.5 6.6 6.2 7.8 3.2 5.6 C3.6 8 5 9.4 6.2 10.5 L-6.2 10.5 C-5 9.4 -3.6 8 -3.2 5.6 C-6.2 7.8 -9.5 6.6 -9.5 3.2 C-9.5 -1.5 0 -10 0 -10 Z"
          fill={fill}
        />
      );
    case "kreuz":
      return (
        <g fill={fill}>
          <circle cx="0" cy="-4.2" r="4.4" />
          <circle cx="-4.6" cy="2.4" r="4.4" />
          <circle cx="4.6" cy="2.4" r="4.4" />
          <path d="M-1.7 2 C-1.7 7 -3.2 9.2 -4.6 11 L4.6 11 C3.2 9.2 1.7 7 1.7 2 Z" />
        </g>
      );
  }
}

/** Platziertes Farbsymbol: Position, Grösse (Breite), optional gedreht. */
function Pip({
  suit,
  x,
  y,
  size,
  fill,
  flip = false,
}: {
  suit: Suit;
  x: number;
  y: number;
  size: number;
  fill: string;
  flip?: boolean;
}) {
  const s = size / 20;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})${flip ? " rotate(180)" : ""}`}>
      <SuitShape suit={suit} fill={fill} />
    </g>
  );
}

// Klassische Pip-Anordnungen (Koordinaten im 100×140-Raster).
const PIP_LAYOUT: Partial<Record<Rank, [number, number][]>> = {
  "6": [
    [33, 42],
    [67, 42],
    [33, 70],
    [67, 70],
    [33, 98],
    [67, 98],
  ],
  "7": [
    [33, 42],
    [67, 42],
    [50, 56],
    [33, 70],
    [67, 70],
    [33, 98],
    [67, 98],
  ],
  "8": [
    [33, 42],
    [67, 42],
    [50, 56],
    [33, 70],
    [67, 70],
    [50, 84],
    [33, 98],
    [67, 98],
  ],
  "9": [
    [33, 36],
    [67, 36],
    [33, 58],
    [67, 58],
    [50, 70],
    [33, 82],
    [67, 82],
    [33, 104],
    [67, 104],
  ],
  "10": [
    [33, 36],
    [67, 36],
    [50, 47],
    [33, 58],
    [67, 58],
    [33, 82],
    [67, 82],
    [50, 93],
    [33, 104],
    [67, 104],
  ],
};

// --- Figürliche Bildkarten (Porträt, oben gezeichnet, unten gespiegelt) ---

function CourtFigure({ rank, suit }: { rank: Rank; suit: Suit }) {
  const red = RED_SUITS.includes(suit);
  const gold = "#e7b53c";
  const goldDark = "#b8902f";
  const skin = "#f1d4b4";
  const hair = "#7a5230";
  const robe = red ? "#c0322f" : "#33414d";
  const robeDark = red ? "#9a2826" : "#283440";
  const suitColor = red ? "var(--red)" : "var(--black)";

  return (
    <g strokeLinejoin="round">
      {/* Schultern / Robe */}
      <path d="M28 70 Q28 52 42 49 L58 49 Q72 52 72 70 Z" fill={robe} />
      <path d="M28 70 Q28 58 35 53 L35 70 Z" fill={robeDark} />
      <path d="M72 70 Q72 58 65 53 L65 70 Z" fill={robeDark} />
      {/* goldener Kragen */}
      <path
        d="M42 49 L50 59 L58 49"
        fill="none"
        stroke={gold}
        strokeWidth="2.4"
      />
      {/* Hals */}
      <rect x="46" y="43" width="8" height="8" fill={skin} />
      {/* Kopf */}
      <circle cx="50" cy="36" r="9" fill={skin} stroke="#cda883" strokeWidth="0.6" />
      {/* Augen */}
      <circle cx="46.6" cy="36" r="0.95" fill="#3a2a1a" />
      <circle cx="53.4" cy="36" r="0.95" fill="#3a2a1a" />

      {rank === "koenig" && (
        <>
          {/* Haar + Bart */}
          <path d="M41 31 Q41 25 50 25 Q59 25 59 31 L59 35 Q56 31 50 31 Q44 31 41 35 Z" fill={hair} />
          <path d="M43 39 Q50 50 57 39 Q57 44 50 46 Q43 44 43 39 Z" fill={hair} />
          {/* Krone */}
          <path
            d="M40 27 L42 16 L46 24 L50 14 L54 24 L58 16 L60 27 Z"
            fill={gold}
            stroke={goldDark}
            strokeWidth="0.6"
          />
          <circle cx="42" cy="16" r="1.5" fill="#e23b3b" />
          <circle cx="50" cy="14" r="1.7" fill="#3b7be2" />
          <circle cx="58" cy="16" r="1.5" fill="#e23b3b" />
        </>
      )}

      {rank === "dame" && (
        <>
          {/* langes Haar */}
          <path d="M40 33 Q39 23 50 23 Q61 23 60 33 L60 44 Q57 37 56 33 L44 33 Q43 37 40 44 Z" fill={hair} />
          {/* Tiara */}
          <path
            d="M42 28 Q45 19 50 24 Q55 19 58 28 Z"
            fill={gold}
            stroke={goldDark}
            strokeWidth="0.6"
          />
          <circle cx="50" cy="24.5" r="1.6" fill="#e23b3b" />
        </>
      )}

      {rank === "bauer" && (
        <>
          {/* kurzes Haar */}
          <path d="M41 33 Q41 27 50 27 Q59 27 59 33 L59 34 Q55 31 50 31 Q45 31 41 34 Z" fill={hair} />
          {/* Kappe mit Goldband + Feder */}
          <path d="M39 30 Q40 21 50 21 Q60 21 61 30 Z" fill={robe} />
          <rect x="39" y="29" width="22" height="3" rx="1.5" fill={gold} />
          <path d="M59 23 Q66 16 63 27 Q61 24 59 25 Z" fill={gold} stroke={goldDark} strokeWidth="0.4" />
        </>
      )}

      {/* Farbsymbol auf der Brust */}
      <Pip suit={suit} x={50} y={64} size={9} fill={suitColor} />
    </g>
  );
}

function isNumber(rank: Rank): boolean {
  return NUMBER_RANKS.includes(rank);
}

/** Bild-Deck mit automatischem Rückfall auf das gezeichnete Deck. */
function ImageCard({
  card,
  width,
  highlight,
}: {
  card: Card;
  width: number;
  highlight: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <DrawnCard card={card} width={width} highlight={highlight} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="pcard"
      src={cardImageSrc(card)}
      alt={`${RANK_LABEL[card.rank]} ${card.suit}`}
      width={width}
      height={width * 1.4}
      style={{
        boxShadow: highlight
          ? "0 0 0 2px var(--gold), 0 4px 9px rgba(0,0,0,.45)"
          : undefined,
      }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

/** Karte rendern – wahlweise als Bild-Deck oder gezeichnet. */
export function PlayingCard({
  card,
  width = 64,
  highlight = false,
  deck = "drawn",
}: {
  card: Card;
  width?: number;
  highlight?: boolean;
  deck?: DeckStyle;
}) {
  if (deck === "image")
    return <ImageCard card={card} width={width} highlight={highlight} />;
  return <DrawnCard card={card} width={width} highlight={highlight} />;
}

function DrawnCard({
  card,
  width = 64,
  highlight = false,
}: {
  card: Card;
  width?: number;
  highlight?: boolean;
}) {
  const height = width * 1.4;
  const red = RED_SUITS.includes(card.suit);
  const color = red ? "var(--red)" : "var(--black)";
  const tint = red ? "#fbecec" : "#eef0f2";
  const label = RANK_LABEL[card.rank];
  const isCourt =
    card.rank === "koenig" || card.rank === "dame" || card.rank === "bauer";

  const Index = (
    <g>
      <text
        x="12.5"
        y="22"
        fontSize={label.length > 1 ? 14 : 17}
        fill={color}
        textAnchor="middle"
        fontWeight={800}
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
      <Pip suit={card.suit} x={12.5} y={34} size={11} fill={color} />
    </g>
  );

  return (
    <svg
      viewBox="0 0 100 140"
      width={width}
      height={height}
      className="pcard"
      role="img"
      aria-label={`${label} ${card.suit}`}
    >
      <defs>
        <linearGradient id="cardFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f3f4f2" />
        </linearGradient>
      </defs>

      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="137"
        rx="10"
        fill="url(#cardFace)"
        stroke={highlight ? "var(--gold)" : "#c9ccd1"}
        strokeWidth={highlight ? 3 : 1.5}
      />
      <rect
        x="5"
        y="5"
        width="90"
        height="130"
        rx="7"
        fill="none"
        stroke={color}
        strokeOpacity="0.12"
        strokeWidth="1"
      />

      {Index}
      <g transform="rotate(180 50 70)">{Index}</g>

      {isNumber(card.rank) &&
        PIP_LAYOUT[card.rank]!.map(([x, y], i) => (
          <Pip
            key={i}
            suit={card.suit}
            x={x}
            y={y}
            size={17}
            fill={color}
            flip={y > 70}
          />
        ))}

      {card.rank === "ass" && (
        <>
          <circle
            cx="50"
            cy="70"
            r="27"
            fill={tint}
            stroke={color}
            strokeOpacity="0.25"
            strokeWidth="1"
          />
          <Pip suit={card.suit} x={50} y={70} size={40} fill={color} />
        </>
      )}

      {isCourt && (
        <>
          <rect x="23" y="14" width="54" height="112" rx="9" fill={tint} opacity="0.6" />
          <line
            x1="50"
            y1="15"
            x2="50"
            y2="125"
            stroke={color}
            strokeOpacity="0.18"
            strokeWidth="1"
          />
          <CourtFigure rank={card.rank} suit={card.suit} />
          <g transform="rotate(180 50 70)">
            <CourtFigure rank={card.rank} suit={card.suit} />
          </g>
        </>
      )}
    </svg>
  );
}

export function CardBack({ width = 30 }: { width?: number }) {
  const height = width * 1.4;
  return (
    <svg viewBox="0 0 100 140" width={width} height={height} className="pcard">
      <defs>
        <linearGradient id="backBase" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b5302f" />
          <stop offset="1" stopColor="#7e1f1e" />
        </linearGradient>
        <pattern
          id="backLattice"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="12" height="12" fill="none" />
          <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="none" stroke="#e7b53c" strokeOpacity="0.28" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect x="1.5" y="1.5" width="97" height="137" rx="10" fill="url(#backBase)" stroke="#fff" strokeWidth="2.5" />
      <rect x="7" y="7" width="86" height="126" rx="7" fill="url(#backLattice)" stroke="#e7b53c" strokeWidth="1.4" />
      <circle cx="50" cy="70" r="22" fill="#8e2423" stroke="#e7b53c" strokeWidth="1.6" />
      <g>
        <Pip suit="herz" x={50} y={59} size={10} fill="#e7b53c" />
        <Pip suit="schaufle" x={50} y={81} size={10} fill="#e7b53c" />
        <Pip suit="ecken" x={39} y={70} size={10} fill="#e7b53c" />
        <Pip suit="kreuz" x={61} y={70} size={10} fill="#e7b53c" />
      </g>
    </svg>
  );
}
