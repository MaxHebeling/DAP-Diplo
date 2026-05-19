import type { MetadataRoute } from "next";

const BASE_URL = "https://www.dapglobal.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          // Auth / cuenta
          "/login",
          "/signup",
          "/verificar/",
          "/suscribirme/exito",
          // Área del alumno
          "/dashboard",
          "/comunidad",
          "/en-vivo",
          "/tutor",
          "/configuracion",
          "/progreso",
          "/certificaciones",
          "/agenda",
          // Player de módulos (contenido pagado)
          "/fases/*/modulos/",
          // Admin
          "/admin/",
          // API + dev routes
          "/api/",
          "/dev/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
