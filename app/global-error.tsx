"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Última red de protección: se activa solo cuando el error ocurre en
 * el root layout (donde `app/error.tsx` no llega). Debe traer su
 * propio <html>/<body> porque reemplaza todo el árbol.
 *
 * Diseño intencionalmente mínimo (puro inline) para que funcione
 * incluso si Tailwind o fonts fallaron al cargar.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: "global-root" },
    });
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#04081A",
          color: "#F8FAFC",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", margin: "0 0 1rem" }}>
          Error inesperado
        </h1>
        <p
          style={{
            margin: "0 0 1.5rem",
            color: "#94A3B8",
            maxWidth: "32rem",
            lineHeight: 1.5,
          }}
        >
          Algo falló mientras cargábamos la página. El error ya quedó
          registrado.
        </p>
        {/* global-error reemplaza el árbol completo, así que Link de
            next/link no funciona acá — necesitamos navegación nativa. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            color: "#FF4D6D",
            textDecoration: "underline",
            fontSize: "0.875rem",
          }}
        >
          Volver al inicio
        </a>
      </body>
    </html>
  );
}
