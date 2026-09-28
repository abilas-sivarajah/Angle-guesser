# Tägliche Rätsel

Vierzehn kleine tägliche Rätsel als statische Website – keine Build-Tools, kein Server-Code.
Jedes Spiel steckt in einem eigenen Ordner und ist eine einzelne HTML-Datei.

| Pfad | Spiel | Kurz |
|---|---|---|
| `/` | Startseite | alle Spiele mit dem heutigen Spielstand |
| `/fuenf` | FÜNF | Wort mit 5 Buchstaben in 6 Versuchen (wie Wordle, deutsch) |
| `/verbindungen` | VERBINDUNGEN | 16 Begriffe in 4 Gruppen sortieren (wie Connections, deutsch) |
| `/contexto` | CONTEXTO | geheimes Wort über seine Bedeutung finden (englisch) |
| `/ziffern` | ZIFFERN | Zielzahl mit + − × ÷ erreichen, 3 Runden (wie Digits) |
| `/sudoku` | SUDOKU | tägliches Sudoku, Übungsmodus in 3 Stufen |
| `/damen` | DAMEN | eine Dame pro Zeile, Spalte und Farbregion (wie Queens) |
| `/tango` | TANGO | Sonnen und Monde mit =/×-Hinweisen (wie Tango) |
| `/pfad` | PFAD | ein Weg durch alle Felder über die Zahlen (wie Zip) |
| `/punktlandung` | PUNKTLANDUNG | 5 Orte auf der Weltkarte antippen, Punkte nach Entfernung (wie MapTap) |
| `/umriss` | UMRISS | Land am Umriss erkennen, mit Entfernung und Richtung (wie Worldle) |
| `/globus` | GLOBUS | geheimes Land finden, die Karte färbt sich heiß/kalt (wie Globle) |
| `/flagge` | FLAGGE | Land an der Flagge erkennen, die Stück für Stück aufgedeckt wird |
| `/zeitstrahl` | ZEITSTRAHL | historische Ereignisse in die richtige Reihenfolge bringen |
| `/angle` | ANGLE | Winkel schätzen in 4 Versuchen |

Alle Tagesrätsel beginnen mit #1 am 28.09.2026 (ANGLE zählt seit 2024) und wechseln um Mitternacht
Ortszeit. In jedem Spiel führt das ▦-Symbol oben links zurück zur Startseite, am Ende einer Runde
zusätzlich „Weitere Spiele“.

### Spielstand auf der Startseite

Die neueren Spiele (alle außer ANGLE und CONTEXTO) melden ihren Tagesstand selbst unter
dem `localStorage`-Schlüssel `raetsel.status`:

```js
{ "<ordner>": { "dateKey": "2026-09-28", "state": "playing" | "won" | "lost", "text": "Gelöst · 3/6" } }
```

ANGLE und CONTEXTO liest die Startseite direkt aus deren eigenen Speicherständen
(`angleguesser.daily`, `contexto.en.games`) – wer dort Schlüssel oder Format ändert, muss `index.html`
mitziehen.

## ANGLE – `/angle`

Ein Nachbau von [angle.wtf](https://angle.wtf): Errate den gezeigten Winkel in 4 Versuchen.

- **Täglich** – ein Winkel pro Tag, für alle gleich (aus dem Datum abgeleitet), plus Countdown zum nächsten Rätsel
- **Übungsmodus** – unbegrenzt viele Zufallsrunden (⇄-Symbol)
- **Statistik** – Serie, Gewinnquote, Verteilung der Versuche (localStorage, nur tägliche Rätsel)
- **Teilen** – Emoji-Grid in die Zwischenablage
- **Animation** – der Strahl dreht sich vom letzten Tipp auf die Lösung

Keine Abhängigkeiten: alles steckt in `angle/index.html`.

## Lokal starten

Im Projektordner einen kleinen Webserver starten (braucht nur Node):

```bash
npx serve .
```

Danach die angezeigte Adresse öffnen, meist http://localhost:3000 – dort liegt die Startseite.

Ein Doppelklick auf eine HTML-Datei reicht nicht: Über `file://` funktionieren die Links zwischen den Seiten und die Daten von CONTEXTO nicht, und je nach Browser ist `localStorage` gesperrt – dann wird der Spielfortschritt nicht gespeichert.

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
index.html     Startseite
favicon.svg    Logo der Startseite
<spiel>/       je Spiel: index.html (HTML + CSS + JS) und favicon.svg
fuenf/words.js Wortlisten für FÜNF (erzeugt)
contexto/data/ Ranglisten für CONTEXTO (erzeugt)
geo/data/      Karten, Länder, Umrisse und Orte für die Geo-Spiele (erzeugt)
geo/lib/       d3 und topojson-client für die Geo-Spiele
*/tools/       Skripte, die diese Daten erzeugen
vercel.json    Static-Hosting-Konfiguration (cleanUrls, Cache-Header)
.vercelignore  hält die Build-Werkzeuge aus dem Deployment
```

Ein weiteres Spiel kommt in einen eigenen Ordner, bekommt auf der Startseite eine Karte
(`<a class="card" data-game="<ordner>">` in `index.html`), im Spiel einen Link zurück auf `/`
und meldet seinen Tagesstand unter `raetsel.status` (siehe oben).

## Anpassen

Alles Wichtige für ANGLE steht oben in `angle/index.html`:

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

## FÜNF – `/fuenf`

Wordle auf Deutsch: 6 Versuche, Ä/Ö/Ü sind eigene Buchstaben, ß kommt nicht vor.
Übungsmodus mit Zufallswörtern, Statistik mit Verteilung der Versuche, Teilen als Emoji-Grid.

- `fuenf/tools/answers.txt` – 452 Lösungswörter, Zeile n = Rätsel #n (reicht bis Dezember 2027, danach von vorn).
  Neue Wörter **hinten** anhängen.
- `fuenf/tools/build_words.py` – erzeugt `fuenf/words.js`: die Lösungen plus die 12.000 häufigsten deutschen
  Wörter mit fünf Buchstaben aus [wordfreq](https://github.com/rspeer/wordfreq) als erlaubte Tipps.

```bash
pip install wordfreq
python3 fuenf/tools/build_words.py
```

## VERBINDUNGEN – `/verbindungen`

16 Begriffe, vier Gruppen, vier Fehler erlaubt; bei drei von vier Treffern gibt es einen Hinweis.
Frühere Rätsel lassen sich über den Kalender nachspielen.

Die 30 Rätsel stehen als `PUZZLES` direkt in `verbindungen/index.html` – je Rätsel vier Gruppen von leicht bis
um die Ecke gedacht: `["Name", "Begriff", "Begriff", "Begriff", "Begriff"]`. Ein `|` im Begriff markiert,
wo er im Feld umbrechen darf (`"Rumpel|stilzchen"`). Nach 30 Tagen (ab 28.10.2026) wiederholen sie sich –
neue Rätsel einfach hinten anhängen. Jedes Rätsel muss genau eine Aufteilung haben, die ganz aufgeht.

## ZIFFERN – `/ziffern`

Drei Runden pro Tag mit je sechs Zahlen und einer Zielzahl (40–99, 100–249, 250–499). Nur ganze, positive
Zwischenergebnisse; wer nicht genau hinkommt, reicht die beste Zahl ein (⭐⭐⭐ genau, ⭐⭐ ≤ 10, ⭐ ≤ 25 daneben).

Die Aufgaben entstehen im Browser aus dem Datum: Ein Löser rechnet alle erreichbaren Zahlen durch und wählt eine
Zielzahl, die exakt geht, aber mindestens drei der Zahlen braucht. Ein Lösungsweg wird nach der Runde angezeigt.

## SUDOKU – `/sudoku`

Tägliches Sudoku (Mittel, ~30 Vorgaben), Übungsmodus Leicht/Mittel/Schwer. Notizen, Rückgängig, Konflikt-Markierung,
Tastatursteuerung, Timer. Der Generator füllt ein zufälliges Gitter und entfernt Felder punktsymmetrisch, solange
die Lösung eindeutig bleibt – alles im Browser, aus dem Datum abgeleitet.

## DAMEN – `/damen`

Wie LinkedIn Queens: je eine Dame pro Zeile, Spalte und Farbregion, keine zwei berühren sich. Tagesrätsel wechseln
zwischen 7×7, 8×8 und 9×9. Der Generator wählt eine Lösung, lässt von jeder Dame aus eine Region wachsen und verschiebt
so lange einzelne Felder zwischen Regionen, bis es keine zweite Lösung mehr gibt.

## TANGO – `/tango`

6×6-Gitter mit Sonnen und Monden: je drei pro Zeile und Spalte, nie drei gleiche nebeneinander, `=`/`×` zwischen
zwei Feldern heißt gleich/verschieden. Der Generator zieht eine zufällige gültige Lösung, gibt zunächst alle Felder
plus zehn Zeichen vor und entfernt dann – erst Vorgaben, dann Zeichen – alles, was für eine eindeutige Lösung nicht
nötig ist (im Schnitt bleiben ~4 Vorgaben und ~6 Zeichen).

## PFAD – `/pfad`

Wie LinkedIn Zip: ein Weg von der 1 bis zur höchsten Zahl, der die Zahlen der Reihe nach besucht und jedes Feld genau
einmal betritt. Abwechselnd 6×6 (10 Zahlen) und 7×7 (12 Zahlen). Der Weg entsteht per „Backbite“ aus einer
Schlangenlinie; gewertet wird jeder Weg, der die Regeln erfüllt – nicht nur der erzeugte.

## ZEITSTRAHL – `/zeitstrahl`

Acht Ereignisse pro Tag (alle aus verschiedenen Jahren); das erste liegt mit Jahreszahl auf dem Zeitstrahl, die übrigen
sieben tippt man an die passende Stelle. Die 163 Ereignisse stehen als `EVENTS` direkt in `zeitstrahl/index.html`
(`[Jahr, Text]`, negative Jahre = v. Chr., drittes Feld `"um"` für ungefähre Angaben) – neue einfach anhängen,
möglichst mit einem Jahr, das noch nicht vorkommt.

## Geo-Spiele – PUNKTLANDUNG, UMRISS, GLOBUS, FLAGGE

Alle vier teilen sich Karten- und Länderdaten unter `geo/`. Karte, Zoom und Projektion übernimmt
[d3](https://d3js.org) (`geo/lib/d3.min.js`, ISC-Lizenz), die Karten sind TopoJSON aus
[world-atlas](https://github.com/topojson/world-atlas) – beides auf Basis von [Natural Earth](https://www.naturalearthdata.com)
(gemeinfrei).

- **PUNKTLANDUNG** (`/punktlandung`): Fünf Orte pro Tag – Weltstadt, Hauptstadt/Großstadt, Sehenswürdigkeit,
  Großstadt, weitere Großstadt, nie zweimal dasselbe Land. Tippen setzt einen Pin, *Bestätigen* wertet aus:
  Punkte = 100 · e^(−Entfernung / 1.100 km), also unter 10 km fast 100, bei 1.000 km rund 40. Zoom per Pinch,
  Mausrad oder Knöpfen. Die Karte ist die 50m-Version (ausgedünnt, ~135 KB gezippt).
- **UMRISS** (`/umriss`): Umriss des Landes (flächentreu, auf das Land zentriert), sechs Versuche. Hinweise:
  Entfernung und Richtung zwischen den Landesmitten (Mitte des größten Landesteils), Nähe in Prozent von 20.000 km.
  Weit abgelegene Landesteile (mehr als 800 km vom Rest, z. B. Hawaii) fehlen im Umriss.
- **FLAGGE** (`/flagge`): Sechs Versuche; zu Beginn ist ein Sechstel der Flagge sichtbar, jeder Fehlversuch deckt ein
  weiteres auf. Dazu Entfernung, Richtung und Nähe wie bei UMRISS. Flaggen aus [flag-icons](https://github.com/lipis/flag-icons)
  (MIT), eine SVG-Datei je Lösung unter `geo/flags/`.
- **GLOBUS** (`/globus`): Beliebig viele Tipps; gemessen wird der kürzeste Abstand zwischen den Grenzen
  (Nachbarn = 0 km) auf der 110m-Karte. Sehr kleine Staaten sind in dieser Karte nicht enthalten.

Lösungen sind nur souveräne Staaten (ohne Antarktis, abhängige Gebiete und Gebiete mit umstrittenem Status);
raten kann man alle 176 Länder und Gebiete der Karte, auch unter gängigen Kurznamen („USA“, „Holland“,
„Weißrussland“ …). UMRISS, GLOBUS und FLAGGE gehen die 165 Lösungen jeweils in eigener, fester Reihenfolge durch.

### Daten neu erzeugen

```bash
cd geo/tools
npm install
npm run build
```

`build.mjs` schreibt `geo/data/` (Karten mit ISO-Codes und deutschen Namen, `countries.json` mit Suchschlüsseln,
Landesmitten und den Lösungsreihenfolgen, `shapes.json` mit den Umrissen, `places.json` mit den Orten), die Flaggen
nach `geo/flags/` und d3/topojson nach `geo/lib/`. Die Städte (Natural Earth „populated places“, mit deutschen Namen) lädt es beim ersten
Lauf nach `geo/tools/.cache/`; die Sehenswürdigkeiten stehen als Liste direkt im Skript.
