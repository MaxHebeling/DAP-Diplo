// Tipos compartidos para anotaciones del admin sobre entregas.
// La tabla submission_annotations soporta 2 targets:
//   - text: rango de offset sobre content_text del submission
//   - attachment: rectángulo normalizado 0..1 sobre el adjunto (imagen)

export type AnnotationColor = "yellow" | "red" | "blue" | "green";
export type AnnotationKind = "highlight" | "strike" | "comment" | "box";
export type AnnotationTarget = "text" | "attachment";

export type TextAnnotation = {
  id: string;
  submission_id: string;
  target: "text";
  kind: "highlight" | "strike" | "comment";
  color: AnnotationColor;
  comment: string | null;
  text_start: number;
  text_end: number;
  // Campos attachment-only nulos:
  rect_x: null;
  rect_y: null;
  rect_w: null;
  rect_h: null;
  created_at: string;
  updated_at: string;
};

export type AttachmentAnnotation = {
  id: string;
  submission_id: string;
  target: "attachment";
  kind: "box";
  color: AnnotationColor;
  comment: string | null;
  rect_x: number;
  rect_y: number;
  rect_w: number;
  rect_h: number;
  // Campos text-only nulos:
  text_start: null;
  text_end: null;
  created_at: string;
  updated_at: string;
};

export type Annotation = TextAnnotation | AttachmentAnnotation;

export function isTextAnnotation(a: Annotation): a is TextAnnotation {
  return a.target === "text";
}

export function isAttachmentAnnotation(a: Annotation): a is AttachmentAnnotation {
  return a.target === "attachment";
}

// Colores RGB usados en UI tanto admin como vista alumno.
// Usamos rgba para que el highlight sea translúcido sin perder legibilidad.
export const ANNOTATION_COLOR_STYLES: Record<
  AnnotationColor,
  { bg: string; border: string; ringClass: string; chipClass: string }
> = {
  yellow: {
    bg: "rgba(250, 204, 21, 0.35)",
    border: "rgb(202, 138, 4)",
    ringClass: "ring-yellow-400/60",
    chipClass: "border-yellow-400/40 bg-yellow-400/10 text-yellow-300",
  },
  red: {
    bg: "rgba(239, 68, 68, 0.30)",
    border: "rgb(220, 38, 38)",
    ringClass: "ring-red-400/60",
    chipClass: "border-red-400/40 bg-red-400/10 text-red-300",
  },
  blue: {
    bg: "rgba(59, 130, 246, 0.30)",
    border: "rgb(37, 99, 235)",
    ringClass: "ring-blue-400/60",
    chipClass: "border-blue-400/40 bg-blue-400/10 text-blue-300",
  },
  green: {
    bg: "rgba(34, 197, 94, 0.30)",
    border: "rgb(22, 163, 74)",
    ringClass: "ring-green-400/60",
    chipClass: "border-green-400/40 bg-green-400/10 text-green-300",
  },
};

// Mime types soportados para anotación con rectángulos sobre imagen.
// PDFs van por iframe sin anotación nativa (alcance fuera de este PR).
export const ANNOTATABLE_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function isAnnotatableImageByName(name: string | null): boolean {
  if (!name) return false;
  return /\.(jpe?g|png|webp|gif)$/i.test(name);
}
