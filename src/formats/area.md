# Area working set

*Read this if you extract or edit maps, area scripts, encounters and area messages.*

The RAM working set of an area: the data blocks and code every `WORLD00`-`WORLD04` archive loads. Every area archive loads the same RAM addresses. The address identifies the
format, not the archive; the payload does not name its area. A type-0 entry's load argument is its
RAM destination, so the same payload reloads over the previous area's copy.

| Address      |   Entry size | Role                                 |
| ------------ | -----------: | ------------------------------------ |
| `0x80010000` |   145-21,547 | area message bank (text)             |
| `0x80032000` |        5,000 | packed 4-bit cell grid               |
| `0x80033800` |          512 | palette arena offset 0               |
| `0x80033A00` |          512 | CLUT bank, arena `+0x200`            |
| `0x80033C00` |          512 | CLUT bank, arena `+0x400`            |
| `0x80033E00` |    512-6,144 | CLUT bank, arena `+0x600`            |
| `0x80035800` |  1,024-3,584 | CLUT bank, arena `+0x2000`           |
| `0x800D3800` | 1,236-65,236 | area script bank                     |
| `0x800E3800` |       36-412 | scene/step table                     |
| `0x800E4000` |        1,160 | encounters plus enemy records        |
| `0x80104000` | 6,872-84,584 | map bundle                           |
| `0x80117000` |  1,444-5,964 | auxiliary module window (9 archives) |
| `0x801F2C00` |    92-16,324 | area program code arena              |

`0x800F0800` is the BATTLE/BOSS battle script bank (3,692 bytes, 42 archives), the same format as
`0x800D3800`. `0x801F2C00` is code, not a data format; two areas load their program elsewhere:
`world00/area030/04` at `0x801D0C00` (75,285 bytes), `world00/area030/05` at `0x800F5000` (8,784 bytes).

## `0x80010000`: area message bank

A little-endian `u16` slot array from the block base, then the records.

```text
+0x0000 u16 slot[0]      ; byte size of the array = offset of the first record
+0x0002 u16 slot[1..N-1] ; byte offsets; N = slot[0]/2
+slot[0] .. end          ; records, delimited by consecutive distinct slots
```

Slots may repeat (two indices share one record) and unused slots point at the payload end: 185 of
the 200 payloads contain at least one such slot (182 contain two or more). All 200 area entries load
at this address; 165 carry text and are kept as message banks: 162 at slot 11, 2 at slot 7, 1 at
slot 12. The other 35 payloads (32 at slot 11, 3 at slot 18) do not parse as text banks. The engine
resolves the active message itself: `@0x801514D0` forms `D_80010000[g_MessageRequest] + 0x80010000`, and
`@0x8014F800` is the text draw entry. Record bytes and control codes are [text](../game/text.md).

## `0x80032000`: packed 4-bit cell grid

5,000 bytes: 10,000 cells at 4 bits. 100x100 is the buffer capacity, not a per-area shape; the
logical extent is `width × height` from the map header. The used region is zero-padded. Nine of the
200 entries are entirely zero and classify as `reserve`; the other 191 carry data.

The only reader found is `emi/etc/game/00@0x801C6FD4`:

```text
addr  = 0x80032000 + (index >> 1)
index = x + width * y
nibble = index & 1 ? low 4 bits : high 4 bits
```

Nibble order follows linear-index parity, not `x` parity. Out-of-range returns 0 against the
header's width and height. No store to the grid exists in any extracted payload; it is archive
data. Observed nibbles in used regions are 0-13, with 0 dominant (free).

## `0x800D3800`: area script bank

A `u32` directory at the block base, one `u16` slot table per section, then byte records. Verified
against all 200 payloads.

```text
bank
  +0x00 u32 dir_bytes          ; == 4*L, the directory's own size
  +0x04 u32 section_off[L-1]   ; block-relative, strictly increasing
section (bank + section_off[i])
  +0x00 u16 table_bytes        ; == 2*M; also record_off[0]
  +0x02 u16 record_off[M-1]    ; remaining offsets, relative to the section base
record
  bytes (byte-addressed, no fixed stride)
```

`dir_bytes == 4*L` in 200/200; the entries are strictly increasing and inside the payload in
200/200; `L` ranges 4-36, so the 200 banks hold 2,380 sections. The last section runs to the end
of the block. `dir_bytes` is the directory size, not an entry count: reading it as a count
overruns the payload (`WORLD00/AREA016` slot 4: `u32[0] = 28`, `u32[29] = 0x240018` in 2,708
bytes).

The reader is `Actor_BeginScript (exe/slus_004_22@0x8014D6DC)`,
which resolves a record through `g_ScriptBank` (`g_ScriptBank`):

```text
section = u32[bank + 4 * lhu(work + 0x2C)]
record  = bank + section + u16[bank + section + 2 * lbu(work + 0x4B)]
```

`SYS_StartFrontend` (`@0x8014EA80`) initializes the pointer to `0x800D3800`; the battle handlers
swap in `0x800F0800` around each handler call and restore `0x800D3800` afterwards
(`func_801E6724 (emi/battle/battle/03@0x801E6724)`, `func_801E6C84 (emi/battle/battle/03@0x801E6C84)`). The record
length itself comes from the bytecode: `Actor_CopyScriptEntry (exe/slus_004_22@0x8014D54C)`
copies a byte count the instruction supplies from the record cursor, so the table offsets are the
only stored record boundaries.

Every section is self-describing (`u16[0]` is both the table size and record 0's offset). The
distinct offsets of a table are strictly increasing in 2,380/2,380 sections, and the spans
between them tile from the table end to the section end in 2,380/2,380. 308 of the 2,380 tables
contain a descent (in 51 byte-identical tables, the most used 23 times, across 88 archives) and
225 more contain only equal words: a table entry may repeat an earlier offset, sharing that
record with the earlier entry. No bytecode opcode is decoded here.

A decoded bank has the directory size and, per section, the stored table words, the record bytes and the record each table entry names.

## `0x800E3800`: scene/step table

```text
+0x00 u32 count              ; == (size - 4) / 8 in 200/200; count 4-51
+0x04 8-byte record[count]
```

Bytes 1-3 of the count are always zero, so the code reads it with `lbu`.

| Offset | Width | Meaning                                                                 |
| -----: | ----: | ----------------------------------------------------------------------- |
| `+0x0` |     2 | id; match key in `@0x8014DD3C` and `@0x80167E00`                        |
| `+0x2` |     2 | low byte stored to `work+0x27`; the u16 is `work+0x2C`                  |
| `+0x4` |     1 | stored to `work+0x25` (4 values)                                        |
| `+0x5` |     1 | stored to `work+0x26` (31 values)                                       |
| `+0x6` |     1 | stored to `work+0x28`; read by the CLUT and texture code                |
| `+0x7` |     1 | stored to `work+0x2C`; the scene's section in the archive's script bank |

The "9 and 10 special" cases are not this byte: they belong to actor member `+0x06`
([actor members](../game/field.md)), which `func_80167E00` reads (9 gates the draw mode, 10 calls
`func_8015A944`).

`+0x7` is a section index, not the record ordinal: with `L = u32[script_bank]/4`, `max(+0x7) < L`
in 200/200 and the values cover `0..L-1` in 200/200. The record array base is published as
`D_801459F4 = 0x800E3800 + 4`; the count is read at the base.

## `0x800E4000`: encounters and enemy records

1,160 bytes, always, tiling exactly: 8 × 9 + 8 × 136 = `0x48 + 0x440 = 0x488`.

|  Offset |  Size | Content                                                    |
| ------: | ----: | ---------------------------------------------------------- |
| `0x000` |    72 | 8 `Encounter` (9 B: `enemy_indexes[8]`, `appearance_rate`) |
| `0x048` | 1,088 | 8 `Enemy` (0x88: `name[8]` first, `ai[4]` at `+0x34`)      |

`emi/etc/game/00@0x801C6A7C` walks the 9-byte records with `sum += base[8]` until the sum reaches a
`1..16` threshold from `rand()`; its caller `@0x801C60E0` stores the selected
`0x800E4000 + 9*idx` into `D_801CD8CC`. `enemy_indexes` uses `0xFF` as the empty slot; only ids
0-6 occur in the extracted data. `@0x800AC218` copies a record into the 280-byte runtime slot
`D_801EB630 + slot*280`; the byte at `D_801EB710 + slot*280` holds the record index. No store to
the block exists in any overlay or resident program. Each area's block holds the eight encounter rows and the eight
enemy records, each field by name.

## Neighboring buffers

| Address      | Role                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `0x800E4800` | the executable's EMI CD streaming window: `cd_base`, sectors DMA to `cd_base + slot*0x800`; the same bytes are per-scene scratch |
| `0x800E4A00` | 32-entry position ring in `world00/area028/13`                                                                                   |
| `0x80147AA8` | `AreaVertex` rows in `world00/area024/14`                                                                                        |

The world overlays' records:

| Record         | Address      |   Size | Count | Owner                                |
| -------------- | ------------ | -----: | ----: | ------------------------------------ |
| `AreaTrail`    | `0x800E4800` | `0x98` |     3 | `world00/area027/13` (`@0x801F2D5C`) |
| `AreaSlotWork` | `0x800E4800` | `0x10` |    32 | `world00/area028/13` (`@0x801F2F5C`) |
| `Vec2us`       | `0x800E4A00` | `0x04` |    32 | `world00/area028/13` (`@0x801F2D3C`) |
| `AreaVertex`   | `0x80147AA8` | `0x28` |     - | `world00/area024/14` (`@0x801F3314`) |

`AreaTrail` (`0x98` bytes):

| Offset | Width | Meaning                            |
| -----: | ----: | ---------------------------------- |
| `0x00` |    12 | head anchor position (three `s32`) |
| `0x0C` |     4 | unknown (`s32`)                    |
| `0x10` |     4 | ring radius (`s32`)                |
| `0x14` |     2 | rotation angle (`u16`)             |
| `0x16` |     2 | padding                            |
| `0x18` |  0x80 | 32 trail points, two `s16` each    |

`AreaSlotWork` (`0x10` bytes):

| Offset | Width | Meaning                          |
| -----: | ----: | -------------------------------- |
| `0x00` |     4 | unknown                          |
| `0x04` |     2 | random position offset x (`s16`) |
| `0x06` |     2 | random position offset y (`s16`) |
| `0x08` |     2 | projection scale (`s16`)         |
| `0x0A` |     2 | unknown (`s16`)                  |
| `0x0C` |     2 | projected screen x (`u16`)       |
| `0x0E` |     2 | projected screen y (`u16`)       |

`Vec2us` is two `u16` halves per entry. `AreaVertex` (`0x28` bytes):

| Offset | Width | Meaning                                 |
| -----: | ----: | --------------------------------------- |
| `0x00` |     2 | unknown (`u16`)                         |
| `0x02` |  0x18 | four points, three `u16` each (x, y, z) |
| `0x1A` |  0x0E | unknown                                 |

The trail and slot rows are different shapes of one window; each area program reads its own.

## Palette arena

The area CLUT entries do not own their addresses: they fill slices of one 16 KB CLUT arena (256
units of `0x40` bytes = 32 color words, 8,192 words). The arena has a working copy at
`0x80037800` (`g_GraphicsPaletteDst`), which the engine uploads as one rectangle.

| Address                    |       Arena offset | Loaded by                                 |
| -------------------------- | -----------------: | ----------------------------------------- |
| `0x80033800`               |                  0 | `ETC/FIRST#8` (512 B)                     |
| `0x80033A00`, `0x80033C00` | `+0x200`, `+0x400` | 3 WORLD archives (512 B each), BMAGIC/ETC |
| `0x80033E00`               |           `+0x600` | 200 WORLD archives and `ETC/START.EMI#6`  |
| `0x80035800`               |          `+0x2000` | 200 WORLD archives                        |
| `0x80036E00`               |          `+0x3600` | BATTLE palettes (shared 512-byte overlay) |

`GFX_ResetPalette (exe/slus_004_22@0x8014E284)` zeroes arena rows 28-31 (`+0x3800`-`+0x3FFF`), then copies all 32
rows of `0x200` bytes into the working copy. Its callers are `SYS_StartFrontend`, `etc/game/00`
`@0x80196FFC` and `@0x8019FAA0`, `etc/game/01` `Game_BeginTitle`, `etc/commu00/00` `@0x801F17A4` and
`scenario/scena17/00` `@0x801F7750`. `SYS_Main` calls `@0x8014E22C` once per frame after `VSync`; it
uploads the working copy when `g_GfxPalettePending` is nonzero, `LoadImage(rect(0, 0x1E0, 0x100, 0x20),
0x80037800)`, then clears the flag. Every palette writer raises `g_GfxPalettePending`. Arena row `r` is
VRAM row `480 + r`. Word format is `STP | B5 | G5 | R5` ([graphics](graphics.md)).

`@0x8014E3A0(row)` copies one arena row into the same working row and raises `g_GfxPalettePending`;
`battle/battle/03`, `battle/battle/15`, `battle/batl_ovr/00`, `bmagic/magic057/03`, `etc/game/00` and `scenario/scena17/00` call it. Battle
code moves single rows this way: `battle/battle/03` `@0x801D1228` copies rows 26 and 27, so the `+0x3600`
battle bank (`BATTLE/BATL_RE2.EMI#1`) reaches VRAM row 507. `battle/battle/15` `@0x800AFC54` copies arena
row 2 (`0x80033C00`) into working row 2 and `@0x800AFB48` copies CLUT runs inside the working copy
into row 2. Readers take the arena base and index it in `0x40`-byte units; `0x80035800` has no
literal reader.

The `+0x200` bank (`ETC/BATE.EMI#3` and its copies) is also read on the CPU: `battle/battle/03`
`@0x801D8AE4`, `@0x801D8DF8`, `@0x801D9AB4` and `@0x801D9C80` and `etc/game/00` `@0x801AEBA0` take word
4 of 16-color CLUT `D_80144952 * 2 + shade` (`0x80033A08 + ((D_80144952 * 2 + shade) << 5)`) as the
RGB of a flat panel primitive.

## `0x80104000`: map bundle

A fixed `0x30`-byte header of `u16` section offsets in 4-byte units, then the per-cell tables, the
tile tables and four record regions. Every offset is `(payload byte address - 0x80104000) / 4`.

|         Offset | Field                   | Meaning                                                                                                                                        |
| -------------: | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
|         `0x00` | `width_00`              | width in cells                                                                                                                                 |
|         `0x01` | `height_01`             | height in cells                                                                                                                                |
|         `0x02` | `grid_off4_02`          | cell grid; `(0x30 + W*H*4 + align4(W*H)) / 4`                                                                                                  |
|  `0x04`-`0x13` | `bank_offsets_04[4][2]` | bank A rectangles then bank B quads, per selector                                                                                              |
|         `0x14` | `byte_code_off4_14`     | per-cell byte codes; equals `W*H + 12` in 200/200                                                                                              |
| `0x16`, `0x18` | `zero_16`, `zero_18`    | zero in 200/200, no reader                                                                                                                     |
|         `0x1A` | `color_1A[2]`           | runtime color words; written by `@0x801583BC`                                                                                                  |
|         `0x1E` | `scroll_1E`             | nonzero in 76/200; 0 in the rest; meaning open. The range is `0xEC00`-`0xFFA0` in one measurement and `0xF300`-`0xFA90` in another; unresolved |
|         `0x20` | `list_base_20`          | record list, opcode byte `& 0x3F`                                                                                                              |
|         `0x22` | `list_base_22`          | record list, opcode byte `& 0x7F`                                                                                                              |
|         `0x24` | `record_region_24`      | record cells, ids in `D_80141880`                                                                                                              |
|         `0x26` | `zero_26`               | zero in 200/200, no reader                                                                                                                     |
|         `0x28` | `object_list_28`        | object list, tag plus body size                                                                                                                |
|         `0x2A` | `height_off4_2A`        | height bytes; `u16[+0x2A]*4 == size` in 187, `size - W*H` in 13                                                                                |
| `0x2C`, `0x2E` | `zero_2C`, `zero_2E`    | zero in 200/200, no reader                                                                                                                     |

Sections, in memory order:

```text
+0x0030             W*H*4       per-cell records (four s8 corner heights)
+code_off4*4        align4(W*H) per-cell byte codes
+grid_off4*4        align4(2*W*H) cell grid (one u16 per cell; 0 empty)
+rect_off4[0]*4     n*4         bank A rectangles then the tile banks
+list_a_off4*4      n*4         record list, opcode & 0x3f
+list_b_off4*4      n*4         record list, opcode & 0x7f
+object_off4*4      n*4         object list
+cell_off4*4        n*4         record cells
+height_off4*4      W*H or 0    height bytes
```

Identities in all 200 payloads: `u16[+0x14] == W*H + 12`; `u16[+0x02]*4 == 0x30 + W*H*4 +
align4(W*H)`; every offset from `rect_off4[0]` to `height_off4` is in region order. The tile
descriptor is a 4-byte word: bit 31 sign, bits 16-18 corner order, bits 28-29 bank selector, bits
24-27 CLUT index, bits 16-23 color, bits 8-11 mode, bit 11 bank. Bank A holds `{dv, du, v, u}`;
bank B holds four UV pairs. The `+0x20`/`+0x22` lists use a header word whose byte 3 is the
dispatcher opcode and byte 2 the size in words; the tables are `D_8017F8F0` (`0x3F`) and
`D_8017F8FC` (`0x7F`). The `+0x24` cells start with `{y, x, size}`; the `+0x28` objects start with
`{tag, body_words}`.

Readers: `@0x80153DE8` (area init, publishes `g_AreaCellCodes`), `@0x80166CB0` (byte code),
`@0x8015477C` (height query, 538 direct call sites: 7 in the executable and 531 across the overlay images), `@0x801530D0`/`@0x8015684C`/`@0x80157CE4`
(mesh), `@0x80154438`/`@0x80158400` (grid), `@0x801576FC`/`@0x80157F98`/`@0x801580A4`/`@0x80158B24`
(record lists), `@0x80155560` (tile banks), `@0x80156ED4` (inline colors). `emi/etc/game/00`
`@0x8019C4F0`, `@0x8019C794`, `@0x8019EC20` read the grid; `@0x801A4BC0` writes the byte code.
Writers are limited to the byte-code table, the height table, the runtime color words and the
record fields; no loader fixup exists.

The bundle decodes to a mesh and to a layout: `width`, `height`, one
byte-code row per map row, the objects and the heights. Open: the names behind a byte-code value,
the operand meanings of the `+0x20`/`+0x22` records, the renderer's fields beyond the descriptor
bit map, and `scroll_1E`.

## `0x80117000`: auxiliary module window

Nine archives ship an extra type-0 entry at `0x80117000` (slot 13 in all nine); in all nine the
area program is then slot 14: `AREA049`, `AREA067` (WORLD01), `AREA077`, `AREA104`, `AREA108`
(WORLD02), `AREA121`, `AREA135`, `AREA145` (WORLD03), `AREA173` (WORLD04). Sizes 1,444-5,964 bytes.

The destination is a reservation (the executable's layout names it `slot_80117000`); the
whole `0x32800`-byte run holds one nonzero word in the shipped image (`0x00000008` at the base).
The loader compares the payload's first `u32` with the TOC's cached first word; the id continues
the area-program numbering (`52 + area` for the 200 programs; these nine are `0xFC`-`0x104`). No
code forms the address; the references are data words in 8-byte-stride tables. Eight payloads are
geometry data; `AREA049`'s is code at `base+4` with a 13-word pointer table.

## `0x801F2C00`: area program code arena

Every WORLD archive ships one type-0 area program at `0x801F2C00`; `AREA030` also ships two
programs at `0x801D0C00` and `0x800F5000`. The executable reserves `0x801F2C00..0x801F6C00`
(16,384 bytes, stamp `0x0000000E`); the largest program is 16,324 bytes. The type-0 handler copies
the payload to the TOC load argument and verifies the cached first word. The executable calls the
loaded program at `base+4` only on target-specific paths. `exe/slus_004_22@0x801527E4` calls
`func_801F2C04` when the `u16` world ID `g_GameAreaId` is `0xBD` (189), selecting
`WORLD04/AREA189`. The `emi/etc/game/00@0x801A8728` dispatcher also calls image-local functions;
its `0x4C` case calls `func_801F2C04`.

Entry bytes vary by target. `AREA189` starts code at `base+4`. `WORLD00/AREA024` stores a zero
`VECTOR` there, which executes as four NOPs before `func_801F2C14` at `base+0x14`.
`WORLD00/AREA008` stores format strings at `base+4`.
The first word of every program is `52 + area` (200/200), matching the TOC cache.

Nineteen payloads hold no `addiu $sp` and no `jr $ra` at any word offset, so they contain no
function that can return: `WORLD00` AREA006, 009, 017, 030 (slot 3), 031; `WORLD01` AREA066, 070;
`WORLD02` AREA083, 089 (slot 3), 101; `WORLD03` AREA122, 126, 129 (slot 3), 137, 138; `WORLD04`
AREA159, 190, 194, 195. Their words after the id are data: the two 128-byte slot-3 stubs
(`WORLD02/AREA089`, `WORLD03/AREA129`) differ only in the id word, and `WORLD04/AREA190` is a table
of pointers into its own slot (`0x801F2C04`-`0x801F2C18`). The entry at `base+4` reaches no return
in any of them; they carry nothing to split.

## Sources

Buffer layouts and table shapes are measured from the retail payloads and the loader code. The
event-script opcodes are not decoded here; the community
[bof3-script-editor](https://github.com/glitch-in-the-herring/bof3-script-editor) (MIT) lists
opcodes and is a lead for that work, not evidence ([sources](../sources.md)).
