/**
 * Helpers para generar JSON-LD (schema.org) inyectables como
 * <script type="application/ld+json"> en Server Components.
 *
 * Usage:
 *   <script
 *     type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }}
 *   />
 */

export const SITE_URL = "https://www.dapglobal.org";
export const SITE_NAME = "DAP";
export const SITE_FULL_NAME = "DAP — Diplomado Apostólico Pastoral";
export const LOGO_URL = `${SITE_URL}/dap-logo-white.png`;

export function jsonLd(obj: unknown): string {
  // Escape sequences sensibles para evitar XSS al inlinerar en HTML.
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: SITE_FULL_NAME,
    alternateName: SITE_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    description:
      "Formación apostólica integral para pastores y líderes hispanohablantes. 18 meses, 9 bloques, 200 módulos.",
    inLanguage: "es",
    founder: personSchema(),
    sameAs: [
      // TODO: agregar URLs de redes sociales cuando existan
      // "https://www.instagram.com/dap_diplomado",
      // "https://twitter.com/dap_diplomado",
      // "https://www.youtube.com/@dap_diplomado",
    ],
  } as const;
}

/**
 * Person schema para el Dr. Max Hebeling — founder/instructor del DAP.
 * Mejora el conocimiento de Google sobre quién está detrás del programa.
 */
export function personSchema() {
  return {
    "@type": "Person",
    name: "Dr. Max Hebeling",
    jobTitle: "Apóstol y fundador",
    affiliation: {
      "@type": "Organization",
      name: "Red Apostólica Reino y Avivamiento",
    },
    worksFor: {
      "@type": "EducationalOrganization",
      name: SITE_FULL_NAME,
      url: SITE_URL,
    },
  } as const;
}

/**
 * BreadcrumbList — habilita el path navigable como rich snippet en
 * Google. Items en orden de raíz → actual.
 *
 * Usage: breadcrumbListSchema([
 *   { name: "Inicio", url: SITE_URL },
 *   { name: "Las 9 Dimensiones", url: `${SITE_URL}/rangos` },
 *   { name: phase.title, url: `${SITE_URL}/rangos/${slug}` },
 * ])
 */
export type BreadcrumbItem = { name: string; url: string };

export function breadcrumbListSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export type CoursePhase = {
  slug: string;
  order_index: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  months_duration: number | null;
};

export function courseSchema(phase: CoursePhase) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: phase.title,
    description: phase.subtitle ?? phase.description ?? undefined,
    url: `${SITE_URL}/fases/${phase.slug}`,
    inLanguage: "es",
    courseCode: `DAP-FASE-${String(phase.order_index).padStart(2, "0")}`,
    provider: {
      "@type": "EducationalOrganization",
      name: SITE_FULL_NAME,
      url: SITE_URL,
    },
    educationalLevel: "Professional",
    learningResourceType: "Course",
    // Modelo del DAP: suscripción mensual recurrente, no compra one-shot.
    offers: {
      "@type": "Offer",
      price: "25.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/suscribirme`,
      category: "subscription",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      ...(phase.months_duration
        ? { courseWorkload: `P${phase.months_duration}M` }
        : {}),
    },
  };
}

export function coursesItemListSchema(phases: CoursePhase[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Los 9 bloques del Diplomado Apostólico Pastoral",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: phases.length,
    itemListElement: phases.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/fases/${p.slug}`,
      name: p.title,
    })),
  };
}

/**
 * ItemList genérico — para listados como "Las 9 Dimensiones" en /rangos.
 * Diferente de coursesItemListSchema que asume el shape CoursePhase.
 */
export type RankItem = {
  order_index: number;
  name: string;
  slug: string;
};

export function ranksItemListSchema(ranks: RankItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Las 9 Dimensiones del DAP",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: ranks.length,
    itemListElement: ranks.map((r) => ({
      "@type": "ListItem",
      position: r.order_index,
      url: `${SITE_URL}/rangos/${r.slug}`,
      name: r.name,
    })),
  };
}

export type FaqItem = { q: string; a: string };

export function faqPageSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_FULL_NAME,
    url: SITE_URL,
    inLanguage: "es",
    publisher: {
      "@type": "EducationalOrganization",
      name: SITE_FULL_NAME,
      url: SITE_URL,
    },
  };
}
