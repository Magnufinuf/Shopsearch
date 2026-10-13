import type { MetadataRoute } from "next";

// Gjør Scavenger til en web-app: kan legges på hjemskjermen og åpnes i fullskjerm.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scavenger",
    short_name: "Scavenger",
    description: "Finn det du leter etter fra mange nettbutikker på ett sted.",
    lang: "nb",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#FBF3EC",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/app-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Annonser", url: "/adverts" },
      { name: "Min side", url: "/min-side" },
    ],
  };
}
