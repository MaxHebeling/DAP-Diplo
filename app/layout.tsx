import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Playfair_Display,
  Space_Grotesk,
} from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ToastFromQuery } from "@/components/toast-from-query";
import {
  jsonLd,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/structured-data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.dapglobal.org"),
  title: {
    default: "DAP · Diplomado Apostólico Pastoral",
    template: "%s · DAP",
  },
  description:
    "Formación apostólica integral para pastores. 200 módulos en 18 meses · 9 áreas ministeriales · mentoría grupal · comunidad. Desde $25 USD/mes.",
  applicationName: "DAP",
  authors: [{ name: "DAP" }],
  generator: "Next.js",
  keywords: [
    "diplomado apostólico",
    "formación pastoral",
    "liderazgo cristiano",
    "discipulado",
    "reino",
    "autoridad apostólica",
    "pastores latinoamérica",
  ],
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_LA",
    url: "/",
    siteName: "DAP",
    title: "DAP · Diplomado Apostólico Pastoral",
    description:
      "Formamos líderes integrales que transforman su generación. 200 módulos en 18 meses, 9 áreas ministeriales y mentoría grupal. Desde $25 USD/mes.",
    // Imagen auto-generada por app/opengraph-image.tsx (file convention).
  },
  twitter: {
    card: "summary_large_image",
    // site: "@dap_diplomado", // descomentar cuando exista la cuenta
    title: "DAP · Diplomado Apostólico Pastoral",
    description:
      "Formamos líderes integrales que transforman su generación. 200 módulos · 18 meses · 9 áreas ministeriales. Desde $25 USD/mes.",
    // Imagen auto-generada por app/opengraph-image.tsx (file convention).
  },
  // Icons + manifest se sirven via file conventions:
  // app/favicon.ico, app/icon.svg, app/apple-icon.png, app/manifest.ts
};

export const viewport: Viewport = {
  themeColor: "#07142B",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* JSON-LD: identidad de la organización + sitio (aplica a todo). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema()) }}
        />

        {children}
        <Toaster richColors position="top-center" />
        <Suspense fallback={null}>
          <ToastFromQuery />
        </Suspense>
      </body>
    </html>
  );
}
