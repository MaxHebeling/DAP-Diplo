"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FileCheck2, FileWarning, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  ACCEPTED_LETTER_EXT,
  ACCEPTED_LETTER_TYPES,
  MAX_LETTER_BYTES,
} from "@/lib/admission/schemas";

type FileDropzoneProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  errorMessage?: string;
  disabled?: boolean;
};

export function FileDropzone({
  value,
  onChange,
  errorMessage,
  disabled,
}: FileDropzoneProps) {
  const t = useTranslations("Admission");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function validateAndSet(file: File | null) {
    setLocalError(null);
    if (!file) {
      onChange(null);
      return;
    }
    if (!ACCEPTED_LETTER_TYPES.includes(file.type)) {
      setLocalError(t("fileDropzone.errorType"));
      onChange(null);
      return;
    }
    if (file.size > MAX_LETTER_BYTES) {
      setLocalError(t("fileDropzone.errorSize"));
      onChange(null);
      return;
    }
    onChange(file);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    validateAndSet(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0] ?? null;
    validateAndSet(f);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }

  function onDragLeave() {
    setDragOver(false);
  }

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    onChange(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const errorText = errorMessage ?? localError;
  const filled = !!value;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openPicker()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all",
          "border-white/[0.12] bg-white/[0.02] hover:border-brand-violet/40 hover:bg-white/[0.04]",
          dragOver && "border-brand-violet bg-brand-violet/10",
          filled && "border-emerald-400/40 bg-emerald-500/[0.04]",
          errorText && "border-brand-coral/50 bg-brand-coral/[0.04]",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_LETTER_EXT}
          onChange={onInputChange}
          className="sr-only"
          disabled={disabled}
        />

        {filled ? (
          <>
            <FileCheck2 className="size-9 text-emerald-400" strokeWidth={1.7} />
            <div>
              <p className="font-grotesk text-sm font-semibold text-text-primary">
                {value.name}
              </p>
              <p className="mt-1 font-inter text-xs text-text-tertiary">
                {t("fileDropzone.fileMeta", {
                  size: (value.size / 1024 / 1024).toFixed(2),
                  type: value.type || t("fileDropzone.fileMetaFallback"),
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] px-3 py-1.5 font-inter text-xs text-text-secondary hover:border-brand-coral/40 hover:text-brand-coral"
            >
              <X className="size-3.5" /> {t("fileDropzone.remove")}
            </button>
          </>
        ) : errorText ? (
          <>
            <FileWarning
              className="size-9 text-brand-coral"
              strokeWidth={1.7}
            />
            <div>
              <p className="font-grotesk text-sm font-semibold text-brand-coral">
                {errorText}
              </p>
              <p className="mt-1 font-inter text-xs text-text-tertiary">
                {t("fileDropzone.errorRetry")}
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload
              className="size-9 text-text-tertiary"
              strokeWidth={1.7}
            />
            <div>
              <p className="font-grotesk text-sm font-semibold text-text-primary">
                {t("fileDropzone.emptyTitle")}
              </p>
              <p className="mt-1 font-inter text-xs text-text-tertiary">
                {t("fileDropzone.emptyHint")}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
