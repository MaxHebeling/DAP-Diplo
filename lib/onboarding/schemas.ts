import { z } from "zod";

const spouseSchema = z.object({
  fullName: z.string().min(3).max(120),
  email: z.string().email().max(120),
  phone: z.string().min(6).max(40),
  province: z.string().min(1).max(80),
  ministry: z.string().max(120).nullable().optional(),
});

const basePayload = {
  email: z.string().email("Email inválido").max(120),
  password: z.string().min(8, "Mínimo 8 caracteres").max(80),
  fullName: z.string().min(3, "Nombre muy corto").max(120),
  ministryName: z.string().max(120).nullable(),
  country: z.string().min(1).max(80),
  countryCode: z.string().length(2),
};

export const individualSchema = z.object({
  ...basePayload,
  registrationType: z.literal("individual").optional(),
  coupon: z.string().max(40).optional().nullable(),
  // AR only: el alumno elige cómo pagar.
  //   'card' → Preapproval (auto-cobro recurrente, tarjeta o saldo MP)
  //   'cash' → Checkout Pro (one-shot mensual; incluye RapiPago/PagoFácil)
  paymentMethod: z.enum(["card", "cash"]).optional(),
});

export const marriageSchema = z.object({
  ...basePayload,
  registrationType: z.literal("marriage"),
  declaredResidenceInAr: z.boolean(),
  spouse1: spouseSchema,
  spouse2: spouseSchema,
  paymentMethod: z.enum(["card", "cash"]).optional(),
  // DAP-VIP / DAP-HONOR → 100% off, cubre a los 2 cónyuges.
  coupon: z.string().max(40).optional().nullable(),
});

export const payloadSchema = z.union([marriageSchema, individualSchema]);

export type OnboardingPayload = z.infer<typeof payloadSchema>;
export type MarriagePayload = z.infer<typeof marriageSchema>;
export type IndividualPayload = z.infer<typeof individualSchema>;

export function isMarriagePayload(
  data: OnboardingPayload,
): data is MarriagePayload {
  return "registrationType" in data && data.registrationType === "marriage";
}
