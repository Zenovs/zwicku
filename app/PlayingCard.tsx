import { Card, Suit, Rank } from "@/lib/engine";

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

// Klassische Pip-Anordnungen (Koordinaten im 100×140-Raster).
const PIP_LAYOUT: Partial<Record<Rank, [number, number][]>> = {
  "6": [
    [34, 40],
    [66, 40],
    [34, 70],
    [66, 70],
    [34, 100],
    [66, 100],
  ],
  "7": [
    [34, 40],
    [66, 40],
    [50, 55],
    [34, 70],
    [66, 70],
    [34, 100],
    [66, 100],
  ],
  "8": [
    [34, 40],
    [66, 40],
    [50, 55],
    [34, 70],
    [66, 70],
    [50, 85],
    [34, 100],
    [66, 100],
  ],
  "9": [
    [34, 34],
    [66, 34],
    [34, 57],
    [66, 57],
    [50, 70],
    [34, 83],
    [66, 83],
    [34, 106],
    [66, 106],
  ],
  "10": [
    [34, 34],
    [66, 34],
    [50, 46],
    [34, 57],
    [66, 57],
    [34, 83],
    [66, 83],
    [50, 94],
    [34, 106],
    [66, 106],
  ],
};

// Eigene Emblem-Figuren für die Bildkarten.
const EMBLEM: Record<"koenig" | "dame" | "bauer", string> = {
  koenig: "M30 80 L35 52 L43 66 L50 46 L57 66 L65 52 L70 80 Z",
  dame: "M32 78 Q34 56 43 60 Q47 48 50 58 Q53 48 57 60 Q66 56 68 78 Z",
  bauer: "M50 46 L68 52 V66 Q68 82 50 90 Q32 82 32 66 V52 Z",
};

function isNumber(rank: Rank): boolean {
  return NUMBER_RANKS.includes(rank);
}

export function PlayingCard({
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
  const sym = SUIT_SYMBOL[card.suit];
  const label = RANK_LABEL[card.rank];

  const Index = (
    <g
      fill={color}
      textAnchor="middle"
      fontWeight={700}
      fontFamily="system-ui, sans-serif"
    >
      <text x="13" y="23" fontSize={label.length > 1 ? 15 : 18}>
        {label}
      </text>
      <text x="13" y="39" fontSize="15">
        {sym}
      </text>
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
      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="137"
        rx="9"
        fill="#fdfdfb"
        stroke={highlight ? "var(--gold)" : "#cfd2d6"}
        strokeWidth={highlight ? 3 : 1.5}
      />

      {Index}
      <g transform="rotate(180 50 70)">{Index}</g>

      {isNumber(card.rank) &&
        PIP_LAYOUT[card.rank]!.map(([x, y], i) => (
          <text
            key={i}
            x={x}
            y={y}
            fontSize="23"
            fill={color}
            textAnchor="middle"
            dominantBaseline="central"
            transform={y > 70 ? `rotate(180 ${x} ${y})` : undefined}
          >
            {sym}
          </text>
        ))}

      {card.rank === "ass" && (
        <text
          x="50"
          y="71"
          fontSize="60"
          fill={color}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {sym}
        </text>
      )}

      {(card.rank === "koenig" ||
        card.rank === "dame" ||
        card.rank === "bauer") && (
        <>
          <rect x="26" y="36" width="48" height="68" rx="8" fill={tint} />
          <path
            d={EMBLEM[card.rank]}
            fill={color}
            stroke={color}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <text
            x="50"
            y="98"
            fontSize="24"
            fill={color}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {sym}
          </text>
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
        <pattern
          id="back-grid"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="14" height="14" fill="#b5302f" />
          <circle cx="7" cy="7" r="2" fill="#9a2826" />
        </pattern>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="137"
        rx="9"
        fill="url(#back-grid)"
        stroke="#fff"
        strokeWidth="2.5"
      />
      <rect
        x="8"
        y="8"
        width="84"
        height="124"
        rx="6"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.5"
      />
      <circle cx="50" cy="70" r="20" fill="#8e2423" stroke="var(--gold)" strokeWidth="1.5" />
      <text
        x="50"
        y="71"
        fontSize="20"
        fill="var(--gold)"
        textAnchor="middle"
        dominantBaseline="central"
        fontWeight={700}
        fontFamily="system-ui, sans-serif"
      >
        J
      </text>
    </svg>
  );
}
