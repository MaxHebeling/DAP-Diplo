"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ALL_DIAL_CODES,
  COUNTRIES,
  COUNTRY_DIAL_ID,
  COUNTRY_PHONE_PLACEHOLDER,
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
        belongs_to_network:
          "Indicá si perteneces a la Red.",
      });
      return;
    }
    if (!clientValidate()) {
      toast.error("Revisá los campos marcados.");
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
      toast.success("¡Solicitud enviada!");
      router.push("/admision/estado");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12" noValidate>
      {/* Sección 1 — Datos personales */}
      <Section title="01 · Datos personales" subtitle="Estos campos son obligatorios.">
        <Field label="Nombre completo" error={errors.full_name} required>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fecha de nacimiento" error={errors.birth_date} required>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </Field>
          <Field label="Email" error={errors.email} hint="Tu cuenta DAP">
            <Input type="email" value={email} disabled />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="País" error={errors.country} required>
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
            <Field label="¿Cuál?" error={errors.country_other} required>
              <Input
                value={countryOther}
                onChange={(e) => setCountryOther(e.target.value)}
                placeholder="Tu país"
              />
            </Field>
          )}
          <Field label="Ciudad" error={errors.city} required>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
        </div>

        <Field
          label="Teléfono"
          error={errors.phone}
          hint="El prefijo se actualiza con el país. Cambialo desde el dropdown si quieres."
          required
        >
          <div className="flex gap-2">
            <Select
              value={dialId}
              onChange={(e) => setDialId(e.target.value)}
              className="w-24 shrink-0 sm:w-28"
              aria-label="Código de país"
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
        title="02 · Pertenencia"
        subtitle="Contanos tu contexto ministerial y profesional."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Iglesia" error={errors.church_name}>
            <Input
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              placeholder="Iglesia local"
            />
          </Field>
          <Field label="Ministerio" error={errors.ministry_name}>
            <Input
              value={ministryName}
              onChange={(e) => setMinistryName(e.target.value)}
              placeholder="Nombre del ministerio"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Profesión" error={errors.profession}>
            <Input
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
            />
          </Field>
          <Field label="Empresa / sector" error={errors.company_or_sector}>
            <Input
              value={companyOrSector}
              onChange={(e) => setCompanyOrSector(e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Sección 3 — Pertenencia a la Red */}
      <Section
        title="03 · Pertenencia a la Red"
        subtitle="Si NO perteneces a nuestra red, debés subir una carta de tu pastor."
      >
        <Field
          label="¿Perteneces a la Red Apostólica Reino y Avivamiento o a Revival & Kingdom Ministries, INC?"
          error={errors.belongs_to_network}
          required
        >
          <div className="flex flex-wrap gap-3">
            <RadioPill
              checked={belongsToNetwork === true}
              onClick={() => setBelongsToNetwork(true)}
              label="Sí"
            />
            <RadioPill
              checked={belongsToNetwork === false}
              onClick={() => setBelongsToNetwork(false)}
              label="No"
            />
          </div>
        </Field>

        {belongsToNetwork === true && (
          <Field
            label="¿A cuál?"
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
              <option value="">Seleccioná…</option>
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
            label="Carta de consentimiento firmada por tu pastor"
            error={errors.consent_letter_url}
            hint="PDF, JPG o PNG · máximo 10 MB"
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
          Al enviar aceptas los{" "}
          <a href="/terminos" className="text-brand-coral hover:underline">
            términos
          </a>{" "}
          y la{" "}
          <a href="/privacidad" className="text-brand-coral hover:underline">
            política de privacidad
          </a>
          .
        </p>
        <DapButton type="submit" size="lg" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <Send />
              Enviar solicitud
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
