// Browsertest für ringzange.de über das Chrome DevTools Protocol.
// Keine Abhängigkeiten: braucht nur Node (ab Version 22) und Google Chrome oder Chromium.
//
//   node tests/e2e.mjs                 alle Prüfungen
//   node tests/e2e.mjs --screenshots   zusätzlich Bildschirmfotos nach tests/screenshots/
//
// Chrome wird automatisch gesucht; sonst Pfad über CHROME_PATH angeben.
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = process.argv.includes("--screenshots") ? join(ROOT, "tests", "screenshots") : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// ---------- kleiner statischer Webserver ----------
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".xml": "application/xml", ".txt": "text/plain",
};
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(ROOT, path === "/" ? "index.html" : path));
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); res.end("not found"); return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

// ---------- Chrome starten ----------
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const mac = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"];
  for (const p of mac) if (existsSync(p)) return p;
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    const r = spawnSync("which", [name], { encoding: "utf8" });
    if (r.status === 0) return r.stdout.trim();
  }
  return null;
}
const chromePath = findChrome();
if (!chromePath) {
  console.error("Chrome/Chromium nicht gefunden. Bitte CHROME_PATH setzen.");
  server.close();
  process.exit(2);
}
const PORT = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(chromePath, [
  "--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run", "--no-default-browser-check",
  "--hide-scrollbars", `--user-data-dir=${mkdtempSync(join(tmpdir(), "rz-chrome-"))}`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function shutdown(code) {
  try { ws?.close(); } catch {}
  chrome.kill();
  server.close();
  process.exit(code);
}

let target;
for (let i = 0; i < 75; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === "page");
    if (target) break;
  } catch {}
  await sleep(200);
}
if (!target) { console.error("Chrome reagiert nicht."); shutdown(2); }

// ---------- DevTools-Verbindung ----------
var ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
const issues = [];
let currentPage = "";
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve: ok, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : ok(msg.result);
  } else if (msg.method === "Runtime.exceptionThrown") {
    issues.push(`${currentPage}: JS-Fehler ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
  } else if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type)) {
    issues.push(`${currentPage}: console.${msg.params.type} ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
  } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
    issues.push(`${currentPage}: ${msg.params.entry.text} ${msg.params.entry.url || ""}`);
  }
});
const send = (method, params = {}) => new Promise((ok, reject) => {
  const id = ++seq;
  pending.set(id, { resolve: ok, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
// Sichtbar = nicht display:none und mit Höhe. (Nur das hidden-Attribut zu prüfen reicht nicht.)
const shown = (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)});
  return !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0; })()`);

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");

async function viewport(width, height = 900, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
}
async function open(path) {
  currentPage = path;
  await send("Page.navigate", { url: BASE + path });
  for (let i = 0; i < 100; i++) {
    await sleep(100);
    if ((await evaluate("document.readyState")) === "complete") break;
  }
  await evaluate("document.fonts.ready.then(() => true)");
  await sleep(150);
}

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

async function pageChecks(path, width) {
  const info = await evaluate(`(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    serif: document.fonts.check('600 20px "Source Serif 4"'),
    sans: document.fonts.check('400 16px "Source Sans 3"'),
  }))()`);
  check(`${path} @${width}: kein horizontales Scrollen`, info.overflow <= 0, `Überstand ${info.overflow}px`);
  check(`${path} @${width}: Schriften geladen`, info.serif && info.sans, JSON.stringify(info));

  // Alle Bilder laden (auch lazy) und auf defekte prüfen
  await viewport(width, 900, width < 500);
  const { cssContentSize } = await send("Page.getLayoutMetrics");
  await viewport(width, Math.ceil(cssContentSize.height), width < 500);
  await evaluate(`Promise.all([...document.images].map(i => { i.loading = 'eager';
    return i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 4000); }); })).then(() => true)`);
  await sleep(300);
  const broken = await evaluate("[...document.images].filter(i => i.getAttribute('src') && i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'))");
  check(`${path} @${width}: alle Bilder geladen`, broken.length === 0, broken.join(", "));
  if (SHOTS) {
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 70, captureBeyondViewport: true });
    writeFileSync(join(SHOTS, `${path.replace(".html", "")}-${width}.jpg`), Buffer.from(shot.data, "base64"));
  }
  await viewport(width, 900, width < 500);
}

async function snap(name) {
  if (!SHOTS) return;
  const s = await send("Page.captureScreenshot", { format: "jpeg", quality: 70 });
  writeFileSync(join(SHOTS, `${name}.jpg`), Buffer.from(s.data, "base64"));
}

const PAGES = ["index.html", "ringzange.html", "ringe-magazine.html", "sonstiges.html",
  "kontakt.html", "impressum.html", "datenschutz.html"];

try {
  // 1) Jede Seite auf Desktop- und Telefonbreite
  for (const w of [1440, 390]) {
    await viewport(w, 900, w < 500);
    for (const p of PAGES) {
      await open(p);
      await pageChecks(p, w);
    }
  }

  // 2) Ringzangen: Filter, Galerie, Bildbetrachter
  await viewport(1440);
  await open("ringzange.html");
  const countVisible = "[...document.querySelectorAll('.model')].filter(m => getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().height > 0).length";
  const clickChip = (f) => evaluate(`document.querySelector('.chip[data-filter="${f}"]').click(), true`);
  const counter = () => evaluate("document.querySelector('.toolbar__count').textContent");

  await clickChip("druckluft");
  check("Filter Druckluft zeigt AS 8000 und AS 9000", (await evaluate(countVisible)) === 2 && (await counter()) === "2 Modelle");
  await clickChip("akku");
  check("Filter Akku zeigt 1 Modell", (await evaluate(countVisible)) === 1 && (await counter()) === "1 Modell");
  await clickChip("magazin");
  check("Filter Mit Magazin zeigt 5 Modelle", (await evaluate(countVisible)) === 5);
  check("Modellindex blendet ausgefilterte Modelle aus",
    (await evaluate("[...document.querySelectorAll('.model-index li')].filter(l => getComputedStyle(l).display !== 'none').length")) === 5);
  await clickChip("alle");
  check("Filter Alle zeigt 10 Modelle", (await evaluate(countVisible)) === 10);
  check("Hinweis „kein Modell“ unsichtbar", !(await shown(".empty-note")));
  check("Gedrückter Filter ist markiert",
    (await evaluate("document.querySelector('.chip[data-filter=\"alle\"]').getAttribute('aria-pressed')")) === "true");

  await evaluate("document.querySelectorAll('#as-2000 .gallery__thumb')[2].click(), true");
  check("Galerie: Vorschaubild wechselt Hauptbild",
    (await evaluate("document.querySelector('#as-2000 .gallery__main img').getAttribute('src')")) === "assets/img/fotos/as-2000-2.jpg");
  check("Galerie: aktives Vorschaubild markiert",
    (await evaluate("document.querySelectorAll('#as-2000 .gallery__thumb')[2].getAttribute('aria-current')")) === "true");
  await evaluate("document.querySelector('#as-2000 .gallery__main').click(), true");
  await sleep(200);
  const caption = () => evaluate("document.querySelector('.lightbox__caption').textContent");
  check("Bildbetrachter öffnet beim Klick", await evaluate("document.getElementById('lightbox').open"));
  check("Bildbetrachter zeigt das gewählte Bild", (await caption()).includes("Bild 3 von 4"));
  await evaluate("document.querySelector('.lightbox__next').click(), true");
  check("Bildbetrachter: Weiter", (await caption()).includes("Bild 4 von 4"));
  await evaluate("document.querySelector('.lightbox__next').click(), true");
  check("Bildbetrachter: Weiter springt zum Anfang", (await caption()).includes("Bild 1 von 4"));
  await snap("lightbox");
  await evaluate("document.querySelector('.lightbox__close').click(), true");
  check("Bildbetrachter schließt", !(await evaluate("document.getElementById('lightbox').open")));

  await clickChip("akku");
  await evaluate("location.hash = 'as-2000'; true");
  await sleep(300);
  check("Sprung auf ausgefiltertes Modell zeigt alle wieder", (await evaluate(countVisible)) === 10);

  // 3) Kontaktformular
  await open("kontakt.html#betreff-as-2000");
  const submit = () => evaluate("document.querySelector('#kontaktformular button[type=submit]').click(), true");
  check("Telefon- und E-Mail-Feld stehen auf einer Linie",
    await evaluate("Math.abs(document.getElementById('telefon').getBoundingClientRect().top - document.getElementById('email').getBoundingClientRect().top) < 2"));
  check("Betreff wird aus dem Link vorbelegt", (await evaluate("document.getElementById('betreff').value")) === "Anfrage zu AS 2000");
  check("Vor dem Absenden: keine Fehlertexte sichtbar",
    (await evaluate("[...document.querySelectorAll('.field__error, .form__summary')].filter(el => getComputedStyle(el).display !== 'none').length")) === 0);
  await submit();
  await sleep(150);
  check("Leeres Formular: Hinweisbox sichtbar", await shown(".form__summary"));
  check("Leeres Formular: Vorname markiert", (await evaluate("document.getElementById('vorname').getAttribute('aria-invalid')")) === "true");
  check("Leeres Formular: Fokus auf erstem Fehler", (await evaluate("document.activeElement.id")) === "vorname");
  check("Leeres Formular: Fehlertext Einwilligung sichtbar", await shown("#einwilligung-fehler"));
  check("Leeres Formular: nicht abgeschickt", (await shown("#kontaktformular")) && !(await shown("#formular-gesendet")));

  await evaluate(`(() => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input')); };
    set('vorname', 'Erika'); set('nachname', 'Muster'); set('email', 'erika@beispiel');
    document.getElementById('einwilligung').checked = true;
    return true;
  })()`);
  await submit();
  await sleep(150);
  check("Ungültige E-Mail wird erkannt", (await evaluate("document.getElementById('email').getAttribute('aria-invalid')")) === "true");
  check("Vorname nach Korrektur nicht mehr markiert", (await evaluate("document.getElementById('vorname').getAttribute('aria-invalid')")) === null);

  await evaluate(`(() => {
    const el = document.getElementById('email'); el.value = 'erika@beispiel.de'; el.dispatchEvent(new Event('input'));
    document.getElementById('nachricht').value = 'Bitte um ein Angebot für 5.000 Ringe 1za.';
    return true;
  })()`);
  await submit();
  await sleep(200);
  check("Gültiges Formular: Bestätigung sichtbar", await shown("#formular-gesendet"));
  check("Gültiges Formular: Formular ausgeblendet", !(await shown("#kontaktformular")));
  check("Bestätigung nennt Prototyp ehrlich", (await evaluate("document.getElementById('gesendet-text').textContent")).includes("Prototyp"));
  check("Bestätigung zeigt Betreff", (await evaluate("document.getElementById('gesendet-daten').textContent")).includes("Anfrage zu AS 2000"));
  await snap("kontakt-gesendet");

  await evaluate("document.getElementById('neue-nachricht').click(), true");
  check("Neue Nachricht: Formular wieder leer und sichtbar",
    (await evaluate("document.getElementById('vorname').value")) === "" && (await shown("#kontaktformular")) && !(await shown("#formular-gesendet")));
  await evaluate(`(() => { document.getElementById('vorname').value = 'A'; document.getElementById('nachname').value = 'B';
    document.getElementById('einwilligung').checked = true; return true; })()`);
  await submit();
  check("Ohne Telefon und E-Mail wird nicht gesendet", (await evaluate("document.getElementById('telefon').getAttribute('aria-invalid')")) === "true");

  // 4) Navigation auf dem Telefon
  await viewport(390, 844, true);
  await open("index.html");
  const navDisplay = () => evaluate("getComputedStyle(document.getElementById('nav-links')).display");
  check("Telefon: Menü zunächst eingeklappt", (await navDisplay()) === "none");
  await evaluate("document.querySelector('.nav__toggle').click(), true");
  check("Telefon: Menü klappt auf", (await navDisplay()) !== "none" &&
    (await evaluate("document.querySelector('.nav__toggle').getAttribute('aria-expanded')")) === "true");
  await snap("menue-telefon");

  // 5) Ohne JavaScript bleibt die Navigation sichtbar
  await send("Emulation.setScriptExecutionDisabled", { value: true });
  await open("index.html");
  check("Ohne JavaScript: Navigation sichtbar", (await navDisplay()) !== "none");
  await send("Emulation.setScriptExecutionDisabled", { value: false });
} catch (err) {
  check("Testlauf ohne Abbruch", false, err.message);
}

// ---------- Ergebnis ----------
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.ok ? "" : "  → " + r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} Prüfungen bestanden`);
console.log(issues.length ? "Konsole:\n" + [...new Set(issues)].join("\n") : "Konsole: keine Fehler oder Warnungen");
if (SHOTS) console.log(`Bildschirmfotos: ${SHOTS}`);
shutdown(failed.length || issues.length ? 1 : 0);
