/**
 * Listados textuales del brief PDF. Separados del componente para
 * cambios rápidos sin tocar la lógica de render.
 */

export const DIMENSIONS = [
  { n: 1, name: "Discípulo", bloque: "Fundamentos Espirituales" },
  { n: 2, name: "Hijo", bloque: "Identidad y Carácter" },
  { n: 3, name: "Líder", bloque: "Liderazgo y Discipulado" },
  { n: 4, name: "Pastor", bloque: "Ministerio y Pastorado" },
  { n: 5, name: "Administrador", bloque: "Administración y Gobierno" },
  { n: 6, name: "Mayordomo", bloque: "Finanzas y Economía del Reino" },
  { n: 7, name: "Reformador", bloque: "Empresas y Expansión" },
  { n: 8, name: "Arquitecto", bloque: "Tecnología, IA y Comunicación" },
  { n: 9, name: "Enviado", bloque: "Gobierno Apostólico y Reforma" },
] as const;

export const INCLUIDO = [
  "Calendario semanal personal — 1 módulo nuevo cada semana, durante 72 semanas",
  "Corrección personalizada de cada activación escrita, en la voz pastoral del Dr. Max (devuelta en 48 horas)",
  "MasterClass en vivo con el Dr. Max — mínimo 1 garantizada al mes",
  "Mentoría grupal por convocatoria apostólica",
  "Comunidad privada de pastores en formación",
  "Tutor IA del DAP — entrenado con todos los materiales del programa, disponible 24/7",
  "Material descargable por módulo (PDFs, plantillas, recursos extra)",
  "Certificado, insignia y nueva dimensión ministerial al aprobar cada bloque",
];

export const FOR_WHOM = [
  "Eres pastor, líder de ministerio o aspirante a serlo y quieres formación con cobertura apostólica real.",
  "Sientes que tu llamado pide profundidad doctrinal, identidad de hijo y capacidad de gobernar — no sólo dones operando sueltos.",
  "Quieres ser formado en ministerio, gobierno, finanzas, empresa y tecnología para no sólo levantar gente, sino estructuras del Reino.",
  "Buscas un programa serio que respete tu tiempo: 100% online, a tu ritmo dentro de la semana, sin viajes obligatorios.",
];
