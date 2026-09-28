#!/usr/bin/env python3
"""Erzeugt die Spieldaten fuer die englische Contexto-Version.

Ausgabe (relativ zu contexto/):
  data/en/vocab.json        Wortschatz, Beugungsformen, Stoppwoerter
  data/en/games/<n>.bin     pro Spiel die Wort-IDs sortiert nach Naehe
                            (Uint16, little endian; Eintrag 0 = Loesung)

Aufruf:  pip install numpy wordfreq lemminflect
         python3 contexto/tools/build_en.py

Beim ersten Lauf werden ~1,4 GB Wortvektoren nach contexto/tools/.cache
geladen (GloVe fuer die Aehnlichkeit, fastText nur fuer Gross-/Kleinschreibung).
"""
import gzip
import json
import re
import sys
import urllib.request
from pathlib import Path

import lemminflect
import numpy as np
import wordfreq

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
CACHE = TOOLS / ".cache"
OUT = ROOT / "data" / "en"

GENSIM = "https://github.com/RaRe-Technologies/gensim-data/releases/download"
GLOVE_URL = f"{GENSIM}/glove-wiki-gigaword-300/glove-wiki-gigaword-300.gz"
FASTTEXT_URL = f"{GENSIM}/fasttext-wiki-news-subwords-300/fasttext-wiki-news-subwords-300.gz"
BADWORDS_URL = ("https://raw.githubusercontent.com/LDNOOBW/"
                "List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en")

FREQ_LIST_SIZE = 120_000   # so viele haeufigste Woerter (wordfreq) werden betrachtet
MAX_VOCAB = 30_000         # Groesse des ratbaren Wortschatzes (muss < 65536 bleiben)
MIN_ZIPF_UNKNOWN = 3.3     # Mindesthaeufigkeit fuer Woerter, die lemminflect nicht kennt

# Zu haeufig, um zu zaehlen – wie bei Contexto ("this word doesn't count")
STOPWORDS = set("""
a about above after again against all am an and any are as at be because been before
being below between both but by can could did do does doing down during each few for from
further had has have having he her here hers herself him himself his how i if in into is it
its itself just me more most my myself no nor not now of off on once only or other our ours
ourselves out over own same she should so some such than that the their theirs them
themselves then there these they this those through to too under until up very was we were
what when where which while who whom why will with would you your yours yourself yourselves
also although among another anyone anything around away else ever every everyone everything
however may might must neither nobody none nothing onto per quite rather since someone
something than though thus toward towards upon via whatever whenever wherever whether whose
yet shall cannot etc despite unless whereas whilst amongst amid amidst beneath beside atop
lest versus albeit unto thru
""".split())

# trotzdem ratbar: Eigennamen und Woerter, die der Filter sonst verwirft
ALLOW = set("""
burger
monday tuesday wednesday thursday friday saturday sunday
january february march april may june july august september october november december
christmas easter halloween thanksgiving ramadan god bible jesus
africa asia europe america australia antarctica
china japan india russia france germany italy spain england britain ireland scotland canada
mexico brazil argentina egypt greece israel iran iraq korea vietnam thailand sweden norway
poland ukraine switzerland netherlands portugal
american british english french german italian spanish chinese japanese indian russian mexican
canadian irish scottish greek dutch swiss swedish african asian european australian korean
arab arabic latin hebrew egyptian brazilian polish portuguese
christian christianity muslim islam jewish judaism buddhist buddhism hindu
venus mars jupiter saturn uranus neptune pluto
""".split())

# rutschen sonst als "haeufig und klein geschrieben" durch
DENY = set("""
non tha govt asap vols ooo kno stil uit tge zijn tarde ech erh naam corpo mille grata mache
tous wel omnis amico mort sola ris rota dealin douce elegans hander
lol haha huh heh duh bruh tho bro gonna wanna gotta dunno cuz sooo soooo boi wha yer tae til
dont didnt doesnt isnt wasnt arent havent couldnt wouldnt theyre youre aint ain
atleast alot everytime ofthe ing def alt exp approx est aka etc
del com von der und que para sur por una ser ver vivo della qui une ist fil var int div dir
""".split())

# Wortstaemme, die nie im Wortschatz landen sollen (zusaetzlich zur LDNOOBW-Liste)
PROFANE = re.compile(r"fuck|shit|cunt|nigg|bitch|whore|slut")


def fetch(url, name):
    CACHE.mkdir(exist_ok=True)
    path = CACHE / name
    if not path.exists():
        print(f"lade {url} ...", flush=True)
        tmp = path.with_suffix(".part")
        urllib.request.urlretrieve(url, tmp)
        tmp.rename(path)
    return path


def fasttext_ranks():
    """Rang jedes (gross/klein geschriebenen) Tokens im nach Haeufigkeit sortierten fastText-Vokabular."""
    words_file = CACHE / "fasttext_words.txt"
    if not words_file.exists():
        src = fetch(FASTTEXT_URL, "fasttext-wiki-news-subwords-300.gz")
        with gzip.open(src, "rt", encoding="utf8", errors="ignore") as f, open(words_file, "w") as out:
            next(f)
            for line in f:
                out.write(line.split(" ", 1)[0] + "\n")
    ranks = {}
    for i, w in enumerate(open(words_file, encoding="utf8")):
        ranks.setdefault(w.rstrip("\n"), i)
    return ranks


def load_glove(wanted):
    src = fetch(GLOVE_URL, "glove-wiki-gigaword-300.gz")
    vecs = {}
    with gzip.open(src, "rt", encoding="utf8") as f:
        next(f)
        for line in f:
            w, rest = line.split(" ", 1)
            if w in wanted and w not in vecs:
                vecs[w] = np.array(rest.split(), dtype=np.float32)
    return vecs


def lemma_of(w, known_words=()):
    """Grundform; Woerter, die selbst eine Grundform sind ("running", "glasses"), bleiben."""
    lem = lemminflect.getAllLemmas(w)
    if not lem:
        # unbekannt: schlichten Plural ("iphones") bzw. verschlucktes g ("lookin") aufloesen
        if w.endswith("s") and not w.endswith("ss") and w[:-1] in known_words:
            return lemma_of(w[:-1], known_words)
        if w.endswith("in") and w + "g" in known_words:
            return lemma_of(w + "g")
        return w
    if w in {x for forms in lem.values() for x in forms}:
        return w
    for pos in ("NOUN", "VERB", "ADJ", "ADV"):
        if pos in lem:
            return lem[pos][0]
    return w


def main():
    ft = fasttext_ranks()
    badlist = {l.strip().lower() for l in open(fetch(BADWORDS_URL, "badwords_en.txt"), encoding="utf8")}

    def bad(w):
        return w in badlist or PROFANE.search(w) is not None
    freq = [w for w in wordfreq.top_n_list("en", FREQ_LIST_SIZE) if re.fullmatch(r"[a-z]+", w)]

    def is_common_word(w):
        if w in DENY:
            return False
        if w in ALLOW or lemminflect.getAllLemmas(w):
            return True
        if len(w) < 3 or not re.search(r"[aeiouy]", w) or wordfreq.zipf_frequency(w, "en") < MIN_ZIPF_UNKNOWN:
            return False
        low = ft.get(w, float("inf"))
        cap = min(ft.get(w.capitalize(), float("inf")), ft.get(w.upper(), float("inf")))
        return low < cap   # ueberwiegend klein geschrieben -> kein Eigenname/Kuerzel

    freq_set = set(freq)
    lemmas = {w: lemma_of(w, freq_set) for w in freq}
    glove = load_glove(set(freq) | set(lemmas.values()))

    vocab, seen = [], set()
    for w in freq:
        lem = lemmas[w]
        if lem in seen or lem in STOPWORDS or bad(lem) or bad(w) or lem not in glove:
            continue
        if not is_common_word(lem):
            continue
        seen.add(lem)
        vocab.append(lem)
        if len(vocab) == MAX_VOCAB:
            break
    index = {w: i for i, w in enumerate(vocab)}

    # Beugungsformen -> Grundform ("cats" -> "cat", "went" -> "go")
    forms = {}
    for w in freq:
        if w not in index and w not in STOPWORDS and not bad(w) and lemmas[w] in index:
            forms[w] = index[lemmas[w]]
    for lem in vocab:
        for infl in lemminflect.getAllInflections(lem).values():
            for f in infl:
                if f not in index and f not in forms and not bad(f) and f in lemmas:
                    forms[f] = index[lem]

    secrets = [w.strip() for w in open(TOOLS / "secret_words_en.txt", encoding="utf8") if w.strip()]
    missing = [w for w in secrets if w not in index]
    if missing:
        sys.exit(f"Loesungswoerter nicht im Wortschatz: {missing}")
    if len(set(secrets)) != len(secrets):
        sys.exit("Loesungswoerter enthalten Duplikate")

    M = np.stack([glove[w] for w in vocab])
    M /= np.linalg.norm(M, axis=1, keepdims=True)

    games_dir = OUT / "games"
    games_dir.mkdir(parents=True, exist_ok=True)
    for old in games_dir.glob("*.bin"):
        old.unlink()
    for n, secret in enumerate(secrets, 1):
        s = index[secret]
        sims = M @ M[s]
        sims[s] = 2.0   # Loesung immer auf Platz 1, auch bei identischen Vektoren
        order = np.argsort(-sims, kind="stable").astype("<u2")
        order.tofile(games_dir / f"{n}.bin")

    meta = {
        "games": len(secrets),
        "words": vocab,
        "forms": forms,
        "stop": sorted(STOPWORDS),
    }
    with open(OUT / "vocab.json", "w", encoding="utf8") as f:
        json.dump(meta, f, separators=(",", ":"))
    print(f"{len(vocab)} Woerter, {len(forms)} Beugungsformen, {len(secrets)} Spiele -> {OUT}")


if __name__ == "__main__":
    main()
