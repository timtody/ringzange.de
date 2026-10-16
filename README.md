# ringzange.de – neue Website (Prototyp)

Statische Website für Allround E.A. Sauer im Design „Briefbogen“. Kein WordPress, keine Datenbank, kein Build-Schritt: reines HTML, CSS und etwas JavaScript.

## Aufbau

```
index.html            Startseite
ringzange.html        Ringzangen (10 Modelle, Filter, Bildergalerien)
ringe-magazine.html   Ringmagazine 1–3 und Gabionenringe
sonstiges.html        Gripple, Uni-Driller, Driller
kontakt.html          Kontaktdaten, Formular, Anfahrt
impressum.html
datenschutz.html
assets/css/site.css   gesamtes Layout
assets/js/site.js     Menü, Galerie, Filter, Formular
assets/fonts/         Source Serif 4 und Source Sans 3 (lokal, keine Verbindung zu Google)
assets/img/fotos/     Produktfotos (1600 px)
assets/img/thumbs/    Vorschaubilder für die Galerien
assets/img/freigestellt/  freigestellte Produktbilder (PNG mit Transparenz)
.htaccess             HTTPS, Weiterleitung der alten WordPress-Adressen, Caching
robots.txt, sitemap.xml
```

**Neu hier und keine Technik-Erfahrung?** Lies zuerst [START-HIER.md](START-HIER.md).
Hinweise für Claude Code stehen in [CLAUDE.md](CLAUDE.md).

## Lokal ansehen

`index.html` einfach im Browser öffnen. Oder mit einem kleinen Server:

```
npm start
```

Dann http://localhost:8000 öffnen.

## Testen

```
npm test                  # Links, Bilder, Anker + Browsertest in Chrome
npm run test:screenshots  # zusätzlich Bildschirmfotos nach tests/screenshots/
```

Braucht Node 22+ und Google Chrome (oder `CHROME_PATH` setzen).

## Veröffentlichen (Strato)

1. Sicherung der bestehenden WordPress-Installation anlegen.
2. Die Website-Dateien per SFTP in das Webverzeichnis der Domain laden: alle `.html`-Dateien, den Ordner `assets/`, `.htaccess`, `robots.txt` und `sitemap.xml`. Nicht hochladen: `tests/`, `package.json` und die `.md`-Dateien.
3. Die alten Adressen (`/ringzange/`, `/kontakt/` …) leiten automatisch auf die neuen Seiten weiter.

## Inhalte ändern

Texte stehen direkt in den HTML-Dateien. Kopf, Navigation und Fuß sind auf allen Seiten gleich; eine Änderung dort bitte in allen sieben Dateien übernehmen.

## Vor dem Livegang

- **Kontaktformular:** In `assets/js/site.js` steht `FORM_ENDPOINT = ""`. Solange das leer ist, prüft das Formular die Eingaben, sendet aber nichts. Einzutragen ist entweder ein kleines PHP-Skript auf dem Strato-Webspace oder ein Formular-Dienst.
- **Datenschutzerklärung:** ist unverändert von der alten Seite übernommen und muss angepasst werden (Formularversand, keine eingebettete Google-Maps-Karte mehr, Font Awesome entfällt). Danach den Hinweiskasten oben auf der Seite entfernen.
- **Foto:** Auf der Startseite ist ein Platz für ein echtes Foto aus Werkstatt oder Team vorgesehen.
- **Offene inhaltliche Fragen** (aus der alten Seite übernommen):
  - AS 8000 Akku: Der Text sagt „gleiche Ringe wie AS 8000“ (CL 24), die alte Seite verlinkte aber CL 28 und CL 36. Im Prototyp steht CL 24.
  - AS 900M: Auf der alten Seite stand bei den passenden Ringen „Fehlt noch!!“. Im Prototyp stehen 9ZA und 9B (laut Ringseite).
  - Ringmagazin 3: angekündigt waren „fünf Ausführungen“, aufgeführt sind vier. Bei 3b steht 1,3 mm Drahtstärke, bei den anderen 2 mm.
  - Ringmagazin 2 nennt als passende Zangen AS 200 M16 und AS 4000, die es im Sortiment nicht gibt.
  - Ringe 05, 6b und 8ZA werden bei Zangen erwähnt, stehen aber nicht auf der Ringseite.
  - AS 300: keine Angabe zu passenden Ringen.
  - E-Mail: Kopf und Kontakt nennen allround-sauer@t-online.de, das Impressum allround-sauer@ringzange.de.
