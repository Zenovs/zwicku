import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "Zwicku",
  description: "Zwicku – Kartenspiel mit französischen Spielkarten.",
  applicationName: "Zwicku",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Zwicku" },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#553a22",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
