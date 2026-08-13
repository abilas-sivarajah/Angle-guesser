# ANGLE – Winkel raten

Ein Nachbau von [angle.wtf](https://angle.wtf): Errate den gezeigten Winkel in 4 Versuchen.

- **Täglich** – ein Winkel pro Tag, für alle gleich (aus dem Datum abgeleitet), plus Countdown zum nächsten Rätsel
- **Übungsmodus** – unbegrenzt viele Zufallsrunden (⇄-Symbol)
- **Statistik** – Serie, Gewinnquote, Verteilung der Versuche (localStorage, nur tägliche Rätsel)
- **Teilen** – Emoji-Grid in die Zwischenablage
- **Animation** – der Strahl dreht sich vom letzten Tipp auf die Lösung

Keine Build-Tools, keine Abhängigkeiten: alles steckt in `index.html`.

## Lokal starten

`index.html` einfach doppelklicken. Oder mit einem lokalen Server (empfohlen, damit `/favicon.svg` gefunden wird):

```bash
npx serve .
# oder
python -m http.server 3000
```

## Auf Vercel deployen

Das Projekt ist ein reines Static Site – kein Build-Step nötig. `vercel.json` ist bereits konfiguriert.

### Variante A: Vercel CLI (schnellster Weg)

```bash
npm i -g vercel
vercel login
vercel          # Preview-Deployment
vercel --prod   # Production-Deployment
```

Bei der ersten Ausführung fragt die CLI nach dem Projekt-Setup. Wichtig:

| Frage | Antwort |
|---|---|
| Framework Preset | **Other** |
| Build Command | leer lassen |
| Output Directory | leer lassen (Root) |
| Install Command | leer lassen |

### Variante B: über GitHub

```bash
git init
git add -A
git commit -m "ANGLE – Winkel-Rätsel"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

Dann auf [vercel.com/new](https://vercel.com/new) das Repo importieren. Framework Preset **Other**, Build/Output-Felder leer lassen. Jeder Push auf `main` deployt danach automatisch.

## Dateien

```
index.html     Spiel (HTML + CSS + JS + SVG)
favicon.svg    Logo
vercel.json    Static-Hosting-Konfiguration (cleanUrls, Cache-Header)
```

## Anpassen

Alles Wichtige steht oben in `index.html`:

- `MAX_ATTEMPTS` – Anzahl der Versuche (Standard: 4)
- `feedbackFor(diff)` – die Temperatur-Stufen und ihre Grenzen
- `CX / CY / RAY_LEN / ARC_R` – Geometrie der Zeichnung
- CSS-Variablen in `:root` – Farbschema
