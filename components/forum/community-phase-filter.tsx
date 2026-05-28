"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  phases: { id: string; order_index: number; title: string }[];
  current: string;
};

export function CommunityPhaseFilter({ phases, current }: Props) {
  const t = useTranslations("Forum");
  const router = useRouter();
  const params = useSearchParams();

  function onChange(value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") {
      next.delete("phase");
    } else {
      next.set("phase", value);
    }
    const qs = next.toString();
    router.push(`/comunidad${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {t("phaseFilter.label")}
      </span>
      <Select value={current} onValueChange={onChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder={t("phaseFilter.placeholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("phaseFilter.all")}</SelectItem>
          {phases.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {t("phaseFilter.phaseOption", {
                number: String(b.order_index).padStart(2, "0"),
                title: b.title,
              })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
