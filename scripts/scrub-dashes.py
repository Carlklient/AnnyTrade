from pathlib import Path
import re

ROOTS = [
    Path("features/annytrade/components"),
    Path("features/annytrade/server/analysis"),
    Path("features/annytrade/lib"),
]

DASHES = {
    "\u2014": ", ",  # em dash
    "\u2013": " to ",  # en dash
    "\u2212": "-",  # minus sign -> ascii hyphen for numbers only later
    "\u00b7": ", ",  # middot
    "\u2010": " ",  # hyphen
    "\u2011": " ",  # non-breaking hyphen
    "\u2012": ", ",  # figure dash
    "\u2015": ", ",  # horizontal bar
}

# User-facing hyphenated labels to space out (not code identifiers)
LABEL_FIXES = [
    ("Rule-based", "Rule based"),
    ("rule-based", "rule based"),
    ("hard-blocked", "hard blocked"),
    ("paper-trade", "paper trade"),
    ("long-only", "long only"),
    ("stop-market", "stop market"),
    ("two-step", "two step"),
    ("re-arm", "rearm"),
    ("LIVE-ish", "LIVE"),
]

changed = []
for root in ROOTS:
    if not root.exists():
        continue
    for path in root.rglob("*"):
        if path.suffix not in {".tsx", ".ts"}:
            continue
        text = path.read_text(encoding="utf-8")
        orig = text
        for a, b in DASHES.items():
            text = text.replace(a, b)
        for a, b in LABEL_FIXES:
            text = text.replace(a, b)
        # clean double spaces / commas from replacements
        text = re.sub(r",\s*,", ",", text)
        text = re.sub(r" {2,}", " ", text)
        if text != orig:
            path.write_text(text, encoding="utf-8", newline="\n")
            changed.append(path.as_posix())

print(f"updated {len(changed)}")
for c in changed:
    print(c)

# verify remaining unicode dashes in components + analysis
left = []
for root in ROOTS:
    for path in root.rglob("*"):
        if path.suffix not in {".tsx", ".ts"}:
            continue
        t = path.read_text(encoding="utf-8")
        if any(ch in t for ch in DASHES):
            left.append(path.as_posix())
print("remaining", len(left), left[:10])
