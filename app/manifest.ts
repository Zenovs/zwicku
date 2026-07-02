import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zwicku",
    short_name: "Zwicku",
    description: "Zwicku – Walliser Kartenspiel am Stammtisch.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#553a22",
    theme_color: "#553a22",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
