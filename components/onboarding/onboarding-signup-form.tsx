"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldAlert,
} from "lucide-react";

import { type Country } from "@/lib/data/countries";
import { AR_DIAL_CODE, isArgentinePhone } from "@/lib/data/argentina";
import { findCountry } from "@/lib/data/countries";
import { SignInWithGoogle } from "@/components/auth/google-button";
import { Field, fieldCx } from "@/components/onboarding/field";
import { MarriageToggle } from "@/components/onboarding/marriage-toggle";
import { DiscountBanner } from "@/components/onboarding/discount-banner";
import {
  SpouseFields,
  EMPTY_SPOUSE,
  type SpouseData,
} from "@/components/onboarding/spouse-fields";

type Props = {
  country: Country;
  onBack: () => void;
  onSuccess: (checkoutUrl: string) => void;
};

type Errors = Record<string, string> & {
  spouse_1?: Partial<Record<keyof SpouseData, string>>;
  spouse_2?: Partial<Record<keyof SpouseData, string>>;
};

export function OnboardingSignupForm({ country, onBack, onSuccess }: Props) {
  const t = useTranslations("Onboarding.signupForm");
  const isArgentina = country.code === "AR";

  const [pending, startTransition] = useTransition();

  // GeoIP — solo nos importa para Argentina (gate del beneficio matrimonio).
  // null = todavía no detectado o local dev (sin headers Vercel).
  const [geoCountry, setGeoCountry] = useState<string | null>(null);
  const [geoChecked, setGeoChecked] = useState(false);
  useEffect(() => {
    if (!isArgentina) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/geo", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as {
          country?: string | null;
        };
        if (!cancelled) {
          setGeoCountry(json.country ?? null);
          setGeoChecked(true);
        }
      } catch {
        if (!cancelled) setGeoChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isArgentina]);

  // Bloqueo SOLO del matrimonio AR: si GeoIP detectó algo distinto a AR,
  // ocultamos el toggle. Si GeoIP devolvió null (local / sin header), no
  // bloqueamos — no podemos afirmar mismatch.
  const geoMismatch =
    isArgentina && geoChecked && geoCountry !== null && geoCountry !== "AR";
  const detectedCountryName = geoCountry
    ? findCountry(geoCountry)?.name ?? geoCountry
    : null;

  // Cuenta primaria (cónyuge 1 = quien hace el registro)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [ministryName, setMinistryName] = useState("");
  // Código promocional AR. En Stripe el campo aparece en su propio
  // checkout. En MP no existe nativo → capturamos acá y lo validamos
  // server-side (lib/coupons/validate.ts).
  const [coupon, setCoupon] = useState("");

  // Campos AR-only
  const [marriage, setMarriage] = useState(false);
  const [spouse1, setSpouse1] = useState<SpouseData>({
    ...EMPTY_SPOUSE,
    phone: AR_DIAL_CODE + " ",
  });
  const [spouse2, setSpouse2] = useState<SpouseData>({
    ...EMPTY_SPOUSE,
    phone: AR_DIAL_CODE + " ",
  });
  const [declaredResidence, setDeclaredResidence] = useState(false);

  const [errors, setErrors] = useState<Errors>({});

  // `marriage` guarda la intención del usuario (toggle). `effectiveMarriage`
  // es lo que realmente cuenta: si GeoIP detectó país distinto a AR,
  // descartamos la elección automáticamente sin tocar el state. Esto
  // evita un setState-in-effect (cascading renders) y mantiene la
  // intención si el usuario corrige país después.
  const effectiveMarriage = marriage && !geoMismatch;

  function validate(): boolean {
    const e: Errors = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      e.fullName = t("errorFullName");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = t("errorEmail");
    }
    if (password.length < 8) {
      e.password = t("errorPassword");
    }

    if (isArgentina && effectiveMarriage) {
      // Cónyuge 1: usa fullName + email + password + ministryName de arriba,
      // pero necesita phone y province propios.
      const s1: Partial<Record<keyof SpouseData, string>> = {};
      if (!isArgentinePhone(spouse1.phone)) {
        s1.phone = t("errorPhonePrefix", { code: AR_DIAL_CODE });
      }
      if (!spouse1.province) {
        s1.province = t("errorProvince");
      }
      if (Object.keys(s1).length) e.spouse_1 = s1;

      const s2: Partial<Record<keyof SpouseData, string>> = {};
      if (!spouse2.fullName.trim() || spouse2.fullName.trim().length < 3) {
        s2.fullName = t("errorSpouseFullName");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(spouse2.email)) {
        s2.email = t("errorSpouseEmail");
      }
      if (spouse2.email.trim().toLowerCase() === email.trim().toLowerCase()) {
        s2.email = t("errorSpouseEmailDistinct");
      }
      if (!isArgentinePhone(spouse2.phone)) {
        s2.phone = t("errorPhonePrefix", { code: AR_DIAL_CODE });
      }
      if (!spouse2.province) {
        s2.province = t("errorSpouseProvince");
      }
      if (Object.keys(s2).length) e.spouse_2 = s2;

      if (!declaredResidence) {
        e.declaredResidence = t("errorResidence");
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      try {
        const body: Record<string, unknown> = {
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          ministryName: ministryName.trim() || null,
          country: country.name,
          countryCode: country.code,
        };

        if (isArgentina && coupon.trim() && !effectiveMarriage) {
          body.coupon = coupon.trim().toUpperCase();
        }

        if (isArgentina && effectiveMarriage) {
          body.registrationType = "marriage";
          body.declaredResidenceInAr = declaredResidence;
          body.spouse1 = {
            fullName: fullName.trim(),
            email: email.trim(),
            phone: spouse1.phone.trim(),
            province: spouse1.province,
            ministry: ministryName.trim() || null,
          };
          body.spouse2 = {
            fullName: spouse2.fullName.trim(),
            email: spouse2.email.trim(),
            phone: spouse2.phone.trim(),
            province: spouse2.province,
            ministry: spouse2.ministry.trim() || null,
          };
        }

        const res = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          checkoutUrl?: string;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.checkoutUrl) {
          toast.error(json.error ?? t("toastError"));
          return;
        }
        toast.success(t("toastSuccess"));
        onSuccess(json.checkoutUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("toastNetworkError");
        toast.error(msg);
      }
    });
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="px-8 pb-2 pt-8 sm:px-10 sm:pt-10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={pending}
            className="inline-flex items-center gap-1.5 font-inter text-xs font-medium text-text-tertiary transition-colors hover:text-text-primary disabled:opacity-50"
          >
            <ArrowLeft className="size-3.5" />
            {t("changeCountry")}
          </button>
          <span className="font-inter text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
            {t("step")}
          </span>
        </div>

        {/* Country chip */}
        <div className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-brand-violet/30 bg-brand-violet/[0.08] px-3.5 py-1.5">
          <span className="text-base">{country.flag}</span>
          <span className="font-inter text-xs font-medium text-text-primary">
            {country.name}
          </span>
        </div>

        <h2 className="mt-5 font-grotesk text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
          {effectiveMarriage ? t("titleMarriage") : t("titleSingle")}
        </h2>
        <p className="mt-3 max-w-md font-inter text-sm leading-relaxed text-text-secondary">
          {effectiveMarriage ? t("subtitleMarriage") : t("subtitleSingle")}
        </p>
      </div>

      {/* Scrollable form */}
      <div className="mt-5 flex-1 overflow-y-auto px-8 pb-8 sm:px-10 sm:pb-10 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
        {/* Google OAuth — solo modo individual (matrimonio requiere campos extra) */}
        {!effectiveMarriage && (
          <>
            <div className="space-y-3">
              <SignInWithGoogle
                redirectTo="/suscribirme"
                label={t("googleLabel")}
                country={country.name}
                countryCode={country.code}
              />
            </div>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <span className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-surface-elevated px-3 font-inter text-xs uppercase tracking-widest text-text-tertiary">
                  {t("orWithEmail")}
                </span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* AR-only: toggle matrimonio (encima del form para que sea visible primero) */}
          {isArgentina && !geoMismatch && (
            <div className="space-y-3">
              <MarriageToggle
                checked={marriage}
                onChange={setMarriage}
                disabled={pending}
              />

              <AnimatePresence initial={false}>
                {marriage && (
                  <motion.div
                    key="banner"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <DiscountBanner />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* AR + GeoIP mismatch: explainer + opción de cambiar país */}
          {isArgentina && geoMismatch && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-amber-500/[0.05] p-4">
              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                  <ShieldAlert className="size-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-grotesk text-sm font-semibold text-text-primary">
                    {t("geoMismatchTitle")}
                  </p>
                  <p className="mt-1 font-inter text-xs leading-relaxed text-text-secondary">
                    {t("geoMismatchBodyBefore")}
                    <span className="font-semibold text-text-primary">
                      {detectedCountryName}
                    </span>
                    {t("geoMismatchBodyAfter")}
                  </p>
                  <button
                    type="button"
                    onClick={onBack}
                    className="mt-3 inline-flex items-center gap-1.5 font-inter text-xs font-medium text-brand-coral transition-colors hover:text-text-primary"
                  >
                    <ArrowLeft className="size-3.5" />
                    {t("geoMismatchChange", {
                      country:
                        detectedCountryName ?? t("geoMismatchChangeFallback"),
                    })}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cuenta primaria */}
          <Field
            label={effectiveMarriage ? t("fullNameMarriage") : t("fullNameSingle")}
            error={errors.fullName}
            input={
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                disabled={pending}
                className={fieldCx(!!errors.fullName)}
              />
            }
          />
          <Field
            label={effectiveMarriage ? t("emailMarriage") : t("emailSingle")}
            error={errors.email}
            input={
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={pending}
                className={fieldCx(!!errors.email)}
              />
            }
          />
          <Field
            label={t("passwordLabel")}
            hint={t("passwordHint")}
            error={errors.password}
            input={
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={pending}
                className={fieldCx(!!errors.password)}
              />
            }
          />
          <Field
            label={t("ministryLabel")}
            hint={t("ministryHint")}
            input={
              <input
                type="text"
                value={ministryName}
                onChange={(e) => setMinistryName(e.target.value)}
                disabled={pending}
                className={fieldCx(false)}
              />
            }
          />

          {/* AR + matrimonio: campos extra del cónyuge 1 (phone + province) */}
          <AnimatePresence initial={false}>
            {isArgentina && effectiveMarriage && (
              <motion.div
                key="marriage-extra"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-5 pt-2">
                  {/* Spouse 1 extra fields */}
                  <SpouseFields
                    prefix="spouse_1"
                    legendNumber={1}
                    data={{
                      fullName,
                      email,
                      phone: spouse1.phone,
                      province: spouse1.province,
                      ministry: ministryName,
                    }}
                    errors={errors.spouse_1 ?? {}}
                    disabled={pending}
                    onChange={(next) => setSpouse1(next)}
                    hideName
                    hideMinistry
                  />

                  <div className="my-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-white/[0.06]" />
                    <span className="font-inter text-[10px] uppercase tracking-[0.32em] text-text-tertiary">
                      {t("spouse2Divider")}
                    </span>
                    <span className="h-px flex-1 bg-white/[0.06]" />
                  </div>

                  <SpouseFields
                    prefix="spouse_2"
                    legendNumber={2}
                    data={spouse2}
                    errors={errors.spouse_2 ?? {}}
                    disabled={pending}
                    onChange={setSpouse2}
                  />

                  {/* Declaración de residencia */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]">
                    <input
                      type="checkbox"
                      checked={declaredResidence}
                      onChange={(e) =>
                        setDeclaredResidence(e.target.checked)
                      }
                      disabled={pending}
                      className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand-violet"
                    />
                    <span className="font-inter text-xs leading-relaxed text-text-secondary">
                      {t("residenceDeclaration")}
                    </span>
                  </label>
                  {errors.declaredResidence && (
                    <p className="-mt-2 font-inter text-xs text-brand-coral">
                      {errors.declaredResidence}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cupón promocional — solo AR individuales (Stripe lo pide en su propio checkout) */}
          {isArgentina && !effectiveMarriage && !geoMismatch && (
            <Field
              label="¿Tenés código promocional?"
              hint="Opcional · DAP-HONOR / DAP-VIP"
              input={
                <input
                  type="text"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  disabled={pending}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="DAP-VIP"
                  className={fieldCx(false)}
                />
              }
            />
          )}

          <button
            type="submit"
            disabled={pending}
            className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-brand-violet via-brand-coral to-brand-violet bg-[length:200%_100%] bg-left px-6 py-3.5 font-inter text-sm font-semibold text-white shadow-lg shadow-brand-coral/20 transition-all hover:bg-right disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {effectiveMarriage
                  ? t("submitCreatingMarriage")
                  : t("submitCreatingSingle")}
              </>
            ) : (
              <>
                {effectiveMarriage ? t("submitMarriage") : t("submitSingle")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          {/* Trust badges */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 font-inter text-xs text-text-tertiary">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" />
              {t("trustNoCommitment")}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" />
              {t("trustCancel")}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3 text-brand-coral" />
              {t("trustStripe")}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

