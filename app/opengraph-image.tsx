import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "DAP — Diplomado Apostólico Pastoral";

export default async function OpengraphImage() {
  const logoBuffer = await readFile(
    join(process.cwd(), "public", "dap-logo-white.png"),
  );
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#07142B",
          backgroundImage: [
            // Cosmic vertical gradient (replica de bg-gradient-cosmic)
            "linear-gradient(180deg, #07142B 0%, #241E72 50%, #07142B 100%)",
            // Glow violeta arriba-izquierda
            "radial-gradient(circle at 30% 42%, rgba(123,97,255,0.45) 0%, transparent 55%)",
            // Glow coral abajo-derecha
            "radial-gradient(circle at 72% 58%, rgba(255,77,109,0.38) 0%, transparent 55%)",
          ].join(", "),
          position: "relative",
        }}
      >
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="DAP"
          width={400}
          height={400}
          style={{
            filter: "drop-shadow(0 0 60px rgba(123,97,255,0.6))",
          }}
        />

        {/* Tagline */}
        <div
          style={{
            marginTop: 16,
            color: "#94A3B8",
            fontSize: 28,
            letterSpacing: 8,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          Diplomado · Apostólico · Pastoral
        </div>
      </div>
    ),
    { ...size },
  );
}
