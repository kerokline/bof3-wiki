# Agent guidance

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you change a page. It defines the page template,
the confidence levels, the callouts and the rule that each fact lives on one page.

- The wiki states game and format facts only. No tool output, progress or project history. The
  one code form is the `c` struct block, with its `Source:` link to the decompilation header
  (`CONTRIBUTING.md`, "Record layouts").
- Pages are Markdown in `src/content/docs/`. `nav.json` lists every page and sets the sidebar order.
  `redirects.json` maps old URLs to pages. Edit those files by hand; nothing generates them.
- Link a page by URL (`../formats/emi/#header`), not by file name.
- Before you push, run the checks in [CONTRIBUTING.md](CONTRIBUTING.md#build-and-check): `dprint check`,
  `npm run check` and `npm run build`, plus `npm run check:diagrams` after a diagram change.
- Keep game data, disc images and extracted assets out of the repository.
