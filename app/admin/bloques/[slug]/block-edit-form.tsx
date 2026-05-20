"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateBlockAction } from "@/lib/admin/blocks/actions";

type Initial = {
  slug: string;
  brandName: string;
  title: string;
  subtitle: string;
  promise: string;
  description: string;
  coverImageUrl: string;
  published: boolean;
};

export function BlockEditForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<Initial>(initial);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("slug", data.slug);
      fd.set("brandName", data.brandName);
      fd.set("title", data.title);
      fd.set("subtitle", data.subtitle);
      fd.set("promise", data.promise);
      fd.set("description", data.description);
      fd.set("coverImageUrl", data.coverImageUrl);
      if (data.published) fd.set("published", "on");

      const res = await updateBlockAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Bloque actualizado.");
      router.refresh();
    });
  }

  function field<K extends keyof Initial>(key: K, value: Initial[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-white/[0.06] bg-surface-elevated/60 p-5 sm:p-6"
    >
      <div>
        <Label htmlFor="brandName">Nombre comercial (brand_name)</Label>
        <Input
          id="brandName"
          value={data.brandName}
          onChange={(e) => field("brandName", e.target.value)}
          placeholder="Raíces, Forja, Antorcha…"
          maxLength={80}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Título grande con gradiente que se muestra en las cards. Si lo
          dejas vacío, se usa el título académico.
        </p>
      </div>

      <div>
        <Label htmlFor="title">Título académico</Label>
        <Input
          id="title"
          value={data.title}
          onChange={(e) => field("title", e.target.value)}
          required
          maxLength={200}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Ej: &quot;Fundamentos Espirituales&quot;. Aparece debajo del brand_name.
        </p>
      </div>

      <div>
        <Label htmlFor="subtitle">Subtítulo (frase corta)</Label>
        <textarea
          id="subtitle"
          value={data.subtitle}
          onChange={(e) => field("subtitle", e.target.value)}
          rows={2}
          maxLength={400}
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] p-3 font-inter text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
          placeholder="Una frase punzante que resume el bloque."
        />
      </div>

      <div>
        <Label htmlFor="promise">Promesa (qué se llevará el alumno)</Label>
        <textarea
          id="promise"
          value={data.promise}
          onChange={(e) => field("promise", e.target.value)}
          rows={3}
          maxLength={600}
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] p-3 font-inter text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
          placeholder='Empieza con "Vas a..." — el outcome concreto.'
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Aparece en italic en las cards al hover y en el hero del detalle.
        </p>
      </div>

      <div>
        <Label htmlFor="description">Descripción larga (opcional)</Label>
        <textarea
          id="description"
          value={data.description}
          onChange={(e) => field("description", e.target.value)}
          rows={6}
          maxLength={2000}
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] p-3 font-inter text-sm leading-relaxed outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
          placeholder="Texto largo del hero del detalle del bloque. Opcional."
        />
      </div>

      <div>
        <Label htmlFor="coverImageUrl">Cover image URL</Label>
        <Input
          id="coverImageUrl"
          value={data.coverImageUrl}
          onChange={(e) => field("coverImageUrl", e.target.value)}
          placeholder="/blocks/01-raices.png"
          maxLength={500}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Path relativo (ej. /blocks/01-raices.png) o URL completa.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <Switch
          checked={data.published}
          onCheckedChange={(checked) => field("published", checked)}
        />
        <div>
          <p className="font-medium">Publicado</p>
          <p className="text-xs text-muted-foreground">
            Si está apagado, no se muestra en la landing pública (admin lo
            sigue viendo igual).
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Guardar cambios
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
