# Breath of Fire III: game specifications

Independent research on how *Breath of Fire III* (US, PlayStation, `SLUS-00422`) stores and runs its data: file formats, memory layouts, record tables, text encoding and the code that reads them. Every page states layouts, offsets, values, limits and what is still unknown.

This site holds no game data and no game assets. It is independent research on the game's file formats and behaviour. *Breath of Fire* and the game belong to Capcom, and the PlayStation belongs to Sony; they keep their rights. This site is not affiliated with or endorsed by either company.

## How to read it

Facts cite the retail code as `Name (image@0xADDR)`: a function name, the program that holds it, and its address. Tags such as `[read]`, `measured` and `unknown` say how well a fact is established. Both are explained in the [glossary](glossary.md). Where something is not known, the page says so, and [open questions](game/architecture/gaps.md) collects every gap.

## Start with your goal

| You want to                             | Read                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Understand how the game runs            | [Architecture overview](game/architecture/index.md), then [boot](game/architecture/boot.md) and [frame loop](game/architecture/frame-loop.md) |
| Read a file format                      | [EMI container](formats/emi.md), then [graphics](formats/graphics.md), [audio](formats/audio.md), [areas](formats/area.md)                    |
| Edit items, skills, enemies or shops    | [Game records](game/records.md), [editor guide](game/architecture/editor-guide.md)                                                            |
| Edit text or dialogue                   | [Game text](game/text.md), [asset kinds](formats/assets.md#message-banks)                                                                     |
| Edit music, sound effects or voices     | [Audio formats](formats/audio.md), [STR and XA](formats/str.md), [audio runtime](game/architecture/audio.md)                                  |
| Edit maps and scenes                    | [Area formats](formats/area.md), [areas and the field](game/architecture/area.md), [scenario engine](game/architecture/scenario.md)           |
| Edit characters and sprites             | [Character bank](formats/character.md), [graphics](formats/graphics.md)                                                                       |
| Edit or inspect a save                  | [Memory card save](formats/save.md), [saving](game/architecture/saving.md)                                                                    |
| Look up the battle or field data in RAM | [Battle](game/battle.md), [field and party](game/field.md)                                                                                    |
| Find a term                             | [Glossary](glossary.md)                                                                                                                       |
| See where a fact comes from             | [Sources](sources.md)                                                                                                                         |

## How the pages are organised

- **Game** pages describe what the game does: records, text, battle, field and the runtime.
- **Architecture** pages follow one run from power-on to the end credits: boot, loading, phases, rendering, audio and saving.
- **Formats** pages give the byte layout of each file kind on the disc.
- Page style: a format page names the file, where it sits on the disc, its layout, its values and limits, and what is unknown.
