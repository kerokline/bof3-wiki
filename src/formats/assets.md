# Asset kinds

*Read this if you want a decoded form of a disc file kind, with its joins, limits and unknowns.*

How the disc's content falls into kinds, how a texture finds its palette, how the terrain, sound, enemy, table and text data decode, and what is still unknown. A kind is a name this wiki gives to a class of disc content, such as `area-map`, `texture` or `audio-bank`. The byte-level layouts are in the format pages ([EMI](emi.md), [game records](../game/records.md), [text](../game/text.md)); this page adds the joins, the decoded forms and the open questions. Terms are in the [glossary](../glossary.md).

## Textures and palettes

### Reading a texture

The stored layouts are on the [graphics page](graphics.md): type-3 VRAM uploads and their load argument, CLUT banks, the palette arena, and the [VRAM coordinates](graphics.md#vram-coordinates) that join them.

A texture is a block of 16-bit VRAM words. A 16 bpp reading takes each word as one pixel: its three 5-bit channels expand to 8 bits, and alpha is 0 for `0x0000` (the GPU never draws it), 128 when the STP bit is set and 255 otherwise. A 4 bpp or 8 bpp texture reads as noise in that view. An indexed reading needs a palette row: its bit depth is the texel depth (4 or 8) and its palette holds the row's words in the same encoding. A texture and one CLUT row are exactly what a Sony TIM file holds (the layout is in Sony's *File Formats* manual, chapter 3); the game stores no TIM of its own.

### The join rule

A texture's palette is known only from a draw site. A site names a texture page (`tpage`) and a
CLUT (`clut`), both as literals in the same function. A site joins when exactly one sheet in its archive
covers the page and exactly one bank in that archive holds the CLUT row. Anything else is not joined: two candidates stay unresolved, and this wiki does not guess between them.

Draw sites whose page or CLUT depends on runtime state are not joined sites: `GetGraphType()`, a caller
argument, a branch, or a table.

### Texture evidence

Every CLUT and TPage write in the game code was resolved from literals and `GetClut` / `GetTPage`
calls. "Literal" means the value needs no runtime input, and "conditional" means it depends on
`GetGraphType()`. `Family` means the CLUT column is a function of a caller argument. Rows are
keyed by the archive that holds the overlay (`BIN/...#entry`).

| Archive, overlay                             | Function                                                                                                                                 | tpage (decoded)                                                        | clut (decoded)                                          | Status                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `WORLD00/AREA024.EMI#14`                     | `func_801F2DF8 (emi/world00/area024/14@0x801F2DF8)`                                                                                      | `0x003B` (4bpp, abr 1, page (704, 256))                                | `0x78CA` ((160, 483))                                   | **Joined**: sheet slot 7, bank slot 8                                            |
| `SCENARIO/SCENA00.EMI#0`                     | `func_801F6E48 (emi/scenario/scena00/00@0x801F6E48)`                                                                                     | `0x001B` (4bpp, (704, 256))                                            | `0x78CB` ((176, 483))                                   | Literal; no sheet in the archive                                                 |
| `WORLD00/AREA030.EMI#4`                      | `func_801D2C34 (emi/world00/area030/04@0x801D2C34)`                                                                                      | `GetGraphType` ? `0x229` (4bpp, (576, 0)) : `0x99` (8bpp, (576, 256))  | `0x7A40` ((0, 489))                                     | Conditional                                                                      |
| `WORLD00/AREA030.EMI#5`                      | `func_800F5E44 (emi/world00/area030/05@0x800F5E44)`                                                                                      | `GetGraphType` ? `0x225` (4bpp, (320, 0)) : `0x95` (8bpp, (320, 256))  | `0x7A80` ((0, 490))                                     | Conditional                                                                      |
| `WORLD00/AREA016.EMI#13`                     | `func_801F39D8 (emi/world00/area016/13@0x801F39D8)`                                                                                      | `GetGraphType` ? `0x22C` (4bpp, (768, 0)) : `0x9C` (8bpp, (768, 256))  | `0x7B80` ((0, 494))                                     | Conditional                                                                      |
| `WORLD00/AREA016.EMI#13`                     | `func_801F4768 (emi/world00/area016/13@0x801F4768)`                                                                                      | `GetGraphType` ? `0x12B` (15bpp, (704, 0)) : `0x5B` (4bpp, (704, 256)) | `0x78CB` ((176, 483))                                   | Conditional                                                                      |
| `SCENARIO/SCENA00.EMI#0`                     | `func_801F7134 (emi/scenario/scena00/00@0x801F7134)`                                                                                     | `0x32D` / `0xDD` by branch                                             | `0x7A80` ((0, 490))                                     | Branch                                                                           |
| `ETC/SHOP.EMI#0`                             | `Menu_DrawIcon (emi/etc/shop/00@0x801DA00C)`                                                                                             | `GetGraphType` ? `0x8F` (8bpp, (960, 0)) : `0x2F` (4bpp, (960, 256))   | `0x7800` ((0, 480))                                     | Conditional                                                                      |
| `ETC/SISYOU.EMI#0`                           | `Menu_DrawPortrait (emi/etc/sisyou/00@0x801D23A0)`                                                                                       | `GetGraphType` ? `0x2E` : `0x1E` (4bpp, (896, 0 / 256))                | `getClut(entry[2], entry[3] + 0x1E0)`                   | Conditional, variable                                                            |
| `SCENARIO/SCE10EFF.EMI#0`                    | `func_801D165C (emi/scenario/sce10eff/00@0x801D165C)`                                                                                    | `0xA5` or `0x35` by `GetGraphType`                                     | none in function                                        | Conditional                                                                      |
| `WORLD00/AREA008.EMI#13`, `ETC/SISYOU.EMI#0` | `func_801F3D88 (emi/world00/area008/13@0x801F3D88)`, `func_801D1E54 (emi/etc/sisyou/00@0x801D1E54)`                                      | `0x0F` (4bpp, (960, 0))                                                | `GetClut(clut_x, 0x1E1)`, `clut_x = (arg4 << 5) + 0x10` | Family: row 481, column `2 x arg4 + 1`                                           |
| `BATTLE/BATTLE.EMI#3`                        | `func_801D7D10 (emi/battle/battle/03@0x801D7D10)`                                                                                        | `GetTPage(0, 0, 0x100, 0x100)` = `0x14` (4bpp, (256, 256))             | `(table[arg0] & 0x3F) \| 0x7800`, row 480               | Table: 7 bytes at `0x801D0C64`; the texture is not at (256, 256) in `BATTLE.EMI` |
| `BATTLE/BATTLE.EMI#3`                        | `func_801D94D4 (emi/battle/battle/03@0x801D94D4)`, `func_801D9804 (emi/battle/battle/03@0x801D9804)`                                     | none in function                                                       | `GetClut((arg2 & 0xFF) << 4, 0x1E0)`                    | Family: row 480, column from `arg2`                                              |
| `ETC/GAME.EMI#0`                             | `UI_DrawSprite (emi/etc/game/00@0x801AF2A0)`, `func_801AE984 (emi/etc/game/00@0x801AE984)`                                               | none in function                                                       | `(176, 481)`, `(128, 482)`, `(192, 480)`                | CLUT only                                                                        |
| `ETC/GAME.EMI#0`                             | `UI_DrawSpriteRun (emi/etc/game/00@0x801AF390)`                                                                                          | `832` / `896` (modes 2 and 3)                                          | none in function                                        | Not a texture page                                                               |
| `exe/slus_004_22`                            | `func_8014F704 (exe/slus_004_22@0x8014F704)`, `func_8014FC00 (exe/slus_004_22@0x8014FC00)`, `func_801647C4 (exe/slus_004_22@0x801647C4)` | `GetTPage(1, p4, 0x140, 0)`, `\| 0x2F`; clut `0x7802`                  | -                                                       | Partial                                                                          |

The proven sites and the world-map terrain rule join **212 of the 593 type-3 textures to 890 palette
rows**, not one: 200 terrain sheets, nine area sprite sheets, two `AREA030` icon sheets and the
`BMAGIC/MAGIC218` effect sheet. [graphics](graphics.md#texture-to-palette-join) documents the rules. A site whose page or CLUT
depends on runtime state remains unjoined.

### The runtime condition

`GetGraphType()` reads the byte `D_8018B15C` (`exe/slus_004_22@0x8017B2B4`). The only writer is
`ResetGraph` (`exe/slus_004_22@0x8017AF0C`): after `jal _reset` at `0x8017AFB4`, `sb $v0, 0($s0)`
at `0x8017AFC4` stores the return value of `_reset` (`@0x8017DA54`). Two callers pass a mode:
`SYS_InitHardware` (`ResetGraph(0)` on first boot, `ResetGraph(3)` later) and the logo overlay
(`ResetGraph(0)`). The US disc therefore runs graph type 0: `_reset(3)` returns 0, and
`ResetGraph(0)` returns `_version(0)`, zero when its GPU-status probe fails. This is a high-confidence
inference, not a hardware capture ([graphics](graphics.md#palette-words-and-runtime-records)).

A data check confirms it for the terrain: every one of the 105,308 descriptors has bit 31 clear
(8bpp), and the 8bpp decode selects a page and bank that exist in the archive.

### Coverage

Counts are for the retail disc.

| Kind                          | Entries | Stored bytes |         Proven palette |
| ----------------------------- | ------: | -----------: | ---------------------: |
| Texture (type 3)              |     593 |  112,312,320 | 212 textures, 890 rows |
| Palette (type 0 in the arena) |     620 |    1,121,696 |                      - |

The remaining 381 textures have no proven depth or palette; 212 textures have at least one rule. A row is not proven when two sheets cover the page or two banks disagree.

### Unknowns, ranked by bytes left unexplained

1. **Battle, `SCENARIO` and `ETC` sites.** Their pages and CLUTs come from tables, caller arguments
   or cross-archive banks. `BATTLE.EMI` has no row-506 bank; `BATL_OVR` and `BATL_DRA` disagree
   there. The join needs the resident banks of the scene, not the archive alone.
2. **Family and table CLUTs (`BATTLE`, `AREA008`, `SISYOU`).** Row 480 and row 481 CLUTs come from
   caller arguments or the 7-byte table at `0x801D0C64`. Those values need the callers' arguments.
3. **Textures outside their archive.** The page used by `SCENA00` and the battle quads is not a sheet
   of the same archive, so the same-archive rule finds nothing there.
4. **Overlapping sheets.** Several sheets cover the same VRAM words (for example slots 5 and 7 of
   `AREA024`). Which upload is resident depends on the stream order (`EMI_LoaderUploadSector`).
5. **Texel depth without a site.** 4bpp, 8bpp or 15bpp is known only for the sites in the table and
   for a joined terrain descriptor; 381 textures still have no proven depth.

## Area terrain

A map bundle (`0x80104000`, kind `area-map`) decodes to a terrain mesh: Wavefront OBJ, glTF 2.0 or an equivalent, with the same corners and one primitive per tile-bank material. The layout is in [map bundle](area.md#0x80104000-map-bundle).

- **Corners.** Each cell is one quad on a unit grid, `x` the column and `z` the row. The mesh builder
  (`exe/slus_004_22@0x801530D0`) places corner `k` at the `(x, z)` step `(0,0)`, `(1,0)`, `(0,1)` and `(1,1)`
  from the cell's near corner, and corner `k` takes record byte `k` (loads at `0x801535A8` to `0x80153640`).
  The GTE vertex holds `-(byte << 4)`. A mesh uses `y = byte * 16`, so a larger byte is higher. A mesh
  face walks the perimeter (corners 0, 2, 3, 1), because the stored order would cross; that walk gives an
  upward normal.
- **Tile descriptor.** A cell's grid value indexes the 4-byte descriptor words. The selector (bits 28-29)
  names the material `bankN`. Mode `0` (bits 8-11) names a 16x16 block from the low byte; its far texels are
  15 from the near corner. Otherwise bit 11 picks rectangle bank A (index `& 0xFF`, `{dv, du, v, u}`) or quad
  bank B (index `& 0x7FF`, four UV pairs).
- **Tile corners.** `func_80155560 (exe/slus_004_22@0x80155560)` builds four UV pairs in corner order, then
  applies the corner-order flags in this order: bit 18 turns the corners a quarter (corners `2, 0, 3, 1`),
  bit 16 flips them across `x` (`1, 0, 3, 2`), and bit 17 flips them across `z` (`2, 3, 0, 1`). A bank B
  quad stores its pairs as `(v, u)` at bytes `(2-3, 0-1, 6-7, 4-5)`, which read as corners 0 to 3.
- **Height table.** 13 of 200 payloads ship the height-byte table, one signed byte per cell. The mesh builder never reads it; the height query `@0x8015477C` does. A mesh built from the corners does not
  apply it.
- **Not applied.** The CLUT index (bits 24-27) and the colour (bits 16-23) need runtime palette and colour
  words. The object list is not in the OBJ or the glTF.
- **Layout.** The bundle holds the byte code of each cell (one row per map row), the objects (each object's `tag` and its body words) and the height-byte table (or none). The header fields are in the [map bundle](area.md#0x80104000-map-bundle) table. Object meanings and the collision classes are open (same table).
- **Textures.** The materials carry no texture. A tile's page and palette are the texture association above,
  which is not proven for world maps.
- **Editing.** Each corner's height is its `y` divided by 16, and each corner must stay at its cell. A mesh does not carry the tiles, objects or height table, so the stored bundle supplies them. On the retail disc all 200 bundles return their stored bytes from a glTF mesh, from an OBJ mesh and from their byte-code, object and height lists (measured); that also checks the bundle codec on every bundle.

Coverage over the 200 retail bundles: 1,263,531 cells, of which 688,714 (54.5%) have a non-empty tile. Corner
heights range from -2048 to 2032 in 244 distinct values. Material runs: `bank0` 22,890, `bank1` 17,204,
`bank2` 9,032, `bank3` 33.

## Character banks

A sprite bank is a container of three sections (`BPLCHAR`, `PLCHAR`, and `ETC/START.EMI` entry 7 at `0x8003B800`),
or one section by itself (the section entries at `0x8003B80C` and its siblings). The section, node and
[palette layout](character.md#palette-layer) are on the character page.

The decoded palette tables can be changed and written back over the decoded bank; every other byte stays. The node data is not decoded: its frame tables, animation tables and pixel formats are open.

## Other data

Each structure below has its layout in the format pages here, with the reader addresses
that prove it. Five kinds are decoded: `area-actor-defs`, `area-encounters`, `area-map`, `area-script` and `audio-cues`. The rest are known by their stored bytes only.

| Kind              | Address      | Layout (size, fields)                                                                                                                                               | Reader evidence                                                                                                      | Status                                           |
| ----------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `area-message`    | `0x80010000` | `u16` slot array; `slot[0]` is the array's byte size; records between distinct slots                                                                                | `UI_DrawText` text draw; `emi/world00/area016/13@0x801F40C4`                                                         | 200 banks, 145 to 21,547 bytes                   |
| `area-cells`      | `0x80032000` | 5,000 bytes: 10,000 cells of 4 bits; index `x + width * y`, byte `index >> 1`, high nibble on even index                                                            | `func_801C6FD4 (emi/etc/game/00@0x801C6FD4)`; width is byte 0 of `0x80104000`                                        | not decoded                                      |
| `area-script`     | `0x800D3800` | directory `u32` (`4 * L`), section offsets, per section `2 * M` offset words (word 0 is `2 * M` and record 0's offset) and byte records tiling to the section end   | `Actor_BeginScript (exe/slus_004_22@0x8014D6DC)`; `g_ScriptBank` (`g_ScriptBank`)                                    | decoded; record opcodes not decoded              |
| `battle-script`   | `0x800F0800` | battle script bank, 3,692 bytes, byte-identical across 42 archives ([formats](emi.md))                                                                              | battle overlays swap it in during a battle (`func_800AD26C (emi/battle/battle/15@0x800AD26C)`)                       | not decoded                                      |
| `area-actor-defs` | `0x800E3800` | `u32 count` (4 to 51), then 8-byte records: `+0` `u16` id, `+2` `u16`, `+4` `u8`, `+5` `u8`, `+6` `u8` dispatch key, `+7` `u8` script section; size `4 + 8 * count` | `Area_FindSceneRecord (exe/slus_004_22@0x8014DD3C)`, `@0x80167E00`; `emi/etc/game/00@0x801ACE9C`                     | decoded; `+7` names a section of the script bank |
| `area-encounters` | `0x800E4000` | 1,160 bytes: 8 `Encounter` (9 bytes: `enemy_indexes[8]`, `appearance_rate`) and 8 `Enemy` (`0x88` bytes, `name[8]` first, `ai[4]` at `+0x34`)                       | `emi/etc/game/00@0x801C6A7C` (picker); enemy base `0x800E4048`                                                       | decoded (see [Enemies](#enemies))                |
| `resource-table`  | `0x8001A000` | group table: `u16` slots; a string is `0x8001A000 + base + u16[slot]`                                                                                               | `Resource_Resolve`, `Resource_Resolve`; 44 disc entries carry this load address ([text](../game/text.md#references)) | 16,248 strings by 16,558 ids                     |
| `bmagic-table`    | `0x800C3800` | not yet known                                                                                                                                                       | -                                                                                                                    | not decoded                                      |

The scene table's section index names a script section in the archive's own bank, and the scene
records cover every section (`max(+7) < L` in 200 of 200 payloads). In a message bank, `slot[0]` is the
byte size of the slot array, and the other slots are byte offsets of the records.

## EMI containers

A container rebuilds from its own entries: every entry keeps its payload, type and load address, and the container keeps its version. The payloads are laid out again, so a payload that changes size moves the entries after it. All 880 `.EMI` files rebuild byte-exactly from their own entries, and replacing one entry changes only that entry (measured). The rebuilt files seal into a disc image by the rules in [Sector sealing](#sector-sealing).

## Sector sealing

Replacing a file of the data track means writing its sectors again. The data track is Mode 2 Form 1. Each 2352-byte sector holds a 12-byte
sync, a 4-byte address, an 8-byte sub-header, 2048 user bytes, a 4-byte EDC and 276 bytes of parity.

- **EDC.** CRC-32 over bytes 16 to 2072 (sub-header and user data), with the reflected polynomial `0xD8018001`. It is
  stored little endian at 2072.
- **Parity.** The ECMA-130 Annex B product code over bytes 12 to 2248, with the address (bytes 12 to 16) counted as
  zero. P is 86 columns of 24 bytes at 2076. Q is 52 columns of 43 bytes at 2248, and it covers P.
- **Form 2.** XA and STR sectors (sub-header submode bit `0x20`) have no parity. They are copied as stored.

On the retail disc, all 161,720 Form 1 sectors match these rules. One sector past the last file (LBA 188323) keeps stray
parity bytes and does not match; it stays as stored. Rewriting every non-XA file with its own bytes gives a
byte-identical disc: 883 files and 128,479 sealed sectors (measured). Only the changed sectors and their directory record change.

A replacement file keeps the original sectors. It can shrink, but it cannot grow past its last sector, because the disc has no
room to move the files after it. The tail sectors of a shrunk file are zeroed. The directory record that holds the size
is rewritten (both byte orders), and its sector is sealed again. The audio track is unchanged.

## Sound

Music, sound banks and XA streams have these playable forms on the retail disc. A music item is one sequence of a SEP package, written as a Standard MIDI File. Its bank is the `.vh`/`.vb` pair of the same archive. A sample or an XA stream renders (loop mode off) to 16-bit PCM.

| Kind             |                      Playable items | Format                                                  |
| ---------------- | ----------------------------------: | ------------------------------------------------------- |
| `audio-sequence` |     289 music items of 119 archives | Standard MIDI File, `MThd` header                       |
| `audio-bank`     |                       6,707 samples | PCM, 44,100 Hz                                          |
| `xa-audio`       | 927 XA items (31 streams, 896 cues) | PCM, 37,800 Hz; the 31 streams are 22 mono and 9 stereo |

### SoundFont banks

A bank is a VAB header and a VAB body that share a load argument ([bank layout](audio.md#bank-layout)). A bank converts to a SoundFont 2 file. The file has one preset for each playable program, with the program's number, in
bank 0. A Standard MIDI File that selects program `p` on bank 0 therefore plays through the bank's preset `p`.

| VAB field               | SoundFont field                    | Mapping                                                                                 |
| ----------------------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| program record `p`      | preset `p`, bank 0, instrument `p` | one preset and one instrument per playable program                                      |
| tone min note, max note | zone key range                     | keys min note to max note                                                               |
| tone center note        | zone root key                      | the key that plays the sample at its recorded rate                                      |
| tone `shift`            | zone coarse and fine tune          | `shift / 128` semitone, rounded to the cent                                             |
| tone `vol`              | zone initial attenuation           | `200 * log10(127 / vol)` centibels                                                      |
| tone `pan`              | zone pan                           | `(pan - 64) * 500 / 64` tenths of a percent                                             |
| tone `vag`, VAG loop    | sample and sample loop             | VAG decoded to 16-bit PCM at 44,100 Hz; the loop from its loop frames                   |
| tone `adsr1`, `adsr2`   | volume envelope                    | attack and decay times, sustain level and release time, timed by the SPU envelope steps |

The envelope times are the ones the voice plays. The envelope steps once per output sample, as the SPU does, and the waits of each phase add up. Attack and decay are timed from full scale and from the decay's end
level. Release is timed from the level the decay ends on, which is where key off
starts it. Times become timecents, `1200 log2(seconds)`, between `-12000` and `8000`. Sustain becomes centibels
below full scale, `200 log10(0x8000 / level)`, with the level `(N + 1) * 800h` from the decay register.

Not mapped: the reverb send, the program's own volume and pan, and a sustain that changes after its start (a
SoundFont sustain holds its level). The PS1 exponential curves become SoundFont linear and decibel curves, so
the phase times match and the curve shapes do not. Tones with `vol` 0, an empty VAG, or a key range that is
empty are left out. Every phase of every register value moves at least one step, so the timing always ends; the
SoundFont default envelope remains the fallback for a register value that the timing rejects.

Retail check: 15,537 zones. Most have attack and decay at the shortest time (`-12000`) and sustain at full level
(`0`). The longest release is 7,885 timecents, about 95 seconds, from a slow-release register.

Checks on the retail disc: all 1,020 converted files parse, with every zone's sample in range and every loop inside its
sample.

A VAG at pitch `0x1000` plays at 44,100 Hz.

### Sequences

A SEP sequence converts to a format 0 Standard MIDI File with a tempo and a time signature at time zero and a second end-of-track. A MIDI file carries no sequence id, so a rebuilt package needs the id the package gives it. On the retail disc, all 476 sequences of the 119 packages read back from their MIDI, and the packages encode to their stored bytes (measured).

### Sample counts

The SoundFont banks hold 6,773 samples, and the playable list holds 6,707 samples. They share 6,572 samples.
Two groups make up the difference, and each was checked against the bank's tone table and the sample PCM:

| Group          | Samples | Why it is in one set only                                                                                                               |
| -------------- | ------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| SoundFont only |     201 | Every sample value is zero. An audible tone uses each one, so its zone stays. A silent sample is unplayable.                            |
| Playable only  |     135 | No tone of the bank uses them. Their PCM is not silent, so they are playable. No preset reaches them, so the SoundFont leaves them out. |

Net: 6,773 − 6,707 = 66 = 201 − 135.

A tone past its program's declared tone count still plays. The voice manager walks all up-to-16 tones of a block
([VAB bank](audio.md#vab-bank), "Tone selection layers every matching tone"), so the SoundFont keeps every usable slot
of each block. Sixteen samples in 16 banks are used only by such tones; the playable list and the SoundFont both
include them.

## Enemies

Each area's encounter block (`area-encounters`, `0x800E4000`, 1,160 bytes) holds eight encounters and eight
enemy records.

- **Encounters** (payload `0x00`, 9 bytes each, eight of them): `enemies` holds eight enemy indexes into the
  block's enemy list (`0xFF` is an empty slot), and `appearance_rate` is the chance the encounter appears.
- **Enemies** (payload `0x48`, `0x88` bytes each, eight of them): name (8 bytes, the table encoding), `enemy_id`
  (`0x08`), `choice_ai` (`0x0a`), `target_preference` (`0x0e`), `zenny` (`0x10`), `exp` (`0x12`), `level`
  (`0x14`), `initial_skills` (`0x18`), `hp` (`0x20`), `ap` (`0x22`), `power`, `defense`, `agility`,
  `intellect` (`0x24` to `0x2a`), `steal` and `drop` (item index and type at `0x2c` and `0x30`) with their rates
  (`0x2e`, `0x32`), four action blocks at `0x34`, `0x44`, `0x54` and `0x64` (condition, seven AI parameters, eight
  ability indexes; condition `0x63` marks an unused block), and `resistances` (nine levels at `0x78`: fire, frost,
  thunder, earth, wind, holy, psionic, status, death).
- The fields that [records](../game/records.md) leaves unnamed (`0x0b`, `0x0f`, `0x15`, `0x74` and `0x81`) are not named.
- **Editing.** Each named field sits at its byte; unnamed bytes keep their stored values. A name must fit in 8 bytes. On the retail disc, all 200 blocks rebuild their stored bytes from their named fields (measured).

HP `0xFFFF` appears in 10 of the 448 non-empty enemy records: Worker (two blocks), Operator, Miner, Engineer,
Foreman, Gary, Mogu, Nina and Garr (`enemy_id` 1108, the party-member variant that [records](../game/records.md) lists). The
battle setup copies the record's HP into the battler without a check. In the battle overlay,
`func_800AC218 (emi/battle/battle/15@0x800AC218)` loads the halfword at `0x800E4068 + index × 0x88` (`0x800AC448`) and stores it at battler
`+0xC0` and in the `D_801EB6C4` row (`0x800AC450`, `0x800AC45C`). HP `0xFFFF` is a sentinel, not a large HP
value: the damage step `Battle_ApplyDamage (emi/battle/battle/03@0x801DBB78)` skips the whole enemy HP change when the enemy battler's HP at `+0x94` is
`0xFFFF`, so the battler takes no damage. Two boss handlers also test it: `func_800C1A00 (emi/boss/boss002/16@0x800C1A00)` and
`func_800C1CDC (emi/boss/boss033/16@0x800C1CDC)` set the action type to 3 when the current enemy's HP is `0xFFFF`. The other `0xFFFF`
immediates in the battle overlays are the default-element argument of `Battle_CalcDamage (emi/battle/battle/03@0x801DC044)`. Open: the script that ends
these fights is not traced.

## Data tables

`ETC/GAME.EMI` entry 0 is a code image (one of the 548 `code` entries), and it holds eight fixed tables after its
code.

| Table          | Records | Record size | Archive offset | Fields (offset, size)                                                                                                                                |
| -------------- | ------: | ----------: | -------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`        |      92 |          18 |      `0x33964` | name (0, 12), flags (12, 1), price (16, 2)                                                                                                           |
| `vital-items`  |      16 |          16 |      `0x33fdc` | name (0, 12)                                                                                                                                         |
| `weapons`      |      83 |          24 |      `0x340dc` | name, equipability (12, 1), element (15, 1), weight (16, 1), power (18, 1), price (22, 2)                                                            |
| `armor`        |      68 |          22 |      `0x348a4` | name, equipability (12, 1), equip type (14, 1), weight (15, 1), power (16, 1), price (20, 2)                                                         |
| `accessories`  |      52 |          20 |      `0x34e7c` | name, equipability (12, 1), weight (15, 1), price (18, 2)                                                                                            |
| `shops`        |      40 |          23 |      `0x3528c` | count (0, 1), 11 slots of item type and item index (1, 22)                                                                                           |
| `abilities`    |     228 |          20 |      `0x3570c` | name, flags (12, 1), type (13, 1), cost (14, 1), power (15, 1), element (16, 1), ability flags (17, 1)                                               |
| `level-growth` |     693 |           8 |      `0x368dc` | exp (0, 2), hp (2, 1), ap (3, 1), power and defense (4, 1, nibbles), agility and intellect (5, 1, nibbles), ability (6, 1), ability candidate (7, 1) |

The archive offsets are file offsets. Subtract the payload start `0x800` for a payload-relative offset. The runtime
item base `0x801C8964` is the entry's load address `0x80195800` plus `0x33164`, which confirms the offset.

Names are 12 bytes in the table encoding: `0xFF` is a space, `0x8E` an apostrophe, `0x3D` a hyphen, `0x3E` a
period and `0x8B` a plus. `0x01` is a newline, and the colour codes `0x05` and `0x06` are dropped. A name ends at
its first `0x00`. Some names have no space in the stored bytes (for example `Gaea'sBreath`), so the text keeps
what is stored.

Checks on the retail disc: the counts match the layouts above, `Nothing` is item 0, `Green Apple` is item 1, and
the Dagger's equipability is `0x19`. Every name decodes with no leftover escape. The layouts are from
[data](../game/records.md), which lists the fields named so far; unnamed bytes
are left out.

### Characters

The eight playable characters are base-stat records in `ETC/START.EMI` entry 8, at payload offset `0x1A914`, 0xA4
bytes each. Each name is in the name encoding, with its `{TAG}` markers; the rest of the record is not typed yet. The string scan finds no fixed-width name field at stride 164 in `START.EMI` or `STATUS.EMI`, so these names are not in the string list. Measured on the retail disc: the records read Ryu, Nina, Garr, Teepo, Rei, Momo, Peco and Whelp and the entry round-trips.

## Message banks

The dialogue is in message banks: the 0x80010000 payloads in the area archives. Its bytes convert to text and back.

- **Layout.** A `u16` table. `offset[0]` is the table length in bytes, so the table has `offset[0] / 2` slots. A slot
  holds the offset of its message. A message runs to the next distinct offset, and the slots past the last message
  point at the end of the bank. The bank is the table, then the messages in offset order.
- **Slots.** A slot is its message's index, or none for the end of the bank.
- **Text.** Control codes are `{TAG}`. A code with an operand is `{TAG:hh}`, with one operand byte in two hex digits. A
  byte with no proven meaning is `{RAW:hh}`. Letters and digits are ASCII. The fullwidth `，` and `：` are the high
  slots `0x8D` and `0x8F`, so each byte keeps its own spelling. The codes and their evidence are in
  [text control codes](../game/text.md#control-codes).
- **Name fields and executables.** The name encoding reads a name field: the same codes, with `{END}` as the only
  single-byte code. The ASCII encoding reads an executable's C strings, with `{TAB}`, `{NEWLINE}` and `{CR}`.
- **Round trip.** `encode(decode(bytes)) == bytes` for every byte string. A bank that the layout rule does not lay out to its own bytes is not a text bank. An unknown tag, an operand that is not one byte, a character the encoding does not have and an empty message have no encoding.

On the retail disc, 200 entries load at 0x80010000 and all 200 are valid bank layouts, holding 11,336 messages in
152 distinct payloads. The bank rule keeps 165 of them
as text banks, in WORLD00 to WORLD04 (33, 33, 29, 30 and 40 archives), and 162 of those are in slot 11. Those 165 banks
hold 10,494 proven strings; all 10,510 messages decode. Every bank decodes
and encodes to its own bytes, every message encodes to its own bytes, and every archive rebuilt from its banks reads
back unchanged (measured).

> WARNING: rewriting a bank changes the slot table and the messages only. A message that changes length moves every message
> after it, so any other offset that points into the bank is stale afterwards. `{LINK:nn}` reads such an offset
> ([text control codes](../game/text.md#control-codes)). Check an edited bank in the game before it ships.

The other strings of an entry, names and records alike, are in [Game strings](#game-strings).

## Game strings

The strings outside message banks are found by a scan of the payloads. The names of the game tables and the enemy records are typed as well, and both forms use the name codec.

On the retail disc 831 payloads hold strings, 43,593 in all: 165 message banks with 10,510 messages, and 666 other payloads with 33,083 strings. The stored payloads stay with the kinds (`area-message`, `code`).

- **Kinds.** A name is a run of printable bytes that repeats at a fixed stride, found by a lattice search over the run
  starts. It is a name string with a stride. Any other string is a record that ends at its
  terminator, or where the pointer table that reaches it begins. A pointer table is two consecutive words that point
  inside the payload, so a payload with a load address (types 0 to 2 in the RAM window) has its pointer tables found.
- **Records.** A string is located by its offset and length; a name also has a stride. Control codes appear as `{TAG}` markers. The bytes between strings stay as they are.
- **Edits.** A name must fit its own bytes. A shorter name is padded with zeros, so the records after it keep their
  offsets. A record may change length. A payload that holds a pointer to a record does not follow the change.
- **Overlaps.** A record that overlaps a name, or another record, is left out and stays as bytes. The
  names win over the records. The scan lists both strings. On the retail disc, 19 of the 33,102 strings outside
  message banks are left out this way (1 name and 18 records, in 14 payloads), so 33,083 remain.
- **Round trip.** Every payload that is not a message bank decodes and encodes to its own bytes: 2,523 payloads on the retail disc, 666 of them with strings (measured).

> WARNING: a record that changes length moves the bytes after it. A pointer table that reaches those bytes is stale
> afterwards. Check an edited payload in the game before it ships.

Not covered: the executables. `SLUS_004.22` and `LOGO.EXE` hold 167 C string literals. They need the ASCII encoding,
which the scan does not select, so the `text` kind leaves them out.

## Battle backgrounds and the world map

Not decoded. The candidates below are located in the data; their loaders are not identified.

- **Battle backgrounds.** Type-3 VRAM uploads in `BIN/BATTLE/BATL_DRA`, `BATL_OVR`, `BATL_RET` and `BATL_RE2`.
  Each one is 0x8000 bytes, and `BATL_OVR` has one of 0x10000 bytes. Their RAM descriptors (`0x1a080200`,
  `0x1c080200`, `0x1e080200`; `0x1a080400` for the `BATL_OVR` upload) place them at VRAM columns 26, 28 and 30 on the row at y = 256, which are texture
  pages 13 to 15 ([load argument](graphics.md#type-3-load-argument)). The same archives
  hold a shared 512-byte overlay at `0x80036E00` (`BATTLE/BATL_RE2.EMI#1`). Not proven: which upload a
  battle draws as its background, and the palette it uses.
- **World map.** `BIN/WORLD00/AREA000` is McNeil, a walked area, not the world map. The world map is the 11 areas whose
  `AreaLoad` flag byte at `+0x32` has bit 0 set (016, 033, 045, 065, 087, 088, 104, 115, 121, 151, 152; see
  [runtime](../game/runtime.md#map-modes-and-the-shared-map-engine)). AREA000 is a 100 × 80 map bundle with six objects. Its
  entries 5 and 7 are uploads of 0x40000 bytes each, which is 512 × 256 at 16 bits. Their 16 bpp views look like indexed
  data; the palette is open. The loader is not identified.
