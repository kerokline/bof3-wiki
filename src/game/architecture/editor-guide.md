# Editor guide

*Read this if you write an editor or a patch: it lists, per data class, where the data lives and what limits a change.*

What a game editor must know to change each class of data: where it lives, how the game reads it, what limits the change, what is proven about writing it back, and how to test it. Companion pages: [disc and files](disc-and-files.md) (the inventory), [loading](loading.md), [saving](saving.md), [coverage](../../formats/coverage.md) (bytes by documentation level), [glossary](../../glossary.md). Evidence tags: `read` (reader code read), `measured` (checked over every instance, count given), `inferred`, `unknown`. "Round trip" below means: decode the data, encode it again without edits, and compare the bytes, with the count over every instance on the disc. Only names, sizes, offsets, layouts and counts appear; no retail bytes.

## Classes

|  # | Class                                   | Lives in                                                       | Format page                                               | Round trip     |
| -: | --------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- | -------------- |
|  1 | UI layouts and windows                  | overlay code constants, `SLUS_004.22` style table              | [text](../text.md), [runtime](../runtime.md)              | container only |
|  2 | Fonts and text encoding                 | `FIRST.EMI#3`, `ENDKANJI.EMI#0` (glyph page), code (encoding)  | [text](../text.md), [graphics](../../formats/graphics.md) | yes            |
|  3 | Strings and dialogue                    | `WORLD*` message banks, `ETC` resource tables, name tables     | [text](../text.md)                                        | yes            |
|  4 | Sound effects                           | `COMN_SE`, `BATL_SE`, enemy and spell banks, type-8 cue tables | [audio](../../formats/audio.md)                           | partly         |
|  5 | Music sequences                         | `BGM*` and `BOSS*` SEP packages                                | [audio](../../formats/audio.md#sep-package)               | yes            |
|  6 | Soundbanks                              | VAB header and body pairs (1,020 banks)                        | [audio](../../formats/audio.md#vab-bank)                  | partly         |
|  7 | XA streams                              | `S_XA00.STR`, `MAGIC00.STR`, `VOICE.STR`                       | [STR](../../formats/str.md)                               | no             |
|  8 | Sprites, animation, palettes            | `PLCHAR`, `BPLCHAR` banks                                      | [character](../../formats/character.md)                   | partly         |
|  9 | Character and monster stats             | `START.EMI#8`, `STATUS.EMI#0`, area encounter blocks           | [records](../records.md), [area](../../formats/area.md)   | yes            |
| 10 | Items, skills, magic, shops, drops      | `GAME.EMI#0` tables, enemy records                             | [records](../records.md)                                  | yes            |
| 11 | Maps, collision, area and event scripts | `WORLD*` archives                                              | [area](../../formats/area.md)                             | partly         |
| 12 | Textures and VRAM layout                | 593 type-3 entries, 620 CLUT banks                             | [graphics](../../formats/graphics.md)                     | yes            |
| 13 | Save data                               | memory card file                                               | [save](../../formats/save.md)                             | no             |

## Rebuilding archives and the disc

Every class ends in the same steps: change the entry bytes, rebuild the archive, put the archive back on the disc. What is proven:

| Step                                      | Behavior                                                                                                                                                     | Evidence   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Rebuild with the stored TOC data          | 880 of 880 archives rebuild byte-identical                                                                                                                   | `measured` |
| Rebuild without entry types and addresses | entry types and load addresses are lost; 0 of 20 sampled archives match                                                                                      | `measured` |
| Keep type and load address per entry      | a changed payload moves the entries after it (no-edit rebuild 880 of 880)                                                                                    | `measured` |
| Reseal the disc                           | all 880 EMI files plus `SLUS_004.22` replaced by themselves: track 1 identical (128,416 sectors resealed); tracks 1 and 2 byte-identical with no replacement | `measured` |
| Growth                                    | a replacement file cannot grow past its last sector (a larger file fails)                                                                                    | `measured` |
| Form 2 files                              | `S_XA00.STR` is a Form 2 stream and cannot be replaced file by file                                                                                          | `measured` |
| Synthetic image                           | an image of top-level files only is not a BOF3 disc                                                                                                          | `measured` |

Every limit in the sections below adds to these: the archive keeps its sector count, and the executable's disc file table ([executable](../../formats/exe.md#the-disc-file-table)) is not rewritten when a file is replaced. The sector rules are in [sector sealing](../../formats/assets.md#sector-sealing).

---

## 1. UI layouts and windows

**Where.** Window rectangles and menu rows are immediate arguments in overlay code. The
shop and save screens call `func_801DAB90(0x14, 0x12, 0x118, 0x13, style)` with fixed values
(`read`, `func_801D5894` (emi/etc/shop/00@0x801D5894)). Text boxes take a style byte (`TEXT_BOX n`) that selects
three parameters at `0x8017F5B8`, `0x8017F5BA`, `0x8017F5B9` in `SLUS_004.22` (`read`,
[text](../text.md#control-codes)). There is no layout file. Find the screen by overlay: the menu
and shop code is `ETC/SHOP.EMI#0` and `ETC/START.EMI#8`, both loaded at `0x801D0C00`.

**Layout and reader.** The rectangle fields of `func_801DAB90` and its twin `func_801DE088` are
x, y, width, height and a style byte in the call sites. Their units and the drawing code are not
read here (`unknown`). The style table is `unknown` beyond its three read offsets.

**Constraints.** The payload of an overlay is fixed to its window (`0x801D0C00` for the menu
overlays); changing instruction count changes the size. Code edits must keep the entry inside
its archive sector budget.

**Editing.** Not decoded. The container path is proven: patch bytes in the code entry and rebuild the archive. A field-level decoder for window arguments does not exist.

**Test and unknowns.** Boot the patched disc and open the screen. Unknown: argument units, the style
table content, which overlay owns each menu.

## 2. Fonts and text encoding

**Where.** The glyph sheet is a type-3 upload at VRAM column 30, row 0: `ETC/FIRST.EMI` entry 3 and
`ETC/ENDKANJI.EMI` entry 0 both carry load argument `0x1E000200` (32,768 bytes each); the glyph draw
selects the page with draw mode `0x2F`, which is column 15 of 64-word pages, i.e. the same x = 960
(`read`, `func_8014FC00`; the identification of these two entries as the font page is `inferred`
from the shared target). Text colors are 16 CLUT rows at `(16 * n, 480)`: `TEXT_COLOR n` loads CLUT
word `0x7800 | (n & 0xF)` (`read`, `UI_DrawTextGlyphs`).

**Layout and reader.** `UI_DrawTextGlyphs` (`UI_DrawTextGlyphs`, `slus_004_22@0x8014F84C`): ordinary bytes use a
31-column atlas, `u = ((c - 0x30) % 31) * 8`, `v = ((c - 0x30) / 31) * 12 + 0x48`; `TEXT_NUM` uses
a 21-column sheet, `u = ((n + 0x5B) % 21) * 12`, glyph height `12 - shade offset`; glyph width is 8
(`read`). The byte classes and the 24 control codes are in [text](../text.md#byte-classes).
The sheet is 4 bits per pixel (draw mode color bits 0, `read`).

**Constraints.** One byte per glyph; the byte-to-cell formula is code, so a new glyph needs a cell
in the existing grid (31 columns of 8 px fit 248 of the 256 px page width). Control bytes
`0x00`-`0x16` and `0x90` cannot be glyphs. Both font pages load into one VRAM rectangle, so
the later upload wins. Changing the formula means changing `slus_004_22` code, and the size of that
file cannot grow.

**Editing.** Sheet pixels are a 16-bit texture view: all 593 texture views read back to their stored words (`measured`, 593 of 593) and 620 of 620 palettes (`measured`). Palette edits use the colour word only; the RGBA view is derived and ignored (`measured`).

**Test and unknowns.** Print a message in a patched area and compare the glyph. Unknown: which entry
the kanji page serves at run time (it replaces the Latin sheet, `unknown`); the 21-column sheet's
page is not identified.

## 3. Strings and dialogue

**Where.** Area messages are the entry loaded at `0x80010000` in each `WORLD*/AREAnnn.EMI` (200 archives;
165 of those entries carry text, [area](../../formats/area.md#0x80010000-area-message-bank)); shared strings are the entries loaded at `0x8001A000`
(`FIRST.EMI#11` and `AFLDKWA.EMI#0`, 16,872 bytes each and byte-identical, `measured`; 44 entries
in all). Fixed-width names sit in the `GAME.EMI#0` tables, `START.EMI#8`, and enemy blocks.

**Layout and reader.** Message bank: `u16` offset table whose first entry is the table size, records
to the next distinct offset (`read`, `UI_DrawText`; all 200 area entries load; 165 parse as text banks and 35 do not, [area](../../formats/area.md#0x80010000-area-message-bank)). Resource
table: `Resource_Resolve` (`exe/slus_004_22@0x801502D0`) maps a 16-bit id through four group bases
(`read`). Control codes: [text](../text.md#control-codes).

**Constraints.** The message bank may not pass `0x8001A000`, where the resource table starts (`0xA000` bytes from `0x80010000`); the largest bank is 21,547
bytes (`AREA153.EMI#11`, `measured`). A longer message shifts every later record in its bank and the
offset table is rebuilt. The resource table is addressed by
ids that are archive-local (`read`). The two `0x8001A000` copies must be edited together.
`text` is authoritative in the JSON; `bytes` is ignored; an unknown `{TAG}` fails (`measured`).

**Editing.** A message bank decodes to text and encodes back. The text is authoritative; an unknown `{TAG}` has no encoding (`measured`). String tables decode as strings; the 165 message banks are not string tables. Round trip: 200 of 200 area banks plus 165 of 165 other banks (message), and 275 of 275 string payloads (strings) (`measured`); [assets](../../formats/assets.md) counts 666 payloads with strings, and the two counts are unresolved ([gaps](gaps.md#strings)).

**Test and unknowns.** Decode the text again and compare; play the scene. Unknown: bytes without a
glyph stay `{RAW:xx}`; no static map from a text id in code to its string.

## 4. Sound effects

**Where.** Effect banks are VAB pairs in `BATTLE/COMN_SE.EMI`, `BATTLE/BATL_SE.EMI`,
`ETC/A085SE2.EMI`, `ETC/A108SE2.EMI`, each `BENEMY/ENEMYnnn.EMI` (200), each `BMAGIC/MAGICnnn.EMI`
and the per-area bank in `WORLD*` (slots 0-2 or 6-8). The cue table (type 8, 904 entries, 34,432
bytes in all) sits beside each bank. Find an instance: `emi list ARCHIVE`, types 6, 7 and 8.

**Layout and reader.** Cue table: 4-byte records, at most 24 per bank and 31 per chunk, copied to
`0x801486A0 + 124 * bank` (`read`, `EMI_LoaderLoadVabCues`); `SND_PlayCue` turns a cue id
`(bank << 8) | record` into `SsUtKeyOnV` calls. Fields: [audio](../../formats/audio.md#emi-type-8-cue-records).
`program` is below the bank's program count in 8,608 of 8,608 records and `tone` inside the
declared tone count in 8,601 of 8,608 (`measured`).

**Constraints.** The bank selector in the TOC load argument (0-6) must match the record's bank; a
payload is a multiple of 4. Byte 0 bits 7-3 of each record are zero and their role is `unknown`. The VB size is bounded by SPU RAM; the SPU base addresses are open (`unknown`). Cue ids in
code and scripts refer to record indexes, so reordering records breaks callers. 1,248 bank-6
records read attributes from a shifted slot (shipped behavior; keep program and tone as they are).

**Editing.** Banks swap as raw stored bytes (1,020 of 1,020 banks match, 2,040 of 2,040 entries, `measured`). Cues: no field editor exists; the 4-byte records can be edited in the entry (container round trip is proven, the field editor is not). Status: partly.

**Test and unknowns.** Trigger the cue in battle or on the field; compare with the original.
Unknown: byte 0 bits 7-3; SPU RAM budget per bank.

## 5. Music sequences and MIDI conversion

**Where.** SEP packages (type 10): `BGM/BGM000`-`BGM197` and `BGMBAT00`-`06`, `BGMEND`, `BGMOPN`,
`BGMSPC` (81 packages), 35 in `BOSS`, 2 in `BATTLE`, 1 in `ETC`. Each package holds 4 sequences
(`measured`, 119 of 119).

**Layout and reader.** 6-byte package header, 13-byte sequence headers (id, resolution 48, tempo,
time signature, data size), MIDI-like events with loop NRPNs 20 and 30; the package tiles exactly
(`measured`, 119 of 119; [audio](../../formats/audio.md#sep-package)). The player calls
`SsSepPlay`, `SsSepStop`, `SsSepSetVol` and `SsSepSetCrescendo` (`read` in [audio](../../formats/audio.md#sound-control)).
The area-to-BGM map is `unknown`.

**Constraints.** Resolution is 48 ticks per quarter in 476 of 476 sequences; each package keeps four
sequences with ids 0-3; the VAB beside it supplies the sounds (program numbers must exist in that
bank). Running status and minimal delta encoding are reproduced by the encoder
(`measured`: 508,471 of 508,471 events). A package can grow only within its archive's sectors; the
BGM bank must fit its SPU allotment (`unknown`).

**Editing.** A sequence converts to a MIDI file and back. Round trip: 119 of 119 packages (476 sequences) read back to their stored bytes (`measured`). Conversion to MIDI is lossy for tempo (the source has no tempo meta event, 476 of 476).

**Test and unknowns.** Play the result; the raw `.seq` and `.vab` bytes are stored unchanged (`measured`). Unknown: the loop semantics beyond the observed NRPN pairs.

## 6. Soundbanks (VAB, tones, samples)

**Where.** Types 6 (VH, 1,020) and 7 (VB, 1,020) in every audio-bearing archive. Header: 32-byte
`VabHdr`, 128 program records of 16 bytes, tone records of 32 bytes (`VagAtr`) at `0x820 + 512 *
b + 32 * tone`, where *b* counts only the program records with `tones != 0`, then the sample size table ([audio](../../formats/audio.md#vab-bank)).

**Layout and reader.** `EMI_LoaderLoadVabHeader` and `EMI_LoaderLoadVabBody` (`SsVabOpenHeadSticky`,
`SsVabTransBodyPartly`). `fsize` equals the VH size plus the VB size in 1,020 of 1,020 banks (`measured`); every
header starts `pBAV`.

**Constraints.** The VB is SPU ADPCM in 16-byte blocks; header and body are paired through the TOC
selector (header selectors cover the type-8 selectors in 731 of 731 containers, `measured`). A bank
that grows can overrun its SPU slot (limit `unknown`). Tone count must stay within the cue table's
references (8,601 of 8,608 records).

**Editing.** Raw: replace the `.vh` and `.vb` entries (lossless). SoundFont conversion: 0 of 1,020 banks return their own bytes (the ADPCM encoder picks an equivalent filter and shift); a second generation is stable, 1,020 of 1,020. Samples: 0 of 4,482 byte-identical (the encoding drops the trailing end-marker block and the loop flags). The raw path is the safe one.

**Test and unknowns.** Decode the bank again and compare; listen to it. Unknown: whether the
4,482-sample byte difference matters for decoded audio (decoded-audio equality is not resolved).

## 7. XA streams

**Where.** `BIN/SCE_XA/S_XA00.STR`, `BIN/SCE_XA/VOICE.STR`, `BIN/BMAG_XA/MAGIC00.STR`; video in
`LOGO/CAPCOM30.STR`. Each is a Form 2 audio stream of 2,336-byte stored sectors.

**Layout and reader.** `SND_ResolveXaStream` (`exe/slus_004_22@0x80163744`) maps `(stream << 12) | cue`
to a first and last sector through the cue arrays in the executable; `SND_XaStateSeek` and
`SND_XaStateRead` set the filter (`CdlSetfilter`) and read with `CdlReadS`. Counts and the sector
classes are in [STR](../../formats/str.md#xa-cue-tables) (`measured`: 880 and 5 cues; 0 bad; the 11 `S_XA00.STR` cues are `inferred` because the array end is unbounded).

**Constraints.** The file keeps its sector count and start LBA. Cue boundaries are `u16` periods
(8 or 16 sectors) stored in `SLUS_004.22`, so a longer clip needs both new audio and new cue values.
`S_XA00.STR` is 72% non-audio sectors that the filter drops. The executable's own disc table must
keep each file's LBA.

**Editing.** Not editable today. A Form 2 file cannot be replaced, and nothing encodes ADPCM into XA sectors. Missing: an XA encoder that writes the 8-byte subheader (file, channel, submode, coding), 18 sound groups per sector, and EDC for Form 2. The cue values can be edited in the executable.

**Test and unknowns.** Compare sector classes and cues against the originals ([STR](../../formats/str.md)). Unknown: the content of the Form 1 sectors, and the end of `S_XA00`'s cue array.

## 8. Character and monster sprites, animation, palettes

**Where.** Character banks: `PLCHAR` (19 LZ77 containers at `0x8003B800`), `BPLCHAR` (45 LZ77 containers, 1 raw container, 75
standalone sections) and `BMAGIC` (3 blocks): 144 blobs in all ([character](../../formats/character.md#load-arguments)). The palette tables sit inside the decoded bank. **Monster sprites are not located**: `BENEMY` holds audio only (600 entries, kinds
`audio-bank` and `audio-cues`, `measured`).

**Layout and reader.** Container, sections, nodes and the palette layer: [character](../../formats/character.md)
(the 3 `BMAGIC` blocks `KAIZAR_D`, `KAIZAR_F`, `KAIZAR_N` have no palette layer, so 141 of 144 decode). Pixel and script bytes inside a node are not decoded
(`unknown`).

**Constraints.** The bank is LZ77; nothing recompresses it, so a changed decoded bank cannot be
stored today (`measured`: a decoded bank is the only form that comes back). Load window `0x8003B800`; the bank must fit the window and the archive's sectors.

**Editing.** Palette tables only: 141 of 144 blobs round trip, and the palette tables cover 44,948 of 27,612,136 decoded bytes (0.16%). Pixels, animation and the LZ77 stream are read-only.

**Test and unknowns.** Decode the palettes again and compare; view them. Unknown: node pixel
format, animation script, the location of monster sprites, the flag bits of `flags | offset` pairs.

## 9. Character and monster stats

**Where.** Eight playable characters: 8 records of `0xA4` bytes at payload `0x1A914` in
`ETC/START.EMI#8` and `ETC/STATUS.EMI#0`; the two entries are byte-identical (117,986 bytes,
`measured`) and both load at `0x801D0C00`, so the table sits at `0x801D0C00 + 0x1A914` once loaded (`inferred` from the load address).
Monsters: eight `Enemy` records of `0x88` bytes in the 1,160-byte encounter block of each area
archive (200 archives, entry loaded at `0x800E4000`).

**Layout and reader.** `Character` is one `0xA4`-byte record; the eight records start at
`0x80144968` once loaded. Level-up reader: `func_801ADDD4` (`emi/etc/game/00@0x801ADDD4`).
Field groups are in [records](../records.md#character-and-master-data). Offsets:

| Offset        | Width    | Field                                                                                            |
| ------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `0x00`        | 5 bytes  | name                                                                                             |
| `0x05`        | u8       | character id                                                                                     |
| `0x06`        | u8       | level                                                                                            |
| `0x07`        | u8       | party-row flags (bit 0 selects the rows listed by `func_801E0F78`, `emi/etc/shop/00@0x801E0F78`) |
| `0x08`        | u32      | experience                                                                                       |
| `0x0C`        | u16      | status flags                                                                                     |
| `0x0E`-`0x11` | 4 x u8   | weapon, shield, helmet, armor                                                                    |
| `0x12`        | 2 x u8   | accessories                                                                                      |
| `0x14`        | u16      | current HP                                                                                       |
| `0x16`        | u16      | current AP                                                                                       |
| `0x18`        | u8       | current willpower                                                                                |
| `0x19`        | u8       | inoculations                                                                                     |
| `0x1A`        | u8       | fatigue                                                                                          |
| `0x1B`        | u8       | master id                                                                                        |
| `0x1C`-`0x26` | 6 x u16  | max HP, max AP, power, defense, agility, intellect                                               |
| `0x28`        | u16      | unknown                                                                                          |
| `0x2A`        | u8       | willpower                                                                                        |
| `0x2B`        | 9 x u8   | resistances                                                                                      |
| `0x34`-`0x38` | 5 x u8   | surprise chance, reprisal chance, critical chance, evasion, accuracy                             |
| `0x39`        | 3 bytes  | unknown                                                                                          |
| `0x3C`-`0x46` | 6 x u16  | base HP, AP, power, defense, agility, intellect                                                  |
| `0x48`        | u16      | unknown                                                                                          |
| `0x4A`        | u8       | base willpower                                                                                   |
| `0x4B`        | 9 x u8   | base resistances                                                                                 |
| `0x54`-`0x58` | 5 x u8   | base surprise, reprisal, critical, evasion, accuracy                                             |
| `0x59`        | 3 bytes  | unknown                                                                                          |
| `0x5C`        | 10 x u8  | healing abilities                                                                                |
| `0x66`        | 10 x u8  | assist abilities                                                                                 |
| `0x70`        | 10 x u8  | attack abilities                                                                                 |
| `0x7A`        | 10 x u8  | skill abilities                                                                                  |
| `0x84`        | u8       | unknown                                                                                          |
| `0x85`        | 6 x u8   | level-up modifiers                                                                               |
| `0x8B`        | 25 bytes | unknown                                                                                          |

The eight records follow a block header: the window-style byte sits at `0x80144952`, `0x16` bytes
before the first record. The shop overlay reads the skill-ability bytes at `0x90` from the block
base (`0x16 + 0x7A`; `emi/etc/shop/00@0x801E1710`). Level growth is a separate `0x08`-byte row:
`u16` experience at `0x00`, HP `0x02`, AP `0x03`, packed power/defense `0x04`, packed
agility/intellect `0x05`, ability `0x06`, extra ability `0x07`.

`Enemy` is one `0x88`-byte record. The encounter picker is `func_801C6A7C` (`emi/etc/game/00@0x801C6A7C`).

| Offset        | Width    | Field                                             |
| ------------- | -------- | ------------------------------------------------- |
| `0x00`        | 8 bytes  | name                                              |
| `0x08`        | u16      | enemy id                                          |
| `0x0A`        | u8       | choice AI                                         |
| `0x0B`        | 3 bytes  | unknown                                           |
| `0x0E`        | u8       | target preference                                 |
| `0x0F`        | u8       | unknown                                           |
| `0x10`        | u16      | zenny                                             |
| `0x12`        | u16      | experience                                        |
| `0x14`        | u8       | level                                             |
| `0x15`        | 3 bytes  | unknown                                           |
| `0x18`        | 8 x u8   | initial skills                                    |
| `0x20`-`0x2A` | 6 x u16  | HP, AP, power, defense, agility, intellect        |
| `0x2C`        | u8, u8   | steal item index, steal item type                 |
| `0x2E`        | u16      | steal rate                                        |
| `0x30`        | u8, u8   | drop item index, drop item type                   |
| `0x32`        | u16      | drop rate                                         |
| `0x34`        | 4 x 0x10 | AI blocks: condition (u8), 7 parameters, 8 skills |
| `0x74`        | 4 bytes  | unknown                                           |
| `0x78`        | 9 x u8   | resistances                                       |
| `0x81`        | 7 bytes  | unknown                                           |

**Constraints.** Both character copies must change together; which overlay a screen reads is `unknown`. Record count and stride are fixed; the block is 1,160
bytes in all 200 archives (`measured`).

**Editing.** Characters: 1 of 1 entry (8 characters, 117,986 bytes identical, `measured`); name fields use the name encoding. Encounter blocks: 200 of 200 rebuild from their named fields, with the stored block as base. Then rebuild both archives.

**Test and unknowns.** Start a new game and open the status screen; fight the edited encounter.
Unknown: the five `unk_` spans of `Enemy`, the `Character` bytes marked `unk`, and which overlay a
given screen reads.

## 10. Items, skills, magic, shops, drops and other records

**Where.** `ETC/GAME.EMI` entry 0 (229,720 bytes, load `0x80195800`) holds eight tables: items
(92 x 18), vital items (16 x 16), weapons (83 x 24), armor (68 x 22), accessories (52 x 20), shops
(40 x 23), abilities (228 x 20) and level growth (693 x 8), at archive offsets `0x33964`, `0x33FDC`,
`0x340DC`, `0x348A4`, `0x34E7C`, `0x3528C`, `0x3570C`, `0x368DC` (`read`; [records](../records.md)).
Each table's span occurs exactly once in entry 0 (`measured`, 8 of 8). Drops and steals are fields of the `Enemy` record (class 9).
Master skills and stats: `ETC/SISYOU.EMI#0`.

**Layout and reader.** The item dispatcher `slus_004_22@0x80165D48` reads category, base and stride
(`read`: items `0x801C8964` stride `0x12`, weapons `0x801C90DC` `0x18`, armor `0x801C98A4` `0x16`,
accessories `0x801C9E7C` `0x14`, vital `0x801C8FDC` `0x10`). Level growth: `character * 99 + level - 1`, with character 0 to 6 (693 rows = 7 x 99).
Record offsets (all names are 12 bytes at `0x00`; descriptions are 16-bit resource ids):

| Table      | Stride | Fields                                                                                                                                                      |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item       | `0x12` | flags `0x0C`, unknown `0x0D`, description `0x0E`, price `0x10`                                                                                              |
| Vital item | `0x10` | description `0x0C`, unknown `0x0E`                                                                                                                          |
| Weapon     | `0x18` | equipability `0x0C`, flags `0x0D`, kind `0x0E`, element `0x0F`, weight `0x10`, sound `0x11`, power `0x12`, unknown `0x13`, description `0x14`, price `0x16` |
| Armor      | `0x16` | equipability `0x0C`, flags `0x0D`, equip type `0x0E`, weight `0x0F`, power `0x10`, unknown `0x11`, description `0x12`, price `0x14`                         |
| Accessory  | `0x14` | equipability `0x0C`, flags `0x0D`, kind `0x0E`, weight `0x0F`, description `0x10`, price `0x12`                                                             |
| Ability    | `0x14` | targeting flags `0x0C`, type `0x0D`, cost `0x0E`, power `0x0F`, element `0x10`, ability flags `0x11`, description `0x12`                                    |

The weapon `sound` byte is a cue-table index (`func_800AB834` (emi/battle/battle/15@0x800AB834), `func_800AB910` (emi/battle/battle/15@0x800AB910)).

**Constraints.** Record counts are compiled into code (`92`, `228` and so on), so adding rows
needs a code change. Names are 12 bytes and need no terminator when full
([records](../records.md#gameemi-fixed-tables)). The tables follow `ETC/GAME.EMI#0`, which must not move: the runtime address is
`0x80195800 + payload offset`. Descriptions are 16-bit resource ids into the `0x8001A000` table.

**Editing.** A table rewrites from its named fields over the stored entry 0. The rewritten span is only the table (for example 4,560 bytes for abilities): splice it at the table's payload offset (archive offset minus `0x800`) into entry 0. Round trip: 8 of 8 tables match their stored span, and splicing each back into entry 0 reproduces the entry 8 of 8 (`measured`).

**Test and unknowns.** Check the item in the shop and the menu. Unknown: the unnamed bytes (one in
`Item`, others), what `kind`'s high nibble does, and the effect of `ability.flags` bits beyond those
named.

## 11. Maps, collision, area and event scripts

**Where.** Each `WORLD00`-`WORLD04` archive (200) has: map bundle (`0x80104000`, 10,247,719 bytes
in all), cell grid (`0x80032000`, 5,000 bytes, 191 non-zero), message bank, script bank
(`0x800D3800`), scene table (`0x800E3800`), encounter block (`0x800E4000`), textures, palettes,
a sound bank and the area program (`0x801F2C00`). Slot = `area + 0x2AB`.

**Layout and reader.** [area](../../formats/area.md) gives every window: `Actor_BeginScript`
`Actor_BeginScript (exe/slus_004_22@0x8014D6DC)` reads the script bank; `func_801C6FD4` (`etc/game/00`) reads the
cells; the scene table and actor definitions are in [area](../../formats/area.md#0x800e3800-scenestep-table) (actor id match key `Area_FindSceneRecord (slus_004_22@0x8014DD3C)`). Script directory and section offsets are read;
the record opcodes are not decoded (`unknown`). The meaning of the cell values (collision classes)
is `unknown`. The map bundle header has unnamed fields ([area](../../formats/area.md)).

**Constraints.** Windows (`measured` over 200 archives): script bank peak 65,236 of 65,536 bytes
(`AREA197#4`, 300 bytes of headroom); area program peak 16,324 of 16,384 (`AREA135#14`, 60 bytes
of headroom); scene table peak 412 of 2,048; message peak 21,547. A rebuilt map bundle keeps its width and height, and its corner count and
heights (in steps of 16); UV edits in a mesh are ignored (`measured`).

**Editing.** Terrain meshes (glTF 200 of 200, OBJ 200 of 200), the layout lists (200 of 200) and encounter blocks (200 of 200) round trip. Cells, actor definitions and the script bank have no decoder that writes back; a decoded script cannot rebuild its bytes (0 of 200). Raw byte edits of the entries work through the container.

**Test and unknowns.** Enter the area; check the collision by walking. Unknown: script opcodes, cell
classes, the three map `unk_` spans, the consumers of the `0x80117000` modules (9 archives).

## 12. Textures and VRAM layout

**Where.** 593 type-3 entries (112,312,320 bytes) and 620 palette entries (CLUT banks of 16 or 256
colors, 1,121,696 bytes) in 8 of the 14 families. The load argument is `col(31:24) | row(23:16) |
count(15:8)`: first 32-word column, first 32-row, rectangles per row (`read`,
`EMI_LoaderLoadGraphics (slus_004_22@0x80162698)`).

**Layout and reader.** A payload is 0x800-byte chunks, each a 32x32-word rectangle (`measured`: every
payload a multiple of `0x800`, 593 of 593). `EMI_LoaderUploadSector` (`@0x80163378`) calls
`LoadImage` per chunk. CLUTs live in the palette arena (VRAM rows 480-511); a CLUT word is `(x / 16)
| (y << 6)`. Depth and palette are proven for 212 textures (890 rows); 381 textures have none
([graphics](../../formats/graphics.md), [assets](../../formats/assets.md#coverage)).

**Constraints.** The payload size is fixed by the rectangle count; the sum of uploads must fit the
1,024 x 512-word VRAM next to the frame buffers and the palette arena. Several sheets cover the same
words (for example `AREA024` slots 5 and 7); which is resident depends on stream order. Indexed
edits must keep the palette row the texture joins to. A palette bank is 512 bytes (256 colors) or
32 bytes (16 colors) in fixed arena slots.

**Editing.** A 16-bit view and an indexed view of a texture read back to the stored words; palettes are edited by colour word. Round trip: 593 of 593 16-bit views, 890 of 890 indexed views, 620 of 620 palettes (`measured`).

**Test and unknowns.** Decode the texture and palette again and compare; look at
the screen. Unknown: depth and palette of the 381 other textures, battle background joins, textures
used outside their archive.

## 13. Save data

**Where.** A 1-block memory-card file named `BASLUS-00422BOF3` + `%02d`; there is no file on the
disc. Layout: [save](../../formats/save.md) (header `0x200`, payload `0x10B0` at `0x200`, checksum
halfword at `0x270`, stored length `0x12B0`).

**Layout and reader.** The persistent block and where each field sits are in [state](state.md#one-persistent-block). `func_801E5A00` (load) and `func_801D69E0` (save) in the `etc/start/08` and
`etc/shop/00` overlays; `CardBuildFileHeader` (`func_801EF27C`); fields in
[records](../records.md#save-layout).

**Constraints.** The load routine checks only the 16-bit byte sum of `0x200..0x12AF` with the slot
zeroed; the payload offsets are RAM-linked (file offset = RAM address minus `0x801446D8`), so field
widths are fixed. The icon records are in `START.EMI#9` and `SHOP.EMI#8`.

**Editing.** By hand: edit bytes in `0x200..0x12AF`, zero the halfword at `0x270`, sum, store the low 16 bits (steps in [save](../../formats/save.md#checksum)). No save file is on the disc, so no round trip was run (`unknown`). State map and unclassified spans: [state](state.md#one-persistent-block), [gaps](gaps.md).

**Test and unknowns.** Load the edited file in the game or an emulator; a wrong sum shows the error
cue (`g_SaveCardStatus` 7). Unknown: the unnamed payload bytes, whether the BIOS verifies the `"SC"`
header, and the seventh title digit.

---

## Readiness

`yes` means every field an editor must change has a cited reader or a measured check across all
instances. `partly` marks a class where a field, an instance family or the write path is missing.
`no` means none. Round trip is `yes` only when a run reproduced the stored bytes for every instance.

|  # | Asset class                             | Read-documented | Write-documented | Round-trip proven | Unknowns                                                                                                                                                   |
| -: | --------------------------------------- | --------------- | ---------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1 | UI layouts and windows                  | partly          | no               | no                | argument units, style table, per-screen owner                                                                                                              |
|  2 | Fonts and text encoding                 | partly          | partly           | yes               | font page `inferred`, kanji page use unknown, 21-column sheet page                                                                                         |
|  3 | Strings and dialogue                    | yes             | yes              | yes               | glyph-less bytes, id-to-string map                                                                                                                         |
|  4 | Sound effects                           | yes             | partly           | partly            | cue byte 2 low nibble, SPU RAM budget; no cue field editor                                                                                                 |
|  5 | Music sequences and MIDI                | yes             | yes              | yes               | area-to-BGM map, loop semantics                                                                                                                            |
|  6 | Soundbanks                              | partly          | partly           | partly            | `ProgAtr` field table missing; SoundFont and VAG conversions are lossy; SPU budget                                                                         |
|  7 | XA streams                              | partly          | no               | no                | Form 1 sector content, S_XA00 cue end; no encoder                                                                                                          |
|  8 | Sprites, animation, palettes            | partly          | partly           | partly            | node pixel format, animation, monster sprites                                                                                                              |
|  9 | Character and monster stats             | partly          | yes              | yes               | `Enemy` and `Character` `unk_` spans                                                                                                                       |
| 10 | Items, skills, magic, shops, drops      | partly          | partly           | partly            | no field table for shops or master skills; the `0xE8`-byte table `D_801CA624` between shops and abilities is undescribed; unnamed bytes, ability flag bits |
| 11 | Maps, collision, area and event scripts | partly          | partly           | partly            | maps only; area script record opcodes are undecoded (scripts: read no, write no); cell classes, map `unk_` spans                                           |
| 12 | Textures and VRAM layout                | partly          | yes              | yes               | depth and palette of 381 textures                                                                                                                          |
| 13 | Save data                               | partly          | partly           | no                | about 74% of the block is classified ([state](state.md#one-persistent-block)), unknown spans in [gaps](gaps.md); no round trip run                         |

Counts per column (13 classes): read-documented 3 yes, 10 partly, 0 no; write-documented 4 yes, 7
partly, 2 no; round-trip proven 5 yes, 5 partly, 3 no.

### Round-trip results

Each row is a decode and encode run without edits, compared byte for byte over every instance on the
disc (`measured`). The result column is the number of instances that return their own bytes.

| Path                                        | Classes  | Result                                        | Verdict                                                       |
| ------------------------------------------- | -------- | --------------------------------------------- | ------------------------------------------------------------- |
| EMI unpack and repack with the TOC data     | all      | 880 of 880                                    | lossless                                                      |
| EMI unpack and repack without the TOC data  | all      | 0 of 20 sampled                               | lossy: entry types and load addresses are lost                |
| message bank to text and back               | 3        | 200 of 200 area banks, 165 of 165 other banks | lossless                                                      |
| strings to text and back                    | 3        | 275 of 275 payloads                           | lossless (count unresolved, [gaps](gaps.md#strings))          |
| SEP package from its MIDI files             | 5        | 119 of 119                                    | lossless                                                      |
| character records to text and back          | 9        | 1 of 1 (8 characters)                         | lossless                                                      |
| encounter blocks from named fields          | 9        | 200 of 200                                    | lossless                                                      |
| fixed tables from named fields              | 10       | 8 of 8                                        | lossless                                                      |
| terrain mesh and layout lists               | 11       | 200 of 200 each                               | lossless for maps; a decoded script rebuilds 0 of 200         |
| save file                                   | 13       | none run                                      | no round trip evidence                                        |
| texture to 16 bpp view and back             | 2, 12    | 593 of 593                                    | lossless                                                      |
| texture to indexed view and back            | 2, 12    | 890 of 890                                    | lossless                                                      |
| palette to colour words and back            | 2, 8, 12 | 620 of 620                                    | lossless                                                      |
| VAB to SoundFont and back                   | 6        | 0 of 1,020                                    | lossy: the ADPCM encoder picks an equivalent filter and shift |
| VAB header and body swapped as stored bytes | 4, 6     | 2,040 of 2,040                                | lossless (1,020 banks, two entries each)                      |
| VAG to WAVE and back                        | 6        | 0 of 4,482                                    | lossy: the encoding drops the end-marker block and loop flags |
| cue tables, area scripts, actor definitions | 4, 11    | no field editor                               | edit the entry bytes by hand and rebuild the archive          |
| XA and STR streams, CDDA tracks             | 7        | no editor                                     | none                                                          |
