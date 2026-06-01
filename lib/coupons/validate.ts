/**
 * Validación local de cupones DAP.
 *
 * En Stripe los cupones DAP-HONOR y DAP-VIP están creados como
 * Promotion Codes apuntando a un Coupon de 100% off duration=forever.
 * Stripe los valida nativamente en el Checkout.
 *
 * Mercado Pago NO tiene Promotion Codes nativos para Preapproval —
 * por eso replicamos la lógica acá. Si el alumno ingresa un cupón
 * válido al subscribirse desde Argentina, creamos el preapproval con
 * monto = 0 (MP lo acepta como subscripción "free trial perpetua").
 *
 * Mantener sincronizado con los Promotion Codes de Stripe.
 */

export type CouponValidation =
  | { valid: true; code: "DAP-HONOR" | "DAP-VIP"; percentOff: 100 }
  | { valid: false; reason: string };

const VALID_CODES = new Set(["DAP-HONOR", "DAP-VIP"]);

export function validateCoupon(rawInput: string | null | undefined): CouponValidation {
  if (!rawInput) return { valid: false, reason: "Sin cupón ingresado" };
  const code = rawInput.trim().toUpperCase();
  if (!code) return { valid: false, reason: "Cupón vacío" };
  if (!VALID_CODES.has(code)) {
    return { valid: false, reason: "Cupón inválido o desactivado" };
  }
  return {
    valid: true,
    code: code as "DAP-HONOR" | "DAP-VIP",
    percentOff: 100,
  };
}

/**
 * Aplica el descuento al monto base. Si el cupón es 100%, devuelve 0.
 */
export function applyCoupon(amount: number, coupon: CouponValidation): number {
  if (!coupon.valid) return amount;
  if (coupon.percentOff === 100) return 0;
  return Math.max(0, Math.round(amount * (1 - coupon.percentOff / 100)));
}
