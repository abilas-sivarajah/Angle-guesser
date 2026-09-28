#!/usr/bin/env python3
"""Erzeugt fuenf/words.js aus answers.txt (Loesungen, Zeile n = Raetsel #n) und wordfreq.

Aufruf:  pip install wordfreq
         python3 fuenf/tools/build_words.py
"""
import re
from pathlib import Path

import wordfreq

TOOLS = Path(__file__).resolve().parent
ALLOWED_COUNT = 12_000     # so viele haeufigste 5-Buchstaben-Woerter gelten als gueltiger Tipp
WORD = re.compile(r"[a-zäöü]{5}")

answers = [w.strip() for w in open(TOOLS / "answers.txt", encoding="utf8") if w.strip()]
bad = [w for w in answers if not WORD.fullmatch(w)]
if bad or len(set(answers)) != len(answers):
    raise SystemExit(f"ungueltige oder doppelte Loesungen: {bad}")

five = [w for w in wordfreq.top_n_list("de", 400_000) if WORD.fullmatch(w)]
allowed = sorted(set(five[:ALLOWED_COUNT]) | set(answers))

js = ("// erzeugt von fuenf/tools/build_words.py – nicht von Hand bearbeiten\n"
      f'const ANSWERS = "{" ".join(answers)}".split(" ");\n'
      f'const ALLOWED = new Set("{" ".join(allowed)}".split(" "));\n')
(TOOLS.parent / "words.js").write_text(js, encoding="utf8")
print(f"{len(answers)} Loesungen, {len(allowed)} erlaubte Woerter")
