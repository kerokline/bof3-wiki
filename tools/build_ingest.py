#!/usr/bin/env python3
"""Write llms.txt, llms-full.txt, sitemap.xml and robots.txt into the built book.

Run after `mdbook build`, from the repository root: python3 tools/build_ingest.py
Pages and their order come from src/SUMMARY.md. Standard library only.
"""

import re
import sys
import tomllib
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://raulcorreia7.github.io/bof3-wiki/"

LINK = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
ITEM = re.compile(r"^\s*[-*]\s+\[([^\]]+)\]\(([^)]+\.md)\)")
PART = re.compile(r"^#\s+(.+)")
H1 = re.compile(r"^#\s+(.+?)\s*$")


def read_summary(src):
    """Return [(part, title, path)] in SUMMARY.md order. Pages before any part have part None."""
    part, pages = None, []
    for line in (src / "SUMMARY.md").read_text(encoding="utf-8").splitlines():
        if (m := PART.match(line)) and line != "# Summary":
            part = m.group(1)
        elif m := re.match(r"^\[([^\]]+)\]\(([^)]+\.md)\)", line):
            pages.append((None, m.group(1), m.group(2)))
        elif m := ITEM.match(line):
            pages.append((part, m.group(1), m.group(2)))
    return pages


def page_url(path):
    return SITE if path == "index.md" else SITE + path[: -len(".md")] + ".html"


def strip_h1(text):
    lines = text.splitlines()
    for i, line in enumerate(lines):
        if H1.match(line):
            return "\n".join(lines[i + 1 :]).strip("\n")
    return text.strip("\n")


def first_sentence(body):
    """First sentence of the first plain paragraph, with links reduced to their text."""
    para, fence = [], False
    for line in body.splitlines():
        if line.startswith("```"):
            fence = not fence
        elif fence or line.startswith(("#", ">", "|", "-", "*", "<", "!")):
            if para:
                break
        elif line.strip():
            para.append(line.strip())
        elif para:
            break
    text = LINK.sub(r"\1", " ".join(para))
    return re.split(r"(?<=[.!?])\s+(?=[A-Z*`\[(])", text, maxsplit=1)[0]


def main():
    cfg = tomllib.loads((ROOT / "book.toml").read_text(encoding="utf-8"))
    out = ROOT / cfg["build"]["build-dir"]
    if not out.is_dir():
        sys.exit(f"{out} is missing: run `mdbook build .` first")
    src = ROOT / cfg["book"]["src"]
    title, summary = cfg["book"]["title"], cfg["book"]["description"]

    index, full, urls, part = [f"# {title}\n", f"> {summary}"], [], [], "\0"
    for page_part, page_title, path in read_summary(src):
        text = (src / path).read_text(encoding="utf-8")
        body = strip_h1(text)
        url = page_url(path)
        if page_part != part:
            part = page_part
            index.append(f"\n## {part or 'Start'}\n")
        index.append(f"- [{page_title}]({url}): {first_sentence(body)}")
        full.append(f"# {page_title}\n\n{url}\n\n{body}\n")
        urls.append(url)

    (out / "llms.txt").write_text("\n".join(index) + "\n", encoding="utf-8")
    (out / "llms-full.txt").write_text(f"# {title}\n\n> {summary}\n\n" + "\n".join(full), encoding="utf-8")
    entries = "".join(f"  <url><loc>{escape(u)}</loc></url>\n" for u in urls)
    (out / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries + "</urlset>\n",
        encoding="utf-8",
    )
    (out / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n", encoding="utf-8")


if __name__ == "__main__":
    main()
