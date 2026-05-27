"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type CoverUploadProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  phaseId: string;
};

export function CoverUpload({ value, onChange, phaseId }: CoverUploadProps) {
  const t = useTranslations("AdminUI");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("coverUpload.tooLarge"));
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${phaseId}/cover-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("phases-covers")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) {
        toast.error(t("coverUpload.uploadFailed", { message: upErr.message }));
        return;
      }

      const { data: pub } = supabase.storage
        .from("phases-covers")
        .getPublicUrl(path);

      onChange(pub.publicUrl);
      toast.success(t("coverUpload.uploaded"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("coverUpload.uploadError");
      toast.error(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-muted/30">
        {value ? (
          <Image
            src={value}
            alt=""
            fill
            sizes="448px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {t("coverUpload.noCover")}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin text-brand-coral" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <ImagePlus className="size-4" />
          {value ? t("coverUpload.changeCover") : t("coverUpload.uploadCover")}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
            {t("coverUpload.remove")}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("coverUpload.hint")}
      </p>
    </div>
  );
}
