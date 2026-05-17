# supabase/

Esquema, migraciones y seed para la base Postgres de Supabase.

- `migrations/` — SQL versionado en orden. Nombre: `NNNN_descripcion.sql`.
- `seed.sql` — datos de ejemplo para desarrollo local (no se ejecuta en prod).

Reglas:
- Migraciones son **inmutables** una vez aplicadas. Para corregir errores, crear una nueva migration.
- Toda tabla nueva debe tener RLS habilitado y al menos una policy explícita antes de mergear.
- Aplicar localmente con `supabase db push` o desde el SQL Editor del dashboard.
