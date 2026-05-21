#!/usr/bin/env node
/**
 * Script standalone: genera el brief PDF del DAP y lo guarda en
 * ~/Downloads/brief-dap-pastores-2026.pdf
 *
 * Uso: pnpm tsx scripts/generate-brief.mjs
 */
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { generatePastorBrief } from "../lib/brief/generate-pastor-brief.tsx";

const out = join(homedir(), "Downloads", "brief-dap-pastores-2026.pdf");
const buf = await generatePastorBrief();
await writeFile(out, buf);
console.log(`OK → ${out} (${(buf.byteLength / 1024).toFixed(1)} KB)`);
