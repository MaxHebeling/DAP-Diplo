# components/

Componentes React reutilizables.

- `ui/` — componentes shadcn/ui generados con el CLI. **No editar a mano.** Para customizar, ejecutar `pnpm dlx shadcn@latest add [componente] --overwrite` y commitear.
- `[feature]/` — un subdirectorio por feature/dominio. Ejemplos planeados: `course/`, `lesson/`, `quiz/`, `certificate/`, `forum/`, `live/`, `tutor/`, `admin/`. Componentes específicos del dominio van acá.

Convenciones:
- Server Components por defecto.
- Validar inputs con Zod cuando reciben datos del cliente.
- Textos visibles en español; nombres de componentes en inglés.
