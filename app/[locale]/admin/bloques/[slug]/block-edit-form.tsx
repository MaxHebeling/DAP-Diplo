"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
  brandNameEn: string;
  titleEn: string;
  subtitleEn: string;
  promiseEn: string;
  descriptionEn: string;
};

export function BlockEditForm({ initial }: { initial: Initial }) {
  const t = useTranslations("BlockEditForm");
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
      fd.set("brandNameEn", data.brandNameEn);
      fd.set("titleEn", data.titleEn);
      fd.set("subtitleEn", data.subtitleEn);
      fd.set("promiseEn", data.promiseEn);
      fd.set("descriptionEn", data.descriptionEn);
      if (data.published) fd.set("published", "on");

      const res = await updateBlockAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("updated"));
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
        <Label htmlFor="brandName">{t("brandName")}</Label>
        <Input
          id="brandName"
          value={data.brandName}
          onChange={(e) => field("brandName", e.target.value)}
          placeholder={t("brandNamePlaceholder")}
          maxLength={80}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("brandNameHelp")}
        </p>
      </div>

      <div>
        <Label htmlFor="brandNameEn">Nombre de marca (inglés)</Label>
        <Input
          id="brandNameEn"
          value={data.brandNameEn}
          onChange={(e) => field("brandNameEn", e.target.value)}
          maxLength={80}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Opcional — si lo dejas vacío, se muestra el español.
        </p>
      </div>

      <div>
        <Label htmlFor="title">{t("title")}</Label>
        <Input
          id="title"
          value={data.title}
          onChange={(e) => field("title", e.target.value)}
          required
          maxLength={200}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("titleHelp")}
        </p>
      </div>

      <div>
        <Label htmlFor="titleEn">Título (inglés)</Label>
        <Input
          id="titleEn"
          value={data.titleEn}
          onChange={(e) => field("titleEn", e.target.value)}
          maxLength={200}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Opcional — si lo dejas vacío, se muestra el español.
        </p>
      </div>

      <div>
        <Label htmlFor="subtitle">{t("subtitle")}</Label>
        <textarea
          id="subtitle"
          value={data.subtitle}
          onChange={(e) => field("subtitle", e.target.value)}
          rows={2}
          maxLength={400}
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] p-3 font-inter text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
          placeholder={t("subtitlePlaceholder")}
        />
      </div>

      <div>
        <Label htmlFor="subtitleEn">Subtítulo (inglés)</Label>
        <textarea
          id="subtitleEn"
          value={data.subtitleEn}
          onChange={(e) => field("subtitleEn", e.target.value)}
          rows={2}
          maxLength={400}
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] p-3 font-inter text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Opcional — si lo dejas vacío, se muestra el español.
        </p>
      </div>

      <div>
        <Label htmlFor="promise">{t("promise")}</Label>
        <textarea
          id="promise"
          value={data.promise}
          onChange={(e) => field("promise", e.target.value)}
          rows={3}
          maxLength={600}
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] p-3 font-inter text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
          placeholder={t("promisePlaceholder")}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("promiseHelp")}
        </p>
      </div>

      <div>
        <Label htmlFor="promiseEn">Promesa (inglés)</Label>
        <textarea
          id="promiseEn"
          value={data.promiseEn}
          onChange={(e) => field("promiseEn", e.target.value)}
          rows={3}
          maxLength={600}
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] p-3 font-inter text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Opcional — si lo dejas vacío, se muestra el español.
        </p>
      </div>

      <div>
        <Label htmlFor="description">{t("description")}</Label>
        <textarea
          id="description"
          value={data.description}
          onChange={(e) => field("description", e.target.value)}
          rows={6}
          maxLength={2000}
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] p-3 font-inter text-sm leading-relaxed outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
          placeholder={t("descriptionPlaceholder")}
        />
      </div>

      <div>
        <Label htmlFor="descriptionEn">Descripción (inglés)</Label>
        <textarea
          id="descriptionEn"
          value={data.descriptionEn}
          onChange={(e) => field("descriptionEn", e.target.value)}
          rows={6}
          maxLength={2000}
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] p-3 font-inter text-sm leading-relaxed outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Opcional — si lo dejas vacío, se muestra el español.
        </p>
      </div>

      <div>
        <Label htmlFor="coverImageUrl">{t("coverImageUrl")}</Label>
        <Input
          id="coverImageUrl"
          value={data.coverImageUrl}
          onChange={(e) => field("coverImageUrl", e.target.value)}
          placeholder={t("coverImageUrlPlaceholder")}
          maxLength={500}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("coverImageUrlHelp")}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <Switch
          checked={data.published}
          onCheckedChange={(checked) => field("published", checked)}
        />
        <div>
          <p className="font-medium">{t("published")}</p>
          <p className="text-xs text-muted-foreground">
            {t("publishedHelp")}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <Save className="size-4" />
              {t("saveChanges")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
