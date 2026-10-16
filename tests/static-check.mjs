// Statische Prüfung aller Seiten: lokale Links, Bilder und Sprunganker existieren,
// keine doppelten IDs, jedes Bild hat einen alt-Text.
//
//   node tests/static-check.mjs
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
const problems = [];
const ids = {};

for (const page of pages) {
  const html = readFileSync(join(ROOT, page), "utf8");
  const list = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  ids[page] = new Set(list);
  const dup = list.filter((id, i) => list.indexOf(id) !== i);
  if (dup.length) problems.push(`${page}: doppelte IDs ${[...new Set(dup)].join(", ")}`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) problems.push(`${page}: Bild ohne alt-Text ${m[0].slice(0, 80)}`);
  }
}

let checked = 0;
for (const page of pages) {
  const html = readFileSync(join(ROOT, page), "utf8");
  for (const m of html.matchAll(/\s(?:href|src|data-full)="([^"]*)"/g)) {
    const ref = m[1];
    if (/^(https?:|tel:|mailto:)/.test(ref)) continue;
    checked++;
    const [path, anchor] = ref.split("#");
    const file = path || page;
    if (!existsSync(join(ROOT, decodeURIComponent(file)))) problems.push(`${page}: Datei fehlt: ${ref}`);
    // "#betreff-…" belegt den Betreff im Kontaktformular vor und ist kein Element-Anker.
    if (anchor && !anchor.startsWith("betreff-") && ids[file] && !ids[file].has(anchor)) {
      problems.push(`${page}: Anker fehlt: ${ref}`);
    }
  }
}

console.log(`${pages.length} Seiten, ${checked} lokale Verweise geprüft`);
if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log("Keine Probleme gefunden.");
