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

## Writing

Docs, comments, commit messages and pull requests follow one standard.

- **What, not how.** Say what a thing does and why. The code shows how.
- **ASD-STE100** is the basis for technical text: short sentences, one instruction per sentence,
  active voice, one term for one concept, numbered steps for a procedure. Exact technical terms
  stay.
- **Orwell's six rules** ("Politics and the English Language", 1946):
  1. Never use a metaphor, simile or other figure of speech that you are used to seeing in print.
  2. Never use a long word where a short one will do.
  3. If it is possible to cut a word out, always cut it out.
  4. Never use the passive where you can use the active.
  5. Never use a foreign phrase, a scientific word or a jargon word if you can think of an everyday
     English equivalent.
  6. Break any of these rules sooner than say anything outright barbarous.
