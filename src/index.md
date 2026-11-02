# Breath of Fire III: game specifications

This site documents how *Breath of Fire III* (US, PlayStation, `SLUS-00422`) stores and runs its data:
file formats, memory layouts, record tables, text encoding and the code that reads them. It is written
for modders and fans who know some PlayStation basics but not this game. Every page states layouts,
offsets, values, limits and what is still unknown.

The site holds no game data and no game assets. *Breath of Fire* and the game belong to Capcom, and the
PlayStation belongs to Sony; they keep their rights. This site is independent and is not affiliated
with or endorsed by either company.

## What the game is made of

The game has three parts.

1. **One resident program.** `SLUS_004.22` loads at boot and stays in RAM until power-off. It holds
   the main loop, the loader, the graphics and sound drivers and the shared helpers. See
   [runtime](data/programs.md).
2. **Overlays.** Everything else is code that the loader streams from `.EMI` archives on the disc
   into fixed RAM windows. Each window holds one overlay at a time, such as the battle program, a
   scenario controller or the program of one map. See [loading](systems/loading.md) and
   [memory](systems/memory.md).
3. **Data tables.** Items, abilities, enemies, text, maps and sound are payloads inside the archives.
   The game reads them through fixed tables and offsets. See [game records](data/records.md) and
   [game text](data/text.md).

An EMI archive is a sector-aligned list of typed entries ([EMI container](formats/emi.md)). Each
entry names the RAM address it loads at, so one archive can carry code, data, textures and audio.

## How the site is organised

The pages go from overview to detail.

- **Getting started** has the [overview](overview.md) of how the game is built and the
  [notation](conventions.md) that every page uses.
- **How the game works** follows one run from power-on to the credits: boot, the frame loop, phases,
  areas, battle, screens, rendering, audio, saving and persistent state.
- **File formats** gives the byte layout of each kind of file on the disc.
- **Game data** gives the layout of the tables and rows the game uses at run time.
- **Guides** has one how-to page per editing task, with the limits to keep and a check in the game.
- **Appendix** has the glossary, the open questions, the documentation coverage and the sources.

## How to read a page

A fact about the code cites the function as `Name (image@0xADDR)`: the name, the program that holds
it and its address. A claim with no tag was read in the code or data. A claim tagged `[inferred]` is a
lead, and one tagged `[unknown]` is not established. The [conventions](conventions.md) define the citation
format, the two tags and the number notation, and the [glossary](appendix/glossary.md) defines every term, and [open questions](appendix/open-questions.md) collects the
gaps.

## Start with your goal

| You want to                             | Read                                                                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read a number, offset or citation       | [Notation and conventions](conventions.md)                                                                                                           |
| Understand how the game runs            | [Architecture overview](overview.md), then [boot](systems/boot.md) and [frame loop](systems/frame-loop.md)                                           |
| Read a file format                      | [EMI container](formats/emi.md), then [graphics](formats/graphics.md), [audio](formats/audio.md), [areas](formats/area.md)                           |
| Edit items, skills, enemies or shops    | [Items, skills and shops](guides/items.md), [characters and enemies](guides/characters.md), [game records](data/records.md)                          |
| Edit text or dialogue                   | [Text and dialogue](guides/text.md), [game text](data/text.md)                                                                                       |
| Edit music, sound effects or voices     | [Sound and music](guides/sound.md), [audio formats](formats/audio.md), [STR and XA](formats/str.md), [audio runtime](systems/audio.md)               |
| Edit maps and scenes                    | [Maps and scripts](guides/maps.md), [area formats](formats/area.md), [areas and the field](systems/areas.md), [scenario engine](systems/scenario.md) |
| Edit textures and sprites               | [Graphics and textures](guides/graphics.md), [character bank](formats/character.md)                                                                  |
| Edit or inspect a save                  | [Editing saves](guides/saves.md), [memory card save](formats/save.md)                                                                                |
| Look up the battle or field data in RAM | [Battle records](data/battle.md), [field and party records](data/field.md)                                                                           |
| Find a term                             | [Glossary](appendix/glossary.md)                                                                                                                     |
| See where a fact comes from             | [Sources](appendix/sources.md)                                                                                                                       |
