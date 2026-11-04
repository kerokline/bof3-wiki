---
title: "Graphics formats"
description: "A texture on the disc is a headerless block of raw VRAM words (EMI type 3), and its palette is a separate block of color words (a type-0 entry)."
---

A texture on the disc is a headerless block of raw VRAM words (EMI type 3), and its palette is a separate block of color words (a type-0 entry). Nothing in either block says which palette goes with which texture: the drawing code holds that link, because it names a texture page and a palette row for each primitive. This page covers how both blocks are stored and loaded, how the VRAM words are encoded and which texture-to-palette joins are proven. The map-tile descriptor is in [area formats](../area/#tile-descriptor).

## Primitives

The game draws with the PsyQ primitive records: `SPRT` (free size), `SPRT_8` and `SPRT_16` sprites, textured quads `POLY_FT4` and `POLY_GT4`, and untextured `TILE` and `POLY_G`. The identifier counts in the game code read are `POLY_FT4` 152, `SPRT` 95, `POLY_GT4` 36, `SPRT_8` 13 and `SPRT_16` 5. The menu's panel icon is one `SPRT_8` written at the primitive cursor `g_GfxPrimCursor (exe/slus_004_22@0x8014598C)`.

## Type-3 load argument

The type-3 handler `EMI_LoaderLoadGraphics (exe/slus_004_22@0x80162698)` reads the load argument as masked fields ([EMI load argument](../emi/#load-argument)).

| Bits                    | Meaning                            | Unit                  |
| ----------------------- | ---------------------------------- | --------------------- |
| `24 to 31`, mask `0x3F` | first rectangle column             | 32 VRAM words         |
| `16 to 23`, mask `0x1F` | first rectangle row                | 32 VRAM rows          |
| `8 to 15`, mask `0x3F`  | rectangles per row                 | 32x32-word rectangles |
| `0 to 7`                | unused (`0` in 592 of 593 entries) |                       |

For example, the argument `0x1A080400` has column `0x1A` = 26 (VRAM x = 832), row `0x08` = 8 (VRAM y = 256) and `0x04` rectangles per row. A 65,536-byte payload holds 32 rectangles, so it fills 8 rectangle rows of 4 rectangles, 128 words wide and 256 rows tall, from (832, 256).

### Chunk layout

Each 2,048-byte chunk of the payload is one 32x32 rectangle of 16-bit VRAM words: 32 rows of 32 little-endian words. Rectangles fill a row from left to right up to `rectangles per row`. Then the destination moves 32 VRAM rows down. The payload order is the rectangle order.

All 593 payloads are a whole number of rectangles, and the count divides into whole rows (54,840 rectangles in all). A rectangle uploads only if its whole 32x32 extent is inside the 1,024 by 512 word frame buffer. The loader drops the rest instead of clipping: `EMI_LoaderUploadSector (exe/slus_004_22@0x80163378)` calls `LoadImage` while `x < 1001` and `y < 501`, which for these 32-aligned destinations means the rectangle fits. `ETC/FIRST.EMI#6` starts at row 15 and spans 8 rectangle rows, so rows 16 to 22 fall outside. All 14 rectangles dropped on the disc are zero.

A rectangle is 32 VRAM words wide in every mode, so its size in pixels depends on the color depth of the draw. No payload or descriptor field carries the depth.

| Mode  | Pixels per rectangle |
| ----- | -------------------- |
| 4bpp  | 128x32               |
| 8bpp  | 64x32                |
| 16bpp | 32x32                |

## Palettes

A palette is a run of color words. A word is a raw little-endian PSX color:

```text
15      14..10 9..5 4..0
STP     blue   green red
```

STP is the semi-transparency bit. A texel of `0x0000` is never drawn. With any other value, STP set marks the texel as semi-transparent when the primitive's blend mode is on. A desktop viewer expands each 5-bit channel to 8 bits.

A 4bpp texture uses a row of 16 colors and an 8bpp texture a row of 256. A CLUT bank is a whole number of 4bpp rows, so its payload is a multiple of 32 bytes. A bank whose word count is also a multiple of 256 is a whole number of 8bpp rows.

| Mode | Colors | Row size |
| ---- | -----: | -------: |
| 4bpp |     16 |       32 |
| 8bpp |    256 |      512 |

Nothing in a bank names its depth, geometry or owner. Palette banks are type-0 entries that load into `0x80033800` to `0x80036E00` and the engine uploads them to VRAM rows 480 to 511 ([palette arena](../area/#palette-arena)). The disc holds 620 such entries: 32 to 6,144 bytes each, 1,121,696 bytes in all, and every size is a multiple of 32. 577 carry 64 bytes or more, and 43 are a single 16-color row. The arena of one area is a single type-0 entry, and its load argument is `0x80033E00` in most areas.

## VRAM coordinates

A palette-arena word `w` sits at VRAM column `w % 256` and row `480 + w / 256`. A 16-color CLUT at arena offset `o` sits at VRAM `x = (o mod 0x200) / 2` and `y = 480 + o / 0x200`.

A CLUT word packs the position of a palette row in VRAM. A texture-page word (`tpage`) packs a page, a depth and a blend mode.

- CLUT word: `(x / 16) | (y << 6)`.
- `tpage` page column: `(w & 0xF) * 64` words. Page row: 256 if `w & 0x10`, else 0.
- `tpage` color mode: `(w >> 7) & 3` (0 is 4bpp, 1 is 8bpp, 2 is 15bpp, 3 is reserved). Blend: `(w >> 5) & 3`.

### Palette words and runtime records

`GetClut (exe/slus_004_22@0x8017A6F0)` builds a 16-bit CLUT word. Bits 0 to 5 are the column in 16-word units and bits 6 to 15 are the row:

```text
clut = ((y & 0x3FF) << 6) | ((x >> 4) & 0x3F)
```

`GetTPage (exe/slus_004_22@0x8017A620)` has two encodings, chosen by the graph type. `GetGraphType (exe/slus_004_22@0x8017B2B4)` returns the byte at `D_8018B15C`, which `ResetGraph (exe/slus_004_22@0x8017AF0C)` writes from the result of `_reset (exe/slus_004_22@0x8017DA54)`. The US disc runs graph type 0 (a high-confidence inference from the boot path, not a hardware capture): the logo overlay calls `ResetGraph(0)`, and `SYS_InitHardware (exe/slus_004_22@0x8014AD28)` calls `ResetGraph(0)` on first boot and `ResetGraph(3)` later. `_reset(3)` returns 0, and `ResetGraph(0)` returns `_version(0)`, which is 0 when its GPU status probe fails.

| Graph type | TPage word                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------- |
| 0          | `(tp & 3) << 7 \| (abr & 3) << 5 \| ((y & 0x100) >> 4) \| ((x & 0x3FF) >> 6) \| ((y & 0x200) << 2)` |
| 1, 2       | `(tp & 3) << 9 \| (abr & 3) << 7 \| ((y & 0x300) >> 3) \| ((x & 0x3FF) >> 6)`                       |

`tp` is 0 for 4bpp, 1 for 8bpp and 2 for 15bpp. A site that writes the type 1 or 2 form decodes with the second row. The game also writes both forms by hand as `getTPage` and `getTPageN` in `Area_DrawObjectSprite (exe/slus_004_22@0x8014C4D4)`.

The palette arena is not the only palette writer. The frontend keeps three more records beside it.

| Record                     | Address      | Size | Count | Readers                                                 |
| -------------------------- | ------------ | ---: | ----: | ------------------------------------------------------- |
| `PaletteFade`              | `0x80145BD4` |   12 |    32 | `GFX_AllocPaletteFade`, `GFX_MarkPaletteCells`          |
| cell map                   | `0x80145D54` |    1 |  4x16 | `GFX_FindPaletteCell`, `GFX_AllocPaletteCell`           |
| `GraphicsPaletteAnimation` | `0x80145D94` |   16 |     8 | `GFX_StartPaletteAnimation`, `GFX_StepPaletteAnimation` |
| palette stage              | `0x80035600` |   64 |     - | `GFX_StagePalette` callers                              |

A `PaletteFade` record has 12 bytes:

| Offset | Size | Type  | Meaning                                                  |
| -----: | ---: | ----- | -------------------------------------------------------- |
| `0x00` |    1 | `u8`  | flags                                                    |
| `0x01` |    1 | `u8`  | unknown                                                  |
| `0x02` |    1 | `u8`  | red offset                                               |
| `0x03` |    1 | `u8`  | green offset                                             |
| `0x04` |    1 | `u8`  | blue offset                                              |
| `0x05` |    1 | `u8`  | table index                                              |
| `0x06` |    1 | `u8`  | step                                                     |
| `0x07` |    1 | `u8`  | unknown                                                  |
| `0x08` |    4 | `u8*` | target pointer (the target pattern at `+0x08` sets size) |

A `GraphicsPaletteAnimation` record has 16 bytes:

| Offset | Size | Type  | Meaning                                                  |
| -----: | ---: | ----- | -------------------------------------------------------- |
| `0x00` |    1 | `u8`  | flags (bit 0: slot in use)                               |
| `0x01` |    1 | `u8`  | frames left on the current entry                         |
| `0x02` |    1 | `u8`  | last owner animation id (`0xFF` on start)                |
| `0x03` |    1 | `u8`  | initial value, copied from owner `+0x27` on start        |
| `0x04` |    4 | `u8*` | pointer to the source table                              |
| `0x08` |    4 | `u8*` | pointer to the current entry                             |
| `0x0C` |    4 | `u8*` | pointer to the owner (owner `+0x4B` is the animation id) |

The cell map has one byte per cell, and `0xFF` is empty. `GFX_StepPaletteAnimation` selects the source-table entry named by the owner's animation id and advances four bytes at a time (entry byte 3 is the frame count). It wraps when the next entry starts with `0xFF`: that entry's second byte is the back-step, a count of four-byte entries. The battle overlay views the same address `0x80145BD4` differently, as a 12-byte `BattleSpriteSlot` that reads bytes `+0x02` (a second copy of the shared sprite value), `+0x03` and `+0x04`. The same address is not the same object in another overlay.

```mermaid
flowchart TD
    B["type-0 CLUT bank"] -->|"EMI_LoaderCopyPayload"| A["arena 0x80033800"]
    A -->|"GFX_ResetPalette"| W["working copy 0x80037800"]
    W -->|"LoadImage rect(0,0x1E0,0x100,0x20)"| V["VRAM rows 480-511"]
    V --> P["POLY_FT4 clut/tpage"]
    F["PaletteFade 0x80145BD4"] --> C["cell map 0x80145D54"]
    C --> S["palette stage 0x80035600"]
    S --> A
```

The arena base holds 256 units of 64 bytes (32 rows of 512). [Rendering](../../systems/rendering/) describes how the working copy and the upload run each frame. `GFX_StepPaletteAnimation` copies colors inside the working copy and sets the upload flag. It does not change the arena.

## Load path

| Asset                         | Route                                                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| texture page, type 3          | `EMI_LoaderLoadGraphics` uploads it with `LoadImage`, one 32x32 rectangle at a time ([chunk layout](#chunk-layout))                                                                                                            |
| CLUT bank, type 0             | `EMI_LoaderCopyPayload (exe/slus_004_22@0x801625E4)` copies it into the palette arena at its load address; the engine uploads the arena's working copy to VRAM rows 480 to 511 ([area](../area/#palette-arena))                |
| `etc/start/09` save-icon TIMs | never uploaded: `CardBuildFileHeader (emi/etc/start/09@0x801EF27C)` copies icon 0's CLUT colors and each icon's pixels into the memory card save frame at `0x800C1800`; nothing reads the TIM headers ([save](../save/#icons)) |

## Texture-to-palette join

A texture's palette follows from a draw rule, never from the texture payload. A draw site names a texture page and a CLUT. Two kinds of rule are proven:

- A literal site names both in one function. `WORLD00/AREA024.EMI#14` writes the page `0x003B` and the CLUT `0x78CA`.
- The world-map terrain rule reads each tile descriptor word in `func_80155560 (exe/slus_004_22@0x80155560)`. Bit 31 selects the depth, bits 24 to 27 the CLUT index and bits 28 to 29 the page bank. An 8bpp descriptor (`bit 31 = 0`) reads CLUT row `(0, 483 + index)`. A 4bpp descriptor reads `(16 * index, 483)`. Both use page `(320 + 128 * bank, 256)`. Empty descriptors name nothing. [Area](../area/#terrain-mesh) describes the descriptor.

A rule joins only when exactly one type-3 sheet in the archive covers the page, and exactly one distinct bank holds the row. Two sheets over the same words, or two banks that disagree at one arena position, leave the texture unjoined. The sheet slot is known, and no palette is guessed. The search first uses the texture's own archive. If that archive has no bank for the row, it consults the resident set of palette banks loaded from the disc, where identical banks collapse. The battle icon rows show the limit: row 506 differs between `BATL_OVR.EMI` and `BATL_DRA.EMI`. Row 507 agrees in `BATTLE.EMI`, `BATL_RE2.EMI`, `BATL_RET.EMI` and `BATTLE2.EMI` but differs in `BATL_DRA.EMI`. A disc-wide resident set therefore leaves them unjoined.

A site whose page or CLUT depends on runtime state (a caller argument, a branch or a table) is not a joined site. A `GetGraphType()` test is different: it chooses between two encodings of one page, so it does not change which page the site names.

Every CLUT and TPage write in the game code was resolved from literals and `GetClut` and `GetTPage` calls. Several sites write the page twice, once per graph-type encoding. Decoding each pair (`0x229` with the type 1 and 2 form and `0x99` with the type 0 form, and so on) gives the same page in all eight pairs, so the table lists one decoded page. "Family" means that the CLUT column is a function of a caller argument.

| Overlay and function                                                                                                                                  | tpage (decoded)                                            | clut (decoded)                                          | Status                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `func_801F2DF8 (emi/world00/area024/14@0x801F2DF8)`                                                                                                   | `0x003B` (4bpp, abr 1, page (704, 256))                    | `0x78CA` ((160, 483))                                   | joined: sheet slot 7, bank slot 8                                                  |
| `func_801F6E48 (emi/scenario/scena00/00@0x801F6E48)`                                                                                                  | `0x001B` (4bpp, (704, 256))                                | `0x78CB` ((176, 483))                                   | literal; no sheet in the archive                                                   |
| `func_801D2C34 (emi/world00/area030/04@0x801D2C34)`                                                                                                   | `0x229` or `0x99`: 8bpp, page (576, 256)                   | `0x7A40` ((0, 489))                                     | page fixed in both encodings                                                       |
| `func_800F5E44 (emi/world00/area030/05@0x800F5E44)`                                                                                                   | `0x225` or `0x95`: 8bpp, page (320, 256)                   | `0x7A80` ((0, 490))                                     | page fixed in both encodings                                                       |
| `Area_DrawHudSprite (emi/world00/area016/13@0x801F39D8)`                                                                                              | `0x22C` or `0x9C`: 8bpp, page (768, 256)                   | `0x7B80` ((0, 494))                                     | page fixed in both encodings                                                       |
| `func_801F4768 (emi/world00/area016/13@0x801F4768)`                                                                                                   | `0x12B` or `0x5B`: 4bpp, abr 2, page (704, 256)            | `0x78CB` ((176, 483))                                   | page fixed in both encodings                                                       |
| `func_801F7134 (emi/scenario/scena00/00@0x801F7134)`                                                                                                  | `0x32D` or `0xDD`: 8bpp, abr 2, page (832, 256)            | `0x7A80` ((0, 490))                                     | page fixed in both encodings                                                       |
| `Menu_DrawIcon (emi/etc/shop/00@0x801DA00C)`                                                                                                          | `0x8F` or `0x2F`: 4bpp, abr 1, page (960, 0)               | `0x7800` ((0, 480))                                     | page fixed in both encodings                                                       |
| `Menu_DrawPortrait (emi/etc/sisyou/00@0x801D23A0)`                                                                                                    | `0x2E` or `0x1E`: 4bpp, page (896, 256)                    | `getClut(entry[2], entry[3] + 0x1E0)`                   | page fixed in both encodings; palette from a table entry                           |
| `Scene_DrawBands (emi/scenario/sce10eff/00@0x801D165C)`                                                                                               | `0xA5` or `0x35`: 4bpp, abr 1, page (320, 256)             | none in function                                        | page fixed in both encodings                                                       |
| `Menu_DrawHeaderBar (emi/world00/area008/13@0x801F3D88)` and `Menu_DrawHeaderBar (emi/etc/sisyou/00@0x801D1E54)`                                      | `0x0F` (4bpp, (960, 0))                                    | `GetClut(clut_x, 0x1E1)`, `clut_x = (arg4 << 5) + 0x10` | family: row 481, column `2 x arg4 + 1`                                             |
| `func_801D7D10 (emi/battle/battle/03@0x801D7D10)`                                                                                                     | `GetTPage(0, 0, 0x100, 0x100)` = `0x14` (4bpp, (256, 256)) | `(table[arg0] & 0x3F) \| 0x7800`, row 480               | table of 7 bytes at `0x801D0C64`; the texture is not at (256, 256) in `BATTLE.EMI` |
| `func_801D94D4 (emi/battle/battle/03@0x801D94D4)` and `func_801D9804 (emi/battle/battle/03@0x801D9804)`                                               | none in function                                           | `GetClut((arg2 & 0xFF) << 4, 0x1E0)`                    | family: row 480, column from `arg2`                                                |
| `UI_DrawSprite (emi/etc/game/00@0x801AF2A0)` and `func_801AE984 (emi/etc/game/00@0x801AE984)`                                                         | none in function                                           | `(176, 481)`, `(128, 482)`, `(192, 480)`                | CLUT only                                                                          |
| `UI_DrawSpriteRun (emi/etc/game/00@0x801AF390)`                                                                                                       | 832 or 896 (modes 2 and 3)                                 | none in function                                        | not a texture page                                                                 |
| `GFX_StepScreenFade (exe/slus_004_22@0x8014F704)`, `func_8014FC00 (exe/slus_004_22@0x8014FC00)`, `Menu_DrawCursorSprite (exe/slus_004_22@0x801647C4)` | `GetTPage(1, p4, 0x140, 0)`, `\| 0x2F`; clut `0x7802`      | -                                                       | partial                                                                            |

The proven sites and the terrain rule together join 212 of the 593 type-3 textures to 890 palette rows: 200 terrain sheets (865 distinct rows across the archives, 11 of which also carry a literal site), nine area sprite sheets, two `AREA030` icon sheets and the `BMAGIC/MAGIC218` effect sheet. The other 381 textures have no proven depth or palette. A data check confirms the terrain depth: all 105,308 terrain descriptors have bit 31 clear (8bpp), and the 8bpp decode selects a page and bank that exist in the archive.

A reading of a texture without a join is limited. Read as 16bpp, each VRAM word is one pixel, and 4bpp and 8bpp textures look like noise. A texture and one CLUT row are what a Sony TIM file holds (Sony's *File Formats* manual, chapter 3), but the game stores no TIM of its own for textures. The six TIM records on the disc are the memory card icons ([save](../save/#icons)).

## Open questions

These are ranked by the bytes they leave unexplained.

1. Battle, `SCENARIO` and `ETC` sites. Their pages and CLUTs come from tables, caller arguments or banks in other archives. `BATTLE.EMI` has no row-506 bank, and `BATL_OVR` and `BATL_DRA` disagree there. The join needs the resident banks of the scene, not the archive alone.
2. Family and table CLUTs (`BATTLE`, `AREA008`, `SISYOU`). The row 480 and row 481 CLUTs come from caller arguments or the 7-byte table at `0x801D0C64`. They need the callers' arguments.
3. Textures outside their archive. The page that `SCENA00` and the battle quads use is not a sheet of the same archive, so the same-archive rule finds nothing.
4. Overlapping sheets. Several sheets cover the same VRAM words, for example slots 5 and 7 of `AREA024`. Which upload is resident depends on the stream order (`EMI_LoaderUploadSector`).
5. Texel depth without a site. A depth of 4bpp, 8bpp or 15bpp is known only for the sites in the table and for a joined terrain descriptor.

## Sources and confidence

- **Confidence:** medium. The upload, the color words and the proven joins are read and checked on every payload, but 381 of 593 textures have no proven depth or palette.
- **Evidence:** all 593 type-3 payloads and 620 palette banks, the loader and drawing functions named above (including `GFX_CopyPaletteAnimationColors`, which copies colors inside the working copy), and every CLUT and TPage write in the game code. The community [BoF3-Data-Doc](https://github.com/GlitchedDragon-dev/BoF3-Data-Doc) (texture and palette notes) only confirms. The runtime primitives are PsyQ 3.7 ([sources](../../appendix/sources/)).

## Related

- [EMI container](../emi/): the type-3 and type-0 entries that carry these blocks.
- [Area formats](../area/): the palette arena slices and the map tile descriptor.
- [Rendering](../../systems/rendering/): how the palette copy, upload and primitives run each frame.
- [Edit graphics and textures](../../guides/graphics/): what can change safely.
