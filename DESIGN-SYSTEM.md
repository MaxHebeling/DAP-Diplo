# DESIGN-SYSTEM.md — DAP

> Sistema visual completo del Diplomado Apostólico Pastoral.
> Inspirado en mockup tipo Linear / Vercel / Stripe Dashboard con alma apostólica.
> **Estética:** dark-tech-premium + gradiente violeta-coral + glassmorphism + tipografía Space Grotesk.

---

## 1. Tokens

### 1.1 Paleta de colores (uso semántico)

| Token | Hex | Uso |
|-------|-----|-----|
| `--surface-base` | `#07142B` | Fondo principal de toda la app (deep navy) |
| `--surface-elevated` | `#111827` | Cards, modales, sidebar |
| `--surface-overlay` | `#0F172A` (90% opacity) | Overlays sobre imágenes |
| `--brand-violet` | `#7B61FF` | Color primario de marca |
| `--brand-coral` | `#FF4D6D` | Color secundario / acento (CTAs) |
| `--brand-deep` | `#241E72` | Violeta profundo (gradientes oscuros) |
| `--text-primary` | `#F8FAFC` | Texto principal sobre dark |
| `--text-secondary` | `#94A3B8` | Texto secundario, labels |
| `--text-tertiary` | `#64748B` | Texto deshabilitado, footnotes |
| `--border-subtle` | `rgba(255,255,255,0.08)` | Bordes de cards glass |
| `--border-strong` | `rgba(255,255,255,0.16)` | Bordes activos / hover |

### 1.2 Gradientes

```css
/* Gradiente de marca — usar en CTAs primarios, logos, hero text */
--gradient-brand: linear-gradient(135deg, #7B61FF 0%, #FF4D6D 100%);

/* Gradiente glow — usar en bg de elementos importantes */
--gradient-glow: radial-gradient(circle at center, rgba(123, 97, 255, 0.3), transparent 70%);

/* Gradiente noche/cósmico — usar como fondo del hero */
--gradient-cosmic: linear-gradient(180deg, #07142B 0%, #241E72 50%, #07142B 100%);
```

### 1.3 Tipografía

- **Space Grotesk** — títulos (headings, números grandes, hero text). Weights 500, 600, 700.
- **Inter** — body, párrafos, UI labels, navegación. Weights 400, 500, 600.

Tamaños (escala):

| Token | Tamaño | Uso |
|-------|--------|-----|
| `text-display` | 64–80px | Hero title (mobile: 40–56px) |
| `text-h1` | 48px | Section titles |
| `text-h2` | 36px | Card titles, page headers |
| `text-h3` | 24px | Subsection titles |
| `text-h4` | 20px | Component titles |
| `text-body` | 16px | Párrafos |
| `text-sm` | 14px | Secondary text, captions |
| `text-xs` | 12px | Microcopy, badges |

### 1.4 Espaciado (escala 4-base)

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 px`

Mapean a `space-1` ... `space-32` en Tailwind. Sin espaciados fuera de esta escala.

### 1.5 Border radius

| Token | Pixels | Uso |
|-------|--------|-----|
| `rounded-sm` | 6px | Inputs, pequeños badges |
| `rounded-md` | 10px | Buttons |
| `rounded-lg` | 14px | Cards, navigation items |
| `rounded-xl` | 20px | Hero cards, big containers |
| `rounded-full` | 9999px | Avatares, badges circulares |

### 1.6 Sombras y glow

```css
/* Sombra estándar de card */
--shadow-card: 0 4px 24px rgba(0, 0, 0, 0.3);

/* Sombra elevada (modales) */
--shadow-modal: 0 16px 64px rgba(0, 0, 0, 0.5);

/* Glow violeta (hover en CTAs, focus rings) */
--shadow-glow-violet: 0 0 40px rgba(123, 97, 255, 0.4);

/* Glow coral (active states) */
--shadow-glow-coral: 0 0 40px rgba(255, 77, 109, 0.4);
```

---

## 2. Componentes base (a construir en `/components/ui-dap/`)

> **Importante:** estos componentes son ESPECÍFICOS del DAP, distintos de los de shadcn (que viven en `/components/ui/`). El prefijo `ui-dap` evita colisiones.

### 2.1 Button

3 variantes + 3 tamaños.

**Variantes:**

| Variante | Apariencia |
|----------|------------|
| `primary` | Bg gradiente violeta-coral. Texto blanco. Hover: scale 1.02 + glow violeta. |
| `secondary` | Bg transparente. Border coral. Texto blanco. Hover: bg coral/10. |
| `ghost` | Solo texto blanco. Hover: text-coral. |

**Tamaños:**

| Tamaño | Padding | Tipo |
|--------|---------|------|
| `sm` | py-2 px-4 | `text-sm` |
| `md` | py-3 px-6 | `text-body` |
| `lg` | py-4 px-8 | `text-body` (más bold) |

**Estado focus:** ring violeta + offset oscuro.

### 2.2 Card.Glass (glassmorphism)

El componente bandera. Look "vidrio esmerilado oscuro".

```tsx
<div className="
  rounded-xl
  bg-white/[0.03]
  backdrop-blur-xl
  border border-white/[0.08]
  shadow-card
  p-6
">
  {children}
</div>
```

Variante con borde gradiente sutil:
```tsx
<div className="relative rounded-xl bg-surface-elevated p-6">
  {/* borde gradiente con pseudo-elemento */}
  <div className="absolute inset-0 rounded-xl bg-gradient-brand opacity-[0.08] -z-10" />
  {children}
</div>
```

### 2.3 Stat (KPI numérico con icono)

Ejemplo de uso: "200 Módulos", "18 Meses", "+12K Estudiantes".

```tsx
<div className="flex items-center gap-4">
  <div className="
    w-12 h-12 rounded-lg
    bg-brand-violet/10
    flex items-center justify-center
    text-brand-violet
  ">
    <Icon className="w-6 h-6" />
  </div>
  <div>
    <p className="font-grotesk font-bold text-h3 text-white">{value}</p>
    <p className="text-sm text-text-secondary">{label}</p>
  </div>
</div>
```

### 2.4 ProgressBar

Track + fill con gradiente.

```tsx
<div className="w-full">
  {showLabel && (
    <div className="flex justify-between text-sm text-text-secondary mb-2">
      <span>{label}</span>
      <span>{percentage}%</span>
    </div>
  )}
  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
    <div
      className="h-full rounded-full bg-gradient-brand transition-all duration-500"
      style={{ width: `${percentage}%` }}
    />
  </div>
</div>
```

### 2.5 RankBadge (hexagonal)

El icono visual de los 9 rangos. SVG inline para no depender de assets externos.

```tsx
// /components/ui-dap/RankBadge.tsx
interface RankBadgeProps {
  rankOrder: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode; // Lucide icon adentro
}

// Mapeo de color por rango (la imagen muestra cada rango con un tinte)
const RANK_TINT = {
  1: '#A78BFA', // Discípulo — violeta claro
  2: '#7B61FF', // Hijo — violeta principal
  3: '#5B4FFF', // Líder — violeta-índigo
  4: '#FF6B9D', // Pastor — coral suave
  5: '#FF4D6D', // Administrador — coral principal
  6: '#FF3B5C', // Mayordomo — coral intenso
  7: '#FFB84D', // Reformador — ámbar
  8: '#4DFFB8', // Arquitecto — verde-menta
  9: '#FFD700', // Enviado — dorado
};

// SVG hexagonal con relleno tinte + glow + icono Lucide al centro.
// Ver implementación en el prompt para Claude Code.
```

### 2.6 NavItem (sidebar)

```tsx
// idle, hover, active
<a className={cn(
  "flex items-center gap-3 px-4 py-3 rounded-lg transition",
  "text-text-secondary hover:text-white hover:bg-white/[0.04]",
  isActive && "bg-brand-violet/10 text-white border-l-2 border-brand-coral"
)}>
  <Icon className="w-5 h-5" />
  <span className="text-body font-medium">{label}</span>
</a>
```

### 2.7 ModuleCard (lista de módulos)

Para "Tus Próximos Módulos" en dashboard.

```tsx
<div className="flex items-center justify-between p-4 rounded-lg hover:bg-white/[0.02] transition group">
  <div className="flex items-center gap-4">
    <span className="font-grotesk text-h4 text-text-secondary group-hover:text-brand-coral">
      {moduleNumber}
    </span>
    <div>
      <p className="text-body font-semibold text-white">{title}</p>
      <p className="text-sm text-text-secondary">{blockName}</p>
    </div>
  </div>
  <Button variant="secondary" size="sm">Iniciar</Button>
</div>
```

### 2.8 BlockCard (las 9 áreas en landing)

```tsx
<div className="
  group p-6 rounded-xl
  bg-surface-elevated
  border border-white/[0.06]
  hover:border-brand-violet/30 hover:bg-surface-elevated/80
  transition-all duration-300
  cursor-pointer
">
  <div className="flex items-start justify-between mb-4">
    <span className="font-grotesk font-bold text-h2 bg-gradient-brand bg-clip-text text-transparent">
      {String(order).padStart(2, '0')}
    </span>
    <div className="w-10 h-10 rounded-lg bg-brand-violet/10 flex items-center justify-center text-brand-violet">
      <BlockIcon className="w-5 h-5" />
    </div>
  </div>
  <h3 className="font-grotesk font-semibold text-h4 text-white mb-2">{title}</h3>
  <p className="text-sm text-text-secondary">{description}</p>
</div>
```

### 2.9 Avatar

```tsx
<div className="
  w-10 h-10 rounded-full
  bg-gradient-brand
  flex items-center justify-center
  text-white font-semibold
">
  {initials || <UserIcon />}
</div>
```

Con foto:
```tsx
<img className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10" src={photoUrl} />
```

### 2.10 InputField

```tsx
<input className="
  w-full px-4 py-3 rounded-md
  bg-white/[0.04]
  border border-white/[0.08]
  text-white placeholder:text-text-tertiary
  focus:outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20
  transition
" />
```

---

## 3. Layouts

### 3.1 Public layout (landing + auth)
- Sin sidebar.
- Header sticky transparente que se vuelve opaco al scroll.
- Footer oscuro con valores ("Bíblico, Práctico, Estratégico, Tecnológico, Apostólico").

### 3.2 Student layout (área del alumno)
- Sidebar oscuro fijo a la izquierda (240px).
- Header superior con searchbar global + iconos (notificaciones, ayuda).
- Sidebar:
  - Top: logo DAP.
  - Items: Inicio, Mis Módulos, Mi Progreso, Mentorías, Comunidad, Recursos, Eventos, Certificaciones, Mensajes, Configuración.
  - Bottom: avatar + nombre + rango del alumno.

### 3.3 Admin layout
- Misma estructura que student, paleta más sobria (sin gradientes en sidebar).
- Items: Bloques, Módulos, Alumnos, Suscripciones, Sesiones en vivo, Tutor IA, Reportes.

---

## 4. Assets — qué tienes y qué falta

| Asset | Estado | Cómo conseguirlo si falta |
|-------|--------|---------------------------|
| **Logo DAP** | ✅ Lo tienes | Guárdalo en `/public/dap-logo.svg`. Si es PNG, convierte a SVG vectorizado en Figma/Illustrator. |
| **Hero image (cosmic + figura)** | ❌ Falta | **Opción A:** generar con Midjourney/DALL-E con prompt como *"silhouette of person standing at edge of cliff looking at futuristic city with cosmic blue and purple particles, night sky, ultra cinematic, 4k, dark blue tones"*. **Opción B:** Unsplash con búsqueda *"silhouette cosmic city night"*. **Opción C (mientras tanto):** gradiente CSS + partículas SVG animadas como placeholder. |
| **Iconos de 9 bloques** | ❌ Falta | Mapeo a Lucide React (gratis, ya está instalado). Ver tabla abajo. |
| **Hexagonal rank badges** | ❌ Falta | Custom SVG inline con tinte por rango. Te paso código en el prompt de Claude Code. |
| **Fotos placeholder de mentor/alumno** | ❌ Falta | **Iniciales sobre gradient** como default. Cuando tengas fotos reales, sustituyes. |
| **Hero secundario (segundo CTA al final)** | Opcional | Mismo approach que el hero principal. |

### 4.1 Mapeo de iconos para los 9 bloques (Lucide React)

| Bloque | Tema | Lucide icon | Tinte (opcional) |
|--------|------|-------------|-------------------|
| 1 | Fundamentos Espirituales | `BookOpen` | violet-400 |
| 2 | Identidad y Carácter | `Heart` | pink-400 |
| 3 | Liderazgo y Discipulado | `Crown` | indigo-400 |
| 4 | Ministerio y Pastorado | `Cross` (o `Sparkles`) | rose-400 |
| 5 | Administración y Gobierno | `ShieldCheck` | violet-500 |
| 6 | Finanzas y Economía del Reino | `Coins` (o `DollarSign`) | amber-400 |
| 7 | Empresas y Expansión | `Rocket` | emerald-400 |
| 8 | Tecnología, IA y Comunicación | `Cpu` (o `Wifi`) | cyan-400 |
| 9 | Gobierno Apostólico y Reforma | `Globe2` | yellow-400 |

### 4.2 Mapeo de iconos para "Una formación integral" (6 áreas)

| Área | Lucide icon |
|------|-------------|
| Espiritual | `Sparkles` |
| Liderazgo | `Users` |
| Administración | `Building2` |
| Finanzas | `Coins` |
| Empresas | `Briefcase` |
| Tecnología | `Cpu` |

### 4.3 Hero image placeholder (mientras consigues uno real)

Mientras no haya imagen real, usar este CSS:

```css
.hero-placeholder {
  background:
    radial-gradient(circle at 30% 50%, rgba(123, 97, 255, 0.3), transparent 50%),
    radial-gradient(circle at 70% 50%, rgba(255, 77, 109, 0.2), transparent 50%),
    linear-gradient(135deg, #07142B 0%, #241E72 50%, #07142B 100%);
}
```

Más SVG con partículas (puntos blancos con opacidad aleatoria) como "estrellas". Pasable.

---

## 5. Plan de implementación (5 fases)

> **Total estimado: 8–12 horas distribuidas en 3–5 sesiones de Claude Code.**

### Fase A — Tokens y tipografías (30–45 min)
- Instalar `next/font` con Space Grotesk + Inter.
- Configurar `tailwind.config.ts` con tokens (colors, fontFamily, spacing, borderRadius, boxShadow).
- `globals.css` con CSS variables.
- `lib/utils.ts` con helper `cn` (clsx + twMerge).

### Fase B — Componentes base (3–4 horas)
- `/components/ui-dap/Button.tsx`
- `/components/ui-dap/Card.tsx` con sub-componente `Card.Glass`
- `/components/ui-dap/Stat.tsx`
- `/components/ui-dap/ProgressBar.tsx`
- `/components/ui-dap/RankBadge.tsx` (SVG inline)
- `/components/ui-dap/NavItem.tsx`
- `/components/ui-dap/ModuleCard.tsx`
- `/components/ui-dap/BlockCard.tsx`
- `/components/ui-dap/Avatar.tsx`
- `/components/ui-dap/InputField.tsx`
- Cada uno con Storybook simple (un archivo `*.stories.tsx`) o página de demo `/dev/components`.

### Fase C — Layouts (1–2 horas)
- `/app/(public)/layout.tsx` con header transparent/sticky + footer.
- `/app/(student)/layout.tsx` con sidebar + topbar.
- `/components/layouts/StudentSidebar.tsx`.
- `/components/layouts/PublicHeader.tsx`, `PublicFooter.tsx`.

### Fase D — Refactor landing (2–3 horas)
- Rehacer `/app/(public)/page.tsx` con los componentes nuevos.
- Hero con gradiente CSS placeholder (mientras consigues imagen real).
- 6 áreas, 9 bloques, stats, valores.

### Fase E — Refactor dashboard (2–3 horas)
- Rehacer `/app/(student)/dashboard/page.tsx` con sidebar + stats + módulos + actividad.
- Mostrar progreso general, nivel actual (rank badge), próximos módulos.

---

## 6. Reglas firmes del design system

- **Nunca usar colores fuera de la paleta.** Si necesitas un tono distinto, agrégalo al token y documenta el uso.
- **Espaciados solo de la escala 4-base.** Nada de `px-7` o `gap-5px`.
- **Border radius solo de la escala.** Nada de `rounded-[8px]` arbitrario.
- **Texto blanco siempre sobre fondos oscuros.** Si necesitas dark text, replantea el componente.
- **El gradiente `--gradient-brand` es sagrado.** Solo se usa en: logo, CTAs primarios, números grandes destacados, hero text. No abusarlo.
- **Glassmorphism solo en cards informativas.** Nunca en navegación principal (donde la legibilidad es crítica).
- **Animaciones < 300ms.** Hover, focus, transiciones. Más allá se siente lento.
- **Mobile-first.** Cada componente probado en 375px antes de desktop.

---

## 7. Componentes a evitar (anti-patterns)

- **Bordes de neón fuera de focus states.** Es tentador, pero quita seriedad. Solo en focus / active.
- **Múltiples gradientes en la misma vista.** Uno o dos máximo. Si pones 5, parece arcoíris.
- **Fondos puramente negros.** Usar `--surface-base` (navy profundo), no #000.
- **Texto en gradiente para párrafos largos.** Solo para títulos cortos y números destacados.
- **Sombras dropshadow tradicionales.** Mejor glow violeta/coral para mantener consistencia.
