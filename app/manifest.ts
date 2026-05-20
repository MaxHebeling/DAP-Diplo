import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DAP — Diplomado Apostólico Pastoral",
    short_name: "DAP",
    description:
      "Formación apostólica integral. 18 meses · 9 Dimensiones · 72 módulos.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07142B",
    theme_color: "#07142B",
    categories: ["education", "lifestyle"],
    lang: "es",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Inicio",
        short_name: "Inicio",
        description: "Tu módulo de la semana",
        url: "/dashboard",
        icons: [{ src: "/web-app-manifest-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Mis Módulos",
        short_name: "Módulos",
        description: "Los 9 bloques",
        url: "/fases",
        icons: [{ src: "/web-app-manifest-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Comunidad",
        short_name: "Comunidad",
        description: "Foro DAP",
        url: "/comunidad",
        icons: [{ src: "/web-app-manifest-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
