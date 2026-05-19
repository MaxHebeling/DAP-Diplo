-- =====================================================================
-- DAP — Seed de los 200 módulos
-- Aplicar DESPUÉS de 0001_initial_schema.sql
-- =====================================================================
-- Inserta los 200 módulos vacíos, distribuidos en los 9 bloques.
-- Las 5 secciones (intro/teaching/activation/evaluation/impartation)
-- de cada módulo se crean AUTOMÁTICAMENTE por el trigger
-- after_module_insert. No hace falta insertarlas a mano.
--
-- Los módulos quedan sin descripción/contenido — el admin los rellena
-- desde el backoffice (/admin/bloques/[slug]/modulos/[slug]).
-- =====================================================================

-- =====================================================================
-- BLOQUE 1 — Fundamentos Espirituales (22 módulos)
-- =====================================================================
with b as (select id from public.blocks where slug = 'fundamentos-espirituales')
insert into public.modules (block_id, order_index, slug, title) values
  ((select id from b),  1, 'panorama-biblico',      'Panorama bíblico'),
  ((select id from b),  2, 'reino-de-dios',         'Reino de Dios'),
  ((select id from b),  3, 'salvacion',             'Salvación'),
  ((select id from b),  4, 'espiritu-santo',        'Espíritu Santo'),
  ((select id from b),  5, 'fe',                    'Fe'),
  ((select id from b),  6, 'gracia',                'Gracia'),
  ((select id from b),  7, 'identidad-en-cristo',   'Identidad en Cristo'),
  ((select id from b),  8, 'oracion',               'Oración'),
  ((select id from b),  9, 'intercesion',           'Intercesión'),
  ((select id from b), 10, 'ayuno',                 'Ayuno'),
  ((select id from b), 11, 'santidad',              'Santidad'),
  ((select id from b), 12, 'guerra-espiritual',     'Guerra espiritual'),
  ((select id from b), 13, 'paternidad-espiritual', 'Paternidad espiritual'),
  ((select id from b), 14, 'discipulado',           'Discipulado'),
  ((select id from b), 15, 'cultura-del-reino',     'Cultura del Reino'),
  ((select id from b), 16, 'intimidad-con-dios',    'Intimidad con Dios'),
  ((select id from b), 17, 'autoridad-espiritual',  'Autoridad espiritual'),
  ((select id from b), 18, 'temor-de-dios',         'Temor de Dios'),
  ((select id from b), 19, 'vida-devocional',       'Vida devocional'),
  ((select id from b), 20, 'adoracion',             'Adoración'),
  ((select id from b), 21, 'la-cruz',               'La cruz'),
  ((select id from b), 22, 'formacion-espiritual',  'Formación espiritual');

-- =====================================================================
-- BLOQUE 2 — Identidad y Carácter (22 módulos)
-- =====================================================================
with b as (select id from public.blocks where slug = 'identidad-y-caracter')
insert into public.modules (block_id, order_index, slug, title) values
  ((select id from b),  1, 'espiritu-de-hijo',         'Espíritu de hijo'),
  ((select id from b),  2, 'sanidad-emocional',        'Sanidad emocional'),
  ((select id from b),  3, 'heridas-del-liderazgo',    'Heridas del liderazgo'),
  ((select id from b),  4, 'rechazo',                  'Rechazo'),
  ((select id from b),  5, 'procesos',                 'Procesos'),
  ((select id from b),  6, 'humildad',                 'Humildad'),
  ((select id from b),  7, 'caracter',                 'Carácter'),
  ((select id from b),  8, 'dominio-propio',           'Dominio propio'),
  ((select id from b),  9, 'integridad',               'Integridad'),
  ((select id from b), 10, 'madurez',                  'Madurez'),
  ((select id from b), 11, 'lealtad',                  'Lealtad'),
  ((select id from b), 12, 'fidelidad',                'Fidelidad'),
  ((select id from b), 13, 'honra',                    'Honra'),
  ((select id from b), 14, 'mentalidad-de-reino',      'Mentalidad de Reino'),
  ((select id from b), 15, 'renovacion-de-la-mente',   'Renovación de la mente'),
  ((select id from b), 16, 'manejo-del-dolor',         'Manejo del dolor'),
  ((select id from b), 17, 'perseverancia',            'Perseverancia'),
  ((select id from b), 18, 'identidad-ministerial',    'Identidad ministerial'),
  ((select id from b), 19, 'restauracion-emocional',   'Restauración emocional'),
  ((select id from b), 20, 'vida-familiar',            'Vida familiar'),
  ((select id from b), 21, 'balance',                  'Balance'),
  ((select id from b), 22, 'legado',                   'Legado');

-- =====================================================================
-- BLOQUE 3 — Liderazgo y Discipulado (22 módulos)
-- =====================================================================
with b as (select id from public.blocks where slug = 'liderazgo-y-discipulado')
insert into public.modules (block_id, order_index, slug, title) values
  ((select id from b),  1, 'liderazgo-biblico',         'Liderazgo bíblico'),
  ((select id from b),  2, 'como-levantar-lideres',     'Cómo levantar líderes'),
  ((select id from b),  3, 'como-discipular',           'Cómo discipular'),
  ((select id from b),  4, 'multiplicacion',            'Multiplicación'),
  ((select id from b),  5, 'cultura-de-equipos',        'Cultura de equipos'),
  ((select id from b),  6, 'delegacion',                'Delegación'),
  ((select id from b),  7, 'resolucion-de-conflictos',  'Resolución de conflictos'),
  ((select id from b),  8, 'vision',                    'Visión'),
  ((select id from b),  9, 'cultura-organizacional',    'Cultura organizacional'),
  ((select id from b), 10, 'comunicacion',              'Comunicación'),
  ((select id from b), 11, 'influencia',                'Influencia'),
  ((select id from b), 12, 'mentoria',                  'Mentoría'),
  ((select id from b), 13, 'correccion',                'Corrección'),
  ((select id from b), 14, 'formacion-de-equipos',      'Formación de equipos'),
  ((select id from b), 15, 'liderazgo-generacional',    'Liderazgo generacional'),
  ((select id from b), 16, 'casas-de-paz',              'Casas de paz'),
  ((select id from b), 17, 'redes',                     'Redes'),
  ((select id from b), 18, 'desarrollo-de-lideres',     'Desarrollo de líderes'),
  ((select id from b), 19, 'planeacion',                'Planeación'),
  ((select id from b), 20, 'expansion',                 'Expansión'),
  ((select id from b), 21, 'cultura-de-honra',          'Cultura de honra'),
  ((select id from b), 22, 'gobierno-espiritual',       'Gobierno espiritual');

-- =====================================================================
-- BLOQUE 4 — Ministerio y Pastorado (22 módulos)
-- =====================================================================
with b as (select id from public.blocks where slug = 'ministerio-y-pastorado')
insert into public.modules (block_id, order_index, slug, title) values
  ((select id from b),  1, 'pastorado',                 'Pastorado'),
  ((select id from b),  2, 'consejeria',                'Consejería'),
  ((select id from b),  3, 'matrimonios',               'Matrimonios'),
  ((select id from b),  4, 'jovenes',                   'Jóvenes'),
  ((select id from b),  5, 'ninos',                     'Niños'),
  ((select id from b),  6, 'restauracion',              'Restauración'),
  ((select id from b),  7, 'manejo-de-crisis',          'Manejo de crisis'),
  ((select id from b),  8, 'administracion-pastoral',   'Administración pastoral'),
  ((select id from b),  9, 'cultura-pastoral',          'Cultura pastoral'),
  ((select id from b), 10, 'equipos-ministeriales',     'Equipos ministeriales'),
  ((select id from b), 11, 'cobertura-espiritual',      'Cobertura espiritual'),
  ((select id from b), 12, 'etica-ministerial',         'Ética ministerial'),
  ((select id from b), 13, 'formacion-de-discipulos',   'Formación de discípulos'),
  ((select id from b), 14, 'predicacion',               'Predicación'),
  ((select id from b), 15, 'homiletica',                'Homilética'),
  ((select id from b), 16, 'hermeneutica',              'Hermenéutica'),
  ((select id from b), 17, 'escatologia',               'Escatología'),
  ((select id from b), 18, 'avivamiento',               'Avivamiento'),
  ((select id from b), 19, 'liberacion',                'Liberación'),
  ((select id from b), 20, 'milagros',                  'Milagros'),
  ((select id from b), 21, 'lo-profetico',              'Lo profético'),
  ((select id from b), 22, 'sensibilidad-espiritual',   'Sensibilidad espiritual');

-- =====================================================================
-- BLOQUE 5 — Administración y Gobierno (22 módulos)
-- =====================================================================
with b as (select id from public.blocks where slug = 'administracion-y-gobierno')
insert into public.modules (block_id, order_index, slug, title) values
  ((select id from b),  1, 'administracion',            'Administración'),
  ((select id from b),  2, 'organizacion',              'Organización'),
  ((select id from b),  3, 'sistemas',                  'Sistemas'),
  ((select id from b),  4, 'procesos',                  'Procesos'),
  ((select id from b),  5, 'planeacion',                'Planeación'),
  ((select id from b),  6, 'presupuestos',              'Presupuestos'),
  ((select id from b),  7, 'gestion-documental',        'Gestión documental'),
  ((select id from b),  8, 'legalidad',                 'Legalidad'),
  ((select id from b),  9, 'fundaciones',               'Fundaciones'),
  ((select id from b), 10, 'crm-ministerial',           'CRM ministerial'),
  ((select id from b), 11, 'tecnologia',                'Tecnología'),
  ((select id from b), 12, 'automatizacion',            'Automatización'),
  ((select id from b), 13, 'kpi-ministeriales',         'KPI ministeriales'),
  ((select id from b), 14, 'estrategia',                'Estrategia'),
  ((select id from b), 15, 'eventos',                   'Eventos'),
  ((select id from b), 16, 'gestion-de-voluntarios',    'Gestión de voluntarios'),
  ((select id from b), 17, 'estructuras',               'Estructuras'),
  ((select id from b), 18, 'gestion-de-equipos',        'Gestión de equipos'),
  ((select id from b), 19, 'planeacion-anual',          'Planeación anual'),
  ((select id from b), 20, 'cultura-organizacional',    'Cultura organizacional'),
  ((select id from b), 21, 'expansion-territorial',     'Expansión territorial'),
  ((select id from b), 22, 'gobierno',                  'Gobierno');

-- =====================================================================
-- BLOQUE 6 — Finanzas y Economía del Reino (22 módulos)
-- =====================================================================
with b as (select id from public.blocks where slug = 'finanzas-y-economia-del-reino')
insert into public.modules (block_id, order_index, slug, title) values
  ((select id from b),  1, 'finanzas-personales',       'Finanzas personales'),
  ((select id from b),  2, 'economia-biblica',          'Economía bíblica'),
  ((select id from b),  3, 'diezmos-y-ofrendas',        'Diezmos y ofrendas'),
  ((select id from b),  4, 'generosidad',               'Generosidad'),
  ((select id from b),  5, 'libertad-financiera',       'Libertad financiera'),
  ((select id from b),  6, 'ahorro',                    'Ahorro'),
  ((select id from b),  7, 'presupuestos',              'Presupuestos'),
  ((select id from b),  8, 'inversiones',               'Inversiones'),
  ((select id from b),  9, 'deudas',                    'Deudas'),
  ((select id from b), 10, 'finanzas-ministeriales',    'Finanzas ministeriales'),
  ((select id from b), 11, 'contabilidad-basica',       'Contabilidad básica'),
  ((select id from b), 12, 'impuestos',                 'Impuestos'),
  ((select id from b), 13, 'mentalidad-de-pobreza',     'Mentalidad de pobreza'),
  ((select id from b), 14, 'multiplicacion',            'Multiplicación'),
  ((select id from b), 15, 'mayordomia',                'Mayordomía'),
  ((select id from b), 16, 'fuentes-de-ingreso',        'Fuentes de ingreso'),
  ((select id from b), 17, 'administracion-financiera', 'Administración financiera'),
  ((select id from b), 18, 'escalabilidad',             'Escalabilidad'),
  ((select id from b), 19, 'emprendimiento',            'Emprendimiento'),
  ((select id from b), 20, 'educacion-financiera',      'Educación financiera'),
  ((select id from b), 21, 'planificacion-economica',   'Planificación económica'),
  ((select id from b), 22, 'prosperidad-biblica',       'Prosperidad bíblica');

-- =====================================================================
-- BLOQUE 7 — Empresas y Expansión (22 módulos)
-- =====================================================================
with b as (select id from public.blocks where slug = 'empresas-y-expansion')
insert into public.modules (block_id, order_index, slug, title) values
  ((select id from b),  1, 'negocios-del-reino',        'Negocios del Reino'),
  ((select id from b),  2, 'emprendimiento',            'Emprendimiento'),
  ((select id from b),  3, 'marca-personal',            'Marca personal'),
  ((select id from b),  4, 'branding',                  'Branding'),
  ((select id from b),  5, 'ventas',                    'Ventas'),
  ((select id from b),  6, 'marketing',                 'Marketing'),
  ((select id from b),  7, 'redes-sociales',            'Redes sociales'),
  ((select id from b),  8, 'embudos',                   'Embudos'),
  ((select id from b),  9, 'liderazgo-empresarial',     'Liderazgo empresarial'),
  ((select id from b), 10, 'equipos',                   'Equipos'),
  ((select id from b), 11, 'innovacion',                'Innovación'),
  ((select id from b), 12, 'ia-aplicada',               'IA aplicada'),
  ((select id from b), 13, 'modelos-de-negocio',        'Modelos de negocio'),
  ((select id from b), 14, 'atencion-al-cliente',       'Atención al cliente'),
  ((select id from b), 15, 'estrategia-digital',        'Estrategia digital'),
  ((select id from b), 16, 'automatizacion',            'Automatización'),
  ((select id from b), 17, 'escalabilidad',             'Escalabilidad'),
  ((select id from b), 18, 'negociacion',               'Negociación'),
  ((select id from b), 19, 'expansion',                 'Expansión'),
  ((select id from b), 20, 'influencia-cultural',       'Influencia cultural'),
  ((select id from b), 21, 'posicionamiento',           'Posicionamiento'),
  ((select id from b), 22, 'vision-empresarial',        'Visión empresarial');

-- =====================================================================
-- BLOQUE 8 — Tecnología, IA y Comunicación (22 módulos)
-- =====================================================================
with b as (select id from public.blocks where slug = 'tecnologia-ia-y-comunicacion')
insert into public.modules (block_id, order_index, slug, title) values
  ((select id from b),  1, 'ia-para-ministerios',       'IA para ministerios'),
  ((select id from b),  2, 'ia-para-sermones',          'IA para sermones'),
  ((select id from b),  3, 'ia-para-liderazgo',         'IA para liderazgo'),
  ((select id from b),  4, 'automatizacion',            'Automatización'),
  ((select id from b),  5, 'streaming',                 'Streaming'),
  ((select id from b),  6, 'podcast',                   'Podcast'),
  ((select id from b),  7, 'produccion-audiovisual',    'Producción audiovisual'),
  ((select id from b),  8, 'diseno',                    'Diseño'),
  ((select id from b),  9, 'canva',                     'Canva'),
  ((select id from b), 10, 'redes-sociales',            'Redes sociales'),
  ((select id from b), 11, 'chatgpt',                   'ChatGPT'),
  ((select id from b), 12, 'crm',                       'CRM'),
  ((select id from b), 13, 'apps-ministeriales',        'Apps ministeriales'),
  ((select id from b), 14, 'evangelismo-digital',       'Evangelismo digital'),
  ((select id from b), 15, 'diseno-web',                'Diseño web'),
  ((select id from b), 16, 'marca-digital',             'Marca digital'),
  ((select id from b), 17, 'ecosistemas-digitales',     'Ecosistemas digitales'),
  ((select id from b), 18, 'seguridad-digital',         'Seguridad digital'),
  ((select id from b), 19, 'comunicacion-de-impacto',   'Comunicación de impacto'),
  ((select id from b), 20, 'storytelling',              'Storytelling'),
  ((select id from b), 21, 'medios',                    'Medios'),
  ((select id from b), 22, 'futuro-tecnologico',        'Futuro tecnológico');

-- =====================================================================
-- BLOQUE 9 — Gobierno Apostólico y Reforma (24 módulos)
-- =====================================================================
with b as (select id from public.blocks where slug = 'gobierno-apostolico-y-reforma')
insert into public.modules (block_id, order_index, slug, title) values
  ((select id from b),  1, 'gobierno-apostolico',       'Gobierno apostólico'),
  ((select id from b),  2, 'reforma',                   'Reforma'),
  ((select id from b),  3, 'expansion-territorial',     'Expansión territorial'),
  ((select id from b),  4, 'cultura-apostolica',        'Cultura apostólica'),
  ((select id from b),  5, 'reino-y-sociedad',          'Reino y sociedad'),
  ((select id from b),  6, 'reino-y-politica',          'Reino y política'),
  ((select id from b),  7, 'reino-y-economia',          'Reino y economía'),
  ((select id from b),  8, 'reino-y-educacion',         'Reino y educación'),
  ((select id from b),  9, 'reino-y-medios',            'Reino y medios'),
  ((select id from b), 10, 'reino-y-empresas',          'Reino y empresas'),
  ((select id from b), 11, 'misiones',                  'Misiones'),
  ((select id from b), 12, 'plantacion-de-iglesias',    'Plantación de iglesias'),
  ((select id from b), 13, 'transformacion-cultural',   'Transformación cultural'),
  ((select id from b), 14, 'avivamiento',               'Avivamiento'),
  ((select id from b), 15, 'generaciones',              'Generaciones'),
  ((select id from b), 16, 'legado',                    'Legado'),
  ((select id from b), 17, 'sucesion',                  'Sucesión'),
  ((select id from b), 18, 'arquitectura-ministerial',  'Arquitectura ministerial'),
  ((select id from b), 19, 'influencia-territorial',    'Influencia territorial'),
  ((select id from b), 20, 'diseno-de-vision',          'Diseño de visión'),
  ((select id from b), 21, 'reformadores',              'Reformadores'),
  ((select id from b), 22, 'estrategias-de-reino',      'Estrategias de Reino'),
  ((select id from b), 23, 'gobierno-espiritual',       'Gobierno espiritual'),
  ((select id from b), 24, 'comisionamiento-final',     'Comisionamiento final');

-- =====================================================================
-- Verificación
-- =====================================================================
-- Después de correr este script, deberías ver:
--   - 9 bloques en public.blocks
--   - 200 módulos en public.modules
--   - 1,000 secciones en public.module_sections (auto-creadas por trigger)
--
-- Validar con:
--   select count(*) from public.blocks;          -- 9
--   select count(*) from public.modules;         -- 200
--   select count(*) from public.module_sections; -- 1000
-- =====================================================================
