import Link from "next/link";
import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";

const UPDATED_AT = "19 de mayo de 2026";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Términos y condiciones de uso del Diplomado Apostólico Pastoral (DAP), operado por Revival & Kingdom Ministries, INC.",
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Términos y condiciones"
      updatedAt={UPDATED_AT}
    >
      <p>
        Bienvenido al Diplomado Apostólico Pastoral (en adelante,{" "}
        <strong>&ldquo;DAP&rdquo;</strong> o <strong>&ldquo;el Servicio&rdquo;</strong>). Estos términos
        regulan tu acceso y uso del sitio web{" "}
        <Link href="/">dapglobal.org</Link> y de cualquier producto, contenido
        o servicio relacionado.
      </p>

      <p>
        El Servicio es operado por{" "}
        <strong>Revival &amp; Kingdom Ministries, INC</strong>, entidad
        constituida bajo las leyes del Estado de California, Estados Unidos de
        América (en adelante, <strong>&ldquo;nosotros&rdquo;</strong> o{" "}
        <strong>&ldquo;la Compañía&rdquo;</strong>).
      </p>

      <p>
        Al crear una cuenta, suscribirte o utilizar el Servicio aceptás estos
        Términos en su totalidad. Si no estás de acuerdo, no utilices el
        Servicio.
      </p>

      <h2>1. Descripción del servicio</h2>
      <p>
        El DAP es un programa educativo online de formación apostólica
        integral de 18 meses, organizado en 9 bloques temáticos
        (72 módulos en total, 1 módulo por semana). Incluye clases
        pre-grabadas, sesiones en vivo por evento (MasterClass + mentoría),
        corrección personalizada de tareas escritas con feedback en la voz
        del Dr. Max Hebeling (48h tras la entrega), comunidad de pastores
        y acceso a un tutor con inteligencia artificial entrenado con el
        material del programa.
      </p>
      <p>
        El ingreso al programa requiere un{" "}
        <strong>proceso de admisión formal</strong>: el aspirante completa
        un formulario y, si no pertenece a la Red Apostólica Reino y
        Avivamiento ni a Revival &amp; Kingdom Ministries, INC, debe
        adjuntar una carta de consentimiento firmada por su pastor. La
        admisión es revisada y aprobada manualmente por el equipo de
        admisiones.
      </p>
      <p>
        Una vez aprobada la admisión, el contenido se libera por{" "}
        <strong>calendario semanal personal</strong>: el módulo de la
        semana abre cada martes (00:01 hora de San Diego, California) y la
        tarea cierra el lunes siguiente (23:59). El contenido pasado
        queda disponible para repaso indefinidamente.
      </p>

      <h2>2. Cuenta de usuario</h2>
      <p>
        Para acceder al Servicio debés crear una cuenta proporcionando
        información veraz, actualizada y completa. Sos responsable de la
        confidencialidad de tu contraseña y de toda actividad que ocurra bajo
        tu cuenta.
      </p>
      <ul>
        <li>Debés ser mayor de 18 años (o tener consentimiento parental verificable si tenés entre 13 y 17 años).</li>
        <li>Una cuenta corresponde a una persona física. No se permite el uso compartido.</li>
        <li>Notificá de inmediato cualquier uso no autorizado a{" "}
          <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>.
        </li>
      </ul>

      <h2>3. Suscripción y pagos</h2>
      <p>
        El acceso al DAP requiere una suscripción mensual de{" "}
        <strong>USD $25.00</strong> procesada por Stripe, Inc. La suscripción
        se renueva automáticamente cada mes en la fecha aniversario de la
        inscripción hasta que el usuario la cancele.
      </p>
      <h3>3.1 Modelo de cancelación</h3>
      <p>
        La suscripción opera bajo modelo Netflix: el cobro mensual continúa
        mientras la suscripción esté activa, independientemente del avance
        académico del usuario. El calendario semanal manda — el usuario
        recibe 1 módulo nuevo por semana mientras la suscripción esté al
        día. Si el usuario no completa la tarea de una semana, no hay
        penalización en el cobro: simplemente la tarea queda como pendiente
        y el contenido sigue accesible para repaso.
      </p>
      <h3>3.2 Cancelación</h3>
      <p>
        Podés cancelar la suscripción en cualquier momento desde la sección
        &ldquo;Mi suscripción&rdquo; de tu cuenta o desde el portal de Stripe. La
        cancelación detiene cobros futuros pero te permite seguir accediendo
        al contenido hasta el final del período mensual ya pagado. Tu
        progreso académico se conserva: si reactivás más adelante,
        retomás desde la semana en que dejaste.
      </p>

      <h2>4. Política de reembolso</h2>
      <p>
        Ofrecemos una{" "}
        <strong>garantía de devolución de 7 días</strong> contados desde la
        fecha del primer cobro. Si no estás conforme con el Servicio, podés
        solicitar el reembolso íntegro de tu primer pago dentro de ese plazo
        escribiendo a{" "}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>.
      </p>
      <p>
        Una vez transcurridos los 7 días, o si se trata de cobros mensuales
        posteriores al primero, no se otorgan reembolsos parciales ni totales.
        El usuario mantiene acceso al contenido hasta el fin del período
        mensual pagado.
      </p>
      <p>
        Más detalle en{" "}
        <Link href="/reembolso">Política de reembolso</Link>.
      </p>

      <h2>5. Propiedad intelectual</h2>
      <p>
        Todo el contenido del DAP (videos, textos, audios, PDFs, evaluaciones,
        marca, logos, diseño, código y materiales descargables) es propiedad
        exclusiva de Revival &amp; Kingdom Ministries, INC o de sus
        licenciantes, y está protegido por leyes de propiedad intelectual de
        Estados Unidos e internacionales.
      </p>
      <p>
        Se otorga al usuario una licencia limitada, no exclusiva, no
        transferible y revocable para acceder al contenido únicamente con
        fines de formación personal mientras la suscripción esté activa.
      </p>
      <p>Queda expresamente prohibido:</p>
      <ul>
        <li>Reproducir, distribuir, retransmitir, vender, licenciar o explotar comercialmente cualquier parte del contenido.</li>
        <li>Grabar, descargar (excepto los materiales identificados como descargables) o redistribuir las sesiones en vivo.</li>
        <li>Crear obras derivadas a partir del contenido del DAP.</li>
        <li>Compartir credenciales de acceso con terceros.</li>
      </ul>

      <h2>6. Certificados y dimensiones ministeriales</h2>
      <p>
        Los certificados y dimensiones otorgadas al completar bloques del DAP
        (Discípulo, Hijo, Líder, Ministro, Administrador, Mayordomo,
        Reformador, Arquitecto, Enviado) son emitidos por Revival &amp;
        Kingdom Ministries, INC y reconocidos dentro de su red ministerial.
        No constituyen títulos académicos universitarios ni grados con
        validez oficial estatal.
      </p>

      <h2>7. Conducta del usuario</h2>
      <p>
        En el uso del Servicio te comprometés a:
      </p>
      <ul>
        <li>No violar leyes aplicables ni derechos de terceros.</li>
        <li>No usar el Servicio para difundir contenido ofensivo, discriminatorio, ilegal o difamatorio.</li>
        <li>No intentar acceder a áreas restringidas, manipular el sistema, evadir el gating académico ni piratear módulos.</li>
        <li>Respetar a los demás miembros de la comunidad.</li>
      </ul>
      <p>
        El incumplimiento puede resultar en la suspensión o cancelación de tu
        cuenta sin reembolso.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        El Servicio se proporciona &ldquo;tal cual&rdquo; y &ldquo;según
        disponibilidad&rdquo;. En la máxima medida permitida por la ley,
        Revival &amp; Kingdom Ministries, INC no será responsable por daños
        indirectos, incidentales, especiales, consecuentes ni punitivos
        derivados del uso o imposibilidad de uso del Servicio.
      </p>
      <p>
        La responsabilidad total agregada de la Compañía no excederá el
        monto total pagado por el usuario en los 12 meses anteriores al
        evento que origine el reclamo.
      </p>

      <h2>9. Modificaciones</h2>
      <p>
        Podemos actualizar estos Términos en cualquier momento. Notificaremos
        cambios materiales por email a los usuarios activos al menos 15 días
        antes de su entrada en vigor. El uso continuado del Servicio luego
        de la entrada en vigor implica aceptación de los nuevos Términos.
      </p>

      <h2>10. Terminación</h2>
      <p>
        Podemos suspender o terminar tu cuenta, con o sin previo aviso, en
        caso de incumplimiento de estos Términos o si determinamos, a nuestra
        razonable discreción, que tu uso del Servicio es perjudicial para
        otros usuarios o para la Compañía.
      </p>

      <h2>11. Ley aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por las leyes del Estado de California,
        Estados Unidos de América, sin atender a sus conflictos de leyes.
      </p>
      <p>
        Cualquier disputa derivada de estos Términos o del uso del Servicio
        será sometida a la jurisdicción exclusiva de los tribunales estatales
        y federales con sede en el Estado de California, EE. UU.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Para cualquier consulta sobre estos Términos podés escribirnos a{" "}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>.
      </p>

      <p className="mt-12 text-sm text-text-tertiary">
        © {new Date().getFullYear()} Revival &amp; Kingdom Ministries, INC.
        Todos los derechos reservados.
      </p>
    </LegalPageLayout>
  );
}
