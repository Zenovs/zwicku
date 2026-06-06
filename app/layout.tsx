import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zwicku",
  description:
    "Zwicku – Kartenspiel mit französischen Spielkarten.",
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
