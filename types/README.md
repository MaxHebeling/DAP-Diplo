# types/

Tipos TypeScript compartidos entre `app/`, `components/` y `lib/`.

Archivos planeados:
- `database.ts` — tipos generados desde el esquema Supabase con `supabase gen types typescript`. **No editar a mano.**
- `domain.ts` — tipos de dominio que no son tablas (ej. `LessonWithProgress`, `ModuleWithStats`).
- `forms.ts` — schemas Zod compartidos para formularios reutilizables.

Re-generar `database.ts` después de cada migration aplicada:
```
pnpm dlx supabase gen types typescript --project-id <ref> > types/database.ts
```
