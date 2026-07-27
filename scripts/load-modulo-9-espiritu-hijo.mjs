// Carga del Módulo 9 (Espíritu de Hijo, Bloque 2):
// 1) Sube PDFs (lección + complemento) al bucket module-pdfs
// 2) Crea rows en module_resources
// 3) Actualiza el módulo con objective/main_revelation/impartation_phrase/subtitle/duration
// 4) Llena body_md de las 5 secciones
// 5) Crea el quiz container y las 8 preguntas (mezclando posición de la correcta)

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error("Faltan envs"); process.exit(1); }

const MODULE_ID = "9ba983aa-2525-43b1-9e1a-81c4c5ca4718";
const PDF_LESSON = "/Users/maxhebeling/Library/CloudStorage/Dropbox/DAP Diplomado/ES/Bloques/2.- Forja/Bloque-2-Leccion-01-Espiritu-de-Hijo.pdf";
const PDF_COMPLEMENT = "/Users/maxhebeling/Library/CloudStorage/Dropbox/DAP Diplomado/ES/Bloques/2.- Forja/Actividades Complementarias/Complemento-Bloque-2-Leccion-01-Espiritu-de-Hijo.pdf";

// Pseudo-random determinístico para que las correctas no caigan todas en la misma letra,
// pero sea reproducible (no usamos Date.now()/random — no son disponibles en runtime).
function shuffleOptions(options, correctIndex, salt) {
  // Generar permutación basada en hash del prompt para que sea determinístico por pregunta.
  const hash = createHash("sha256").update(salt).digest();
  const indexed = options.map((opt, i) => ({ opt, originalIdx: i, sortKey: hash[i % hash.length] * 31 + i }));
  indexed.sort((a, b) => a.sortKey - b.sortKey);
  const newOptions = indexed.map(x => x.opt);
  const newCorrectIndex = indexed.findIndex(x => x.originalIdx === correctIndex);
  return { options: newOptions, correctIndex: newCorrectIndex };
}

// Helper Supabase REST
async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${path} → ${res.status}: ${txt}`);
  }
  return res;
}

// ============================================================
// 1) Subir PDFs a Storage (bucket module-pdfs)
// ============================================================
async function uploadPdf(localPath, storagePath) {
  const buf = readFileSync(localPath);
  await sb(`/storage/v1/object/module-pdfs/${storagePath}`, {
    method: "POST",
    headers: { "Content-Type": "application/pdf", "x-upsert": "true" },
    body: buf,
  });
  return `${SUPABASE_URL}/storage/v1/object/public/module-pdfs/${storagePath}`;
}

const lessonPath = `${MODULE_ID}/es/bloque-2-leccion-01-espiritu-de-hijo.pdf`;
const complementPath = `${MODULE_ID}/es/bloque-2-leccion-01-espiritu-de-hijo-complemento.pdf`;

console.log("1) Subiendo PDFs...");
const lessonUrl = await uploadPdf(PDF_LESSON, lessonPath);
console.log("   ✅ Lección:", lessonUrl);
const complementUrl = await uploadPdf(PDF_COMPLEMENT, complementPath);
console.log("   ✅ Complemento:", complementUrl);

// ============================================================
// 2) Limpiar resources viejos + insertar nuevos
// ============================================================
console.log("\n2) Registrando module_resources...");
await sb(`/rest/v1/module_resources?module_id=eq.${MODULE_ID}&locale=eq.es`, {
  method: "DELETE",
  headers: { Prefer: "return=minimal" },
});
await sb(`/rest/v1/module_resources`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
  body: JSON.stringify([
    {
      module_id: MODULE_ID,
      title: "Espíritu de Hijo — Lección completa",
      kind: "pdf",
      url: lessonUrl,
      order_index: 0,
      locale: "es",
    },
    {
      module_id: MODULE_ID,
      title: "Material complementario — Tareas, examen e impartición",
      kind: "pdf",
      url: complementUrl,
      order_index: 1,
      locale: "es",
    },
  ]),
});
console.log("   ✅ 2 resources insertados");

// ============================================================
// 3) Actualizar módulo
// ============================================================
console.log("\n3) Actualizando módulo...");
await sb(`/rest/v1/modules?id=eq.${MODULE_ID}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
  body: JSON.stringify({
    subtitle: "La división relacional más fundamental: cómo el huérfano interior se transforma en hijo amado y se forja el carácter que sostiene todo llamado",
    objective: "Reconocer la división espiritual más fundamental del Reino —entre el espíritu de huérfano y el espíritu de hijo— y comprender que ningún carácter cristiano se sostiene mientras el alma siga operando bajo el sistema antiguo. Recibir la revelación de que la filiación operativa, modelada por Cristo y declarada por el Padre antes de toda obra, es el suelo inamovible sobre el cual se forja todo carácter, todo ministerio y toda autoridad sostenible.",
    main_revelation: "Nada que hagas puede convertirte en hijo. Solo puedes vivir como tal porque ya lo eres.",
    impartation_phrase: "Antes de hacer una sola obra, el Padre ya dijo: este es mi hijo amado. Toda tu vida, desde hoy, es la respuesta a esa voz.",
    duration_minutes: 45,
  }),
});
console.log("   ✅ Módulo actualizado");

// ============================================================
// 4) Actualizar las 5 secciones (body_md)
// ============================================================
const SECTIONS = {
  intro: `## Objetivo de la lección

Reconocer la división espiritual más fundamental del Reino —entre el **espíritu de huérfano** y el **espíritu de hijo**— y comprender que ningún carácter cristiano se sostiene mientras el alma siga operando bajo el sistema antiguo.

Recibir la revelación de que la **filiación operativa**, modelada por Cristo y declarada por el Padre antes de toda obra, es el suelo inamovible sobre el cual se forja todo carácter, todo ministerio y toda autoridad sostenible.

---

## Fundamento bíblico

> «No habéis recibido el espíritu de esclavitud para estar otra vez en temor, sino que habéis recibido el espíritu de adopción, por el cual clamamos: ¡Abba, Padre!»
> — **Romanos 8:15**

> «Este es mi Hijo amado, en quien tengo complacencia.»
> — **Mateo 3:17**

> «No puede el Hijo hacer nada por sí mismo, sino lo que ve hacer al Padre.»
> — **Juan 5:19**

> «Así que ya no eres esclavo, sino hijo; y si hijo, también heredero de Dios por medio de Cristo.»
> — **Gálatas 4:7**

---

**Dimensión:** HIJO · **Lectura:** 45 min · **Clase autodidacta**`,

  teaching: `Hay una división espiritual que atraviesa toda la cristiandad, y la mayoría de los creyentes nunca la reconoce. No es la división entre creyentes y no creyentes. No es la división entre maduros e inmaduros. No es la división entre dones y carencias. Es una división más profunda, anterior a todas las demás: la división entre el **espíritu de huérfano** y el **espíritu de hijo**. Y mientras esta línea no se identifique en el interior, ningún carácter cristiano se construirá sobre suelo firme. Toda forja del carácter, en el Reino, comienza aquí.

La Biblia abre con una imagen específica del diseño original: dos seres humanos caminando con su Padre «en el aire del día» (Génesis 3:8). No había templo. No había distancia. No había temor. Había una conversación cotidiana entre el Padre eterno y sus hijos creados. Esa imagen es la matriz de toda la antropología bíblica: el ser humano fue diseñado para vivir en filiación. Cuando esa filiación se rompió, no se perdió principalmente un jardín ni una vida fácil; se perdió la atmósfera relacional desde la cual el ser humano fue diseñado para operar.

La caída, leída a la luz del Nuevo Testamento, fue ante todo una fractura de filiación. Adán y Eva se escondieron (Génesis 3:10). Esa es la primera reacción huérfana de la historia humana: esconderse del Padre. Y desde ese momento, toda la humanidad nace con el reflejo huérfano grabado en el ADN espiritual: el reflejo de creer que el Padre nos rechaza, de creer que tenemos que ganarnos su mirada, de creer que estamos solos en el universo y que cada cosa buena tenemos que producirla con nuestras manos. Ese reflejo es el sistema operativo del huérfano. Y opera incluso en personas religiosas, ministros prominentes y padres terrenales: si no han sido sanados, transfieren orfandad a sus hijos.

Por eso Israel fue llamado, desde su origen, «mi hijo, mi primogénito» (Éxodo 4:22). Ese título no era decorativo. Era la corrección del régimen orfanal sobre toda una nación. Israel salió de Egipto no como un esclavo liberado, sino como un hijo reclamado.

Cuando Jesús inicia su ministerio público, no sube primero a un púlpito ni realiza primero un milagro. Sube del agua del Jordán, los cielos se abren, y se oye la voz del Padre: «Este es mi Hijo amado, en quien tengo complacencia» (Mateo 3:17). Detente ahí. El Padre habla complacencia sobre Jesús **antes** de cualquier obra visible. Antes de la primera predicación. Antes de los milagros. Antes de la cruz. La identidad de Hijo es declarada antes de cualquier producción ministerial. Y desde esa identidad —no para ganarla, sino para expresarla— Jesús sale al desierto, al ministerio, al Calvario.

---

> ### *Nada que hagas puede convertirte en hijo. Solo puedes vivir como tal porque ya lo eres.*

---

Por eso Pablo escribe la frase más liberadora del Nuevo Testamento: «no habéis recibido el espíritu de esclavitud para estar otra vez en temor, sino que habéis recibido el espíritu de adopción, por el cual clamamos: ¡Abba, Padre!» (Romanos 8:15). El término griego es **huiothesía** —filiación plena—. No «ser adoptado como huérfano» en el sentido emocional moderno, sino «ser declarado hijo legítimo con derecho a herencia». Y la palabra clave es **«Abba»**: el más íntimo de los nombres paternos, equivalente a «papito» en arameo. Un esclavo, un siervo, un huérfano —ninguno usa ese registro. Solo un hijo. Y el Espíritu mismo planta ese clamor dentro del redimido. Donde ese clamor opera, hay filiación operativa.

Por eso queda claro por qué el enemigo, en el desierto, atacó la identidad de Jesús con la frase: «si eres Hijo de Dios…» (Mateo 4:3, 4:6). Esa es la estrategia universal contra el creyente: poner un «si» delante de la filiación. «Si eres hijo, tendrías más dinero». «Si eres hijo, tendrías mejor matrimonio». «Si eres hijo, no estarías sufriendo así». Cada «si» es un anzuelo. Jesús no cayó porque ya había escuchado la voz del Padre tres versículos antes. No necesitaba producir nada para confirmar lo que ya era. Pero cuando el creyente no ha escuchado interiormente esa voz, cae en cada anzuelo intentando demostrar con obras lo que solo se sostiene por declaración paternal.

La parábola del hijo pródigo (Lucas 15) revela algo escandaloso: los dos hijos del padre eran huérfanos en su interior. El menor se fue del lado del padre porque interpretó su filiación como esclavitud que merecía liberarse —y dilapidó la herencia. El mayor se quedó en casa, pero nunca entró en el gozo del padre —servía con resentimiento, contaba sus años de fidelidad, y cuando el menor volvió, se enfureció: «He aquí, tantos años te sirvo, no habiendo desobedecido jamás tu mandamiento, y nunca me has dado un cabrito para gozarme con mis amigos» (v. 29). Ese discurso es el grito clásico del huérfano religioso: he servido sin recibir, he obedecido sin disfrutar.

El padre, asombrosamente, responde con la frase más reveladora del Evangelio: «Hijo, tú siempre estás conmigo, y todas mis cosas son tuyas» (v. 31). Es decir: nunca dejaste de tener mi herencia. La herencia siempre estuvo a tu disposición. Lo que te faltó fue entrar en el cuarto y tomar lo que ya era tuyo. El huérfano religioso vive así toda su vida: rodeado de abundancia, sin tomarla; cerca del Padre, sin abrazarlo; en la casa, sin descansar. La filiación no se manifiesta porque no se confía. Y donde no hay confianza, no hay gozo. Donde no hay gozo, no hay ministerio sostenible.

---

Aquí está la primera revelación que reorganiza el carácter: **el espíritu de huérfano puede coexistir con el ministerio activo**. Esa es la trampa más sutil. Puedes predicar, pastorear, liderar, establecer iglesias —y al mismo tiempo estar operando con el corazón del hermano mayor, sirviendo desde el resentimiento y midiendo tu valor por la cantidad de servicio que rindes. Cuando el ministerio se vuelve un mecanismo para validar tu identidad, no estás operando como hijo. Estás operando como huérfano disfrazado de obrero del Reino.

### Marcas del corazón huérfano que el Padre quiere sanar

I. **Compara constantemente.** Mide su valor por lo que otros tienen, no por lo que el Padre ya le dio.

II. **Compite donde el Reino llama a colaborar.** Ve a los demás como amenazas, no como hermanos.

III. **Vive con el ruido interior de «no es suficiente».** Trabaja más para producir más, pero la voz nunca se acalla.

IV. **Se aísla.** No deja que otros entren a su zona de carencia; mantiene la imagen aunque por dentro esté roto.

V. **Castiga su carne para ganar amor.** Religiosidad sin descanso, disciplina sin gozo, esfuerzo sin reposo.

---

La transformación del huérfano al hijo no se opera por mejor conducta. Se opera por escuchar la voz del Padre repetidamente, hasta que el suelo interior cambie. No es un evento; es una formación. Es el equivalente espiritual a la forja del hierro: el hierro no cambia por una sola pasada por el fuego, sino por entrar al fuego repetidamente hasta que su estructura molecular se reordene. El espíritu de hijo se forma en el calor de la presencia del Padre, en el yunque de las pruebas, bajo el martillo de las renuncias —hasta que el alma deja de funcionar desde el huérfano y comienza a funcionar desde el hijo.

Por eso Jesús modeló la perfecta filiación. Dijo: «No puede el Hijo hacer nada por sí mismo, sino lo que ve hacer al Padre» (Juan 5:19). Esa frase no es teología abstracta. Es la descripción de cómo opera un hijo verdadero: en sintonía continua con el Padre, no en autosuficiencia. Jesús no hizo un solo milagro desde su iniciativa. Cada uno fue respuesta a lo que veía hacer al Padre. Esa es la dependencia filial: la confianza absoluta en que el Padre tiene un guion mejor que el tuyo, y que tu mayor sabiduría es escuchar el suyo. El huérfano no opera así. El huérfano improvisa, decide solo, ejecuta su propio plan —y luego le pide a Dios que lo bendiga.

Pablo lleva esta verdad un paso más allá en Gálatas 4:1-7. El heredero, mientras es niño, en nada difiere del esclavo —aunque sea señor de todo. Esa es la condición de cada creyente que no ha entrado en su filiación operativa: heredero legal, pero esclavo experiencial. «Por cuanto sois hijos, Dios envió a vuestros corazones el Espíritu de su Hijo, el cual clama: ¡Abba, Padre!». Y la conclusión es decisiva: «Así que ya no eres esclavo, sino hijo; y si hijo, también heredero de Dios por medio de Cristo». Esa secuencia —esclavo, hijo, heredero— es el mapa de la formación del carácter en el Reino.

La economía del huérfano y la economía del hijo son completamente diferentes. **El huérfano gana; el hijo hereda.** El huérfano se gana cada bendición con su trabajo; el hijo recibe lo que el Padre ya guardó para él antes de su nacimiento. El huérfano dice: «tengo que probarlo». El hijo dice: «ya me lo dieron». Esa diferencia no es matiz emocional. Es la diferencia entre dos sistemas espirituales completos. Y se nota en cómo se administra el dinero, el tiempo, los talentos, el ministerio, las relaciones. El huérfano acumula porque teme la escasez. El hijo da porque sabe que el Padre tiene más.

La transformación más exigente no es la económica, es la relacional. El huérfano nunca confía plenamente, ni siquiera en Dios. Siempre tiene un plan B por si Dios falla. El hijo descansa. El huérfano calcula. El hijo se entrega. El huérfano necesita controlar el resultado. El hijo opera desde el reposo de saber que el Padre está al timón. Por eso Jesús pudo dormir en la barca durante la tormenta (Marcos 4:38): no porque estuviera distraído, sino porque su filiación operativa era tan profunda que la tormenta no podía robarle el descanso. El huérfano no puede dormir en la tormenta. El hijo sí.

---

> ### *El servicio del huérfano busca aprobación. El servicio del hijo desborda la herencia.*

---

Y aquí entra la figura que el Reino necesita restaurar con urgencia: **el padre espiritual**. Pablo escribe a los corintios algo que muchos pasan por alto: «aunque tengáis diez mil ayos en Cristo, no tendréis muchos padres» (1 Corintios 4:15). Ayos —instructores antiguos— transfieren conocimiento. Padres transfieren identidad. La diferencia entre los dos no es de magnitud, es de naturaleza. El instructor enseña a hacer. El padre forma quien uno es. La iglesia moderna está repleta de instructores: pastores que predican, mentores que aconsejan, líderes que entrenan. Lo que escasea son los padres que bendicen, los que dicen sobre el hijo lo que el Padre celestial dice sobre él.

Por eso muchos creyentes con dones, con llamado, con preparación, con plataforma —siguen operando como huérfanos. No porque no hayan recibido enseñanza, sino porque nadie les ha mediatizado el rostro del Padre. Un padre espiritual no reemplaza al Padre celestial: lo refleja. No exige obediencia, la modela. No demanda lealtad, la merece por amor. Y bajo su cobertura, los huérfanos comienzan a creer que sí pueden ser hijos, porque ven a alguien viviéndolo delante de ellos. Recuperar paternidad es recuperar el Reino: porque sin padres terrenales que reflejen al Padre celestial, los hijos quedan vagando sin suelo.

---

La sanidad del huérfano interior no ocurre principalmente por revelación bíblica abstracta. Ocurre por experiencia repetida del amor del Padre. Es como aprender un idioma nuevo: requiere inmersión, no solo estudio. Por eso el Espíritu Santo es enviado al corazón del creyente como Aquel que clama «Abba, Padre» desde dentro (Gálatas 4:6). Su trabajo principal no es solo dar dones; es restaurar la atmósfera de filiación. Quien se rinde a esa obra del Espíritu va siendo, lenta pero definitivamente, reorganizado por dentro: pierde el miedo, recupera el descanso, deja de competir, comienza a dar, aprende a recibir.

Y entonces el carácter empieza a forjarse de modo sostenible. Porque el carácter del huérfano siempre es frágil. Funciona bajo aplauso, colapsa bajo crítica. Funciona bajo abundancia, se quiebra bajo escasez. Pero el carácter del hijo es inamovible. No depende de las circunstancias externas porque su raíz no está afuera, sino en la palabra que el Padre ya pronunció sobre él. Por eso Jesús pudo enfrentar la cruz sin ceder, porque ya había escuchado: «este es mi Hijo amado». Por eso los apóstoles pudieron sufrir martirio gozosos. Por eso los santos pudieron perder bienes con alegría: porque sabían que su herencia no estaba aquí, sino en la palabra paternal que los precedía.

Recibir esta revelación reorganiza por completo el sentido del ministerio. Ya no ministramos para ser amados; ministramos porque ya fuimos amados. Ya no servimos para ganar reconocimiento; servimos porque ya fuimos reconocidos. Ya no trabajamos para que el Padre nos note; trabajamos porque el Padre nos vio antes de nuestro primer aliento. Esa inversión —pasar de «para que» a «porque»— es la transformación más radical de toda la vida cristiana. Y todo el Bloque 2, todo este proceso de forja del carácter, comienza aquí: en la transición del huérfano al hijo.

La meta final, sin embargo, no es solo nuestra propia sanidad. Es revelar el rostro del Padre a una generación huérfana. Vivimos en la generación más sin-padre de la historia humana: padres ausentes, padres heridos, padres que nunca aprendieron a bendecir. Mientras la iglesia siga produciendo huérfanos espirituales con doctrina correcta, la generación seguirá vagando. Pero cuando una iglesia comienza a producir hijos verdaderos, con descanso en su interior y libertad en su mirada, las naciones quedan expuestas a una realidad que ningún sistema mundano puede ofrecer: la existencia real de un Padre bueno que aún busca caminar con sus hijos en el aire del día.

---

### Síntesis doctrinal

**I. Huérfano o hijo es la división espiritual más profunda.** Atraviesa toda la vida cristiana, antes que las distinciones entre maduros e inmaduros o dones y carencias. Mientras esa línea no se identifique en el interior, ningún carácter cristiano se construye sobre suelo firme.

**II. La caída fue una fractura de filiación.** Adán se escondió. Desde ese momento, toda la humanidad nace con el reflejo huérfano grabado: creer que el Padre rechaza, que el amor se gana, que cada cosa buena hay que producirla solo. Toda la historia bíblica es la búsqueda divina por reabrir esa filiación.

**III. Cristo modeló la perfecta filiación operativa.** Voz del Padre antes de toda obra (Mt 3:17). Ministerio desde el reposo: «no puede el Hijo hacer nada por sí mismo, sino lo que ve hacer al Padre» (Jn 5:19). Autoridad por delegación filial. Cualquier ministerio que no nace de ese suelo es activismo orfanal disfrazado.

**IV. La transición de huérfano a hijo es la base del carácter sostenible.** Sin ella, el carácter funciona bajo aplauso y colapsa bajo presión. Con ella, el carácter es inamovible porque su raíz no está en circunstancias sino en la palabra paternal que precede toda producción.

---

### Preguntas para la reflexión

1. ¿Estoy operando desde el corazón del huérfano —comparación, competición, control, esfuerzo sin descanso— o desde el corazón del hijo —reposo, herencia, confianza, gozo en el servicio?

2. ¿Hay un padre espiritual en mi vida que mediatice el rostro del Padre y me bendiga como hijo, o estoy navegando solo, intentando ganar lo que ya me fue dado?

3. ¿Qué área concreta de mi ministerio, mis relaciones o mi vida íntima todavía revela el reflejo del huérfano que necesita ser sanado bajo el calor de la presencia del Padre?

---

### Lecturas complementarias

- *El regreso del hijo pródigo*, Henri Nouwen — clásico contemporáneo sobre la filiación restaurada y los dos rostros del huérfano.
- *Cómo recibir el corazón del Padre*, Jack Frost — manual práctico sobre la sanidad del espíritu de huérfano.
- *From Slavery to Sonship*, Trevor Galpin — la transición del esclavo al hijo como mapa de la formación del carácter cristiano.

> 📄 **Recordá descargar el PDF completo de esta lección desde la sección de recursos del módulo.**`,

  activation: `## Activación · Trabajo del alumno

Esta semana entras al primer trabajo profundo de **forja del carácter**. No es un curso de doctrina —es una transformación del modo en que tu espíritu se relaciona con el Padre. Las dos tareas siguientes están diseñadas para que el conocimiento se vuelva experiencia.

> 📄 **Descargá el material complementario** desde la sección de recursos del módulo para completarlo. Incluye el examen personal, la práctica sostenida y el decreto apostólico de cierre.

---

### Tarea I · Práctica sostenida — *Treinta días clamando Abba*

Durante los próximos **treinta días**, comprométete a una práctica diaria: entra al aposento secreto y clama **«Abba Padre»** hasta que el espíritu de orfandad pierda fuerza y el espíritu de adopción se vuelva tu lengua natural. No es técnica; es declaración sostenida hasta que la realidad espiritual cambie.

Registrá en el material complementario:

- **Lugar y hora** del encuentro diario con el Padre
- **Síntomas de orfandad espiritual** que aún identificas en ti (autosuficiencia, miedo, performance)
- **Áreas donde sigues operando como siervo** en lugar de como hijo
- **Lo que el Padre te va hablando como hijo** (registro semanal)

---

### Tarea II · Examen personal — *Orfandad o filiación*

Responde con honestidad delante del Padre. No estás reportando a un instructor —estás diagnosticando tu propio espíritu.

- **Mi historia con mi padre terrestre** y cómo ha condicionado mi imagen del Padre celestial
- **Áreas donde aún busco aprobación humana** para sentirme aceptado
- **Una decisión concreta que tomo hoy** para soltar el espíritu de orfandad
- **Una persona ante quien voy a confesar** mi necesidad de sanidad filial

---

### Preguntas guía para la reflexión

1. ¿Estoy operando desde el corazón del huérfano —comparación, competición, control, esfuerzo sin descanso— o desde el corazón del hijo —reposo, herencia, confianza, gozo en el servicio?

2. ¿Hay un padre espiritual en mi vida que mediatice el rostro del Padre y me bendiga como hijo, o estoy navegando solo, intentando ganar lo que ya me fue dado?

3. ¿Qué área concreta de mi ministerio, mis relaciones o mi vida íntima todavía revela el reflejo del huérfano que necesita ser sanado bajo el calor de la presencia del Padre?

---

**Entregá esta activación** subiendo:
- Una reflexión escrita (mínimo 500 palabras) integrando las dos tareas anteriores
- Opcionalmente: foto del material complementario llenado a mano

El Dr. Max revisará personalmente tu entrega y te enviará feedback en su voz pastoral dentro de las próximas 48 horas.`,

  evaluation: `## Evaluación · Comprensión filial

Esta evaluación verifica que la enseñanza haya tomado raíz en tu comprensión. Son **8 preguntas** sobre los puntos centrales de la lección.

- **Umbral de aprobación:** 70% (mínimo 6 de 8 correctas)
- **Intentos disponibles:** 3
- Las preguntas salen mezcladas en cada intento

> 📌 *No es un examen para juzgar tu vida espiritual. Es una herramienta para asegurar que entendiste los conceptos doctrinales antes de avanzar al siguiente módulo.*

Cuando estés listo, abre el quiz desde el panel del alumno.`,

  impartation: `## Decreto apostólico · Apertura del Bloque 2

> Hijo amado, hija amada: en esta hora rompo sobre tu espíritu toda raíz de orfandad espiritual.
>
> Que pierda fuerza sobre ti la voz que te dijo que tienes que performar para ser amado, que tienes que producir para ser aceptado, que tienes que ganar tu lugar delante del Padre.
>
> Recibe el espíritu de adopción por el cual clamas Abba. Recibe la sensibilidad filial que te hace conocer Su voz por encima del ruido. Recibe el reposo del hijo que sabe a quién pertenece.
>
> Te declaro hijo —no siervo. Te declaro amado —no funcional. Te declaro heredero —no asalariado. Te declaro hijo del Padre, formado en Su pecho, sostenido en Su afecto.
>
> **Desde hoy operas desde la filiación. Desde la aceptación. Desde el descanso. Y desde esa identidad construirás todo lo demás del Diplomado. Amén.**

---

### *"Antes de hacer una sola obra, el Padre ya dijo: este es mi hijo amado. Toda tu vida, desde hoy, es la respuesta a esa voz."*

---

**Dr. Max Hebeling**
*Apertura del Bloque 2 · Diplomado Apostólico Pastoral*`,
};

console.log("\n4) Llenando body_md de las 5 secciones...");
for (const [kind, body_md] of Object.entries(SECTIONS)) {
  await sb(
    `/rest/v1/module_sections?module_id=eq.${MODULE_ID}&kind=eq.${kind}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ body_md }),
    },
  );
  console.log(`   ✅ ${kind}`);
}

// ============================================================
// 5) Quiz + 8 preguntas (con opciones mezcladas determinísticamente)
// ============================================================
console.log("\n5) Creando quiz...");

// Obtener evaluation section_id
const evalRes = await sb(
  `/rest/v1/module_sections?module_id=eq.${MODULE_ID}&kind=eq.evaluation&select=id`,
);
const [{ id: EVAL_SECTION_ID }] = await evalRes.json();
console.log("   Evaluation section_id:", EVAL_SECTION_ID);

// Eliminar quiz/preguntas previas si existieran
const oldQuizRes = await sb(
  `/rest/v1/quizzes?module_section_id=eq.${EVAL_SECTION_ID}&select=id`,
);
const oldQuizzes = await oldQuizRes.json();
for (const q of oldQuizzes) {
  await sb(`/rest/v1/quiz_questions?quiz_id=eq.${q.id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  await sb(`/rest/v1/quizzes?id=eq.${q.id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

// Crear quiz
const newQuizRes = await sb(`/rest/v1/quizzes`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({
    module_section_id: EVAL_SECTION_ID,
    title: "Evaluación — Espíritu de Hijo",
    description: "8 preguntas de comprensión sobre los puntos centrales de la lección.",
    pass_threshold: 70,
    max_attempts: 3,
    shuffle_questions: true,
  }),
});
const [{ id: QUIZ_ID }] = await newQuizRes.json();
console.log("   ✅ Quiz creado:", QUIZ_ID);

// Preguntas — originalmente todas con correct_index=1 (opción b).
// Las mezclamos por hash del prompt para que la correcta no caiga siempre en la misma letra.
const RAW_QUESTIONS = [
  {
    prompt: "Romanos 8:15 describe el espíritu de adopción como:",
    options: [
      "El espíritu de la ley",
      "El espíritu por el cual clamamos «Abba, Padre»",
      "Un espíritu de poder y dominio",
      "El espíritu de servicio",
    ],
    correctIndex: 1,
  },
  {
    prompt: "«Abba» en arameo es:",
    options: [
      "Un título oficial y formal",
      "El llamado íntimo de un niño a su padre, equivalente a «papito»",
      "Una palabra litúrgica solemne",
      "Un sinónimo de Yahveh",
    ],
    correctIndex: 1,
  },
  {
    prompt: "La diferencia entre huérfano e hijo es:",
    options: [
      "El huérfano es más espiritual",
      "El huérfano performa para ser aceptado; el hijo descansa en su filiación",
      "El hijo trabaja más",
      "Solo es cuestión de teología",
    ],
    correctIndex: 1,
  },
  {
    prompt: "La parábola del hijo pródigo (Lc 15) muestra que:",
    options: [
      "Solo el hijo menor estaba lejos del padre",
      "Tanto el menor como el mayor operaban con espíritu de huérfano —uno por rebelión, otro por servidumbre",
      "El padre castigó al menor",
      "El mayor era el verdadero hijo",
    ],
    correctIndex: 1,
  },
  {
    prompt: "El espíritu de orfandad en el ministerio se manifiesta como:",
    options: [
      "Mayor productividad ministerial",
      "Necesidad de aprobación, comparación, autosuficiencia, performance",
      "Don de profecía",
      "Madurez espiritual",
    ],
    correctIndex: 1,
  },
  {
    prompt: "Jesús nos enseñó a orar comenzando con:",
    options: [
      "«Señor Soberano»",
      "«Padre nuestro» — identidad filial antes de cualquier petición",
      "«Dios Todopoderoso»",
      "«Maestro»",
    ],
    correctIndex: 1,
  },
  {
    prompt: "La filiación se recibe, no se conquista. Esto significa que:",
    options: [
      "Hay que trabajar para merecerla",
      "Es regalo del Padre por la obra de Cristo; no se gana con esfuerzo",
      "Solo algunos creyentes la alcanzan",
      "Depende del desempeño espiritual",
    ],
    correctIndex: 1,
  },
  {
    prompt: "La marca primaria del hijo maduro es:",
    options: [
      "Mayor actividad ministerial",
      "Reposo en la aceptación del Padre, independiente de la circunstancia",
      "Profundidad doctrinal",
      "Capacidad de servicio",
    ],
    correctIndex: 1,
  },
];

const questionsPayload = RAW_QUESTIONS.map((q, i) => {
  const { options, correctIndex } = shuffleOptions(q.options, q.correctIndex, q.prompt);
  return {
    quiz_id: QUIZ_ID,
    kind: "multiple_choice",
    prompt: q.prompt,
    payload: { options, correct_index: correctIndex },
    order_index: i + 1,
  };
});

await sb(`/rest/v1/quiz_questions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
  body: JSON.stringify(questionsPayload),
});

console.log(`   ✅ 8 preguntas creadas`);

// Reporte de en qué posición quedó la correcta para cada pregunta
const letterFor = (i) => "abcd"[i];
console.log("\n📊 Distribución de respuestas correctas tras mezcla:");
for (let i = 0; i < questionsPayload.length; i++) {
  const q = questionsPayload[i];
  console.log(`   P${i + 1}: correcta = ${letterFor(q.payload.correct_index)}`);
}

console.log("\n=== ✅ MÓDULO 9 CARGADO ===");
