"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Highlighter, Strikethrough, MessageSquarePlus, Trash2 } from "lucide-react";

import {
  type AnnotationColor,
  type AnnotationKind,
  type TextAnnotation,
  ANNOTATION_COLOR_STYLES,
} from "@/lib/annotations/types";

/**
 * Renderiza el texto del alumno como string anotable. Al seleccionar
 * un rango aparece un popover flotante con 3 acciones:
 *   - Subrayar (highlight, amarillo por defecto)
 *   - Tachar (strike, rojo por defecto)
 *   - Comentar (comment, abre prompt al margen)
 *
 * El render del texto convierte las anotaciones existentes en spans
 * superpuestos. Cuando 2 anotaciones se solapan, las renderizamos por
 * "puntos de corte" — partimos el string en segmentos máximos que
 * comparten el mismo set de anotaciones activas. Esto evita el bug
 * de "highlight perdido cuando hay strike encima".
 *
 * Pensado para modo admin (editable). Para vista alumno hay un
 * componente sibling read-only que reusa la lógica de segmentación.
 */
export function TextAnnotator({
  submissionId,
  text,
  initialAnnotations,
  readOnly = false,
  onChange,
}: {
  submissionId: string;
  text: string;
  initialAnnotations: TextAnnotation[];
  readOnly?: boolean;
  onChange?: (next: TextAnnotation[]) => void;
}) {
  const [annotations, setAnnotations] =
    useState<TextAnnotation[]>(initialAnnotations);
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
    rect: { x: number; y: number; w: number };
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Notificar al parent cuando cambian las anotaciones (para que
  // re-render KPIs si quiere). Solo en cambios reales.
  useEffect(() => {
    onChange?.(annotations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations]);

  const handleMouseUp = useCallback(() => {
    if (readOnly) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelection(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!containerRef.current?.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }
    // Convertir el range del DOM a offsets dentro del string `text`.
    // Aprovechamos que cada span tiene data-offset con su start.
    const start = resolveOffset(range.startContainer, range.startOffset);
    const end = resolveOffset(range.endContainer, range.endOffset);
    if (start === null || end === null || start === end) {
      setSelection(null);
      return;
    }
    const [lo, hi] = start < end ? [start, end] : [end, start];

    // Posición del popover — usamos el bounding del range.
    const r = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setSelection({
      start: lo,
      end: hi,
      rect: {
        x: r.left - containerRect.left + r.width / 2,
        y: r.top - containerRect.top,
        w: r.width,
      },
    });
  }, [readOnly]);

  // Crear anotación nueva
  const createAnnotation = useCallback(
    async (kind: AnnotationKind, color: AnnotationColor) => {
      if (!selection) return;
      // Optimistic UI
      const tempId = `tmp_${Math.random().toString(36).slice(2)}`;
      const optimistic: TextAnnotation = {
        id: tempId,
        submission_id: submissionId,
        target: "text",
        kind: kind === "box" ? "comment" : (kind as TextAnnotation["kind"]),
        color,
        comment: null,
        text_start: selection.start,
        text_end: selection.end,
        rect_x: null,
        rect_y: null,
        rect_w: null,
        rect_h: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAnnotations((prev) => [...prev, optimistic]);
      const wasComment = optimistic.kind === "comment";
      setSelection(null);
      window.getSelection()?.removeAllRanges();

      try {
        const res = await fetch(
          `/api/admin/correcciones/${submissionId}/annotations`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              target: "text",
              kind: optimistic.kind,
              color,
              text_start: selection.start,
              text_end: selection.end,
            }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { annotation } = (await res.json()) as {
          annotation: TextAnnotation;
        };
        setAnnotations((prev) =>
          prev.map((a) => (a.id === tempId ? annotation : a)),
        );
        if (wasComment) {
          setEditingId(annotation.id);
          setEditingComment("");
        }
      } catch (err) {
        // Rollback
        setAnnotations((prev) => prev.filter((a) => a.id !== tempId));
        console.error("[annotation create] falló:", err);
      }
    },
    [selection, submissionId],
  );

  // Editar comentario
  const saveComment = useCallback(
    async (id: string, comment: string) => {
      setSavingId(id);
      try {
        const res = await fetch(
          `/api/admin/correcciones/${submissionId}/annotations/${id}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ comment: comment.trim() || null }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { annotation } = (await res.json()) as {
          annotation: TextAnnotation;
        };
        setAnnotations((prev) =>
          prev.map((a) => (a.id === id ? annotation : a)),
        );
        setEditingId(null);
      } catch (err) {
        console.error("[annotation save] falló:", err);
      } finally {
        setSavingId(null);
      }
    },
    [submissionId],
  );

  const deleteAnnotation = useCallback(
    async (id: string) => {
      const prev = annotations;
      setAnnotations((p) => p.filter((a) => a.id !== id));
      try {
        const res = await fetch(
          `/api/admin/correcciones/${submissionId}/annotations/${id}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        setAnnotations(prev);
        console.error("[annotation delete] falló:", err);
      }
    },
    [annotations, submissionId],
  );

  // Segmentación: convertimos el texto en segmentos máximos donde
  // todas las anotaciones activas son las mismas.
  const segments = useMemo(
    () => segmentText(text, annotations),
    [text, annotations],
  );

  const comments = useMemo(
    () => annotations.filter((a) => a.kind === "comment"),
    [annotations],
  );

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div
        ref={containerRef}
        className="relative whitespace-pre-wrap font-inter text-sm leading-relaxed text-foreground"
        onMouseUp={handleMouseUp}
      >
        {segments.map((seg, i) => (
          <Segment
            key={`${seg.start}-${i}`}
            segment={seg}
            text={text}
            annotations={annotations}
            readOnly={readOnly}
            onDeleteAnnotation={deleteAnnotation}
          />
        ))}

        {selection && (
          <SelectionPopover
            x={selection.rect.x}
            y={selection.rect.y}
            onPick={createAnnotation}
            onDismiss={() => setSelection(null)}
          />
        )}
      </div>

      {/* Columna de comentarios al margen */}
      <aside className="space-y-2">
        {comments.length === 0 ? (
          <p className="font-inter text-xs italic text-muted-foreground">
            {readOnly
              ? "Sin comentarios al margen."
              : "Seleccioná texto y elegí 💬 para dejar un comentario."}
          </p>
        ) : (
          comments.map((c) => (
            <CommentCard
              key={c.id}
              annotation={c}
              text={text}
              isEditing={editingId === c.id}
              editingValue={editingComment}
              saving={savingId === c.id}
              readOnly={readOnly}
              onEdit={() => {
                setEditingId(c.id);
                setEditingComment(c.comment ?? "");
              }}
              onChange={setEditingComment}
              onSave={() => saveComment(c.id, editingComment)}
              onCancel={() => setEditingId(null)}
              onDelete={() => deleteAnnotation(c.id)}
            />
          ))
        )}
      </aside>
    </div>
  );
}

// ---------- helpers ----------

type Segment = {
  start: number;
  end: number;
  annIds: string[]; // ids de anotaciones activas en este segmento
};

/**
 * Parte el texto en segmentos máximos donde un mismo set de anotaciones
 * está activo. Algoritmo: ordenar todos los boundaries (start/end) y
 * recorrer en orden, manteniendo un set de annIds activos.
 */
function segmentText(text: string, annotations: TextAnnotation[]): Segment[] {
  if (text.length === 0) return [];
  const points = new Set<number>([0, text.length]);
  for (const a of annotations) {
    points.add(Math.max(0, Math.min(a.text_start, text.length)));
    points.add(Math.max(0, Math.min(a.text_end, text.length)));
  }
  const sorted = Array.from(points).sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (end <= start) continue;
    const annIds = annotations
      .filter((a) => a.text_start <= start && a.text_end >= end)
      .map((a) => a.id);
    out.push({ start, end, annIds });
  }
  return out;
}

function Segment({
  segment,
  text,
  annotations,
  readOnly,
  onDeleteAnnotation,
}: {
  segment: Segment;
  text: string;
  annotations: TextAnnotation[];
  readOnly: boolean;
  onDeleteAnnotation: (id: string) => void;
}) {
  const slice = text.slice(segment.start, segment.end);

  if (segment.annIds.length === 0) {
    return (
      <span data-offset={segment.start} data-len={segment.end - segment.start}>
        {slice}
      </span>
    );
  }

  // Resolver style: prioridad → strike > highlight, color del más reciente.
  const active = annotations.filter((a) => segment.annIds.includes(a.id));
  const hasStrike = active.some((a) => a.kind === "strike");
  const highlightAnn = active.find((a) => a.kind === "highlight");
  const commentAnn = active.find((a) => a.kind === "comment");

  const bgColor =
    highlightAnn !== undefined
      ? ANNOTATION_COLOR_STYLES[highlightAnn.color].bg
      : commentAnn !== undefined
        ? "transparent"
        : "transparent";
  const borderBottom = commentAnn
    ? `2px dotted ${ANNOTATION_COLOR_STYLES[commentAnn.color].border}`
    : undefined;

  // Si hay varias anotaciones, mostramos un menu al click para borrar la que queramos.
  const handleClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    // UX simple: si solo hay 1 borra directo con confirm. Si hay varias,
    // borra la más reciente con confirm.
    const target = active[active.length - 1];
    if (!target) return;
    if (window.confirm(`¿Quitar esta marca (${target.kind})?`)) {
      onDeleteAnnotation(target.id);
    }
  };

  return (
    <span
      data-offset={segment.start}
      data-len={segment.end - segment.start}
      onClick={handleClick}
      style={{
        backgroundColor: bgColor,
        textDecoration: hasStrike ? "line-through" : undefined,
        textDecorationColor: hasStrike ? "rgba(220, 38, 38, 0.85)" : undefined,
        textDecorationThickness: hasStrike ? "2px" : undefined,
        borderBottom,
        cursor: readOnly ? "default" : "pointer",
        borderRadius: "2px",
        padding: "0 1px",
      }}
    >
      {slice}
    </span>
  );
}

function SelectionPopover({
  x,
  y,
  onPick,
  onDismiss,
}: {
  x: number;
  y: number;
  onPick: (kind: AnnotationKind, color: AnnotationColor) => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDismiss]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: Math.max(y - 48, -8),
        transform: "translateX(-50%)",
      }}
      className="z-30 flex items-center gap-1 rounded-lg border border-border bg-popover px-1.5 py-1 shadow-xl"
    >
      <button
        type="button"
        title="Subrayar (amarillo)"
        onClick={() => onPick("highlight", "yellow")}
        className="rounded p-1.5 text-yellow-400 transition hover:bg-yellow-400/15"
      >
        <Highlighter className="size-4" />
      </button>
      <button
        type="button"
        title="Tachar (rojo)"
        onClick={() => onPick("strike", "red")}
        className="rounded p-1.5 text-red-400 transition hover:bg-red-400/15"
      >
        <Strikethrough className="size-4" />
      </button>
      <button
        type="button"
        title="Comentar al margen"
        onClick={() => onPick("comment", "blue")}
        className="rounded p-1.5 text-blue-400 transition hover:bg-blue-400/15"
      >
        <MessageSquarePlus className="size-4" />
      </button>
    </div>
  );
}

function CommentCard({
  annotation,
  text,
  isEditing,
  editingValue,
  saving,
  readOnly,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  annotation: TextAnnotation;
  text: string;
  isEditing: boolean;
  editingValue: string;
  saving: boolean;
  readOnly: boolean;
  onEdit: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const quote = text
    .slice(annotation.text_start, annotation.text_end)
    .slice(0, 80);
  const styles = ANNOTATION_COLOR_STYLES[annotation.color];

  return (
    <div className={`rounded-lg border ${styles.chipClass} p-3`}>
      <p
        className="mb-2 line-clamp-1 font-mono text-[11px] italic opacity-80"
        title={text.slice(annotation.text_start, annotation.text_end)}
      >
        &ldquo;{quote}
        {(annotation.text_end - annotation.text_start) > 80 && "…"}&rdquo;
      </p>
      {isEditing ? (
        <div className="space-y-1.5">
          <textarea
            value={editingValue}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder="Tu comentario…"
            className="w-full rounded border border-border bg-background p-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand-violet"
            autoFocus
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="rounded bg-brand-violet px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              {saving ? "…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground"
            >
              Cancelar
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={onDelete}
                className="ml-auto text-red-400 hover:text-red-300"
                title="Eliminar"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {annotation.comment ? (
            <p className="font-inter text-xs text-foreground/90">
              {annotation.comment}
            </p>
          ) : (
            <p className="font-inter text-xs italic opacity-70">
              (sin texto — click para escribir)
            </p>
          )}
          {!readOnly && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="text-[11px] text-brand-violet hover:underline"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="ml-auto text-red-400 hover:text-red-300"
                title="Eliminar"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Dado un Node + offset del DOM, resuelve el offset dentro del string
 * `text` original. Usamos data-offset en cada Segment para localizar
 * el inicio del span y sumar el offset relativo.
 */
function resolveOffset(node: Node, offset: number): number | null {
  // Si es un text node, subimos al span padre que tiene data-offset.
  let el: Element | null =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  while (el && !el.hasAttribute?.("data-offset")) {
    el = el.parentElement;
  }
  if (!el) return null;
  const base = parseInt(el.getAttribute("data-offset") ?? "0", 10);
  return base + offset;
}
