# ANGLE – Winkel raten

Ein Nachbau von [angle.wtf](https://angle.wtf): Errate den gezeigten Winkel in 4 Versuchen.

- **Täglich** – ein Winkel pro Tag, für alle gleich (aus dem Datum abgeleitet), plus Countdown zum nächsten Rätsel
- **Übungsmodus** – unbegrenzt viele Zufallsrunden (⇄-Symbol)
- **Statistik** – Serie, Gewinnquote, Verteilung der Versuche (localStorage, nur tägliche Rätsel)
- **Teilen** – Emoji-Grid in die Zwischenablage
- **Animation** – der Strahl dreht sich vom letzten Tipp auf die Lösung

Keine Build-Tools, keine Abhängigkeiten: alles steckt in `index.html`.

## Lokal starten

Im Projektordner einen kleinen Webserver starten (braucht nur Node):

```bash
npx serve .
```

Danach die angezeigte Adresse öffnen, meist http://localhost:3000.

Zur Not tut es auch ein Doppelklick auf `index.html`. Über `file://` findet der Browser aber `/favicon.svg` nicht, und je nach Browser ist `localStorage` gesperrt – dann wird der Spielfortschritt nicht gespeichert. Zum Entwickeln also lieber der Server.

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
.vercelignore  hält die Build-Werkzeuge (und damit die Lösungsliste) aus dem Deployment
contexto/      zweites Spiel, siehe unten
```

## Anpassen

Alles Wichtige steht oben in `index.html`:

- `MAX_ATTEMPTS` – Anzahl der Versuche (Standard: 4)
- `feedbackFor(diff)` – die Temperatur-Stufen und ihre Grenzen
- `CX / CY / RAY_LEN / ARC_R` – Geometrie der Zeichnung
- CSS-Variablen in `:root` – Farbschema

## CONTEXTO (englisch) – `/contexto`

Ein Nachbau von [contexto.me](https://contexto.me): Finde das geheime Wort. Jeder Tipp bekommt
eine Position – wie nah er dem Lösungswort in der Bedeutung ist (#1 = Lösung).
Beliebig viele Versuche, Tipps (💡), Aufgeben, alle bisherigen Spiele im Archiv, Statistik und Teilen.

Läuft ebenfalls ohne Server-Code: Die Ranglisten sind vorberechnet, der Browser schlägt nur nach.
Deshalb braucht auch dieses Spiel einen Webserver (`npx serve .`, dann `/contexto/` öffnen) –
über `file://` lassen sich die Daten nicht laden.

```
contexto/index.html                Spiel
contexto/data/en/vocab.json        Wortschatz (~25.500 Grundformen), Beugungsformen, Stoppwörter
contexto/data/en/games/<n>.bin     pro Spiel alle Wort-IDs nach Nähe sortiert (Uint16, Eintrag 0 = Lösung)
contexto/tools/build_en.py         erzeugt die Daten
contexto/tools/secret_words_en.txt Lösungswörter, Zeile n = Spiel #n
```

- **Ähnlichkeit**: Kosinus-Ähnlichkeit der [GloVe](https://nlp.stanford.edu/projects/glove/)-Wortvektoren
  (Wikipedia + Gigaword, 300 Dimensionen, Public Domain).
- **Wortschatz**: die häufigsten englischen Wörter ([wordfreq](https://github.com/rspeer/wordfreq)),
  auf Grundformen gebracht ([lemminflect](https://github.com/bjascob/LemmInflect)), ohne Eigennamen,
  Füllwörter und Schimpfwörter. Ob ein Wort ein Eigenname ist, entscheidet die Groß-/Kleinschreibung
  im fastText-Vokabular.
- **Tagesrätsel**: Spiel #1 ist der 28.09.2026, danach eins pro Tag (`EPOCH` in `contexto/index.html`).
  Die 535 Lösungswörter reichen bis März 2028; danach beginnt die Liste von vorn.

### Daten neu erzeugen

```bash
pip install numpy wordfreq lemminflect
python3 contexto/tools/build_en.py
```

Der erste Lauf lädt ~1,4 GB Wortvektoren nach `contexto/tools/.cache/` (nicht im Repo).
Neue Lösungswörter **hinten** an `secret_words_en.txt` anhängen – sonst verschieben sich die bisherigen Spiele.
