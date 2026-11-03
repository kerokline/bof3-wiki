# Breath of Fire III: game specifications

Independent research on the file formats, memory layouts and runtime of *Breath of Fire III* (US, PlayStation). Read it at <https://raulcorreia7.github.io/bof3-wiki/>.

This repository holds no game data and no game assets. *Breath of Fire* and the game belong to Capcom, and the PlayStation belongs to Sony. This project is not affiliated with or endorsed by either company. The text is under the MIT license in `LICENSE`.

The site is built with [Astro Starlight](https://starlight.astro.build/). Pages are Markdown in `src/content/docs/`; `nav.json` sets the sidebar order.

## Build

You need Node.js 22.23.4 or later.

```sh
npm ci
npm run dev       # live preview at http://localhost:4321/bof3-wiki/
npm run build     # builds dist/, validates links, writes the search index, llms.txt and the sitemap
npm run check     # page template, titles, orphan pages
npm run check:diagrams  # diagram readability (needs a build and Chrome)
```

[CONTRIBUTING.md](CONTRIBUTING.md) has the page template and the full list of checks.
