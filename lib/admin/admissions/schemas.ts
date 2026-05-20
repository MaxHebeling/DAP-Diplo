import { z } from "zod";

// Motivos predefinidos + "otro" libre. Definimos las labels acá para
// que el UI las consuma y el server las guarde como texto completo en
// admissions.rejection_reason (el alumno verá el texto, no el enum).
export const REJECTION_REASONS = [
  {
    value: "consent_invalid",
    label: "Carta de consentimiento no válida",
    text:
      "La carta de consentimiento que recibimos no cumple con los requisitos (firma del pastor / formato legible).",
  },
  {
    value: "incomplete_data",
    label: "Datos incompletos o no verificables",
    text:
      "No pudimos verificar la información ministerial provista en tu solicitud.",
  },
  {
    value: "not_right_time",
    label: "No es momento de iniciar",
    text:
      "Te sugerimos retomar la admisión cuando tu contexto pastoral esté más asentado.",
  },
  {
    value: "other",
    label: "Otro motivo (escribir)",
    text: null,
  },
] as const;

export type RejectionReasonValue =
  (typeof REJECTION_REASONS)[number]["value"];

export const approveAdmissionSchema = z.object({
  admissionId: z.string().uuid(),
});

export const rejectAdmissionSchema = z
  .object({
    admissionId: z.string().uuid(),
    reasonValue: z.enum(
      REJECTION_REASONS.map((r) => r.value) as [
        RejectionReasonValue,
        ...RejectionReasonValue[],
      ],
    ),
    customReason: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.reasonValue !== "other") return true;
      return !!data.customReason && data.customReason.trim().length >= 5;
    },
    {
      message: "Si elegís 'Otro motivo', escribí al menos 5 caracteres.",
      path: ["customReason"],
    },
  );

export type RejectAdmissionInput = z.infer<typeof rejectAdmissionSchema>;

/**
 * Devuelve el texto final que se persiste y se envía por email.
 */
export function resolveRejectionText(input: {
  reasonValue: RejectionReasonValue;
  customReason?: string;
}): string {
  if (input.reasonValue === "other") {
    return (input.customReason ?? "").trim();
  }
  const found = REJECTION_REASONS.find((r) => r.value === input.reasonValue);
  return found?.text ?? "Tu solicitud no fue aprobada en esta convocatoria.";
}
