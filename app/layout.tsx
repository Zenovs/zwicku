import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trumpf – Schieber-Jass",
  description:
    "Spielbarer Schieber-Jass (französische Karten) gegen einfache Bots.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
