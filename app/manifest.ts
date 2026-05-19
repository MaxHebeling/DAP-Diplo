import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DAP — Diplomado Apostólico Pastoral",
    short_name: "DAP",
    description:
      "Formación apostólica integral para pastores y líderes hispanohablantes. 18 meses, 9 bloques, 200 módulos.",
    start_url: "/",
    display: "standalone",
    background_color: "#07142B",
    theme_color: "#07142B",
    icons: [
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
        purpose: "maskable",
      },
    ],
  };
}
