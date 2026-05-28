import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Playfair_Display,
  Space_Grotesk,
} from "next/font/google";
import { Suspense } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { ToastFromQuery } from "@/components/toast-from-query";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import {
  jsonLd,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/structured-data";
import "../globals.css";

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
    "Formación apostólica integral. 72 módulos en 18 meses · 9 Dimensiones · MasterClass en vivo · comunidad. Desde $25 USD/mes.",
  applicationName: "DAP",
  appleWebApp: {
    capable: true,
    title: "DAP",
    statusBarStyle: "black-translucent",
  },
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
      "Formamos líderes integrales que transforman su generación. 9 Dimensiones, 18 Meses 1 Experiencia.",
    // Imagen estática servida desde app/opengraph-image.png (file convention).
  },
  twitter: {
    card: "summary_large_image",
    // site: "@dap_diplomado", // descomentar cuando exista la cuenta
    title: "DAP · Diplomado Apostólico Pastoral",
    description:
      "Formamos líderes integrales que transforman su generación. 9 Dimensiones, 18 Meses 1 Experiencia.",
    // Imagen estática servida desde app/opengraph-image.png (file convention).
  },
  // Icons + manifest se sirven via file conventions:
  // app/favicon.ico, app/icon.svg, app/apple-icon.png, app/manifest.ts
};

export const viewport: Viewport = {
  themeColor: "#07142B",
  colorScheme: "dark",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Habilita el render estático para este locale (next-intl).
  setRequestLocale(locale as Locale);

  return (
    <html
      lang={locale}
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

        {/* NextIntlClientProvider hereda locale + mensajes del request
            config y los expone a los Client Components (useTranslations). */}
        <NextIntlClientProvider>
          {children}
          <RegisterServiceWorker />
          <InstallPrompt />
          <Toaster richColors position="top-center" />
          <Suspense fallback={null}>
            <ToastFromQuery />
          </Suspense>
        </NextIntlClientProvider>
        {/* Vercel observability: pageviews + Core Web Vitals reales
            (LCP, INP, CLS). Gratis hasta 2.5k events/mes en Hobby. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
