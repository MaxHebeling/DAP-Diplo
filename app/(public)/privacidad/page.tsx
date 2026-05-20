import Link from "next/link";
import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";

const UPDATED_AT = "19 de mayo de 2026";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Política de privacidad del Diplomado Apostólico Pastoral (DAP). Cómo recolectamos, usamos y protegemos tus datos personales.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Política de privacidad"
      updatedAt={UPDATED_AT}
    >
      <p>
        En el Diplomado Apostólico Pastoral (<strong>&ldquo;DAP&rdquo;</strong>),
        operado por <strong>Revival &amp; Kingdom Ministries, INC</strong>{" "}
        (en adelante, &ldquo;nosotros&rdquo;), respetamos tu privacidad y nos
        comprometemos a proteger los datos personales que nos compartís.
        Esta política explica qué datos recolectamos, cómo los usamos, con
        quién los compartimos y qué derechos tenés sobre ellos.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        Revival &amp; Kingdom Ministries, INC, entidad constituida en
        California, Estados Unidos, es la responsable del tratamiento de los
        datos personales recolectados a través de{" "}
        <Link href="/">dapglobal.org</Link>.
      </p>
      <p>
        Contacto:{" "}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>
      </p>

      <h2>2. Datos que recolectamos</h2>
      <h3>2.1 Datos que vos nos proporcionás</h3>
      <ul>
        <li>Nombre completo, email y contraseña (al crear la cuenta).</li>
        <li>Información del ministerio o iglesia (opcional).</li>
        <li>País y zona horaria.</li>
        <li>Foto de perfil (si la subís).</li>
        <li>Datos de pago: procesados directamente por Stripe; nosotros no almacenamos los números de tarjeta.</li>
        <li>Contenido que generás dentro del Servicio (posts en comunidad, mensajes al tutor IA, respuestas a evaluaciones).</li>
      </ul>

      <h3>2.2 Datos recolectados automáticamente</h3>
      <ul>
        <li>Dirección IP, tipo de navegador, dispositivo y sistema operativo.</li>
        <li>Páginas visitadas, tiempo de permanencia y módulos consumidos (analítica de uso).</li>
        <li>Progreso académico (módulos completados, evaluaciones aprobadas, dimensiones obtenidas).</li>
        <li>Cookies y tecnologías similares (ver sección 5).</li>
      </ul>

      <h2>3. Finalidades del tratamiento</h2>
      <p>Usamos tus datos para:</p>
      <ul>
        <li><strong>Prestar el Servicio:</strong> gestionar tu cuenta, controlar tu progreso académico, otorgarte certificados y dimensiones.</li>
        <li><strong>Procesar pagos:</strong> facturación recurrente y cancelaciones a través de Stripe.</li>
        <li><strong>Comunicación operativa:</strong> envío de emails transaccionales (bienvenida, confirmaciones de pago, avisos de cancelación, apertura semanal, correcciones de tareas).</li>
        <li><strong>Comunicación pedagógica:</strong> recordatorios de sesiones en vivo, novedades del programa.</li>
        <li><strong>Soporte:</strong> responder a tus consultas y resolver problemas.</li>
        <li><strong>Mejora del Servicio:</strong> analítica agregada para optimizar contenido y experiencia.</li>
        <li><strong>Seguridad:</strong> prevenir fraude, abuso o uso no autorizado de cuentas.</li>
        <li><strong>Cumplimiento legal:</strong> cuando una autoridad competente lo requiera.</li>
      </ul>

      <h2>4. Compartición con terceros</h2>
      <p>
        No vendemos tus datos personales. Los compartimos únicamente con los
        siguientes proveedores que nos ayudan a operar el Servicio bajo
        contratos de confidencialidad y protección de datos:
      </p>
      <ul>
        <li><strong>Stripe, Inc.</strong> — procesamiento de pagos.</li>
        <li><strong>Supabase Inc.</strong> — base de datos y autenticación.</li>
        <li><strong>Vercel Inc.</strong> — hosting y entrega del sitio.</li>
        <li><strong>Mux Inc.</strong> — alojamiento y reproducción de video.</li>
        <li><strong>Resend Inc.</strong> — envío de emails transaccionales.</li>
        <li><strong>Anthropic PBC</strong> — modelo de inteligencia artificial del tutor (las consultas se procesan sin asociarse a tu identidad pública).</li>
      </ul>
      <p>
        Cada proveedor opera bajo sus propias políticas de privacidad y
        cumple con estándares internacionales (GDPR, CCPA, SOC 2 cuando
        aplique).
      </p>

      <h2>5. Cookies y tecnologías similares</h2>
      <p>Utilizamos cookies y tecnologías equivalentes para:</p>
      <ul>
        <li><strong>Esenciales:</strong> mantener tu sesión iniciada y proteger contra CSRF.</li>
        <li><strong>Funcionales:</strong> recordar preferencias (idioma, modo oscuro).</li>
        <li><strong>Analíticas:</strong> medir uso del sitio en forma agregada.</li>
      </ul>
      <p>
        Podés configurar tu navegador para rechazar cookies, aunque eso
        puede afectar la funcionalidad del Servicio (especialmente el inicio
        de sesión).
      </p>

      <h2>6. Almacenamiento y seguridad</h2>
      <p>
        Tus datos se almacenan en infraestructura administrada por Supabase
        (Postgres, AWS us-west-2). Aplicamos:
      </p>
      <ul>
        <li>Cifrado en tránsito (TLS 1.2+) y en reposo (AES-256).</li>
        <li>Row Level Security (RLS) en la base de datos.</li>
        <li>Contraseñas hasheadas (no almacenamos contraseñas en texto plano).</li>
        <li>Acceso interno restringido a personal autorizado.</li>
      </ul>
      <p>
        A pesar de las medidas implementadas, ningún sistema es 100% seguro.
        En caso de incidente que comprometa datos personales, te notificaremos
        sin dilación injustificada por email.
      </p>

      <h2>7. Retención de datos</h2>
      <ul>
        <li><strong>Cuenta activa:</strong> mientras tu cuenta esté abierta y por hasta 12 meses adicionales después del último acceso.</li>
        <li><strong>Datos de facturación:</strong> conservados según obligaciones fiscales y contables aplicables (mínimo 7 años en EE. UU.).</li>
        <li><strong>Tras solicitud de eliminación:</strong> borramos tus datos en un máximo de 30 días, salvo aquellos que debamos conservar por ley.</li>
      </ul>

      <h2>8. Tus derechos</h2>
      <p>
        Podés ejercer en cualquier momento los siguientes derechos sobre tus
        datos personales:
      </p>
      <ul>
        <li><strong>Acceso:</strong> obtener copia de los datos que tenemos sobre vos.</li>
        <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
        <li><strong>Eliminación:</strong> solicitar el borrado de tus datos (&ldquo;derecho al olvido&rdquo;).</li>
        <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado y legible.</li>
        <li><strong>Oposición:</strong> oponerte al tratamiento de tus datos para fines de marketing.</li>
        <li><strong>Limitación:</strong> restringir el tratamiento en ciertas circunstancias.</li>
      </ul>
      <p>
        Para ejercer cualquiera de estos derechos, escribinos a{" "}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>{" "}
        desde la dirección de email asociada a tu cuenta. Responderemos en
        un plazo máximo de 30 días.
      </p>

      <h2>9. Transferencias internacionales</h2>
      <p>
        Dado que algunos de nuestros proveedores tienen infraestructura en
        Estados Unidos y otras regiones, tus datos pueden transferirse fuera
        de tu país de residencia. Aseguramos que dichas transferencias
        cumplan con las salvaguardas apropiadas (cláusulas contractuales
        estándar, certificaciones internacionales).
      </p>

      <h2>10. Menores de edad</h2>
      <p>
        El Servicio está dirigido a personas mayores de 18 años. No
        recolectamos conscientemente datos de menores de 13 años. Si tomamos
        conocimiento de que hemos recolectado datos de un menor sin
        consentimiento parental verificable, los eliminaremos de inmediato.
      </p>

      <h2>11. Cambios a esta política</h2>
      <p>
        Podemos actualizar esta política. Te notificaremos cambios materiales
        por email con al menos 15 días de antelación. La fecha de última
        actualización aparece al inicio de este documento.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Para consultas, ejercicio de derechos o quejas relacionadas con tus
        datos personales:
      </p>
      <p>
        <strong>Revival &amp; Kingdom Ministries, INC</strong>
        <br />
        Email:{" "}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>
      </p>

      <p className="mt-12 text-sm text-text-tertiary">
        © {new Date().getFullYear()} Revival &amp; Kingdom Ministries, INC.
        Todos los derechos reservados.
      </p>
    </LegalPageLayout>
  );
}
