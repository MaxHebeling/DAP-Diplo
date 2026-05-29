"use client";

import { useRef, useState, useTransition } from "react";
import {
  Download,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  uploadModulePdfAction,
  deleteModuleResourceAction,
} from "@/lib/modules/pdf-actions";

type Pdf = {
  id: string;
  title: string;
  url: string;
};

/**
 * Manager admin de PDFs por módulo:
 * - Lista los PDFs existentes con título + botón descargar + botón borrar
 * - Form de subida: title + file picker
 *
 * El backend hace el upload a Storage + insert en module_resources. Al
 * volver, el módulo público muestra el botón de descarga en ModuleQuickActions.
 */
export function ModulePdfManager({
  moduleId,
  initialPdfs,
}: {
  moduleId: string;
  initialPdfs: Pdf[];
}) {
  const [pdfs, setPdfs] = useState<Pdf[]>(initialPdfs);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) {
      toast.error("Completá título y elegí un PDF");
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Solo PDFs");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Máximo 20MB");
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("moduleId", moduleId);
      fd.append("title", title.trim());
      fd.append("file", file);

      const res = await uploadModulePdfAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPdfs((prev) => [...prev, res.resource]);
      setTitle("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("PDF subido");
    } finally {
      setIsUploading(false);
    }
  }

  function handleDelete(id: string) {
    if (!confirm("¿Borrar este PDF? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      const res = await deleteModuleResourceAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPdfs((prev) => prev.filter((p) => p.id !== id));
      toast.success("PDF eliminado");
    });
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <header className="mb-4">
        <h3 className="font-grotesk text-base font-bold text-foreground">
          PDFs del módulo
        </h3>
        <p className="mt-1 font-inter text-xs text-muted-foreground">
          Los alumnos verán estos PDFs como botón de descarga en el banner
          superior de cada módulo.
        </p>
      </header>

      {/* Lista de PDFs existentes */}
      {pdfs.length > 0 ? (
        <ul className="mb-5 space-y-2">
          {pdfs.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border bg-background p-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-violet/10 text-brand-violet">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-inter text-sm font-medium text-foreground">
                  {p.title}
                </p>
              </div>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Descargar PDF"
              >
                <Download className="size-4" />
              </a>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Borrar PDF"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-5 rounded-lg border border-dashed bg-muted/30 p-4 text-center font-inter text-sm text-muted-foreground">
          Aún no hay PDFs en este módulo.
        </p>
      )}

      {/* Form de subida */}
      <form onSubmit={handleUpload} className="space-y-3">
        <div>
          <label
            htmlFor="pdf-title"
            className="mb-1.5 block font-inter text-xs font-semibold text-foreground"
          >
            Título del PDF
          </label>
          <input
            id="pdf-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Material complementario · Semana 1"
            className="w-full rounded-md border bg-background px-3 py-2 font-inter text-sm outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet/40"
            disabled={isUploading}
            required
          />
        </div>
        <div>
          <label
            htmlFor="pdf-file"
            className="mb-1.5 block font-inter text-xs font-semibold text-foreground"
          >
            Archivo PDF (máx 20MB)
          </label>
          <input
            ref={fileInputRef}
            id="pdf-file"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full font-inter text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-brand-violet/10 file:px-3 file:py-1.5 file:font-inter file:text-xs file:font-semibold file:text-brand-violet hover:file:bg-brand-violet/20"
            disabled={isUploading}
            required
          />
          {file && (
            <p className="mt-1 font-inter text-xs text-muted-foreground">
              {file.name} ·{" "}
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>
        <Button type="submit" disabled={isUploading || !file || !title.trim()}>
          {isUploading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Subiendo…
            </>
          ) : (
            <>
              <UploadCloud className="size-4" />
              Subir PDF
            </>
          )}
        </Button>
      </form>
    </section>
  );
}
