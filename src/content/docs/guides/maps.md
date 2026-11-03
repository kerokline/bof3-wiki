---
title: "Edit maps and scripts"
description: "An area is one archive, BIN/WORLDn/AREAnnn.EMI, and 200 of them exist."
---

An area is one archive, `BIN/WORLDn/AREAnnn.EMI`, and 200 of them exist. Loading an area copies a fixed set of blocks to fixed RAM addresses: the map, a cell grid, the actor scripts, the scene table, the encounters, the text and one program. This guide shows where each block sits and what you can change in it. The formats are in [area formats](../../formats/area/), and the loading flow is in [areas and the field](../../systems/areas/).

## Where the data is

Every area archive uses the same load addresses, so the address names the block. The entry sizes are in the [area working set](../../formats/area/).

| Block                  | Load address | What you change there                                                                     |
| ---------------------- | ------------ | ----------------------------------------------------------------------------------------- |
| Message bank           | `0x80010000` | dialogue ([text](../text/))                                                               |
| Cell grid              | `0x80032000` | 4-bit cell values ([cell grid](../../formats/area/#0x80032000-packed-4-bit-cell-grid))    |
| Script bank            | `0x800D3800` | actor bytecode ([script bank](../../formats/area/#0x800d3800-area-script-bank))           |
| Scene table            | `0x800E3800` | the actors of the area ([scene table](../../formats/area/#0x800e3800-scenestep-table))    |
| Encounters and enemies | `0x800E4000` | enemies and battles ([characters and enemies](../characters/))                            |
| Map bundle             | `0x80104000` | terrain, tiles and object lists ([map bundle](../../formats/area/#0x80104000-map-bundle)) |
| Area program           | `0x801F2C00` | the code that places the area's objects and runs its scripts                              |

The textures, the palettes and the sound bank of the area are further entries of the same archive ([graphics and textures](../graphics/), [sound and music](../sound/)).

## What to change

- **The map.** The map bundle opens with a header of width, height and section offsets, followed by the per-cell tables, the tile descriptors and four record lists ([layout](../../formats/area/#0x80104000-map-bundle)). Each cell holds four signed corner heights. Every offset in the header counts 4-byte units from the start of the bundle, so a section that changes size shifts every later offset.
- **Heights through a mesh.** A bundle converts to a terrain mesh (OBJ or glTF) and back ([terrain mesh](../../formats/area/#terrain-mesh)). The height of a corner is its `y` divided by 16, and each corner stays at its cell. The mesh carries no tiles, objects or height table, so the stored bundle supplies them.
- **Tiles.** A 4-byte descriptor gives the tile of a cell: a bank, a palette index and a mode ([tile descriptor](../../formats/area/#tile-descriptor)).
- **The cell grid.** It holds one 4-bit value per cell, two cells per byte, with the nibble chosen by the parity of the cell index. Edit it as raw bytes. Its values run from 0 to 13, and 0 means a free cell. What the other values do is `[unknown]`.
- **The scene table.** It starts with a `u32` count and holds one 8-byte record per actor: an id to match and setup bytes that include the script section the actor runs. The game matches the actor id to find the record.
- **Scripts.** The script bank is a directory of sections, and each section is a table of record offsets followed by byte-coded records. The structure is known, but the opcodes are not decoded, so edit a record as raw bytes. If a record changes length, rebuild the offset table of the section and the directory of the bank.
- **Encounters.** Edit the 1,160-byte block as the [characters guide](../characters/) describes.

## Limits and pitfalls

Each block must fit its window. The table gives the largest entry of each block over all 200 areas.

| Block        | Window (bytes) | Largest entry (bytes) | Headroom | Where        |
| ------------ | -------------: | --------------------: | -------: | ------------ |
| Script bank  |         65,536 |                65,236 |      300 | `AREA197#4`  |
| Area program |         16,384 |                16,324 |       60 | `AREA135#14` |
| Scene table  |          2,048 |                   412 |    1,636 | `AREA089#9`  |
| Message bank |         40,960 |                21,547 |   19,413 | `AREA153#11` |

- **Script growth.** The largest script bank leaves 300 bytes of headroom, so a longer script there must come from a shorter one in the same bank.
- **The area program** is code. Changing it needs a code change that keeps the entry within 16,384 bytes.
- **Auxiliary modules.** Nine archives carry an extra entry at `0x80117000`, and most of what reads it is `[unknown]` ([window](../../formats/area/#0x80117000-auxiliary-module-window)).
- **Unused header fields.** The header words at `0x16`, `0x18`, `0x26`, `0x2C` and `0x2E` are zero in all 200 bundles and have no reader. The meaning of `scroll` at `0x1E` is `[unknown]`. Leave them as they are.
- **No write path for scripts.** Without the opcode meanings, a script edit is a byte edit.

## Check in the game

Enter the area. A map edit shows in the terrain and the tiles, an encounter edit in the next battle, and a scene table or script edit in what the actors do. Change one section at a time to see which edit caused a change.

## Related

- [Area formats](../../formats/area/): the layout of every block.
- [Areas and the field](../../systems/areas/): how the game loads an area and runs its scripts.
- [Memory map](../../concepts/memory/): the windows that bound each block.
- [Edit characters and enemies](../characters/): the encounter block.
- [Edit text and dialogue](../text/): the message bank.
- [Edit the game](../): the editing cycle and the limits that apply to every edit.
