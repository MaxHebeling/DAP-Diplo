-- =====================================================================
-- DAP — 0017: Seed editorial PROPUESTO de subtitle + promise
-- =====================================================================
-- Copy inicial para los 9 bloques. Max edita desde /admin/bloques.
-- Idempotente: solo escribe si subtitle o promise es null.
-- =====================================================================

with src as (
  select * from (values
    (1, 'Construí los cimientos del llamado sobre roca, no sobre arena.',
        'Vas a salir sabiendo quién es Dios, quién sos vos y para qué fuiste enviado.'),
    (2, 'El proceso del carácter precede al ejercicio del ministerio.',
        'Vas a entender que tu identidad como hijo es la base de toda autoridad.'),
    (3, 'Levantá líderes que levanten líderes. La luz se enciende para encender.',
        'Vas a salir formando a otros con la misma fidelidad con que fuiste formado.'),
    (4, 'El corazón pastoral antes que las estrategias pastorales.',
        'Vas a pastorear con autoridad y ternura, alineado al modelo apostólico.'),
    (5, 'Donde hay orden, hay bendición. El gobierno apostólico tiene estructura.',
        'Vas a operar tu ministerio o iglesia con la estructura que sostiene el crecimiento.'),
    (6, 'La economía del Reino no es escasez. Es siembra, mayordomía y multiplicación.',
        'Vas a romper estructuras de pobreza y a operar las finanzas del Reino con sabiduría.'),
    (7, 'El llamado del Reino también se expresa en negocios, marcas y territorios.',
        'Vas a entender cómo tu ministerio puede impactar el mercado y la cultura.'),
    (8, 'El siglo XXI exige pastores que dominen las herramientas que dominan la cultura.',
        'Vas a usar tecnología, IA y medios para extender tu mensaje sin perder el alma.'),
    (9, 'El apóstol no se forma para ocupar puestos, sino para reformar naciones.',
        'Vas a salir enviado con autoridad sobre territorios, no solo sobre congregaciones.')
  ) as t(ord, sub, prom)
)
update public.blocks b
set subtitle = s.sub,
    promise = s.prom,
    updated_at = now()
from src s
where b.order_index = s.ord
  and (b.subtitle is null or b.promise is null);

with src as (
  select * from (values
    (1, 'Construí los cimientos del llamado sobre roca, no sobre arena.',
        'Vas a salir sabiendo quién es Dios, quién sos vos y para qué fuiste enviado.'),
    (2, 'El proceso del carácter precede al ejercicio del ministerio.',
        'Vas a entender que tu identidad como hijo es la base de toda autoridad.'),
    (3, 'Levantá líderes que levanten líderes. La luz se enciende para encender.',
        'Vas a salir formando a otros con la misma fidelidad con que fuiste formado.'),
    (4, 'El corazón pastoral antes que las estrategias pastorales.',
        'Vas a pastorear con autoridad y ternura, alineado al modelo apostólico.'),
    (5, 'Donde hay orden, hay bendición. El gobierno apostólico tiene estructura.',
        'Vas a operar tu ministerio o iglesia con la estructura que sostiene el crecimiento.'),
    (6, 'La economía del Reino no es escasez. Es siembra, mayordomía y multiplicación.',
        'Vas a romper estructuras de pobreza y a operar las finanzas del Reino con sabiduría.'),
    (7, 'El llamado del Reino también se expresa en negocios, marcas y territorios.',
        'Vas a entender cómo tu ministerio puede impactar el mercado y la cultura.'),
    (8, 'El siglo XXI exige pastores que dominen las herramientas que dominan la cultura.',
        'Vas a usar tecnología, IA y medios para extender tu mensaje sin perder el alma.'),
    (9, 'El apóstol no se forma para ocupar puestos, sino para reformar naciones.',
        'Vas a salir enviado con autoridad sobre territorios, no solo sobre congregaciones.')
  ) as t(ord, sub, prom)
)
update public.phases p
set subtitle = s.sub,
    promise = s.prom,
    updated_at = now()
from src s
where p.order_index = s.ord
  and (p.subtitle is null or p.promise is null);
