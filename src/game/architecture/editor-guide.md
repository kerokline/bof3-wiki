# Editor guide

This page answers one question for each kind of game data: where does it live, how does the game
read it, and what limits a change. It is for anyone who patches the game or writes an editor. The
page lists 13 classes of data and points to the page that owns each format. Every class ends in the
same steps: change the entry bytes, rebuild the archive, put the archive back on the disc. The
limits of those steps come first.

Companion pages: [disc and files](disc-and-files.md) is the inventory, [loading](loading.md) shows how
entries reach RAM, [saving](saving.md) covers the card, [coverage](../../formats/coverage.md) counts
bytes by documentation level, and the [glossary](../../glossary.md) defines the terms and tags.

## Classes

The table lists each class, the files that hold it and the page that describes the format.

|  # | Class                                   | Lives in                                                       | Format page                                               |
| -: | --------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
|  1 | UI layouts and windows                  | overlay code constants, `SLUS_004.22` style table              | [text](../text.md), [runtime](../runtime.md)              |
|  2 | Fonts and text encoding                 | `FIRST.EMI#3`, `ENDKANJI.EMI#0` (glyph page), code (encoding)  | [text](../text.md), [graphics](../../formats/graphics.md) |
|  3 | Strings and dialogue                    | `WORLD*` message banks, `ETC` resource tables, name tables     | [text](../text.md)                                        |
|  4 | Sound effects                           | `COMN_SE`, `BATL_SE`, enemy and spell banks, type-8 cue tables | [audio](../../formats/audio.md)                           |
|  5 | Music sequences                         | `BGM*` and `BOSS*` SEP packages                                | [audio](../../formats/audio.md#sep-package)               |
|  6 | Soundbanks                              | VAB header and body pairs (1,020 banks)                        | [audio](../../formats/audio.md#vab-bank)                  |
|  7 | XA streams                              | `S_XA00.STR`, `MAGIC00.STR`, `VOICE.STR`                       | [STR](../../formats/str.md)                               |
|  8 | Sprites, animation, palettes            | `PLCHAR`, `BPLCHAR` banks                                      | [character](../../formats/character.md)                   |
|  9 | Character and monster stats             | `START.EMI#8`, `STATUS.EMI#0`, area encounter blocks           | [records](../records.md), [area](../../formats/area.md)   |
| 10 | Items, skills, magic, shops, drops      | `GAME.EMI#0` tables, enemy records                             | [records](../records.md)                                  |
| 11 | Maps, collision, area and event scripts | `WORLD*` archives                                              | [area](../../formats/area.md)                             |
| 12 | Textures and VRAM layout                | 593 type-3 entries, 620 CLUT banks                             | [graphics](../../formats/graphics.md)                     |
| 13 | Save data                               | memory card file                                               | [save](../../formats/save.md)                             |

## Rebuilding archives and the disc

Each entry of an archive stores a type, a load address and a size in the archive's entry table.
The type and the load address cannot be recovered from the payload. The limits follow from that.

- A rebuilt archive must keep the type and the load address of every entry. Without them the game
  cannot place the entry.
- A changed payload moves every entry after it, because the entries are packed one after another.
- A replacement file cannot grow past its last sector. The archive keeps its sector count.
- The executable's disc file table ([executable](../../formats/exe.md#the-disc-file-table)) is not
  rewritten when a file is replaced, so each file keeps its first sector.
- `S_XA00.STR` is a Form 2 stream. A Form 2 file cannot be replaced file by file.
- An image made of top-level files only is not a bootable game disc.

The sector rules are in [sector sealing](../../formats/conversion.md#sector-sealing). Every limit in the
sections below adds to these.

---

## 1. UI layouts and windows

**Where.** Window rectangles and menu rows are immediate arguments in overlay code. There is no layout
file. The shop and save screens call `func_801DAB90(0x14, 0x12, 0x118, 0x13, style)` with fixed values
(`func_801D5894 (emi/etc/shop/00@0x801D5894)`). A text box takes a style byte (`{BOX:nn}`) that
selects three parameters at `0x8017F5B8`, `0x8017F5BA` and `0x8017F5B9` in `SLUS_004.22`
([text](../text.md#control-codes)). Find the screen by overlay. The menu and shop code is
`ETC/SHOP.EMI#0` and `ETC/START.EMI#8`, both loaded at `0x801D0C00`.

**Layout.** The call sites of `func_801DAB90` and its twin `func_801DE088` pass x, y, width, height and a
style byte. Their units and the drawing code are not read (`[unknown]`). The style table is
`[unknown]` beyond its three read offsets.

**Limits.** An overlay payload is fixed to its window (`0x801D0C00` for the menu overlays). A code edit
that changes the instruction count changes the size, and the entry must stay inside its archive's
sector budget.

**Editing.** Patch bytes in the code entry. No field-level view of the window arguments exists.
`[unknown]`: the argument units, the style table content and which overlay owns each menu.

## 2. Fonts and text encoding

**Where.** The glyph sheet is a type-3 upload at VRAM column 30, row 0. `ETC/FIRST.EMI` entry 3 and
`ETC/ENDKANJI.EMI` entry 0 both carry the load argument `0x1E000200` (32,768 bytes each). The glyph
draw selects the page with draw mode `0x2F`, which is column 15 of 64-word pages, so x = 960
(`func_8014FC00 (exe/slus_004_22@0x8014FC00)`). That these two entries are the font page is
`[inferred]` from the shared target. The text colours are 16 CLUT rows at `(16 * n, 480)`: `{COLOR:nn}`
loads the CLUT word `0x7800 | (n & 0xF)`.

**Layout.** `UI_DrawTextGlyphs` (exe/slus_004_22@0x8014F84C) maps ordinary bytes to a 31-column atlas
(`u = ((c - 0x30) % 31) * 8`, `v = ((c - 0x30) / 31) * 12 + 0x48`). The `{NUM:nn}` code uses a
21-column sheet of 12 px cells. Glyph width is 8 px, and the sheet is 4 bits per pixel. The byte
classes and the 24 control codes are in [text](../text.md#byte-classes).

**Limits.** One byte is one glyph. The byte-to-cell formula is code, so a new glyph needs a cell in the
existing grid; 31 columns of 8 px fill 248 of the 256 px page width. The control bytes `0x00`-`0x16`
and `0x90` cannot be glyphs. Both font pages load into one VRAM rectangle, so the later upload wins.
Changing the formula means changing code in `slus_004_22`, and that file cannot grow.

**Editing.** Edit the sheet pixels as a 16-bit texture, and edit palettes by colour word. `[unknown]`:
which entry the kanji page serves at run time (it replaces the Latin sheet), and which page holds the
21-column sheet.

## 3. Strings and dialogue

**Where.** Area messages are the entry loaded at `0x80010000` in each `WORLD*/AREAnnn.EMI` (200
archives; [area](../../formats/area.md#0x80010000-area-message-bank)). The shared strings are the
entries loaded at `0x8001A000`: 44 entries, among them `FIRST.EMI#11` and `AFLDKWA.EMI#0`, which are
16,872 bytes each and byte-identical. Fixed-width names sit in the `GAME.EMI#0` tables, in
`START.EMI#8` and in the enemy blocks.

**Layout.** A message bank is a `u16` offset table whose first entry is the table size, followed by
records that run to the next distinct offset. 197 of the 200 area entries parse as banks; the three
fishing areas do not. `Resource_Resolve` (exe/slus_004_22@0x801502D0) maps a 16-bit id through four
group bases. The control codes are in [text](../text.md#control-codes).

**Limits.** A message bank may not pass `0x8001A000`, where the resource table starts, so it holds at
most `0xA000` bytes. The largest bank is 21,547 bytes (`AREA153.EMI#11`). A longer message shifts
every later record in its bank, so the offset table must be rebuilt. The resource ids are
archive-local. The two `0x8001A000` copies must change together.

**Editing.** Decode a bank to text, edit the text and rebuild the offset table. `[unknown]`: bytes
without a glyph, and a static map from a text id in code to its string ([gaps](gaps.md#strings)).

## 4. Sound effects

**Where.** Effect banks are VAB pairs in `BATTLE/COMN_SE.EMI`, `BATTLE/BATL_SE.EMI`,
`ETC/A085SE2.EMI`, `ETC/A108SE2.EMI`, each `BENEMY/ENEMYnnn.EMI` (200), each `BMAGIC/MAGICnnn.EMI` and
the per-area bank in `WORLD*` (slots 0-2 or 6-8). The cue table (type 8, 904 entries, 34,432 bytes in
all) sits beside each bank. Entry types 6, 7 and 8 mark a bank's header, body and cues.

**Layout.** A cue record is 4 bytes. A bank holds at most 24 records, and a chunk holds at most 31.
`EMI_LoaderLoadVabCues` copies them to `0x801486A0 + 124 * bank`. `SND_PlayCue`
(exe/slus_004_22@0x8015DF18) turns a cue id `(bank << 8) | record` into `SsUtKeyOnV` calls. The fields
are in [audio](../../formats/audio.md#emi-type-8-cue-records). In all 8,608 records the `program` is
below the bank's program count, and in 8,601 the `tone` is inside the declared tone count.

**Limits.** The bank selector in the TOC load argument (0-6) must match the record's bank, and a payload
is a multiple of 4 bytes. Cue ids in code and scripts are record indexes, so reordering records breaks
the callers. 1,248 bank-6 records read their attributes from a shifted slot. That is shipped
behaviour, so keep `program` and `tone` as they are. The VB size is bounded by SPU RAM, and the SPU
base addresses are `[unknown]`.

**Editing.** A bank swaps as raw stored bytes. The 4-byte cue records can be edited in the entry.
`[unknown]`: bits 7-3 of byte 0 of each record (always zero) and the SPU RAM budget per bank.

## 5. Music sequences and MIDI conversion

**Where.** SEP packages (type 10) are `BGM/BGM000`-`BGM197`, `BGMBAT00`-`06`, `BGMEND`, `BGMOPN` and
`BGMSPC` (81 packages), 35 in `BOSS`, 2 in `BATTLE` and 1 in `ETC`. Each package holds 4 sequences.

**Layout.** A package has a 6-byte header, then 13-byte sequence headers (id, resolution 48, tempo, time
signature, data size) and MIDI-like events with loop NRPNs 20 and 30. The package tiles exactly
([audio](../../formats/audio.md#sep-package)). The player calls `SsSepPlay`, `SsSepStop`, `SsSepSetVol`
and `SsSepSetCrescendo` ([audio](../../formats/audio.md#sound-control)). The area-to-BGM map is
`[unknown]`.

**Limits.** The resolution is 48 ticks per quarter in all 476 sequences. Each package keeps four sequences
with ids 0-3. The VAB beside it supplies the sounds, so program numbers must exist in that bank. A
package can grow only within its archive's sectors, and the BGM bank must fit its SPU allotment
(`[unknown]`). The source has no tempo meta event, so a MIDI conversion loses the tempo.

**Editing.** A sequence converts to MIDI and back. `[unknown]`: the loop semantics beyond the observed NRPN
pairs.

## 6. Soundbanks (VAB, tones, samples)

**Where.** Types 6 (VH, 1,020) and 7 (VB, 1,020) in every audio-bearing archive. A VAB header has a 32-byte
header, 128 program records of 16 bytes, tone records of 32 bytes at `0x820 + 512 * b + 32 * tone`, where
*b* counts only the program records with `tones != 0`, then the sample size table
([audio](../../formats/audio.md#vab-bank)).

**Layout.** `EMI_LoaderLoadVabHeader` and `EMI_LoaderLoadVabBody` call `SsVabOpenHeadSticky` and
`SsVabTransBodyPartly`. `fsize` equals the VH size plus the VB size in all 1,020 banks, and every header
starts `pBAV`.

**Limits.** The VB is SPU ADPCM in 16-byte blocks. Header and body pair through the TOC selector: the
header selectors cover the type-8 selectors in all 731 containers. A bank that grows can overrun its
SPU slot (limit `[unknown]`). The tone count must stay within what the cue table references.

**Editing.** Replace the `.vh` and `.vb` entries as raw bytes. Re-encoding samples is not
byte-identical: the encoder picks an equivalent filter and shift, drops the trailing end-marker block
and drops the loop flags. `[unknown]`: whether that difference matters for decoded audio.

## 7. XA streams

**Where.** `BIN/SCE_XA/S_XA00.STR`, `BIN/SCE_XA/VOICE.STR` and `BIN/BMAG_XA/MAGIC00.STR`. Video is in
`LOGO/CAPCOM30.STR`. Each is a Form 2 stream of 2,336-byte stored sectors.

**Layout.** `SND_ResolveXaStream` (exe/slus_004_22@0x80163744) maps `(stream << 12) | cue` to a first and
last sector through the cue arrays in the executable. `SND_XaStateSeek` and `SND_XaStateRead` set the
filter (`CdlSetfilter`) and read with `CdlReadS`. The counts are in
[STR](../../formats/str.md#xa-cue-tables): 880 and 5 cues. The 11 `S_XA00.STR` cues are `[inferred]`
because the array end is unbounded.

**Limits.** The file keeps its sector count and start LBA. Cue boundaries are `u16` periods (8 or 16
sectors) stored in `SLUS_004.22`, so a longer clip needs both new audio and new cue values. The executable's
own disc table must keep each file's LBA.

**Editing.** Edit the cue values in the executable. Replacing the audio needs an ADPCM encoder that writes
the 8-byte subheader (file, channel, submode, coding), 18 sound groups per sector and the EDC for
Form 2. `[unknown]`: the content of the Form 1 sectors and the end of the `S_XA00` cue array.

## 8. Character and monster sprites, animation, palettes

**Where.** Character banks are `PLCHAR` (19 LZ77 containers at `0x8003B800`), `BPLCHAR` (45 LZ77 containers,
1 raw container and 75 standalone sections) and `BMAGIC` (3 blocks): 144 blobs in all
([character](../../formats/character.md#load-arguments)). The palette tables sit inside the decoded
bank. Monster sprites are not located: `BENEMY` holds audio only (600 entries of kinds `audio-bank` and
`audio-cues`).

**Layout.** The container, sections, nodes and the palette layer are in
[character](../../formats/character.md). The 3 `BMAGIC` blocks (`KAIZAR_D`, `KAIZAR_F`, `KAIZAR_N`)
have no palette layer, so 141 of 144 blobs have palettes. The pixel and script bytes inside a node are
not decoded (`[unknown]`).

**Limits.** The bank is LZ77. A changed decoded bank must be recompressed to fit the window at
`0x8003B800` and the archive's sectors.

**Editing.** Palette tables only. Pixels, animation and the LZ77 stream stay read-only. `[unknown]`: the node
pixel format, the animation script, the location of the monster sprites and the flag bits of the
`flags | offset` pairs.

## 9. Character and monster stats

**Where.** The eight playable characters are 8 records of `0xA4` bytes at payload `0x1A914` in
`ETC/START.EMI#8` and `ETC/STATUS.EMI#0`. The two entries are byte-identical (117,986 bytes) and both
load at `0x801D0C00`, so the table sits at `0x801D0C00 + 0x1A914` once loaded (`[inferred]` from the
load address). Monsters are eight enemy records of `0x88` bytes in the 1,160-byte encounter block of
each area archive (200 archives, entry loaded at `0x800E4000`).

**Layout.** The eight character records start at `0x80144968` once loaded. The level-up reader is
`func_801ADDD4 (emi/etc/game/00@0x801ADDD4)`. The window-style byte sits at `0x80144952`, `0x16` bytes
before the first record. The shop overlay reads the skill-ability bytes at `0x90` from the block base
(`0x16 + 0x7A`; `func_801E1710`, emi/etc/shop/00@0x801E1710). The field tables are in
[records](../records.md#character-and-master-data) for characters and
[records](../records.md#the-enemy-record) for enemies. The encounter picker is `func_801C6A7C
(emi/etc/game/00@0x801C6A7C)`.

**Limits.** Both character copies must change together. Which overlay a screen reads is `[unknown]`. The
record count and stride are fixed, and the encounter block is 1,160 bytes in all 200 archives.

**Editing.** Edit the fields in place. Name fields use the [name encoding](../text.md#byte-classes).
`[unknown]`: the unnamed spans of the enemy and character records, and which overlay a given screen
reads.

## 10. Items, skills, magic, shops, drops and other records

**Where.** `ETC/GAME.EMI` entry 0 (229,720 bytes, load `0x80195800`) holds eight tables. The table lists
each one's rows and archive offset.

| Table        | Rows x stride | Archive offset |
| ------------ | ------------- | -------------- |
| items        | 92 x 18       | `0x33964`      |
| vital items  | 16 x 16       | `0x33FDC`      |
| weapons      | 83 x 24       | `0x340DC`      |
| armor        | 68 x 22       | `0x348A4`      |
| accessories  | 52 x 20       | `0x34E7C`      |
| shops        | 40 x 23       | `0x3528C`      |
| abilities    | 228 x 20      | `0x3570C`      |
| level growth | 693 x 8       | `0x368DC`      |

Each table's span occurs exactly once in entry 0. Drops and steals are fields of the enemy record
(class 9). Master skills and stats are in `ETC/SISYOU.EMI#0`.

**Layout.** The item dispatcher `func_80165D48` (exe/slus_004_22@0x80165D48) reads category, base and stride. Level
growth is indexed by `character * 99 + level - 1`, with character 0 to 6 (693 rows = 7 x 99). Names are
12 bytes at `0x00`, and descriptions are 16-bit resource ids. The row layouts are in
[records](../records.md#row-layouts). The weapon `sound` byte is a cue-table index
(`func_800AB834 (emi/battle/battle/15@0x800AB834)`, `func_800AB910 (emi/battle/battle/15@0x800AB910)`).

**Limits.** The record counts are compiled into code (`92`, `228` and so on), so adding rows needs a
code change. A name needs no terminator when it fills its 12 bytes
([records](../records.md#gameemi-fixed-tables)). `GAME.EMI#0` must not move, because the runtime address
is `0x80195800 + payload offset`. Descriptions are resource ids into the `0x8001A000` table.

**Editing.** Rewrite a table's span and splice it at the table's payload offset (archive offset minus
`0x800`) into entry 0. `[unknown]`: the unnamed bytes (one in the item row, others), what the high
nibble of `kind` does and the ability flag bits beyond those named.

## 11. Maps, collision, area and event scripts

**Where.** Each `WORLD00`-`WORLD04` archive (200 in all) holds a map bundle (`0x80104000`, 10,247,719 bytes in
all), a cell grid (`0x80032000`, 5,000 bytes, 191 non-zero), a message bank, a script bank
(`0x800D3800`), a scene table (`0x800E3800`), an encounter block (`0x800E4000`), textures, palettes, a
sound bank and the area program (`0x801F2C00`).

**Layout.** [area](../../formats/area.md) gives every window. `Actor_BeginScript
(exe/slus_004_22@0x8014D6DC)` reads the script bank. `func_801C6FD4` (`etc/game/00`) reads the cells. The
scene table and the actor definitions are in
[area](../../formats/area.md#0x800e3800-scenestep-table), and `Area_FindSceneRecord
(exe/slus_004_22@0x8014DD3C)` matches the actor id. The script directory and section offsets are read.
The record opcodes are not decoded (`[unknown]`), and the cell values (collision classes) are
`[unknown]`.

**Limits.** The peak sizes over the 200 archives are:

| Window       | Peak (bytes)     | Where        | Headroom |
| ------------ | ---------------- | ------------ | -------- |
| script bank  | 65,236 of 65,536 | `AREA197#4`  | 300      |
| area program | 16,324 of 16,384 | `AREA135#14` | 60       |
| scene table  | 412 of 2,048     |              |          |
| message bank | 21,547           | `AREA153#11` |          |

**Editing.** Edit the map bundle, the layout lists and the encounter blocks by field. Cells, actor
definitions and the script bank can be edited only as raw bytes in the entry. `[unknown]`: the script
opcodes, the cell classes, the three unnamed spans of the map bundle and the consumers of the
`0x80117000` modules (9 archives).

## 12. Textures and VRAM layout

**Where.** 593 type-3 entries (112,312,320 bytes) and 620 palette entries (CLUT banks of 16 or 256 colours,
1,121,696 bytes) in 8 of the 14 families. The load argument is `col(31:24) | row(23:16) | count(15:8)`: the
first 32-word column, the first 32-row and the rectangles per row
(`EMI_LoaderLoadGraphics (exe/slus_004_22@0x80162698)`).

**Layout.** A payload is a run of `0x800`-byte chunks, each a 32 by 32 word rectangle, so every payload is a
multiple of `0x800`. `EMI_LoaderUploadSector` calls `LoadImage` per chunk. CLUTs live in the palette arena (VRAM
rows 480-511), and a CLUT word is `(x / 16) | (y << 6)`. Depth and palette are proven for 212 textures
(890 rows). 381 textures have none ([graphics](../../formats/graphics.md),
[coverage](../../formats/coverage.md)).

**Limits.** The payload size is fixed by the rectangle count. The sum of uploads must fit the 1,024 by 512 word VRAM
next to the frame buffers and the palette arena. Several sheets cover the same words (for example `AREA024`
slots 5 and 7), and which one is resident depends on the stream order. An indexed edit must keep the
palette row that the texture joins to. A palette bank is 512 bytes (256 colours) or 32 bytes (16 colours)
in fixed arena slots.

**Editing.** Edit a texture as 16-bit words or as indexed pixels, and edit palettes by colour word.
`[unknown]`: depth and palette of the 381 other textures, the battle background joins and textures used
outside their archive.

## 13. Save data

**Where.** A 1-block memory-card file named `BASLUS-00422BOF3` + `%02d`. There is no save file on the disc.
The layout is in [save](../../formats/save.md): header `0x200`, payload `0x10B0` at `0x200`, checksum
halfword at `0x270`, stored length `0x12B0`.

**Layout.** The persistent block and the place of each field are in [state](state.md#one-persistent-block).
`func_801E5A00` (load) and `func_801D69E0` (save) sit in the `etc/start/08` and `etc/shop/00` overlays.
`CardBuildFileHeader` is `func_801EF27C`. The fields are in [records](../records.md#save-layout). About
74% of the block's bytes have a named field in the state table (3,179 of 4,272 bytes). The unknown spans
are in [gaps](gaps.md).

**Limits.** The load routine checks only the 16-bit byte sum of `0x200..0x12AF` with the checksum slot
zeroed. The payload offsets are linked to RAM (file offset = RAM address minus `0x801446D8`), so field
widths are fixed. The icon records are in `START.EMI#9` and `SHOP.EMI#8`.

**Editing.** Edit bytes in `0x200..0x12AF`, zero the halfword at `0x270`, sum the range and store the low
16 bits ([save](../../formats/save.md#checksum)). A wrong sum shows the error cue (`g_SaveCardStatus` 7).
`[unknown]`: the unnamed payload bytes, whether the BIOS verifies the `"SC"` header, and the seventh
title digit.

---

## Readiness

The table rates each class. "Fields" says whether the fields an editor must change are documented.
"Write path" says whether a change goes back into the archive without raw byte edits. `partly` marks a
class where a field, an instance family or the write path is missing.

|  # | Class                                   | Fields | Write path | Not yet known                                                                                                                                              |
| -: | --------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1 | UI layouts and windows                  | partly | no         | argument units, style table, per-screen owner                                                                                                              |
|  2 | Fonts and text encoding                 | partly | partly     | font page (`[inferred]`), kanji page use, 21-column sheet page                                                                                             |
|  3 | Strings and dialogue                    | yes    | yes        | glyph-less bytes, id-to-string map                                                                                                                         |
|  4 | Sound effects                           | yes    | partly     | cue byte 0 bits 7-3, SPU RAM budget; no cue field editor                                                                                                   |
|  5 | Music sequences and MIDI                | yes    | yes        | area-to-BGM map, loop semantics                                                                                                                            |
|  6 | Soundbanks                              | partly | partly     | program record field table missing; sample re-encoding is not byte-identical; SPU budget                                                                   |
|  7 | XA streams                              | partly | no         | Form 1 sector content, `S_XA00` cue end; no encoder                                                                                                        |
|  8 | Sprites, animation, palettes            | partly | partly     | node pixel format, animation, monster sprites                                                                                                              |
|  9 | Character and monster stats             | partly | yes        | unnamed spans of the enemy and character records                                                                                                           |
| 10 | Items, skills, magic, shops, drops      | partly | partly     | no field table for shops or master skills; the `0xE8`-byte table `D_801CA624` between shops and abilities is undescribed; unnamed bytes, ability flag bits |
| 11 | Maps, collision, area and event scripts | partly | partly     | area script opcodes (no write path for scripts), cell classes, unnamed map spans                                                                           |
| 12 | Textures and VRAM layout                | partly | yes        | depth and palette of 381 textures                                                                                                                          |
| 13 | Save data                               | partly | partly     | unclassified spans in [gaps](gaps.md); no save file on the disc to compare                                                                                 |
