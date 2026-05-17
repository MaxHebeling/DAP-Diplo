# supabase/migrations/

SQL migrations versionadas. Se aplican en orden alfanumérico.

Convención: `NNNN_descripcion_breve.sql` (4 dígitos, snake_case).

Cada migration debe:
- Ser idempotente cuando sea razonable (`if not exists`).
- Habilitar RLS y declarar policies para cualquier tabla nueva.
- No depender de datos previos no commiteados.

Para crear una nueva migration:
```
touch supabase/migrations/$(printf "%04d" $(($(ls supabase/migrations | grep -c '^[0-9]') + 1)))_descripcion.sql
```
