#!/usr/bin/env python3
"""Aggregate style signals from your own published text.

Usage:
  python3 -I style_signals.py PATH [PATH ...] [--field text] [--cut-list FILE]

PATH is a .txt or .md file (one post per file, or posts separated by a line
containing only ---), a .jsonl file (one post per line, text in --field), or a
directory of those. Prints aggregate counts as Markdown. It never prints post
text, reads only the paths given, and makes no network calls.
"""

from __future__ import annotations

import argparse
import collections
import json
import re
import sys
from pathlib import Path
from statistics import median

DEFAULT_CUT = [
    "delve", "dive into", "unpack", "leverage", "utilize", "harness", "robust",
    "seamless", "streamline", "empower", "unlock", "elevate", "supercharge",
    "cutting-edge", "game changer", "landscape", "realm", "in order to",
    "furthermore", "additionally", "moreover", "moving forward",
    "at the end of the day", "let that sink in", "read that again",
    "thrilled to announce", "excited to share", "here's the thing",
    "nobody tells you", "this changes everything",
]
CONTRAST = re.compile(r"\b(?:it's|this is|that's)\s+not\b[^.!?\n]{1,60}[,.;]\s*(?:it's|this is|that's)\b", re.I)
EMOJI = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]")
TRAILING = re.compile(r"[\s\U0001F300-\U0001FAFF\u2600-\u27BF\uFE0F\u200D]+$")
WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d+")
CONTRACTION = re.compile(r"\b[A-Za-z]+(?:n't|'re|'ve|'ll|'d|'m|'s)\b")


def load(paths: list[Path], field: str) -> list[str]:
    posts: list[str] = []
    files: list[Path] = []
    for p in paths:
        if p.is_dir():
            files += sorted(f for f in p.rglob("*") if f.suffix in {".txt", ".md", ".jsonl"})
        elif p.is_file():
            files.append(p)
        else:
            print(f"skipped missing path: {p}", file=sys.stderr)
    for f in files:
        raw = f.read_text(encoding="utf-8", errors="replace")
        if f.suffix == ".jsonl":
            for line in raw.splitlines():
                try:
                    value = json.loads(line).get(field, "")
                except (json.JSONDecodeError, AttributeError):
                    continue
                if isinstance(value, str) and value.strip():
                    posts.append(value)
        else:
            posts += [chunk for chunk in re.split(r"^---\s*$", raw, flags=re.M) if chunk.strip()]
    return posts


def mid(values: list[int]) -> float:
    return median(values) if values else 0


def rate(part: int, whole: int) -> str:
    return f"{part}/{whole} ({part / whole * 100:.0f}%)" if whole else "0/0"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="+", type=Path)
    ap.add_argument("--field", default="text", help="JSONL field holding the post text")
    ap.add_argument("--cut-list", type=Path, help="file with one phrase per line to count")
    args = ap.parse_args()

    cut = DEFAULT_CUT
    if args.cut_list:
        cut = [l.strip().lower() for l in args.cut_list.read_text(encoding="utf-8").splitlines() if l.strip()]

    posts = load(args.paths, args.field)
    n = len(posts)
    if not n:
        print("No posts found.", file=sys.stderr)
        return 1

    post_words, sentence_words, para_words = [], [], []
    chars, starters, cut_hits = [], collections.Counter(), collections.Counter()
    em = ell = emo = excl = q_end = contrast = contractions = 0
    for text in posts:
        t = text.strip()
        words = WORD.findall(t)
        post_words.append(len(words))
        chars.append(len(t))
        sentence_words += [len(WORD.findall(s)) for s in re.split("(?<=[.!?\u2026])\\s+", t) if WORD.findall(s)]
        para_words += [len(WORD.findall(p)) for p in re.split(r"\n\s*\n", t) if WORD.findall(p)]
        if words:
            starters[words[0].lower()] += 1
        em += "\u2014" in t
        ell += "\u2026" in t or "..." in t
        emo += bool(EMOJI.search(t))
        excl += "!" in t
        q_end += TRAILING.sub("", t).endswith("?")
        contrast += bool(CONTRAST.search(t))
        contractions += len(CONTRACTION.findall(t))
        low = t.lower()
        for phrase in cut:
            hits = low.count(phrase)
            if hits:
                cut_hits[phrase] += hits

    total_words = sum(post_words)
    print(f"# Style signals\n\nSample: {n} posts, {total_words} words. Aggregates only.\n")
    print("| Signal | Value |\n|---|---|")
    print(f"| Median characters per post | {mid(chars):.0f} |")
    print(f"| Median words per post | {mid(post_words):.0f} |")
    print(f"| Median words per sentence | {mid(sentence_words):.0f} |")
    print(f"| Median words per paragraph | {mid(para_words):.0f} |")
    print(f"| Contractions per 1,000 words | {contractions / total_words * 1000 if total_words else 0:.1f} |")
    print(f"| Posts with an em dash | {rate(em, n)} |")
    print(f"| Posts with an ellipsis | {rate(ell, n)} |")
    print(f"| Posts with emoji | {rate(emo, n)} |")
    print(f"| Posts with an exclamation mark | {rate(excl, n)} |")
    print(f"| Posts ending on a question | {rate(q_end, n)} |")
    print(f"| Posts with a not-X-it's-Y contrast | {rate(contrast, n)} |")
    print("\n## Most common first words\n")
    for word, count in starters.most_common(10):
        print(f"- {word}: {count}")
    print("\n## Cut-list phrases found\n")
    if cut_hits:
        for phrase, count in cut_hits.most_common():
            print(f"- {phrase}: {count}")
    else:
        print("- none")
    return 0


if __name__ == "__main__":
    sys.exit(main())
