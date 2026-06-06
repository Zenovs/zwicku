"use client";

/** Geldbetrag (Rappen) als Schweizer-Franken-Text, z. B. 90 -> "0.90". */
export function formatChf(rappen: number): string {
  return (rappen / 100).toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface Denom {
  v: number;
  label: string;
  sub: string;
  d: number;
  face: string;
  rim: string;
  text: string;
}

// Stilisierte Schweizer Münzen (eigenes Design, keine Originalprägung).
const DENOMS: Denom[] = [
  { v: 500, label: "5", sub: "FR", d: 34, face: "#e7c86a", rim: "#b08a2e", text: "#5a4410" },
  { v: 200, label: "2", sub: "FR", d: 32, face: "#e2e6ea", rim: "#9aa0a6", text: "#3a3f44" },
  { v: 100, label: "1", sub: "FR", d: 30, face: "#e2e6ea", rim: "#9aa0a6", text: "#3a3f44" },
  { v: 50, label: "½", sub: "FR", d: 25, face: "#e9ecef", rim: "#a9afb5", text: "#3a3f44" },
  { v: 20, label: "20", sub: "RP", d: 27, face: "#e9ecef", rim: "#a9afb5", text: "#3a3f44" },
  { v: 10, label: "10", sub: "RP", d: 24, face: "#e9ecef", rim: "#a9afb5", text: "#3a3f44" },
  { v: 5, label: "5", sub: "RP", d: 22, face: "#d8a46e", rim: "#9c6f3f", text: "#5a3a1c" },
];

function breakdown(amount: number): Denom[] {
  const out: Denom[] = [];
  let r = Math.max(0, Math.round(amount));
  for (const den of DENOMS) {
    while (r >= den.v) {
      out.push(den);
      r -= den.v;
    }
  }
  return out;
}

export function Coin({ den, size }: { den: Denom; size?: number }) {
  const s = size ?? den.d;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" className="coinSvg">
      <circle cx="20" cy="20" r="19" fill={den.rim} />
      <circle cx="20" cy="20" r="16.5" fill={den.face} />
      <circle cx="20" cy="20" r="16.5" fill="none" stroke={den.rim} strokeWidth="0.8" opacity="0.6" />
      <circle cx="20" cy="20" r="13.5" fill="none" stroke={den.rim} strokeWidth="0.7" opacity="0.4" />
      <text
        x="20"
        y={den.sub ? 18.5 : 21}
        textAnchor="middle"
        dominantBaseline="central"
        fontWeight={800}
        fontSize={den.label.length > 1 ? 13 : 16}
        fill={den.text}
        fontFamily="system-ui, sans-serif"
      >
        {den.label}
      </text>
      {den.sub && (
        <text
          x="20"
          y="27"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight={700}
          fontSize="6"
          fill={den.text}
          fontFamily="system-ui, sans-serif"
        >
          {den.sub}
        </text>
      )}
    </svg>
  );
}

/** Münzhaufen für einen Betrag (Rappen). */
export function CoinPile({
  amount,
  max = 14,
  size,
}: {
  amount: number;
  max?: number;
  size?: number;
}) {
  const coins = breakdown(amount);
  const shown = coins.slice(0, max);
  const extra = coins.length - shown.length;
  return (
    <div className="coinpile">
      {shown.map((den, i) => (
        <span
          key={i}
          className="coin"
          style={{
            left: `${(i % 6) * 13}px`,
            top: `${Math.floor(i / 6) * 11 + (i % 2) * 4}px`,
            zIndex: i,
            transform: `rotate(${((i * 47) % 26) - 13}deg)`,
          }}
        >
          <Coin den={den} size={size} />
        </span>
      ))}
      {extra > 0 && <span className="coinmore">+{extra}</span>}
    </div>
  );
}

/** Deko: Schnapsglas (Stammtisch-Feeling). */
export function SchnappsGlass({ size = 26 }: { size?: number }) {
  const h = size * 1.45;
  return (
    <svg width={size} height={h} viewBox="0 0 30 42" className="glass">
      {/* Schatten */}
      <ellipse cx="15" cy="40" rx="10" ry="2" fill="rgba(0,0,0,0.25)" />
      {/* Glaskörper */}
      <path
        d="M6 6 L24 6 L21.5 38 Q21 40 15 40 Q9 40 8.5 38 Z"
        fill="rgba(255,255,255,0.16)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1"
      />
      {/* Schnaps */}
      <path d="M9.2 22 L20.8 22 L19.4 36.5 Q19 38.4 15 38.4 Q11 38.4 10.6 36.5 Z" fill="#d98a2b" opacity="0.92" />
      <ellipse cx="15" cy="22" rx="5.8" ry="1.3" fill="#f0b35a" opacity="0.9" />
      {/* Glanz */}
      <path d="M10 9 L11.5 9 L10.6 30 L9.2 30 Z" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}
