"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ALL_DIAL_CODES,
  COUNTRIES,
  COUNTRY_DIAL_ID,
  NETWORK_OPTIONS,
  admissionFormSchema,
  type AdmissionFormInput,
} from "@/lib/admission/schemas";
import { DapButton } from "@/components/ui-dap/button";
import { FileDropzone } from "@/components/admission/file-dropzone";
import { submitAdmissionAction } from "./actions";

type AdmissionFormProps = {
  prefill: {
    fullName: string;
    email: string;
  };
};

type FieldErrors = Partial<Record<keyof AdmissionFormInput, string>>;

export function AdmissionForm({ prefill }: AdmissionFormProps) {
  const t = useTranslations("AdmissionForm");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Local state (UX simple, sin react-hook-form para no agregar deps)
  const [fullName, setFullName] = useState(prefill.fullName ?? "");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState<AdmissionFormInput["country"]>("México");
  const [countryOther, setCountryOther] = useState("");
  const [city, setCity] = useState("");
  // Phone split: dial id (ej "MX", "US", "CA") + local number.
  // El id distingue entre países que comparten +1 (USA, Canadá, PR, RD).
  // El dial code real se lookup desde ALL_DIAL_CODES.
  const [dialId, setDialId] = useState<string>(COUNTRY_DIAL_ID["México"]);
  const [phoneLocal, setPhoneLocal] = useState("");
  const dialCode =
    ALL_DIAL_CODES.find((d) => d.id === dialId)?.code ?? "";
  const phone = `${dialCode} ${phoneLocal.trim()}`.trim();
  const [email] = useState(prefill.email ?? "");

  const [churchName, setChurchName] = useState("");
  const [ministryName, setMinistryName] = useState("");
  const [profession, setProfession] = useState("");
  const [companyOrSector, setCompanyOrSector] = useState("");

  const [belongsToNetwork, setBelongsToNetwork] = useState<boolean | null>(null);
  const [networkName, setNetworkName] =
    useState<AdmissionFormInput["network_name"]>("");
  const [consentFile, setConsentFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<FieldErrors>({});

  function clientValidate(): boolean {
    const data: AdmissionFormInput = {
      full_name: fullName.trim(),
      birth_date: birthDate,
      country,
      country_other: country === "Otro" ? countryOther.trim() : undefined,
      city: city.trim(),
      phone: phone.trim(),
      email,
      church_name: churchName.trim() || undefined,
      ministry_name: ministryName.trim() || undefined,
      profession: profession.trim() || undefined,
      company_or_sector: companyOrSector.trim() || undefined,
      belongs_to_network: belongsToNetwork === true,
      network_name: belongsToNetwork ? networkName : undefined,
      consent_letter_url: belongsToNetwork
        ? undefined
        : consentFile
          ? "pending-upload"
          : undefined,
    };
    const result = admissionFormSchema.safeParse(data);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fe: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof AdmissionFormInput;
      if (!fe[key]) fe[key] = issue.message;
    }
    setErrors(fe);
    return false;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (belongsToNetwork === null) {
      setErrors({
        belongs_to_network: t("selectNetworkError"),
      });
      return;
    }
    if (!clientValidate()) {
      toast.error(t("reviewFieldsError"));
      return;
    }

    const fd = new FormData();
    fd.set("full_name", fullName.trim());
    fd.set("birth_date", birthDate);
    fd.set("country", country);
    if (country === "Otro") fd.set("country_other", countryOther.trim());
    fd.set("city", city.trim());
    fd.set("phone", phone.trim());
    fd.set("email", email);
    if (churchName) fd.set("church_name", churchName.trim());
    if (ministryName) fd.set("ministry_name", ministryName.trim());
    if (profession) fd.set("profession", profession.trim());
    if (companyOrSector) fd.set("company_or_sector", companyOrSector.trim());
    fd.set("belongs_to_network", belongsToNetwork ? "true" : "false");
    if (belongsToNetwork && networkName) fd.set("network_name", networkName);
    if (!belongsToNetwork && consentFile)
      fd.set("consent_letter", consentFile);

    startTransition(async () => {
      const res = await submitAdmissionAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        if (res.fieldErrors) {
          setErrors(res.fieldErrors as FieldErrors);
        }
        return;
      }
      toast.success(t("submittedSuccess"));
      router.push("/admision/estado");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12" noValidate>
      {/* Sección 1 — Datos personales */}
      <Section title={t("section1Title")} subtitle={t("section1Subtitle")}>
        <Field label={t("fullName")} error={errors.full_name} required>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("birthDate")} error={errors.birth_date} required>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </Field>
          <Field label={t("email")} error={errors.email} hint={t("emailHint")}>
            <Input type="email" value={email} disabled />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("country")} error={errors.country} required>
            <Select
              value={country}
              onChange={(e) => {
                const next = e.target.value as AdmissionFormInput["country"];
                setCountry(next);
                // Auto-sync: si el país tiene id en el dropdown, lo seleccionamos.
                const nextId = COUNTRY_DIAL_ID[next];
                if (nextId) setDialId(nextId);
              }}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          {country === "Otro" && (
            <Field label={t("countryOther")} error={errors.country_other} required>
              <Input
                value={countryOther}
                onChange={(e) => setCountryOther(e.target.value)}
                placeholder={t("countryOtherPlaceholder")}
              />
            </Field>
          )}
          <Field label={t("city")} error={errors.city} required>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
        </div>

        <Field
          label={t("phone")}
          error={errors.phone}
          hint={t("phoneHint")}
          required
        >
          <div className="flex gap-2">
            <Select
              value={dialId}
              onChange={(e) => setDialId(e.target.value)}
              className="w-24 shrink-0 sm:w-28"
              aria-label={t("countryCode")}
              title={
                ALL_DIAL_CODES.find((d) => d.id === dialId)?.country ?? ""
              }
            >
              {ALL_DIAL_CODES.map((d) => (
                <option key={d.id} value={d.id} title={d.country}>
                  {d.label}
                </option>
              ))}
            </Select>
            <Input
              type="tel"
              value={phoneLocal}
              onChange={(e) => setPhoneLocal(e.target.value)}
              autoComplete="tel-national"
              inputMode="tel"
              className="flex-1"
            />
          </div>
        </Field>
      </Section>

      {/* Sección 2 — Pertenencia */}
      <Section
        title={t("section2Title")}
        subtitle={t("section2Subtitle")}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("church")} error={errors.church_name}>
            <Input
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              placeholder={t("churchPlaceholder")}
            />
          </Field>
          <Field label={t("ministry")} error={errors.ministry_name}>
            <Input
              value={ministryName}
              onChange={(e) => setMinistryName(e.target.value)}
              placeholder={t("ministryPlaceholder")}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("profession")} error={errors.profession}>
            <Input
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
            />
          </Field>
          <Field label={t("companyOrSector")} error={errors.company_or_sector}>
            <Input
              value={companyOrSector}
              onChange={(e) => setCompanyOrSector(e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Sección 3 — Pertenencia a la Red */}
      <Section
        title={t("section3Title")}
        subtitle={t("section3Subtitle")}
      >
        <Field
          label={t("belongsToNetwork")}
          error={errors.belongs_to_network}
          required
        >
          <div className="flex flex-wrap gap-3">
            <RadioPill
              checked={belongsToNetwork === true}
              onClick={() => setBelongsToNetwork(true)}
              label={t("yes")}
            />
            <RadioPill
              checked={belongsToNetwork === false}
              onClick={() => setBelongsToNetwork(false)}
              label={t("no")}
            />
          </div>
        </Field>

        {belongsToNetwork === true && (
          <Field
            label={t("whichNetwork")}
            error={errors.network_name}
            required
          >
            <Select
              value={networkName ?? ""}
              onChange={(e) =>
                setNetworkName(
                  e.target.value as AdmissionFormInput["network_name"],
                )
              }
            >
              <option value="">{t("selectPlaceholder")}</option>
              {NETWORK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {belongsToNetwork === false && (
          <Field
            label={t("consentLetter")}
            error={errors.consent_letter_url}
            hint={t("consentLetterHint")}
            required
          >
            <FileDropzone
              value={consentFile}
              onChange={setConsentFile}
              errorMessage={errors.consent_letter_url}
              disabled={pending}
            />
          </Field>
        )}
      </Section>

      {/* Submit */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-inter text-xs text-text-tertiary">
          {t("termsPrefix")}
          <a href="/terminos" className="text-brand-coral hover:underline">
            {t("termsLink")}
          </a>
          {t("termsAnd")}
          <a href="/privacidad" className="text-brand-coral hover:underline">
            {t("privacyLink")}
          </a>
          {t("termsSuffix")}
        </p>
        <DapButton type="submit" size="lg" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("sending")}
            </>
          ) : (
            <>
              <Send />
              {t("submit")}
            </>
          )}
        </DapButton>
      </div>
    </form>
  );
}

// ----- helpers de presentación (locales al archivo) -----

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-2xl border border-white/[0.08] bg-surface-elevated/60 p-4 backdrop-blur-sm sm:p-8">
      <header>
        <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
          {title}
        </p>
        <p className="mt-1 font-inter text-sm text-text-secondary">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 inline-flex items-center gap-1 font-inter text-sm font-medium text-text-secondary">
        {label}
        {required && <span className="text-brand-coral">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 font-inter text-xs text-brand-coral">{error}</p>
      )}
      {!error && hint && (
        <p className="mt-1.5 font-inter text-xs text-text-tertiary">{hint}</p>
      )}
    </div>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-4 py-3 font-inter text-base text-text-primary outline-none transition-colors",
        "placeholder:text-text-tertiary",
        "focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        props.className,
      )}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-4 py-3 font-inter text-base text-text-primary outline-none transition-colors",
        "focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        props.className,
      )}
    />
  );
}

function RadioPill({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={cn(
        "rounded-full border px-6 py-2 font-inter text-sm font-medium transition-all",
        checked
          ? "border-brand-coral bg-brand-coral/15 text-text-primary"
          : "border-white/[0.1] bg-white/[0.02] text-text-secondary hover:border-white/[0.2] hover:text-text-primary",
      )}
    >
      {label}
    </button>
  );
}
