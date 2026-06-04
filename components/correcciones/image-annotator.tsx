"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, MessageSquare } from "lucide-react";

import {
  type AnnotationColor,
  type AttachmentAnnotation,
  ANNOTATION_COLOR_STYLES,
} from "@/lib/annotations/types";

const COLORS: AnnotationColor[] = ["red", "yellow", "blue", "green"];

/**
 * Anotador de imágenes adjuntas (JPG/PNG/WebP/GIF). El usuario hace
 * mouse-down sobre la imagen y arrastra para crear un rectángulo. Al
 * soltar, queda fijo y abre el editor de comentario.
 *
 * Coordenadas guardadas en proporciones 0..1 del tamaño natural de la
 * imagen. Esto permite responsive: se muestren a 600px o 1200px, los
 * rectángulos quedan donde tienen que ir.
 *
 * Pensado para admin (editable). Para vista alumno se usa el mismo
 * componente con readOnly=true.
 */
export function ImageAnnotator({
  submissionId,
  imageUrl,
  imageName,
  initialAnnotations,
  readOnly = false,
}: {
  submissionId: string;
  imageUrl: string;
  imageName: string | null;
  initialAnnotations: AttachmentAnnotation[];
  readOnly?: boolean;
}) {
  const [annotations, setAnnotations] =
    useState<AttachmentAnnotation[]>(initialAnnotations);
  const [drawing, setDrawing] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);
  const [selectedColor, setSelectedColor] = useState<AnnotationColor>("red");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return;
      if (!boxRef.current) return;
      // Si el click es sobre un rect existente, no empezar a dibujar.
      const t = e.target as HTMLElement;
      if (t.dataset.annotationBox === "1") return;
      const r = boxRef.current.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      setDrawing({ startX: x, startY: y, curX: x, curY: y });
    },
    [readOnly],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing || !boxRef.current) return;
      const r = boxRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      setDrawing({ ...drawing, curX: x, curY: y });
    },
    [drawing],
  );

  const handleMouseUp = useCallback(async () => {
    if (!drawing) return;
    const rect = normalizeRect(drawing);
    setDrawing(null);
    // Ignorar drags muy chiquitos (clicks accidentales)
    if (rect.w < 0.01 || rect.h < 0.01) return;

    const tempId = `tmp_${Math.random().toString(36).slice(2)}`;
    const optimistic: AttachmentAnnotation = {
      id: tempId,
      submission_id: submissionId,
      target: "attachment",
      kind: "box",
      color: selectedColor,
      comment: null,
      rect_x: rect.x,
      rect_y: rect.y,
      rect_w: rect.w,
      rect_h: rect.h,
      text_start: null,
      text_end: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setAnnotations((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(
        `/api/admin/correcciones/${submissionId}/annotations`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            target: "attachment",
            kind: "box",
            color: selectedColor,
            rect_x: rect.x,
            rect_y: rect.y,
            rect_w: rect.w,
            rect_h: rect.h,
          }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { annotation } = (await res.json()) as {
        annotation: AttachmentAnnotation;
      };
      setAnnotations((prev) =>
        prev.map((a) => (a.id === tempId ? annotation : a)),
      );
      // Abrir editor de comentario para la nueva box
      setEditingId(annotation.id);
      setEditingComment("");
    } catch (err) {
      setAnnotations((prev) => prev.filter((a) => a.id !== tempId));
      console.error("[box create] falló:", err);
    }
  }, [drawing, selectedColor, submissionId]);

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
          annotation: AttachmentAnnotation;
        };
        setAnnotations((prev) =>
          prev.map((a) => (a.id === id ? annotation : a)),
        );
        setEditingId(null);
      } catch (err) {
        console.error("[box save] falló:", err);
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
      setEditingId((current) => (current === id ? null : current));
      try {
        const res = await fetch(
          `/api/admin/correcciones/${submissionId}/annotations/${id}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        setAnnotations(prev);
        console.error("[box delete] falló:", err);
      }
    },
    [annotations, submissionId],
  );

  // Cancelar drawing si soltás fuera del contenedor
  useEffect(() => {
    if (!drawing) return;
    const onWindowMouseUp = () => setDrawing(null);
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [drawing]);

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-inter text-xs text-muted-foreground">
            Color:
          </span>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c)}
              className={`size-6 rounded-full border-2 transition ${
                selectedColor === c
                  ? "scale-110 ring-2 ring-offset-2 ring-offset-background"
                  : "opacity-60 hover:opacity-100"
              }`}
              style={{
                backgroundColor: ANNOTATION_COLOR_STYLES[c].bg,
                borderColor: ANNOTATION_COLOR_STYLES[c].border,
              }}
              title={c}
            />
          ))}
          <span className="ml-auto font-inter text-xs italic text-muted-foreground">
            Arrastrá para marcar
          </span>
        </div>
      )}

      <div
        ref={boxRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative w-full select-none overflow-hidden rounded-lg border border-border bg-black/10 ${
          readOnly ? "cursor-default" : "cursor-crosshair"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={imageName ?? "adjunto"}
          draggable={false}
          onLoad={() => setImgLoaded(true)}
          className="block h-auto w-full select-none"
        />

        {imgLoaded &&
          annotations.map((ann) => (
            <Box
              key={ann.id}
              annotation={ann}
              readOnly={readOnly}
              isEditing={editingId === ann.id}
              editingValue={editingComment}
              saving={savingId === ann.id}
              onClick={() => {
                if (readOnly) return;
                setEditingId(ann.id);
                setEditingComment(ann.comment ?? "");
              }}
              onChange={setEditingComment}
              onSave={() => saveComment(ann.id, editingComment)}
              onCancel={() => setEditingId(null)}
              onDelete={() => deleteAnnotation(ann.id)}
            />
          ))}

        {drawing && (
          <div
            style={{
              position: "absolute",
              ...rectToStyles(normalizeRect(drawing)),
              backgroundColor: ANNOTATION_COLOR_STYLES[selectedColor].bg,
              border: `2px solid ${ANNOTATION_COLOR_STYLES[selectedColor].border}`,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}

function Box({
  annotation,
  readOnly,
  isEditing,
  editingValue,
  saving,
  onClick,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  annotation: AttachmentAnnotation;
  readOnly: boolean;
  isEditing: boolean;
  editingValue: string;
  saving: boolean;
  onClick: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const styles = ANNOTATION_COLOR_STYLES[annotation.color];
  return (
    <div
      data-annotation-box="1"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        position: "absolute",
        ...rectToStyles({
          x: annotation.rect_x,
          y: annotation.rect_y,
          w: annotation.rect_w,
          h: annotation.rect_h,
        }),
        backgroundColor: styles.bg,
        border: `2px solid ${styles.border}`,
        cursor: readOnly ? "default" : "pointer",
      }}
      className={`group ${isEditing ? "ring-2 ring-offset-2 " + styles.ringClass : ""}`}
    >
      {annotation.comment && !isEditing && (
        <div
          data-annotation-box="1"
          className="absolute right-0 top-full mt-1 max-w-[240px] rounded border bg-popover/95 p-1.5 text-[11px] text-foreground shadow"
          style={{ borderColor: styles.border }}
        >
          <MessageSquare className="mb-0.5 inline size-2.5 opacity-60" />{" "}
          {annotation.comment}
        </div>
      )}
      {isEditing && (
        <div
          data-annotation-box="1"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border bg-popover p-2 shadow-xl"
          style={{ borderColor: styles.border }}
        >
          <textarea
            value={editingValue}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder="Comentario sobre esta marca…"
            autoFocus
            className="mb-2 w-full rounded border border-border bg-background p-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand-violet"
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
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto text-red-400 hover:text-red-300"
              title="Eliminar marca"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type RawRect = { startX: number; startY: number; curX: number; curY: number };
type Rect = { x: number; y: number; w: number; h: number };

function normalizeRect(raw: RawRect): Rect {
  const x = Math.min(raw.startX, raw.curX);
  const y = Math.min(raw.startY, raw.curY);
  const w = Math.abs(raw.curX - raw.startX);
  const h = Math.abs(raw.curY - raw.startY);
  return { x, y, w, h };
}

function rectToStyles(r: Rect) {
  return {
    left: `${r.x * 100}%`,
    top: `${r.y * 100}%`,
    width: `${r.w * 100}%`,
    height: `${r.h * 100}%`,
  };
}
