// Erzeugt die Daten für die Geo-Spiele (PUNKTLANDUNG, UMRISS, GLOBUS).
//
//   cd geo/tools && npm install && npm run build
//
// Quellen: world-atlas (Natural Earth, gemeinfrei), i18n-iso-countries (deutsche Ländernamen), flag-icons (Flaggen, MIT),
// Natural Earth „populated places“ (Städte mit deutschen Namen, wird nach .cache geladen)
// und die handverlesenen Sehenswürdigkeiten unten.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as d3 from "d3";

const require = createRequire(import.meta.url);
const topojson = require("topojson-client");
const simplify = require("topojson-simplify");
const iso = require("i18n-iso-countries");
iso.registerLocale(require("i18n-iso-countries/langs/de.json"));

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const GEO = path.join(TOOLS, "..");
const CACHE = path.join(TOOLS, ".cache");
const PLACES_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson";

/* ---------- Ländernamen ---------- */
// Features ohne ISO-Nummer in world-atlas
const EXTRA_CODES = { "Kosovo": "XK", "N. Cyprus": "XN", "Somaliland": "XS", "Indian Ocean Ter.": "XI", "Siachen Glacier": "XG" };
// Anzeigename (erster Eintrag) und zusätzliche Schreibweisen
const NAMES = {
  US: ["USA", "Vereinigte Staaten", "Vereinigte Staaten von Amerika", "Amerika"],
  GB: ["Großbritannien", "Vereinigtes Königreich", "England", "UK"],
  RU: ["Russland", "Russische Föderation"],
  CZ: ["Tschechien", "Tschechische Republik"],
  CD: ["DR Kongo", "Demokratische Republik Kongo", "Kongo-Kinshasa"],
  CG: ["Republik Kongo", "Kongo-Brazzaville"],
  NL: ["Niederlande", "Holland"],
  CI: ["Elfenbeinküste", "Côte d'Ivoire"],
  MK: ["Nordmazedonien", "Mazedonien"],
  SZ: ["Eswatini", "Swasiland"],
  MM: ["Myanmar", "Birma", "Burma"],
  TL: ["Osttimor", "Timor-Leste"],
  AE: ["Vereinigte Arabische Emirate", "VAE", "Emirate"],
  CF: ["Zentralafrikanische Republik", "ZAR"],
  BA: ["Bosnien und Herzegowina", "Bosnien"],
  PS: ["Palästina", "Palästinensische Gebiete"],
  TW: ["Taiwan"],
  KR: ["Südkorea", "Korea"],
  VA: ["Vatikanstadt", "Vatikan"],
  SY: ["Syrien"], TZ: ["Tansania"], BN: ["Brunei", "Brunei Darussalam"],
  BY: ["Belarus", "Weißrussland"], KG: ["Kirgisistan", "Kirgistan"], MD: ["Moldau", "Moldawien", "Republik Moldau"],
  IR: ["Iran"], LA: ["Laos"], VN: ["Vietnam"], BO: ["Bolivien"], VE: ["Venezuela"],
  XK: ["Kosovo"], XN: ["Nordzypern"], XS: ["Somaliland"],
  XI: ["Britisches Territorium im Indischen Ozean"], XG: ["Siachen-Gletscher"],
};
function namesFor(code){
  const own = NAMES[code] || [];
  const lib = iso.getName(code, "de", { select:"all" }) || [];
  const all = [...own, ...lib].filter((n, i, a) => n && a.indexOf(n) === i);
  if(!all.length) throw new Error("kein Name für " + code);
  return all;
}
// Suchschlüssel: klein, nur Buchstaben – einmal mit ausgeschriebenen Umlauten (oesterreich), einmal ohne (osterreich)
const plain = s => s.toLowerCase().replace(/ß/g, "ss").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
const norm = s => plain(s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue"));

function relabel(topo){
  for(const g of topo.objects.countries.geometries){
    const code = g.id ? iso.numericToAlpha2(g.id) : EXTRA_CODES[g.properties.name];
    if(!code) throw new Error("kein Code für " + g.id + " " + g.properties.name);
    g.id = code;
    g.properties = { n: namesFor(code)[0] };
  }
  delete topo.objects.land;
  return topo;
}

/* ---------- Karten ---------- */
const world110 = relabel(structuredClone(require("world-atlas/countries-110m.json")));
// 50m für die Zoom-Karte ausdünnen (etwa die Hälfte der Punkte) und wieder kompakt quantisieren
const world50 = (() => {
  const pre = simplify.presimplify(relabel(structuredClone(require("world-atlas/countries-50m.json"))));
  const s = simplify.simplify(pre, simplify.quantile(pre, 0.45));
  s.arcs = s.arcs.map(arc => arc.map(([x, y]) => [x, y]));
  return topojson.quantize(s, 1e5);
})();

const f110 = topojson.feature(world110, world110.objects.countries).features;
const f50 = topojson.feature(world50, world50.objects.countries).features;

/* ---------- Länderliste ---------- */
// Hauptteil eines Landes: das größte Polygon (Frankreich ohne Französisch-Guayana usw.)
function polygonsOf(f){
  const g = f.geometry;
  return g.type === "Polygon" ? [g.coordinates] : g.coordinates;
}
function mainCentroid(f){
  const polys = polygonsOf(f).map(c => ({ type:"Polygon", coordinates:c }));
  const main = polys.reduce((a, b) => d3.geoArea(b) > d3.geoArea(a) ? b : a);
  return d3.geoCentroid(main).map(v => Math.round(v * 100) / 100);
}
// Keine Lösungen: Antarktis, abhängige Gebiete und Gebiete mit umstrittenem Status
const NOT_ANSWER = new Set(["AQ", "TF", "GL", "PR", "NC", "FK", "EH", "PS", "TW", "XK", "XN", "XS"]);

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(arr, seed){
  const a = arr.slice(), rnd = mulberry32(seed);
  for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const countryList = f110
  .filter(f => f.id !== "AQ")
  .map(f => {
    const names = namesFor(f.id);
    return { id:f.id, name:names[0], keys:[...new Set([...names.map(norm), ...names.map(plain)])], c:mainCentroid(f) };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "de"));
const answerIds = countryList.map(c => c.id).filter(id => !NOT_ANSWER.has(id)).sort();

/* ---------- Umrisse (UMRISS) ---------- */
// Teile, die mehr als 800 km vom Rest entfernt liegen, fallen weg (Hawaii, Französisch-Guayana …)
function clusterParts(f){
  const polys = polygonsOf(f).map(c => ({ type:"Polygon", coordinates:c }));
  const sample = p => p.coordinates[0].filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 60)) === 0);
  const pts = polys.map(sample);
  const main = polys.indexOf(polys.reduce((a, b) => d3.geoArea(b) > d3.geoArea(a) ? b : a));
  const keep = new Set([main]);
  let grew = true;
  while(grew){
    grew = false;
    polys.forEach((_, i) => {
      if(keep.has(i)) return;
      for(const j of keep){
        const near = pts[i].some(a => pts[j].some(b => d3.geoDistance(a, b) * 6371 < 800));
        if(near){ keep.add(i); grew = true; break; }
      }
    });
  }
  return { type:"MultiPolygon", coordinates:[...keep].map(i => polys[i].coordinates) };
}
const shapes = {};
for(const id of answerIds){
  const f = f50.find(x => x.id === id);
  const geom = clusterParts(f);
  const [lon, lat] = d3.geoCentroid(geom);
  const proj = d3.geoAzimuthalEqualArea().rotate([-lon, -lat]).fitExtent([[8, 8], [292, 292]], geom);
  shapes[id] = d3.geoPath(proj).digits(0)(geom);
}

/* ---------- Orte (PUNKTLANDUNG) ---------- */
// Tiers: A = Weltstädte, B = Hauptstädte & große Städte, C = weitere Großstädte, L = Sehenswürdigkeiten
const LANDMARKS = [
  ["Eiffelturm", "FR", 48.8584, 2.2945], ["Freiheitsstatue", "US", 40.6892, -74.0445],
  ["Kolosseum", "IT", 41.8902, 12.4922], ["Machu Picchu", "PE", -13.1631, -72.5450],
  ["Chinesische Mauer (Badaling)", "CN", 40.3598, 116.0200], ["Taj Mahal", "IN", 27.1751, 78.0421],
  ["Pyramiden von Gizeh", "EG", 29.9792, 31.1342], ["Christusstatue (Corcovado)", "BR", -22.9519, -43.2105],
  ["Opernhaus Sydney", "AU", -33.8568, 151.2153], ["Petra", "JO", 30.3285, 35.4444],
  ["Angkor Wat", "KH", 13.4125, 103.8670], ["Mount Everest", "NP", 27.9881, 86.9250],
  ["Kilimandscharo", "TZ", -3.0674, 37.3556], ["Uluru", "AU", -25.3444, 131.0369],
  ["Niagarafälle", "CA", 43.0962, -79.0377], ["Victoriafälle", "ZM", -17.9243, 25.8572],
  ["Grand Canyon", "US", 36.1069, -112.1129], ["Stonehenge", "GB", 51.1789, -1.8262],
  ["Akropolis", "GR", 37.9715, 23.7257], ["Schloss Neuschwanstein", "DE", 47.5576, 10.7498],
  ["Sagrada Família", "ES", 41.4036, 2.1744], ["Burj Khalifa", "AE", 25.1972, 55.2744],
  ["Fuji", "JP", 35.3606, 138.7274], ["Osterinsel", "CL", -27.1127, -109.3497],
  ["Iguazú-Wasserfälle", "AR", -25.6953, -54.4367], ["Golden Gate Bridge", "US", 37.8199, -122.4783],
  ["Mount Rushmore", "US", 43.8791, -103.4591], ["Tafelberg", "ZA", -33.9628, 18.4098],
  ["Alhambra", "ES", 37.1761, -3.5881], ["Matterhorn", "CH", 45.9763, 7.6586],
  ["Mont-Saint-Michel", "FR", 48.6361, -1.5115], ["Schiefer Turm von Pisa", "IT", 43.7230, 10.3966],
  ["Chichén Itzá", "MX", 20.6843, -88.5678], ["Teotihuacán", "MX", 19.6925, -98.8438],
  ["Halong-Bucht", "VN", 20.9101, 107.1839], ["Hagia Sophia", "TR", 41.0086, 28.9802],
  ["Kreml", "RU", 55.7520, 37.6175], ["Nordkap", "NO", 71.1725, 25.7836],
  ["Kap der Guten Hoffnung", "ZA", -34.3568, 18.4740], ["Kap Hoorn", "CL", -55.9800, -67.2700],
  ["Loch Ness", "GB", 57.3229, -4.4244], ["Serengeti", "TZ", -2.3333, 34.8333],
  ["Salar de Uyuni", "BO", -20.1338, -67.4891], ["Totes Meer", "JO", 31.5590, 35.4732],
  ["Bora Bora", "PF", -16.5004, -151.7415], ["Hollywood-Schriftzug", "US", 34.1341, -118.3215],
  ["Borobudur", "ID", -7.6079, 110.2038], ["Potala-Palast", "CN", 29.6558, 91.1170],
  ["Zugspitze", "DE", 47.4211, 10.9853], ["Nazca-Linien", "PE", -14.7390, -75.1300],
  ["Vesuv", "IT", 40.8210, 14.4260], ["Ätna", "IT", 37.7510, 14.9934],
  ["Marina Bay Sands", "SG", 1.2834, 103.8607], ["Kīlauea", "US", 19.4069, -155.2834],
  ["Old Faithful (Yellowstone)", "US", 44.4605, -110.8281], ["Göreme (Kappadokien)", "TR", 38.6431, 34.8289],
  ["Geirangerfjord", "NO", 62.1049, 7.0940], ["Plitvicer Seen", "HR", 44.8654, 15.5820],
  ["Drei Zinnen", "IT", 46.6186, 12.3025], ["Felsen von Gibraltar", "GI", 36.1440, -5.3530],
  ["Panamakanal (Miraflores-Schleusen)", "PA", 9.0170, -79.5920],
];

async function loadPlaces(){
  const file = path.join(CACHE, "ne_10m_populated_places.geojson");
  if(!fs.existsSync(file)){
    fs.mkdirSync(CACHE, { recursive:true });
    console.log("lade", PLACES_URL);
    const res = await fetch(PLACES_URL);
    if(!res.ok) throw new Error("Download fehlgeschlagen: " + res.status);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(fs.readFileSync(file, "utf8")).features.map(f => f.properties);
}
function countryName(p){
  const a2 = p.ISO_A2 && p.ISO_A2 !== "-99" ? p.ISO_A2 : iso.alpha3ToAlpha2(p.ADM0_A3);
  return a2 ? namesFor(a2)[0] : p.ADM0NAME;
}
function tierOf(p){
  const pop = p.POP_MAX, cap = p.ADM0CAP === 1;
  if(pop >= 500000 && p.SCALERANK <= 2 && (p.WORLDCITY === 1 || cap || pop >= 5e6)) return "A";
  if((cap && pop >= 200000) || (pop >= 2e6 && p.SCALERANK <= 3)) return "B";
  if(pop >= 500000 && p.SCALERANK <= 5) return "C";
  return null;
}

const places = [];
const seenPlace = new Set();
for(const p of await loadPlaces()){
  const t = tierOf(p);
  if(!t) continue;
  const name = (p.NAME_DE || p.NAME).replace(/^New York City$/, "New York");
  const country = countryName(p);
  const key = name + "|" + country;
  if(seenPlace.has(key)) continue;
  seenPlace.add(key);
  places.push([name, country, +p.LATITUDE.toFixed(3), +p.LONGITUDE.toFixed(3), t]);
}
for(const [name, a2, lat, lon] of LANDMARKS) places.push([name, namesFor(a2)[0], lat, lon, "L"]);
places.sort((a, b) => a[4].localeCompare(b[4]) || a[0].localeCompare(b[0], "de"));

/* ---------- Schreiben ---------- */
const out = (rel, data) => {
  const file = path.join(GEO, rel);
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, typeof data === "string" ? data : JSON.stringify(data));
  console.log(rel.padEnd(28), (fs.statSync(file).size / 1024).toFixed(0).padStart(5), "KB");
};
out("data/world-110m.json", world110);
out("data/world-50m.json", world50);
out("data/countries.json", {
  countries: countryList,
  umriss: shuffled(answerIds, 20260928),
  globus: shuffled(answerIds, 19700101),
  flagge: shuffled(answerIds, 31415926),
});
out("data/shapes.json", shapes);
// Flaggen (FLAGGE): eine SVG-Datei je Lösung
const flagSrc = path.join(TOOLS, "node_modules/flag-icons/flags/4x3");
fs.rmSync(path.join(GEO, "flags"), { recursive:true, force:true });
fs.mkdirSync(path.join(GEO, "flags"));
let flagBytes = 0;
for(const id of answerIds){
  const svg = fs.readFileSync(path.join(flagSrc, id.toLowerCase() + ".svg"));
  fs.writeFileSync(path.join(GEO, "flags", id + ".svg"), svg);
  flagBytes += svg.length;
}
console.log("flags/*.svg".padEnd(28), (flagBytes / 1024).toFixed(0).padStart(5), "KB", `(${answerIds.length} Dateien)`);
out("data/places.json", places);
out("lib/d3.min.js", fs.readFileSync(path.join(TOOLS, "node_modules/d3/dist/d3.min.js"), "utf8"));
out("lib/topojson-client.min.js", fs.readFileSync(path.join(TOOLS, "node_modules/topojson-client/dist/topojson-client.min.js"), "utf8"));

const tiers = places.reduce((m, p) => (m[p[4]] = (m[p[4]] || 0) + 1, m), {});
console.log(`${countryList.length} Länder, ${answerIds.length} als Lösung, Orte je Stufe:`, tiers);
