"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
        Filtrar por fase
      </span>
      <Select value={current} onValueChange={onChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Todos las fases" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos las fases</SelectItem>
          {phases.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              Fase {String(b.order_index).padStart(2, "0")} · {b.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
