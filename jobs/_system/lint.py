#!/usr/bin/env python3
"""Mechanical checks for /self-prompt.

Usage: python3 lint.py RUBRIC [RUBRIC ...] OUTPUT_FILE
Pass core-rules.md first, then the job rubric. Number limits from later
files win; banned and must_include lists are merged.
Code blocks and inline code are skipped for dash and banned word checks.
Code files (.py, .js, .html, .css, .json) get word limits only.
Exit 0 = PASS, 1 = FAIL, 2 = bad input.
"""
import re
import sys
from pathlib import Path

DASHES = {"—": "em dash", "–": "en dash", "-": "hyphen"}
LIST_KEYS = ("banned", "must_include")
PLACEHOLDER = re.compile(r"\[\[[^\]]+\]\]")
CODE_EXT = {".py", ".js", ".ts", ".html", ".css", ".json", ".sh"}


def split_list(value):
    return [item.strip() for item in value.split(",") if item.strip()]


def load_rules(path):
    text = Path(path).read_text(encoding="utf-8")
    block = re.search(r"## Hard checks.*?```(.*?)```", text, re.S)
    if not block:
        print(f"LINT ERROR: no Hard checks code block in {path}")
        sys.exit(2)
    rules = {}
    for line in block.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        value = value.strip()
        if value and not PLACEHOLDER.search(value):
            rules[key.strip()] = value
    return rules


def merge(rule_sets):
    merged = {key: [] for key in LIST_KEYS}
    for rules in rule_sets:
        for key, value in rules.items():
            if key in LIST_KEYS:
                merged[key] += [t for t in split_list(value) if t not in merged[key]]
            else:
                merged[key] = value
    return merged


def prose_only(text):
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"~~~.*?~~~", " ", text, flags=re.S)
    return re.sub(r"`[^`\n]*`", " ", text)


def lint(rules, text, is_code):
    failures = []
    words = len(re.findall(r"\b\w+\b", text))
    if "max_words" in rules and words > int(rules["max_words"]):
        failures.append(f"max_words: {words} words, limit {rules['max_words']}")
    if "min_words" in rules and words < int(rules["min_words"]):
        failures.append(f"min_words: {words} words, minimum {rules['min_words']}")
    if is_code:
        return words, failures

    prose = prose_only(text)
    if str(rules.get("no_dashes", "")).lower() == "true":
        for char, name in DASHES.items():
            count = prose.count(char)
            if count:
                failures.append(f"no_dashes: {count} x {name}")
    for term in rules["banned"]:
        hits = re.findall(rf"\b{re.escape(term)}\b", prose, re.I)
        if hits:
            failures.append(f"banned: '{term}' found {len(hits)} time(s)")
    for term in rules["must_include"]:
        if not re.search(re.escape(term), text, re.I):
            failures.append(f"must_include: '{term}' missing")
    return words, failures


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    *rubrics, output = sys.argv[1:]
    rules = merge(load_rules(r) for r in rubrics)
    path = Path(output)
    words, failures = lint(rules, path.read_text(encoding="utf-8"), path.suffix in CODE_EXT)
    if failures:
        print(f"LINT: FAIL ({words} words)")
        for item in failures:
            print(f"* {item}")
        sys.exit(1)
    print(f"LINT: PASS ({words} words, {len(rubrics)} rule file(s))")


if __name__ == "__main__":
    main()
