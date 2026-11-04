# Contributing

All contributions follow the [code of conduct](CODE_OF_CONDUCT.md). Contributions are under the
repository's [MIT license](LICENSE).

The wiki states facts about *Breath of Fire III* (US, PlayStation): file formats, memory layouts and
runtime behaviour. A change needs evidence: a game address, bytes, or a cited source from the
[sources page](src/content/docs/appendix/sources.md). Do not add game data, disc images, extracted
assets or game text. To check a claim yourself, dump your own US disc (Redump-verified CUE sheet and
BIN tracks).

The wiki holds game and format facts only. Pages contain no tool output, progress reports or project
history. The one code form is the `c` struct block, and the one repository path is its `Source:` link,
both described under [Record layouts](#record-layouts).

## Repository layout

| Path                       | Holds                                                                       |
| -------------------------- | --------------------------------------------------------------------------- |
| `src/content/docs/`        | The pages, one Markdown file each, in a folder per part of the wiki.        |
| `nav.json`                 | Every page in sidebar order, grouped by part. A page not listed here fails. |
| `redirects.json`           | Old URL to current page. Add an entry when a page moves or is renamed.      |
| `src/styles/wiki.css`      | Typography and table styling.                                               |
| `public/wiki.js`           | Sticky table headers, monospace data columns and copy links on headings.    |
| `astro.config.mjs`         | Site, search, link validation, diagrams and `llms.txt` settings.            |
| `tools/check_pages.py`     | The page template check.                                                    |
| `tools/check_diagrams.mjs` | The diagram readability check.                                              |

## Record layouts

- Every layout table has a `Type` column. Use `u8`, `s8`, `u16`, `s16`, `u32`, `s32`, `T[N]`, `T*`,
  `s32 (16.16)` or a record name. Tag a type that no reader proves with `[inferred]`.
- A record that has a struct in the [decompilation](https://github.com/raulcorreia7/bof3-decomp) has a
  `c` block after its table. The block uses the header's struct and member names, gives each member an
  offset comment such as `/* 0x98 */`, writes gaps as `u8 unk_XX[N];` and stays within 30 lines. One line
  under the block links to the header, for example
  ``Source: [`include/battle/records.h`](https://github.com/raulcorreia7/bof3-decomp/blob/main/include/battle/records.h)``.
- The header is the source for names and members. When a page and a header differ on an offset, a width or
  a name, check the reader's code: if the page is wrong, fix the page; if the header is wrong, report the
  difference to the decompilation.
- `tools/check_pages.py` enforces the `Type` column.

## Page template

Every page has the same shape. [`tools/check_pages.py`](tools/check_pages.py) enforces the parts
that a script can check.

```markdown
---
title: "Page title"
description: "One sentence that states the fact the page establishes."
---

Summary paragraph. The first sentence is the fact that the page establishes.

## Facts, in sections named for the topic

Prose first, then tables.

| Offset | Size | Type  | Name      | Meaning                 |
| -----: | ---: | ----- | --------- | ----------------------- |
| `0x00` |    2 | `u16` | `item_id` | the item this row gives |

## Open questions

Optional. One bullet per `[unknown]` claim, with what would settle it.

## Sources and confidence

- **Confidence:** high. Every layout was read in the code and checked on every instance.
- **Evidence:** the functions and archives that show the facts.

## Related

- [Page title](../../formats/emi/): why the reader goes there next.
```

| Part                   | Rule                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Front matter           | `title` in sentence case, unique across the wiki. `description` is one plain sentence of at most 240 characters.                  |
| Title                  | The front matter title is the page's H1. The body has no H1, and the sidebar shows the title.                                     |
| Summary                | One paragraph of two to four sentences, directly under the front matter. It states the fact, the scope and the page's limits.     |
| Facts                  | H2 sections with unique headings, and no skipped levels. Lead with the fact. Put the table after the sentence that introduces it. |
| Layout tables          | Columns in this order: `Offset`, `Size`, `Type`, `Name`, `Meaning`, then `Evidence`. Leave out a column that adds nothing.        |
| Open questions         | Optional. The question list lives here; [open questions](src/content/docs/appendix/open-questions.md) indexes it.                 |
| Sources and confidence | Required on concepts, systems, formats and data pages. `Confidence` is `high`, `medium` or `low`, then one clause of reason.      |
| Related                | Required last section on every page except the introduction and the appendix. Each link says why.                                 |

Guides follow the same shape without `Sources and confidence`. Their sections are `Where the data is`,
`What to change`, `Limits and pitfalls`, `Check in the game` and `Related`. A guide links to the
page that owns each fact and does not restate it.

### Links

Link a page by its URL, relative to the page, with a trailing slash: `../../formats/emi/#header`
from `systems/boot.md`. A link to a file name (`emi.md`) is an error. A heading link uses the
heading's slug: lower case, spaces as hyphens, punctuation removed.

### Confidence

| Level    | Meaning                                                                                  |
| -------- | ---------------------------------------------------------------------------------------- |
| `high`   | Every field and rule was read in the game's code or data and checked on every instance.  |
| `medium` | The structure and the main fields are established. Some fields or instances are not.     |
| `low`    | Most of the page is `[inferred]` or from a community source that the game does not show. |

Inside a page, an untagged claim is read directly from the game. `[inferred]` marks a deduced lead
and `[unknown]` marks a claim that is not established. The
[notation page](src/content/docs/concepts/notation.md#evidence-tags) defines both tags.

### Callouts

Use at most one or two callouts per page.

```markdown
:::note
Context that changes how the reader reads the facts.
:::

:::caution
A mistake that corrupts data, a save or a build of the game.
:::
```

### Diagrams

Use a Mermaid diagram only for flow or structure that prose shows badly. Give nodes short labels. Do
not set colours in the diagram: the theme colours it for light and dark.

In a sequence diagram, break a long participant name or message with `<br/>` at about 20
characters. Do not rely on automatic wrapping: it splits words with hyphens. Show a repeated
self-call as one message, not as a `loop` frame around it. In a flowchart with subgraphs, use `LR`
when edges would cross a subgraph title.

After a diagram change, run `npm run build && npm run check:diagrams`. It renders every diagram at
1440 and 390 pixels in both themes and fails on overlapping text, a label larger than its shape,
a line across a label, clipped text, text under 12 px and contrast under 4.5:1. Set `CHROMIUM` to
a Chrome or Chromium binary when Google Chrome is not installed.

## Where a fact lives

Each fact has one page. Other pages link to it and do not copy it.

| Fact                                              | Page that owns it                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| Number, type, offset and citation notation        | [Notation and conventions](src/content/docs/concepts/notation.md)             |
| Meaning of a term                                 | [Glossary](src/content/docs/appendix/glossary.md)                             |
| The release and disc image that pages describe    | [Game version](src/content/docs/appendix/version.md)                          |
| Byte layout of a kind of file                     | The page in `formats/` for that file                                          |
| Row layout, count and stride of a table in RAM    | The page in `data/` for that table                                            |
| What the game does at run time, and in what order | The page in `systems/` or `concepts/` for that part                           |
| A step to change something                        | The page in `guides/`, linking to the owner of each fact                      |
| An unanswered question                            | The `Open questions` section of the page that owns the topic                  |
| Where a claim comes from                          | [Sources](src/content/docs/appendix/sources.md) and the page's own `Evidence` |

## Add or change a fact

1. Find the owning page in the table above. Search for the value first:
   `grep -rn "0x80195800" src/content/docs`.
2. Change the fact on that page only. Replace every other copy with a link to the owner.
3. Update the page's `Sources and confidence`: add the evidence and adjust the confidence level.
4. If the change answers an open question, delete it from the page's `Open questions` section and
   from [open questions](src/content/docs/appendix/open-questions.md). If it adds one, add it to both.
5. If it changes how many bytes of the disc are understood, update the
   [coverage](src/content/docs/appendix/coverage.md) tables.
6. If the page needs a new term, add it to the glossary once and link it from the page.
7. Run the checks below.

To add a page, create it from the template, list its slug in `nav.json` in the right part, and link
it from a related page. To rename or move a page, add the old URL to `redirects.json` so that the
old URL keeps working. When you rename a heading, search for links to its old slug.

## Writing rules

- Lead with the fact. Use short sentences with one idea each.
- Use one term per concept and the form that the glossary uses.
- Write hexadecimal with a `0x` prefix and upper-case digits. Write sizes, counts and strides in
  decimal. [Notation and conventions](src/content/docs/concepts/notation.md) has the full rules.
- Name a function as `Name (image@0xADDR)`. A name is a label from this research and not a name that
  the game stores.
- Remove filler, restatement and transitions. Keep a sentence only if a reader would miss it.
- State what is known. Mark the rest `[inferred]` or `[unknown]`.

## Build and check

You need Node.js 22.23.4 or later, [dprint](https://dprint.dev/) and Python 3.11 or later. The
dependencies are pinned in `package-lock.json`. CI runs the same commands.

```sh
npm ci
dprint check                    # Markdown format; dprint fmt fixes it
python3 tools/check_pages.py    # page template, titles, orphan pages
npm run build                   # builds dist/ and validates internal links and anchors
npm run check:diagrams          # diagram readability, after npm run build
npm run dev                     # live preview at http://localhost:4321/bof3-wiki/
```

The build also writes the search index, `llms.txt`, `llms-full.txt`, the sitemap and a redirect
page for every URL in `redirects.json`. CI then checks internal links and anchors offline with
[lychee](https://github.com/lycheeverse/lychee) 0.24.2. To run it, download that release, then:

```sh
mkdir -p /tmp/site && ln -sfn "$PWD/dist" /tmp/site/bof3-wiki
lychee --offline --include-fragments --index-files index.html \
  --root-dir /tmp/site --exclude-path 404.html /tmp/site/bof3-wiki
```

Check the result in a browser at phone width and at desktop width, in the light and the dark theme.

To update a dependency, run `npm install --save-exact <package>@<version>`, rebuild, and read the
changelog of Astro or Starlight for breaking changes.

## Submit a change

Create a branch and keep each change focused. Use commit subjects such as
`docs(formats): correct the EMI header size`. Describe the evidence in the pull request.
