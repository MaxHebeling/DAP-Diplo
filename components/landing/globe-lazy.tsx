"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// Wrapper que carga `<Globe>` (three.js + vanta, ~750KB gz) SOLO en el
// cliente y SOLO cuando el componente se monta. Esto saca esos 750KB
// del bundle inicial de la landing pública y mejora el LCP, sin tocar
// el resultado visual: el placeholder mantiene la altura exacta del
// globe para evitar layout shift, y al hidratarse el iframe-like effect
// arranca solo.
//
// `ssr:false` requiere que este wrapper sea client component; el Server
// Component padre (GlobalReachSection) lo importa normal.
const Globe = dynamic(() => import("./globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => null,
});

export function GlobeLazy(props: ComponentProps<typeof Globe>) {
  return <Globe {...props} />;
}
