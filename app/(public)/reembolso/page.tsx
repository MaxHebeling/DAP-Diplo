import Link from "next/link";
import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";

const UPDATED_AT = "19 de mayo de 2026";

export const metadata: Metadata = {
  title: "Política de reembolso",
  description:
    "Garantía de devolución de 7 días en el Diplomado Apostólico Pastoral. Modelo de suscripción mensual con cancelación libre.",
  alternates: { canonical: "/reembolso" },
};

export default function ReembolsoPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Política de reembolso"
      updatedAt={UPDATED_AT}
    >
      <p>
        Queremos que entres al Diplomado Apostólico Pastoral{" "}
        <strong>(&ldquo;DAP&rdquo;)</strong> con confianza y sin riesgo
        económico. Esta política explica cuándo y cómo puedes solicitar la
        devolución de tu dinero.
      </p>

      <h2>1. Garantía de 7 días</h2>
      <p>
        <strong>
          Tienes 7 días corridos desde tu primer cobro para pedir un
          reembolso íntegro
        </strong>
        , sin necesidad de justificar el motivo. Si dentro de ese plazo
        sientes que el DAP no es para ti, te devolvemos el 100% de los{" "}
        <strong>USD $25</strong> pagados.
      </p>

      <h2>2. Cómo solicitar el reembolso</h2>
      <ol>
        <li>
          Envía un email a{" "}
          <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>{" "}
          desde la misma dirección con la que creaste tu cuenta.
        </li>
        <li>
          Asunto: <em>&ldquo;Solicitud de reembolso DAP&rdquo;</em>.
        </li>
        <li>
          Incluí: nombre completo y fecha del cobro (o el último 4 de la
          tarjeta).
        </li>
      </ol>
      <p>
        Procesamos el reembolso en un máximo de{" "}
        <strong>5 días hábiles</strong> desde la recepción del pedido. El
        crédito aparece en tu tarjeta o medio de pago entre 5 y 10 días
        hábiles adicionales, según los tiempos de tu banco emisor.
      </p>

      <h2>3. Después de los 7 días</h2>
      <p>
        Pasada la ventana de garantía,{" "}
        <strong>
          no otorgamos reembolsos parciales ni totales por los meses ya
          cobrados
        </strong>
        . Esto incluye:
      </p>
      <ul>
        <li>Suscripciones canceladas a la mitad del mes (mantenés acceso hasta el fin del período pagado).</li>
        <li>Olvidos de cancelar antes del cobro recurrente.</li>
        <li>Falta de tiempo o motivación personal para completar el contenido del mes.</li>
      </ul>
      <p>
        El modelo del DAP es de tipo Netflix: cancelas cuando quieres, dejas
        de pagar el próximo mes, pero el mes ya cobrado se cumple.
      </p>

      <h2>4. Modelo Netflix — sin penalidades por no avanzar</h2>
      <p>
        La suscripción opera bajo modelo Netflix: el cobro mensual continúa
        mientras la suscripción esté activa, independientemente del avance
        académico. Si una semana no completaste la tarea, no hay penalidad
        — simplemente queda como pendiente y el contenido sigue accesible.
        Para certificarte del bloque vas a necesitar aprobar los 8 módulos
        en algún momento, pero puedes hacerlo a tu ritmo.
      </p>
      <p>
        Si en algún momento decides no continuar, simplemente cancelas la
        suscripción desde tu dashboard y dejas de pagar a partir del mes
        siguiente. <strong>No hay penalidades de cancelación.</strong> Tu
        progreso queda guardado: si reactivas, retomas desde la semana en
        que dejaste.
      </p>

      <h2>5. Casos especiales</h2>
      <h3>5.1 Cobro duplicado o error técnico</h3>
      <p>
        Si recibes un cobro que no corresponde, escríbenos de inmediato y lo
        revertimos sin costo. El plazo de 7 días no aplica en estos casos.
      </p>
      <h3>5.2 Fraude o uso no autorizado</h3>
      <p>
        Si alguien usó tu tarjeta sin autorización para suscribirse al DAP,
        avísanos en cuanto lo detectes para investigar y reembolsar el cargo.
      </p>
      <h3>5.3 Suspensión por incumplimiento de términos</h3>
      <p>
        Si suspendemos o cancelamos tu cuenta por violación de los{" "}
        <Link href="/terminos">Términos y condiciones</Link>, no se otorgan
        reembolsos por períodos ya cobrados.
      </p>

      <h2>6. Procesamiento del reembolso</h2>
      <p>
        Los reembolsos se procesan a través de Stripe, Inc. al mismo medio de
        pago original. No emitimos reembolsos en efectivo, transferencias
        bancarias alternativas, criptomonedas ni a tarjetas distintas a la
        original.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Para solicitudes o consultas sobre reembolsos:
      </p>
      <p>
        <strong>Revival &amp; Kingdom Ministries, INC</strong>
        <br />
        Email:{" "}
        <Link href="mailto:office@rkchurch.com">office@rkchurch.com</Link>
      </p>

      <p className="mt-12 text-sm text-text-tertiary">
        Esta política forma parte de nuestros{" "}
        <Link href="/terminos">Términos y condiciones</Link>. En caso de
        discrepancia entre este documento y los Términos, prevalecen los
        Términos.
      </p>

      <p className="mt-2 text-sm text-text-tertiary">
        © {new Date().getFullYear()} Revival &amp; Kingdom Ministries, INC.
      </p>
    </LegalPageLayout>
  );
}
