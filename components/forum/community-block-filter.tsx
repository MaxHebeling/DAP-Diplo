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
  blocks: { id: string; order_index: number; title: string }[];
  current: string;
};

export function CommunityBlockFilter({ blocks, current }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") {
      next.delete("block");
    } else {
      next.set("block", value);
    }
    const qs = next.toString();
    router.push(`/comunidad${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Filtrar por bloque
      </span>
      <Select value={current} onValueChange={onChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Todos los bloques" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los bloques</SelectItem>
          {blocks.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              Bloque {String(b.order_index).padStart(2, "0")} · {b.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
