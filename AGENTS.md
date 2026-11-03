# Agent guidance

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you change a page. It defines the page template,
the confidence levels, the callouts and the rule that each fact lives on one page.

- The wiki states game and format facts only. No tool output, progress or project history. The
  one code form is the `c` struct block, with its `Source:` link to the decompilation header
  (`CONTRIBUTING.md`, "Record layouts").
- Pages are Markdown in `src/content/docs/`. `nav.json` lists every page and sets the sidebar order.
  `redirects.json` maps old URLs to pages. Edit those files by hand; nothing generates them.
- Link a page by URL (`../formats/emi/#header`), not by file name.
- Run `dprint check`, `python3 tools/check_pages.py` and `npm run build` before you push. The build
  validates internal links and anchors.
- Keep game data, disc images and extracted assets out of the repository.
