"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Loader2, Mail, MessageCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { captureLeadAction } from "@/lib/leads/actions";
import { createClient } from "@/lib/supabase/client";

/**
 * Widget de lead capture flotante.
 *
 * Botón flotante bottom-left que abre un formulario premium con email +
 * nombre + mensaje opcional. Captura via captureLeadAction → tabla
 * `leads`.
 *
 * NOTA: el beacon de visit_log se maneja en un componente separado
 * (<VisitBeacon />) montado en el mismo layout. NO duplicar acá.
 *
 * Posición: bottom-LEFT para no competir con el bubble de Esdras en
 * el portal del alumno (que va bottom-right). En el sitio público no
 * convive con Esdras así que tampoco hay conflicto.
 */
export function LeadCaptureWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Detección de sesión: si el usuario está logueado, NO mostramos el
  // widget (el lead solo tiene sentido para visitantes anónimos).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  // Si el usuario está logueado o aún estamos detectando, no renderizar.
  // (Renderizar mientras isLoggedIn===null causaría un flash del botón
  // a usuarios autenticados.)
  if (isLoggedIn !== false) return null;

  return (
    <>
      <FloatingButton onClick={() => setOpen(true)} hidden={open} />
      <AnimatePresence>
        {open && (
          <LeadSheet
            onClose={() => setOpen(false)}
            pagePath={pathname ?? null}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function FloatingButton({
  onClick,
  hidden,
}: {
  onClick: () => void;
  hidden: boolean;
}) {
  const t = useTranslations("LeadCapture.button");
  if (hidden) return null;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2.5 rounded-full border border-brand-violet/35 bg-[#04081A]/95 py-2.5 pl-3 pr-5 shadow-[0_10px_40px_-10px_rgba(123,97,255,0.55)] backdrop-blur-xl transition-all hover:border-brand-violet/60 hover:shadow-[0_15px_50px_-12px_rgba(123,97,255,0.75)] lg:bottom-6 lg:left-6"
      aria-label={t("ariaLabel")}
    >
      <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-violet to-brand-coral text-white">
        <MessageCircle className="size-4" strokeWidth={2} />
      </div>
      <span className="font-grotesk text-sm font-semibold text-text-primary">
        {t("label")}
      </span>
    </motion.button>
  );
}

function LeadSheet({
  onClose,
  pagePath,
}: {
  onClose: () => void;
  pagePath: string | null;
}) {
  const t = useTranslations("LeadCapture.modal");
  const tErr = useTranslations("LeadCapture.errors");
  const [state, formAction] = useActionState(captureLeadAction, undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Resetear submitting cuando llega la respuesta del server action
    // (state pasa de undefined → {ok|error}). El useActionState es el
    // "sistema externo" desde el punto de vista del lint rule.
    if (state) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubmitting(false);
    }
  }, [state]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-4 left-4 right-4 top-auto z-50 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-[#04081A] shadow-2xl ring-1 ring-white/[0.08] sm:bottom-6 sm:left-6 sm:right-auto sm:w-[420px]"
        role="dialog"
      >
        {state?.ok ? (
          <ThanksState onClose={onClose} duplicated={state.duplicated} />
        ) : (
          <form
            action={(fd) => {
              setSubmitting(true);
              formAction(fd);
            }}
            className="p-6"
          >
            <input type="hidden" name="source" value="landing" />
            {pagePath && (
              <input type="hidden" name="pagePath" value={pagePath} />
            )}
            {/* Honeypot — bots tienden a llenar todos los inputs.
                CSS-hidden con label para que screen readers también skipean. */}
            <div className="absolute -left-[9999px]" aria-hidden>
              <label>
                Website
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-coral/15 text-brand-coral">
                <Mail className="size-5" strokeWidth={1.8} />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
                aria-label={t("close")}
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>

            <p className="mt-4 font-inter text-[10px] font-semibold uppercase tracking-[0.42em] text-brand-coral">
              {t("eyebrow")}
            </p>
            <h3 className="mt-2 font-grotesk text-xl font-bold leading-tight text-text-primary sm:text-2xl">
              {t("title")}
            </h3>
            <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
              {t("subtitle")}
            </p>

            <div className="mt-5 space-y-3">
              <input
                type="email"
                name="email"
                required
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
                disabled={submitting}
                className={fieldCx}
              />
              <input
                type="text"
                name="fullName"
                placeholder={t("namePlaceholder")}
                autoComplete="name"
                disabled={submitting}
                className={fieldCx}
              />
              <textarea
                name="message"
                rows={3}
                placeholder={t("messagePlaceholder")}
                disabled={submitting}
                className={`${fieldCx} resize-none`}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-violet to-brand-coral px-6 py-3 font-inter text-sm font-semibold text-white shadow-lg shadow-brand-coral/20 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </button>

            {state && !state.ok && (
              <p className="mt-3 text-center font-inter text-xs text-brand-coral">
                {translateServerError(state.error, tErr)}
              </p>
            )}

            <p className="mt-4 text-center font-inter text-[10px] text-text-tertiary">
              {t("privacy")}
            </p>
          </form>
        )}
      </motion.div>
    </>
  );
}

function ThanksState({
  onClose,
  duplicated,
}: {
  onClose: () => void;
  duplicated: boolean;
}) {
  const t = useTranslations("LeadCapture.thanks");
  return (
    <div className="p-8 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
        <CheckCircle2 className="size-7" strokeWidth={1.8} />
      </div>
      <h3 className="mt-5 font-grotesk text-xl font-bold text-text-primary">
        {duplicated ? t("titleDuplicated") : t("titleNew")}
      </h3>
      <p className="mt-3 font-inter text-sm leading-relaxed text-text-secondary">
        {duplicated ? t("bodyDuplicated") : t("bodyNew")}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 inline-flex items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] px-6 py-2.5 font-inter text-xs font-medium text-text-secondary backdrop-blur-sm transition-all hover:bg-white/[0.08] hover:text-text-primary"
      >
        {t("close")}
      </button>
    </div>
  );
}

/**
 * Mapea el `error` string que viene del server action al mensaje
 * traducido del namespace `LeadCapture.errors`. Los strings del server
 * llegan en español (action no tiene acceso a locale del request);
 * acá los re-traducimos al locale activo del browser.
 */
function translateServerError(
  serverError: string,
  tErr: ReturnType<typeof useTranslations>,
): string {
  const lower = serverError.toLowerCase();
  if (lower.includes("demasiados") || lower.includes("too many")) {
    return tErr("rateLimit");
  }
  if (lower.includes("email") || lower.includes("inv")) {
    return tErr("invalidEmail");
  }
  return tErr("generic");
}

const fieldCx =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-inter text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-brand-violet/40 focus:bg-white/[0.05] focus:ring-4 focus:ring-brand-violet/15";
