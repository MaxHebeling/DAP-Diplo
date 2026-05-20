-- =====================================================================
-- DAP — 0013: Seed cover_image_url + brand_name de los 9 bloques
-- =====================================================================
-- Aplica los assets visuales y nombres comerciales de cada bloque.
-- Las 9 imágenes viven en /public/blocks/01-raices.png ... 09-dominio.png
-- (en el repo). Cada una trae el brand_name impreso encima.
--
-- Mapping order_index → brand → image:
--   1 · Raíces      → Fundamentos Espirituales
--   2 · Forja       → Identidad y Carácter
--   3 · Antorcha    → Liderazgo y Discipulado
--   4 · Cayado      → Ministerio y Pastorado
--   5 · Orden       → Administración y Gobierno
--   6 · Cosecha     → Finanzas y Economía del Reino
--   7 · Impacto     → Empresas y Expansión
--   8 · Influencia  → Tecnología, IA y Comunicación
--   9 · Dominio     → Gobierno Apostólico y Reforma
-- =====================================================================

with src as (
  select * from (values
    (1, 'Raíces',     '/blocks/01-raices.png'),
    (2, 'Forja',      '/blocks/02-forja.png'),
    (3, 'Antorcha',   '/blocks/03-antorcha.png'),
    (4, 'Cayado',     '/blocks/04-cayado.png'),
    (5, 'Orden',      '/blocks/05-orden.png'),
    (6, 'Cosecha',    '/blocks/06-cosecha.png'),
    (7, 'Impacto',    '/blocks/07-impacto.png'),
    (8, 'Influencia', '/blocks/08-influencia.png'),
    (9, 'Dominio',    '/blocks/09-dominio.png')
  ) as t(ord, brand, img)
)
update public.blocks b
set brand_name = s.brand,
    cover_image_url = s.img,
    updated_at = now()
from src s
where b.order_index = s.ord;

with src as (
  select * from (values
    (1, 'Raíces',     '/blocks/01-raices.png'),
    (2, 'Forja',      '/blocks/02-forja.png'),
    (3, 'Antorcha',   '/blocks/03-antorcha.png'),
    (4, 'Cayado',     '/blocks/04-cayado.png'),
    (5, 'Orden',      '/blocks/05-orden.png'),
    (6, 'Cosecha',    '/blocks/06-cosecha.png'),
    (7, 'Impacto',    '/blocks/07-impacto.png'),
    (8, 'Influencia', '/blocks/08-influencia.png'),
    (9, 'Dominio',    '/blocks/09-dominio.png')
  ) as t(ord, brand, img)
)
update public.phases p
set brand_name = s.brand,
    cover_image_url = s.img,
    updated_at = now()
from src s
where p.order_index = s.ord;
