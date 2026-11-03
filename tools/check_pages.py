#!/usr/bin/env python3
"""Check that every page follows the page template in CONTRIBUTING.md.

Run from the repository root: python3 tools/check_pages.py
Standard library only. Exit status 1 when any rule fails.

Pages live in src/content/docs/ and the sidebar order lives in nav.json.

Rules:
  - every page is listed in nav.json, and every listed page exists;
  - every page has a front matter title and a one-sentence description; titles are unique;
  - the body has no H1 (the title is the H1), starts with a summary paragraph and skips no
    heading level;
  - headings are unique within a page;
  - concepts, systems, formats and data pages end with "Sources and confidence" and "Related",
    and "Sources and confidence" has a Confidence and an Evidence bullet;
  - guide pages end with "Related";
  - code fences are `mermaid` or `text`; callouts are `:::note` or `:::caution`; page links use
    URLs ("../formats/emi/"), not file names; no repository or tool names appear;
  - hexadecimal digits are upper case; layout tables keep the standard column order.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "src" / "content" / "docs"

REFERENCE_DIRS = {"concepts", "systems", "formats", "data"}
GUIDE_DIRS = {"guides"}
FENCE_LANGS = {"mermaid", "text"}
CALLOUTS = {"note", "caution"}
CONFIDENCE = ("high", "medium", "low")
DESCRIPTION_MAX = 240
LAYOUT_ORDER = ["Offset", "Address", "Bits", "Size", "Type", "Name", "Meaning", "Evidence"]
BANNED = re.compile(r"rebof3|bof3-tools|bof3player|\bmeson\b|\.py\b|\.rs\b|\bsrc/|\btools/", re.I)
HEX_LOWER = re.compile(r"0[xX](?=[0-9A-Fa-f]*[a-f])[0-9A-Fa-f]+\b|0X[0-9A-F]+\b")
LINK_TARGET = re.compile(r"\]\(([^)]*)\)")
HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*$")


def read_nav():
    """Return the page slugs of nav.json in order, with the introduction first."""
    groups = json.loads((ROOT / "nav.json").read_text(encoding="utf-8"))
    return ["index"] + [slug for group in groups for slug in group["items"]]


def page_file(slug):
    for name in (f"{slug}.md", f"{slug}.mdx", f"{slug}/index.md", f"{slug}/index.mdx"):
        if (DOCS / name).is_file():
            return DOCS / name
    return None


def read_front_matter(lines):
    """Return ({key: value}, index of the first body line)."""
    if not lines or lines[0] != "---":
        return {}, 0
    meta = {}
    for n, line in enumerate(lines[1:], 1):
        if line == "---":
            return meta, n + 1
        key, _, value = line.partition(":")
        value = value.strip()
        meta[key.strip()] = json.loads(value) if value.startswith('"') else value
    return meta, 0


def split_table_row(line):
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def check_page(path, slug, titles, errors):
    rel = path.relative_to(DOCS).as_posix()
    kind = slug.split("/")[0]
    lines = path.read_text(encoding="utf-8").splitlines()
    meta, body_start = read_front_matter(lines)

    def err(n, message):
        errors.append(f"{rel}:{n}: {message}")

    title, description = meta.get("title", ""), meta.get("description", "")
    if not title:
        err(1, "front matter needs a title")
    elif title in titles:
        err(1, f"duplicate title '{title}' (also {titles[title]})")
    titles.setdefault(title, rel)
    if not description:
        err(1, "front matter needs a description (one sentence)")
    elif len(description) > DESCRIPTION_MAX:
        err(1, f"description is longer than {DESCRIPTION_MAX} characters")

    headings, fence, last_level = [], None, 1
    for n, line in enumerate(lines, 1):
        if n <= body_start:
            continue
        if line.startswith("```"):
            if fence is None:
                fence = line[3:].strip()
                if fence not in FENCE_LANGS:
                    err(n, f"code fence language '{fence}' (allowed: {', '.join(sorted(FENCE_LANGS))})")
            else:
                fence = None
            continue
        if fence is not None:
            continue
        if line.startswith(":::") and len(line) > 3 and line[3:].split("[")[0].strip() not in CALLOUTS:
            err(n, f"callout '{line}' (allowed: {', '.join(':::' + c for c in sorted(CALLOUTS))})")
        if line.startswith("> [!"):
            err(n, "use ':::note' or ':::caution' for callouts")
        if m := HEADING.match(line):
            level = len(m.group(1))
            headings.append((n, level, m.group(2)))
            if level == 1:
                err(n, "no H1 in the body: the front matter title is the H1")
            elif level > last_level + 1:
                err(n, f"heading level jumps from {last_level} to {level}")
            last_level = level
        for target in LINK_TARGET.findall(line):
            if target.split("#")[0].endswith((".md", ".mdx")):
                err(n, f"link '{target}': link to a page by its URL, for example ../formats/emi/")
        prose = LINK_TARGET.sub("]", line)
        if HEX_LOWER.search(prose):
            err(n, "hexadecimal digits must be upper case with a lower-case 0x prefix")
        if BANNED.search(prose):
            err(n, "repository or tool name; state game and format facts only")

    if slug != "index":
        # The summary paragraph is the first body line that is not an import or blank.
        first = next((l for l in lines[body_start:] if l.strip()), "")
        if not first or first.startswith(("#", "|", "-", "*", ">", "`", "!", "<", ":", "1.", "import ")):
            err(body_start + 1, "the page must start with a summary paragraph")

    seen = {}
    for n, _, text in headings:
        if text in seen:
            err(n, f"duplicate heading '{text}' (first at line {seen[text]})")
        seen.setdefault(text, n)

    h2 = [(n, t) for n, level, t in headings if level == 2]
    names = [t for _, t in h2]
    if kind in REFERENCE_DIRS:
        if names[-2:] != ["Sources and confidence", "Related"]:
            err(1, "the last two sections must be 'Sources and confidence' and 'Related'")
        else:
            start = h2[-2][0]
            body = "\n".join(lines[start : h2[-1][0] - 1])
            for label in ("Confidence", "Evidence"):
                if not re.search(rf"^- \*\*{label}:\*\* ", body, re.M):
                    err(start, f"'Sources and confidence' needs a '- **{label}:**' bullet")
            m = re.search(r"^- \*\*Confidence:\*\* (\w+)", body, re.M)
            if m and m.group(1) not in CONFIDENCE:
                err(start, f"Confidence must start with one of {', '.join(CONFIDENCE)}")
    elif kind in GUIDE_DIRS:
        if not names or names[-1] != "Related":
            err(1, "the last section must be 'Related'")

    check_tables(lines, err)


def check_tables(lines, err):
    fence = False
    for n, line in enumerate(lines, 1):
        if line.startswith("```"):
            fence = not fence
        if fence or not line.startswith("|") or n < 2 or lines[n - 2].startswith("|"):
            continue
        # `line` is the header row of a table.
        headers = split_table_row(line)
        if headers[0] not in ("Offset", "Address") or not {"Field", "Name", "Meaning"} & set(headers):
            continue
        if "Field" in headers:
            err(n, "layout table: name the field column 'Name'")
            continue
        if any(h not in LAYOUT_ORDER for h in headers):
            continue
        index = [LAYOUT_ORDER.index(h) for h in headers]
        if index != sorted(index):
            err(n, "layout table: columns go Offset, Size, Type, Name, Meaning, Evidence")


def main():
    errors, titles, listed = [], {}, set()
    slugs = read_nav()
    for slug in slugs:
        if slug in listed:
            errors.append(f"nav.json: '{slug}' is listed twice")
        listed.add(slug)
    for slug in slugs:
        path = page_file(slug)
        if path is None:
            errors.append(f"nav.json: page '{slug}' does not exist")
        else:
            check_page(path, slug, titles, errors)
    known = {page_file(s) for s in slugs}
    for page in sorted(DOCS.rglob("*.md*")):
        if page not in known:
            errors.append(f"{page.relative_to(DOCS).as_posix()}: page is not listed in nav.json")
    if errors:
        print("\n".join(errors))
        sys.exit(f"{len(errors)} page check failure(s)")
    print(f"{len(slugs)} pages follow the template")


if __name__ == "__main__":
    main()
