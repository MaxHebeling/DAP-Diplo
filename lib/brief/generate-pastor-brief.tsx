import { renderToBuffer } from "@react-pdf/renderer";

import { assertAssetsExist } from "./brief-assets";
import { BriefDocument } from "./brief-document";

/**
 * Genera el PDF del Brief Apostólico del DAP a buffer (~4 páginas).
 * Verifica primero que los assets (logos + firma) existan en
 * /public/admission-assets/ para evitar PDFs corruptos en runtime.
 *
 * Estilos en `brief-styles.ts`, copy en `brief-content.ts`, paths +
 * fuentes en `brief-assets.ts`, componente en `brief-document.tsx`.
 */
export async function generatePastorBrief(): Promise<Buffer> {
  assertAssetsExist();
  return await renderToBuffer(<BriefDocument />);
}
