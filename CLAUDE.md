# CLAUDE.md – ringzange.de

Website von **Allround E.A. Sauer** (Frankfurt am Main), Spezialist für Ringzangen im Zaunbau seit über 25 Jahren. Ersetzt die alte WordPress-Seite. Der Inhaber ist kein Techniker: Erkläre Änderungen in einfachen Worten, ohne Fachjargon, und zeige ihm das Ergebnis im Browser.

## Technik

- Rein statisch: HTML, CSS, ein kleines JavaScript. Kein Framework, kein Build-Schritt, keine Abhängigkeiten. Das soll so bleiben.
- Hosting: Strato (Apache). `.htaccess` erzwingt HTTPS und leitet alte WordPress-Adressen (`/ringzange/` usw.) auf die neuen Seiten um.
- Ansehen ohne Server: `index.html` einfach im Browser öffnen. Mit Server: `npm start` (Python) → http://localhost:8000
- Sprache der Seite und aller Texte: Deutsch, Sie-Form.

## Dateien

- `index.html`, `ringzange.html`, `ringe-magazine.html`, `sonstiges.html`, `kontakt.html`, `impressum.html`, `datenschutz.html`
- `assets/css/site.css` – gesamtes Layout, Farb- und Schrift-Tokens oben in `:root`
- `assets/js/site.js` – Handy-Menü, Galerie und Bildbetrachter, Modellfilter, Kontaktformular, Kopierknöpfe
- `assets/img/fotos/` (1600 px), `assets/img/thumbs/` (Galerie-Vorschauen), `assets/img/freigestellt/` (PNG mit Transparenz)
- `assets/fonts/` – Source Serif 4 und Source Sans 3, lokal gehostet (DSGVO: keine Verbindung zu Google). Keine Google-Fonts-Links einbauen.

## Wichtige Regeln

- **Kopf, Navigation und Fuß stehen identisch in allen sieben HTML-Dateien.** Eine Änderung dort immer in allen sieben übernehmen. Die aktive Seite trägt `aria-current="page"` im Menü.
- **Design „Briefbogen“:** Papierweiß `#FCFBF9`, Blauschwarz `#1E2630`, Bordeaux `#A3201E` sparsam für Akzente, feine Linien statt Kästen und Schatten, keine runden Ecken, Überschriften in Serif. Abschnitte nutzen die Randspalte (`.margin-layout` mit `__label` und `__body`). Neue Farben nur als Token in `:root`.
- **`[hidden]` muss wirklich ausblenden:** Es gibt eine globale Regel `[hidden] { display: none !important; }`. Nicht entfernen, sonst bleiben Filter-Ergebnisse und Formular sichtbar.
- **Inhalte nicht erfinden.** Technische Daten, Bestellnummern und Zusagen kommen vom Inhaber. Fehlt etwas, nachfragen statt raten.
- **Bilder:** neue Produktfotos auf maximal 1600 px verkleinern, mit `width`/`height`-Attributen und sinnvollem `alt`-Text einbinden. Vorschaubilder für Galerien: 480 px in `assets/img/thumbs/`.
- **Modelle auf `ringzange.html`:** jedes Modell ist ein `<article class="model" id="as-…" data-tags="…">`. Filter-Tags: `hand`, `einzel`, `magazin`, `druckluft`, `akku`. Ein neues Modell braucht außerdem einen Eintrag in `.model-index` und in `MODEL_NAMES` in `assets/js/site.js` (für den vorbelegten Betreff im Kontaktformular).
- **Links zum Kontaktformular mit Betreff:** `kontakt.html#betreff-<id>`, z. B. `#betreff-as-2000`.

## Testen

Nach jeder Änderung:

```
npm test
```

Das prüft statisch alle Links, Bilder und Anker und testet danach im echten Chrome (headless) jede Seite auf Desktop- und Handybreite, den Filter, die Galerie, das Formular und das Handy-Menü. Braucht Node 22+ und Google Chrome. `npm run test:screenshots` legt zusätzlich Bildschirmfotos in `tests/screenshots/` ab; die solltest du dir nach optischen Änderungen ansehen.

## Offen vor dem Livegang

1. **Kontaktformular versendet noch nichts.** In `assets/js/site.js` `FORM_ENDPOINT` setzen, z. B. ein kleines PHP-Skript auf dem Strato-Webspace. Bis dahin zeigt das Formular ehrlich an, dass es ein Prototyp ist.
2. **Datenschutzerklärung anpassen** (stammt von der alten Seite): Formularversand, keine eingebettete Google-Maps-Karte mehr, Font Awesome entfällt. Danach den Hinweiskasten `.notice` oben entfernen.
3. **Foto** aus Werkstatt oder Team für den Platzhalter auf der Startseite (`.photo-slot`).
4. **Inhaltliche Fragen an den Inhaber:**
   - AS 8000 Akku: passende Ringe CL 24 (laut Text) oder CL 28/CL 36 (alte Verlinkung)?
   - AS 900M: passende Ringe 9ZA und 9B korrekt? (auf der alten Seite stand „Fehlt noch!!“)
   - Ringmagazin 3: vier oder fünf Ausführungen? Drahtstärke 3b wirklich 1,3 mm?
   - Ringmagazin 2: Zangen „AS 200 M16“ und „AS 4000“ gibt es nicht im Sortiment.
   - Ringe 05, 6b und 8ZA werden erwähnt, fehlen aber auf der Ringseite.
   - AS 300: welche Ringe passen?
   - E-Mail: allround-sauer@t-online.de (Kopf, Kontakt) oder allround-sauer@ringzange.de (Impressum)?

## Veröffentlichen

Nur nach ausdrücklicher Freigabe durch den Inhaber: alle Dateien inklusive `.htaccess` per SFTP ins Webverzeichnis bei Strato laden, vorher die alte WordPress-Seite sichern. Nicht mitladen: `tests/`, `package.json`, `CLAUDE.md`, `START-HIER.md`, `README.md`.
