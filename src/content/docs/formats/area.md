---
title: "Area formats"
description: "Every area archive BIN/WORLDnn/AREAnnn.EMI loads the same fixed set of data blocks and one program to the same RAM addresses, and the address, not the archive, identifies each format."
---

Every area archive `BIN/WORLDnn/AREAnnn.EMI` loads the same fixed set of data blocks and one program to the same RAM addresses, and the address, not the archive, identifies each format. A type-0 entry's load argument is its RAM destination, so the next area's blocks load straight over the previous ones, and no payload names its area. This page describes each block of that working set. [Areas and the field](../../systems/areas/) describes how the engine uses the blocks, and the [EMI page](../emi/#world-shapes) lists which slot holds which block.

An area is a town, dungeon, world map or battlefield. The table lists the blocks by address.

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

`0x800F0800` is the battle script bank, which holds 3,692 bytes in 42 BATTLE and BOSS archives and has the same format as the area script bank. `0x801F2C00` is code, not a data format. Two areas load their program elsewhere: `world00/area030/04` at `0x801D0C00` (75,285 bytes) and `world00/area030/05` at `0x800F5000` (8,784 bytes).

## `0x80010000`: area message bank

The message bank holds the area's dialogue. It starts with a little-endian `u16` slot array, followed by the records.

```text
+0x0000 u16 slot[0]      ; byte size of the array = offset of the first record
+0x0002 u16 slot[1..N-1] ; byte offsets; N = slot[0]/2
+slot[0] .. end          ; records, delimited by consecutive distinct slots
```

A message is addressed by its slot index. Two slots may share one record, and unused slots point at the end of the payload. 185 of the 200 payloads have at least one such slot, and 182 have two or more. All 200 area entries load at this address. 197 are message banks and 165 of those are text banks, the ones this page and the [text kinds](../assets/#message-banks) describe; 162 are at entry 11, 2 at entry 7 and 1 at entry 12. The other 35 payloads are the 32 non-text banks at entry 11 and the 3 fishing payloads at entry 18, which are not banks. [Game text](../../data/text/#message-bank) defines both terms.

The engine finds the active message itself. The code at `@0x801514D0` forms `D_80010000[g_MessageRequest] + 0x80010000`, and `@0x8014F800` is the text draw entry. The bytes of a record and the control codes are described in [game text](../../data/text/).

## `0x80032000`: packed 4-bit cell grid

The grid has 5,000 bytes, 10,000 cells of 4 bits. 100 by 100 is the buffer capacity and not a per-area shape. The logical extent is `width x height` from the [map bundle](#0x80104000-map-bundle) header, and the unused part is zero. Nine of the 200 entries are all zero and classify as `reserve`. The other 191 carry data. Observed nibble values in the used region are 0 to 13, mostly 0 (free).

The only reader found is `emi/etc/game/00@0x801C6FD4`:

```text
index  = x + width * y
addr   = 0x80032000 + (index >> 1)
nibble = (index & 1) ? low 4 bits : high 4 bits
```

The nibble order follows the parity of the linear index, not the parity of `x`. A read outside the header's width and height returns 0. No store to the grid exists in any extracted payload, so it is archive data. For example, with `width = 7`, the cell `(x = 2, y = 1)` has index 9 and is the low nibble of byte 4.

## `0x800D3800`: area script bank

The script bank holds the bytecode that drives the area's actors. It is a two-level index. A directory of section offsets starts the block. Each section opens with a table of record offsets, and the records follow as plain bytes. All 200 payloads fit this description.

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

`dir_bytes` is the size of the directory, not an entry count: `L = dir_bytes / 4`. Reading it as a count overruns the payload (`WORLD00/AREA016` slot 4 has `u32[0] = 28` and `u32[29] = 0x240018` in 2,708 bytes). `dir_bytes == 4*L` and the entries are strictly increasing and inside the payload in 200 of 200 banks. `L` ranges from 4 to 36, so the 200 banks hold 2,380 sections. The last section runs to the end of the block.

Worked example. Take a bank with `dir_bytes = 0x10`, so `L = 4` and the directory is the four words `0x10`, `0x80`, `0x120` and `0x1A0`. Section 2 starts at bank offset `0x120`. If its first halfword is `0x08`, its table is 8 bytes long (`M = 4` offsets), and record 0 starts at section offset `0x08`. If its table entry 3 is `0x40`, record 3 starts at section offset `0x40`, that is bank offset `0x160`.

`Actor_BeginScript (exe/slus_004_22@0x8014D6DC)` resolves a record through the pointer `g_ScriptBank`:

```text
section = u32[bank + 4 * lhu(work + 0x2C)]
record  = bank + section + u16[bank + section + 2 * lbu(work + 0x4B)]
```

`SYS_StartFrontend (exe/slus_004_22@0x8014EA80)` sets the pointer to `0x800D3800`. The battle handlers swap in `0x800F0800` around each handler call and restore `0x800D3800` afterwards (`func_801E6724 (emi/battle/battle/03@0x801E6724)`, `func_801E6C84 (emi/battle/battle/03@0x801E6C84)`). The record length comes from the bytecode: `Actor_CopyScriptEntry (exe/slus_004_22@0x8014D54C)` copies a byte count that the instruction supplies, starting at the record cursor. The table offsets are the only stored record boundaries.

Every section describes itself, because `u16[0]` is both the table size and record 0's offset. In all 2,380 sections the distinct offsets of a table increase strictly, and the spans between them tile the section from the table end to its end. 308 of the 2,380 tables contain a descent (51 byte-identical tables, the most used 23 times, across 88 archives), and 225 more contain only equal words. A table entry may therefore repeat an earlier offset, and then it shares that record with the earlier entry. The bytecode opcodes are not decoded here.

## `0x800E3800`: scene/step table

The scene table lists the actors of the area: for each one, an id to match and a few setup bytes, including which script section it runs. It opens with a `u32` count that equals `(size - 4) / 8` in 200 of 200 payloads (4 to 51), followed by `count` records of 8 bytes. Bytes 1 to 3 of the count are always zero, so the code reads it with `lbu`. The record array base is published as `D_801459F4 = 0x800E3800 + 4`.

A record has these fields.

| Offset | Size | Type  | Meaning                                                                 |
| -----: | ---: | ----- | ----------------------------------------------------------------------- |
| `0x00` |    2 | `u16` | id; the match key in `@0x8014DD3C` and `@0x80167E00`                    |
| `0x02` |    2 | `u16` | low byte stored to `work+0x27`; the `u16` is `work+0x2C`                |
| `0x04` |    1 | `u8`  | stored to `work+0x25` (4 values)                                        |
| `0x05` |    1 | `u8`  | stored to `work+0x26` (31 values)                                       |
| `0x06` |    1 | `u8`  | stored to `work+0x28`; read by the CLUT and texture code                |
| `0x07` |    1 | `u8`  | stored to `work+0x2C`; the scene's section in the archive's script bank |

```c
typedef struct AreaActorDef {
    /* 0x00 */ u16 id;
    /* 0x02 */ u16 clut_select;
    /* 0x04 */ u8  texture_page;
    /* 0x05 */ u8  texture_v;
    /* 0x06 */ u8  texture_mode;
    /* 0x07 */ u8  script_section;
} AreaActorDef;
```

Source: [`include/world/area.h`](https://github.com/raulcorreia7/bof3-decomp/blob/main/include/world/area.h)

`+0x7` is a section index, not a record ordinal. With `L = u32[script_bank] / 4`, `max(+0x7) < L` in 200 of 200 payloads and the values cover `0` to `L-1` in 200 of 200. The "9 and 10 special" cases are not this byte. They belong to the actor member `+0x06` ([actor members](../../data/field/)), which `func_80167E00` reads: 9 gates the draw mode and 10 calls `func_8015A944`.

## `0x800E4000`: encounters and enemy records

Each area carries its own enemies. The block is 1,160 bytes in every area and tiles exactly: 8 encounters of 9 bytes and 8 enemy records of 136 bytes (`0x48 + 0x440 = 0x488`).

|  Offset |  Size | Type           | Meaning                                                        |
| ------: | ----: | -------------- | -------------------------------------------------------------- |
| `0x000` |    72 | `Encounter[8]` | 8 `Encounter` (9 bytes: `enemy_indexes[8]`, `appearance_rate`) |
| `0x048` | 1,088 | `Enemy[8]`     | 8 `Enemy` (136 bytes: `name[8]` first, `ai[4]` at `+0x34`)     |

```c
typedef struct Encounter {
    /* 0x00 */ u8 enemy_indexes[ENCOUNTER_ENEMY_COUNT]; /* 8 */
    /* 0x08 */ u8 appearance_rate;
} Encounter;
```

Source: [`include/game/enemy.h`](https://github.com/raulcorreia7/bof3-decomp/blob/main/include/game/enemy.h)

An encounter lists up to eight enemy indexes into the block's own enemy records (`0xFF` is an empty slot) and an appearance rate. Only indexes 0 to 6 occur on the disc. The picker `emi/etc/game/00@0x801C6A7C` walks the 9-byte records with `sum += base[8]` until the sum reaches a threshold of 1 to 16 from `rand()`. Its caller `@0x801C60E0` stores the selected `0x800E4000 + 9*idx` into `D_801CD8CC`. A battle setup, `@0x800AC218`, copies the enemy record into the 280-byte runtime slot `D_801EB630 + slot*280`, and the byte at `D_801EB710 + slot*280` holds the record index. No store to the block exists in any overlay or resident program.

An enemy record has 136 bytes. The table gives its fields by offset inside the record. Unnamed bytes (`0x0B`, `0x0F`, `0x15`, `0x74`, `0x81` and `0x84` to `0x87`) have no known role.

| Offset | Size | Type              | Name                                                                                           |
| -----: | ---: | ----------------- | ---------------------------------------------------------------------------------------------- |
| `0x00` |    8 | `u8[8]`           | `name`, in the game's name encoding                                                            |
| `0x08` |    2 | `u16`             | `enemy_id`                                                                                     |
| `0x0A` |    1 | `u8`              | `choice_ai`                                                                                    |
| `0x0E` |    1 | `u8`              | `target_preference`                                                                            |
| `0x10` |    2 | `u16`             | `zenny`                                                                                        |
| `0x12` |    2 | `u16`             | `exp`                                                                                          |
| `0x14` |    1 | `u8`              | `level`                                                                                        |
| `0x18` |    8 | `u8[8]`           | `initial_skills`                                                                               |
| `0x20` |    2 | `u16`             | `hp`                                                                                           |
| `0x22` |    2 | `u16`             | `ap`                                                                                           |
| `0x24` |    8 | `u16[4]`          | `power`, `defense`, `agility`, `intellect` (`u16` each, at `0x24`, `0x26`, `0x28`, `0x2A`)     |
| `0x2C` |    2 | `u8[2]`           | first item row: item index (`u8`), item type (`u8`)                                            |
| `0x2E` |    2 | `u16`             | first item row: rate (`u16`)                                                                   |
| `0x30` |    2 | `u8[2]`           | second item row: item index (`u8`), item type (`u8`)                                           |
| `0x32` |    2 | `u16`             | second item row: rate (`u16`)                                                                  |
| `0x34` |   64 | `EnemyAiBlock[4]` | four action blocks at `0x34`, `0x44`, `0x54` and `0x64`                                        |
| `0x78` |    9 | `u8[9]`           | `resistances`: fire, frost, thunder, earth, wind, holy, psionic, status, death (levels 0 to 7) |
| `0x82` |    1 | `u8`              | `reach`: footprint size for encounter placement `[inferred]` name                              |
| `0x83` |    1 | `u8`              | `height`: vertical offset in pixels `[inferred]` name                                          |

```c
typedef struct Enemy {
    /* 0x00 */ u8           name[ENEMY_NAME_LENGTH];
    /* 0x08 */ u16          enemy_id;
    /* 0x0A */ u8           choice_ai;
    /* 0x0B */ u8           unk_0B[3];
    /* 0x0E */ u8           target_preference;
    /* 0x0F */ u8           unk_0F;
    /* 0x10 */ u16          zenny;
    /* 0x12 */ u16          exp;
    /* 0x14 */ u8           level;
    /* 0x15 */ u8           unk_15[3];
    /* 0x18 */ u8           initial_skills[ENEMY_SKILL_COUNT];
    /* 0x20 */ u16          hp;
    /* 0x22 */ u16          ap;
    /* 0x24 */ u16          power, defense, agility, intellect; /* 0x24, 0x26, 0x28, 0x2A */
    /* 0x2C */ u8           first_item_index, first_item_type;
    /* 0x2E */ u16          first_item_rate;
    /* 0x30 */ u8           second_item_index, second_item_type;
    /* 0x32 */ u16          second_item_rate;
    /* 0x34 */ EnemyAiBlock ai[ENEMY_AI_COUNT]; /* 4 blocks of 16 bytes */
    /* 0x74 */ u8           unk_74[4];
    /* 0x78 */ u8           resistances[RES_SLOT_COUNT]; /* 9 */
    /* 0x81 */ u8           unk_81;
    /* 0x82 */ u8           reach;
    /* 0x83 */ u8           height;
    /* 0x84 */ u8           unk_84[4];
} Enemy;
```

Source: [`include/game/enemy.h`](https://github.com/raulcorreia7/bof3-decomp/blob/main/include/game/enemy.h)

An action block is 16 bytes: a condition byte, seven AI parameters and eight ability indexes. Condition `0x63` marks an unused block. [Game records](../../data/records/#area-data) lists the same fields by group.

HP `0xFFFF` appears in 10 of the 448 non-empty enemy records: Worker (two blocks), Operator, Miner, Engineer, Foreman, Gary, Mogu, Nina and Garr (`enemy_id` 1108, the party-member variant that [records](../../data/records/) lists). It is a sentinel, not a large HP value. The battle setup `func_800AC218 (emi/battle/battle/15@0x800AC218)` loads the halfword at `0x800E4068 + index x 0x88` (`@0x800AC448`) and stores it at battler `+0xC0` and in the `D_801EB6C4` row (`@0x800AC450` and `@0x800AC45C`) without a check. The damage step `Battle_ApplyDamage (emi/battle/battle/03@0x801DBB78)` then skips the whole enemy HP change when the battler's HP at `+0x94` is `0xFFFF`, so the battler takes no damage. Two boss handlers also test it: `func_800C1A00 (emi/boss/boss002/16@0x800C1A00)` and `func_800C1CDC (emi/boss/boss033/16@0x800C1CDC)` set the action type to 3 when the current enemy's HP is `0xFFFF`. The other `0xFFFF` immediates in the battle overlays are the default-element argument of `Battle_CalcDamage (emi/battle/battle/03@0x801DC044)`. The script that ends these fights is `[unknown]`.

## Neighboring buffers

RAM next to the working set is scratch that individual area programs use.

| Address      | Role                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `0x800E4800` | the executable's EMI CD streaming window: `cd_base`, sectors DMA to `cd_base + slot*0x800`; the same bytes are per-scene scratch |
| `0x800E4A00` | 32-entry position ring in `world00/area028/13`                                                                                   |
| `0x80147AA8` | `AreaVertex` rows in `world00/area024/14`                                                                                        |

The world overlays use these records in that scratch space.

| Record         | Address      | Size | Count | Owner                                |
| -------------- | ------------ | ---: | ----: | ------------------------------------ |
| `AreaTrail`    | `0x800E4800` |  152 |     3 | `world00/area027/13` (`@0x801F2D5C`) |
| `AreaSlotWork` | `0x800E4800` |   16 |    32 | `world00/area028/13` (`@0x801F2F5C`) |
| `Vec2us`       | `0x800E4A00` |    4 |    32 | `world00/area028/13` (`@0x801F2D3C`) |
| `AreaVertex`   | `0x80147AA8` |   40 |     - | `world00/area024/14` (`@0x801F3314`) |

The trail and slot rows are different shapes of one window. Each area program reads its own.

An `AreaTrail` row has 152 bytes:

| Offset | Size | Type             | Meaning                            |
| -----: | ---: | ---------------- | ---------------------------------- |
| `0x00` |   12 | `Vec3i`          | head anchor position (three `s32`) |
| `0x0C` |    4 | `s32`            | unknown (`s32`)                    |
| `0x10` |    4 | `s32`            | ring radius (`s32`)                |
| `0x14` |    2 | `u16`            | rotation angle (`u16`)             |
| `0x16` |    2 | `u16`            | padding                            |
| `0x18` |  128 | `TrailPoint[32]` | 32 trail points, two `s16` each    |

An `AreaSlotWork` row has 16 bytes:

| Offset | Size | Type    | Meaning                          |
| -----: | ---: | ------- | -------------------------------- |
| `0x00` |    4 | `u8[4]` | unknown                          |
| `0x04` |    2 | `s16`   | random position offset x (`s16`) |
| `0x06` |    2 | `s16`   | random position offset y (`s16`) |
| `0x08` |    2 | `s16`   | projection scale (`s16`)         |
| `0x0A` |    2 | `s16`   | unknown (`s16`)                  |
| `0x0C` |    2 | `u16`   | projected screen x (`u16`)       |
| `0x0E` |    2 | `u16`   | projected screen y (`u16`)       |

A `Vec2us` entry is two `u16` halves. An `AreaVertex` row has 40 bytes:

| Offset | Size | Type             | Meaning                                 |
| -----: | ---: | ---------------- | --------------------------------------- |
| `0x00` |    2 | `u16`            | unknown (`u16`)                         |
| `0x02` |   24 | `VertexPoint[4]` | four points, three `u16` each (x, y, z) |
| `0x1A` |   14 | `u8[14]`         | unknown                                 |

## Palette arena

The area's CLUT entries do not own their addresses. They fill slices of one 16 KiB CLUT arena (256 units of 64 bytes, 8,192 colour words). The arena has a working copy at `0x80037800`, which the engine uploads as one rectangle. Arena row `r` is VRAM row `480 + r`. A colour word is `STP | B5 | G5 | R5` ([graphics](../graphics/#palettes)). The table gives the slices and the entries that fill them.

| Address                    |       Arena offset | Loaded by                                 |
| -------------------------- | -----------------: | ----------------------------------------- |
| `0x80033800`               |                  0 | `ETC/FIRST#8` (512 B)                     |
| `0x80033A00`, `0x80033C00` | `+0x200`, `+0x400` | 3 WORLD archives (512 B each), BMAGIC/ETC |
| `0x80033E00`               |           `+0x600` | 200 WORLD archives and `ETC/START.EMI#6`  |
| `0x80035800`               |          `+0x2000` | 200 WORLD archives                        |
| `0x80036E00`               |          `+0x3600` | BATTLE palettes (shared 512-byte overlay) |

`GFX_ResetPalette (exe/slus_004_22@0x8014E284)` zeroes arena rows 28 to 31 (`+0x3800` to `+0x3FFF`) and copies all 32 rows to the working copy. Its callers are `SYS_StartFrontend`, `etc/game/00` (`@0x80196FFC` and `@0x8019FAA0`), `etc/game/01` `Game_BeginTitle`, `etc/commu00/00` (`@0x801F17A4`) and `scenario/scena17/00` (`@0x801F7750`). `GFX_UploadPalette (exe/slus_004_22@0x8014E22C)` uploads the working copy once per frame while `g_GfxPalettePending` is nonzero ([rendering](../../systems/rendering/)). Every palette writer raises that flag.

`GFX_CopyPalette (exe/slus_004_22@0x8014E3A0)` copies one arena row into the same working row. `battle/battle/03`, `battle/battle/15`, `battle/batl_ovr/00`, `bmagic/magic057/03`, `etc/game/00` and `scenario/scena17/00` call it. Battle code moves single rows this way:

- `battle/battle/03` `@0x801D1228` copies rows 26 and 27, so the `+0x3600` battle bank (`BATTLE/BATL_RE2.EMI#1`) reaches VRAM row 507.
- `battle/battle/15` `@0x800AFC54` copies arena row 2 (`0x80033C00`) into working row 2, and `@0x800AFB48` copies CLUT runs inside the working copy into row 2.

Readers take the arena base and index it in 64-byte units. `0x80035800` has no literal reader.

The `+0x200` bank (`ETC/BATE.EMI#3` and its copies) is also read on the CPU. `battle/battle/03` (`@0x801D8AE4`, `@0x801D8DF8`, `@0x801D9AB4` and `@0x801D9C80`) and `etc/game/00` (`@0x801AEBA0`) take word 4 of the 16-colour CLUT `D_80144952 * 2 + shade`, at `0x80033A08 + ((D_80144952 * 2 + shade) << 5)`, as the RGB of a flat panel primitive.

## `0x80104000`: map bundle

The map bundle is the terrain and layout of the area: a grid of cells, with a height for each corner of a cell, a tile for each cell, and lists of objects and render records. It opens with a fixed 48-byte header of section offsets, then the per-cell tables, the tile tables and four record regions.

The header has `u8` width and height at bytes 0 and 1. Every other field is a `u16` at the byte offset shown, and its value is an offset in 4-byte units from the start of the bundle: `(payload byte address - 0x80104000) / 4`.

|         Offset | Type        | Name                 | Meaning                                                                                                                                              |
| -------------: | ----------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
|         `0x00` | `u8`        | `width`              | width in cells                                                                                                                                       |
|         `0x01` | `u8`        | `height`             | height in cells                                                                                                                                      |
|         `0x02` | `u16`       | `grid_off4`          | cell grid; `(0x30 + W*H*4 + align4(W*H)) / 4`                                                                                                        |
|    `0x04-0x13` | `u16[4][2]` | `bank_offsets[4][2]` | eight offsets: bank A rectangles and bank B quads, per selector                                                                                      |
|         `0x14` | `u16`       | `byte_code_off4`     | per-cell byte codes; equals `W*H + 12` in 200 of 200                                                                                                 |
| `0x16`, `0x18` | `u16`       | `zero_16`, `zero_18` | zero in 200 of 200, no reader                                                                                                                        |
|         `0x1A` | `u16[2]`    | `color[2]`           | runtime colour words; written by `@0x801583BC`                                                                                                       |
|         `0x1E` | `u16`       | `scroll`             | nonzero in 76 of 200 and 0 in the rest; meaning unknown. One measurement gives the range `0xEC00`-`0xFFA0` and another `0xF300`-`0xFA90`; unresolved |
|         `0x20` | `u16`       | `list_base_20`       | record list, opcode byte `& 0x3F`                                                                                                                    |
|         `0x22` | `u16`       | `list_base_22`       | record list, opcode byte `& 0x7F`                                                                                                                    |
|         `0x24` | `u16`       | `record_region_24`   | record cells, ids in `D_80141880`                                                                                                                    |
|         `0x26` | `u16`       | `zero_26`            | zero in 200 of 200, no reader                                                                                                                        |
|         `0x28` | `u16`       | `object_list`        | object list, tag plus body size                                                                                                                      |
|         `0x2A` | `u16`       | `height_off4`        | height bytes; `u16[+0x2A]*4 == size` in 187 bundles and `size - W*H` in 13                                                                           |
| `0x2C`, `0x2E` | `u16`       | `zero_2C`, `zero_2E` | zero in 200 of 200, no reader                                                                                                                        |

The sections follow the header in this order:

```text
+0x0030             W*H*4       per-cell records (four s8 corner heights)
+byte_code_off4*4   align4(W*H) per-cell byte codes
+grid_off4*4        2*W*H       cell grid (one u16 per cell; 0 is empty)
(next)              n*4         tile descriptors: one 4-byte word each, up to the first bank
+bank_offsets[0]*4  n*4         bank A rectangles, then the other tile banks
+list_base_20*4     n*4         record list, opcode & 0x3F
+list_base_22*4     n*4         record list, opcode & 0x7F
+object_list*4      n*4         object list
+record_region_24*4 n*4         record cells
+height_off4*4      W*H or 0    height bytes
```

These identities hold in all 200 bundles: `u16[+0x14] == W*H + 12`; `u16[+0x02]*4 == 0x30 + W*H*4 + align4(W*H)`; every offset from the first bank offset to `height_off4` is in region order. The tile descriptor table sits between the cell grid and the first bank. A grid value indexes it, and the largest grid value is below the descriptor count in all 200 bundles. Descriptor 0 is empty.

### Tile descriptor

A tile descriptor is a 4-byte word. `func_80155560 (exe/slus_004_22@0x80155560)` reads it:

| Bits     | Meaning                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------- |
| 31       | depth: 0 is 8bpp, 1 is 4bpp                                                                    |
| 28 to 29 | bank selector (material `bank0` to `bank3`)                                                    |
| 24 to 27 | CLUT index                                                                                     |
| 19 to 23 | colour (byte 2 masked with `0xF8`)                                                             |
| 16 to 18 | corner-order flags: bit 18 turns the corners a quarter, bit 16 flips across x, bit 17 across z |
| 8 to 11  | mode                                                                                           |
| 11       | with a nonzero mode: 1 picks bank B (quad), 0 picks bank A (rectangle)                         |
| 0 to 7   | index of a 16x16 block (mode 0), or of a bank A rectangle                                      |

Bit 15 is also read, and its meaning is `[unknown]`. Mode 0 names a 16x16 block from the low byte: the block's near corner is `u = (b & 0x0F) * 16`, `v = b & 0xF0`, and its far texels are 15 from the near corner. Otherwise bit 11 picks rectangle bank A (index `& 0xFF`, entry `{dv, du, v, u}`) or quad bank B (index `& 0x7FF`, four UV pairs). A bank B quad stores its pairs as `(v, u)` at bytes 2-3, 0-1, 6-7 and 4-5, which read as corners 0 to 3. The function builds four UV pairs in corner order, then applies the corner flags in this order: bit 18 turns the corners (order 2, 0, 3, 1), bit 16 flips them across x (1, 0, 3, 2) and bit 17 flips them across z (2, 3, 0, 1).

Worked example. The synthetic descriptor `0x20000112` has bit 31 clear, so the tile is 8bpp. The bank selector is 2, the CLUT index is 0, no corner flag is set, and the mode is 1 with bit 11 clear, so it picks rectangle bank A, entry `0x12`. By the terrain rule in [graphics](../graphics/#texture-to-palette-join) it uses page `(320 + 128 * 2, 256) = (576, 256)` and CLUT row `(0, 483)`.

### Terrain mesh

The bundle decodes to a terrain mesh (Wavefront OBJ, glTF 2.0 or similar) with the same corners and one primitive per tile-bank material. Each cell is a quad on a unit grid, with `x` the column and `z` the row.

- Corners: the mesh builder `exe/slus_004_22@0x801530D0` places corner `k` at the step `(0,0)`, `(1,0)`, `(0,1)` and `(1,1)` from the cell's near corner, and corner `k` takes record byte `k` (loads at `0x801535A8` to `0x80153640`). The GTE vertex holds `-(byte << 4)`. A mesh uses `y = byte * 16`, so a larger byte is higher. A face walks the perimeter (corners 0, 2, 3, 1), because the stored order would cross, and that walk gives an upward normal.
- Height table: 13 of the 200 payloads ship the height-byte table, one signed byte per cell. The mesh builder never reads it. The height query `@0x8015477C` does. A mesh built from the corners does not use it.
- Not applied: the CLUT index and the colour need runtime palette and colour words. The object list is not part of a mesh.
- Textures: the materials carry no texture. A tile's page and palette come from the texture association in [graphics](../graphics/#texture-to-palette-join), which is not proven for world maps.
- Editing: each corner's height is its `y` divided by 16, and each corner must stay at its cell. A mesh does not carry the tiles, objects or height table, so the stored bundle must supply them. On the retail disc all 200 bundles return their stored bytes from a glTF mesh, from an OBJ mesh and from their byte-code, object and height lists.

Over the 200 retail bundles there are 1,263,531 cells, and 688,714 (54.5 percent) have a non-empty tile. Corner heights run from -2048 to 2032 in 244 distinct values. The cells use `bank0` in 22,890 runs, `bank1` in 17,204, `bank2` in 9,032 and `bank3` in 33.

### Readers

The code that reads the bundle: `@0x80153DE8` (area init, publishes `g_AreaCellCodes`), `@0x80166CB0` (byte code), `@0x8015477C` (height query, 538 direct call sites: 7 in the executable and 531 across the overlay images), `@0x801530D0`, `@0x8015684C` and `@0x80157CE4` (mesh), `@0x80154438` and `@0x80158400` (grid), `@0x801576FC`, `@0x80157F98`, `@0x801580A4` and `@0x80158B24` (record lists), `@0x80155560` (tile banks) and `@0x80156ED4` (inline colours). `emi/etc/game/00` reads the grid at `@0x8019C4F0`, `@0x8019C794` and `@0x8019EC20`, and writes the byte code at `@0x801A4BC0`. Writers are limited to the byte-code table, the height table, the runtime colour words and the record fields. No loader fixup exists.

The `+0x20` and `+0x22` lists use a header word whose byte 3 is the dispatcher opcode and byte 2 the size in words. The dispatch tables are `D_8017F8F0` (mask `0x3F`) and `D_8017F8FC` (mask `0x7F`). The `+0x24` cells start with `{y, x, size}`, and the `+0x28` objects start with `{tag, body_words}`.

### Not decoded

The names behind a byte-code value, the operand meanings of the `+0x20` and `+0x22` records, the renderer fields beyond the descriptor bit map, and `scroll` are open. Two kinds of candidate data are located but their loaders are not identified:

- Battle backgrounds. They are type-3 uploads in `BIN/BATTLE/BATL_DRA`, `BATL_OVR`, `BATL_RET` and `BATL_RE2`. Each is 32,768 bytes, and `BATL_OVR` has one of 65,536 bytes. Their descriptors (`0x1A080200`, `0x1C080200`, `0x1E080200`, and `0x1A080400` for the `BATL_OVR` upload) place them at VRAM columns 26, 28 and 30 on the row at y = 256, which are texture pages 13 to 15 ([load argument](../graphics/#type-3-load-argument)). The same archives hold a shared 512-byte overlay at `0x80036E00` (`BATTLE/BATL_RE2.EMI#1`). Which upload a battle draws as its background, and its palette, are `[unknown]`.
- World map. `BIN/WORLD00/AREA000` is McNeil, a walked area, not the world map. The world map is the 11 areas whose `AreaLoad` flag byte at `+0x32` has bit 0 set: 016, 033, 045, 065, 087, 088, 104, 115, 121, 151 and 152 ([runtime](../../data/programs/#map-kinds)). `AREA000` is a 100 by 80 bundle with six objects. Its entries 5 and 7 are uploads of 262,144 bytes each, which is 512 by 256 words at 16 bits. Read as 16bpp they look like indexed data, and their palette is `[unknown]`.

## `0x80117000`: auxiliary module window

Nine archives ship an extra type-0 entry at `0x80117000`. It is slot 13 in all nine, and the area program is then slot 14: `AREA049`, `AREA067` (WORLD01), `AREA077`, `AREA104`, `AREA108` (WORLD02), `AREA121`, `AREA135`, `AREA145` (WORLD03) and `AREA173` (WORLD04). The sizes are 1,444 to 5,964 bytes.

The destination is a reservation: the executable's layout names it `slot_80117000`, and the whole 206,848-byte run holds one nonzero word in the shipped image (`0x00000008` at the base). The loader compares the payload's first `u32` with the TOC's cached first word. The id continues the area-program numbering (`52 + area` for the 200 programs, and `0xFC` to `0x104` for these nine). No code forms the address, and the references are data words in 8-byte-stride tables. Eight payloads are geometry data. The `AREA049` payload is code at `base+4` with a 13-word pointer table.

## `0x801F2C00`: area program code arena

Every WORLD archive ships one type-0 area program at `0x801F2C00`, and `AREA030` also ships two programs at `0x801D0C00` and `0x800F5000`. The executable reserves `0x801F2C00` to `0x801F6C00` (16,384 bytes, stamp `0x0000000E`), and the largest program is 16,324 bytes. The type-0 handler copies the payload to the load argument and checks the cached first word. The first word of every program is `52 + area` (200 of 200), which matches the TOC cache.

The executable calls the loaded program at `base+4` only on target-specific paths. `exe/slus_004_22@0x801527E4` calls `func_801F2C04` when the `u16` world id `g_GameAreaId` is `0xBD` (189), which selects `WORLD04/AREA189`. The dispatcher `emi/etc/game/00@0x801A8728` also calls image-local functions, and its `0x4C` case calls `func_801F2C04`. The entry bytes vary by target. `AREA189` starts code at `base+4`. `WORLD00/AREA024` stores a zero `VECTOR` there, which executes as four NOPs before `func_801F2C14` at `base+0x14`. `WORLD00/AREA008` stores format strings at `base+4`.

Nineteen payloads hold no `addiu $sp` and no `jr $ra` at any word offset, so they contain no function that can return. They are `WORLD00` AREA006, 009, 017, 030 (slot 3) and 031; `WORLD01` AREA066 and 070; `WORLD02` AREA083, 089 (slot 3) and 101; `WORLD03` AREA122, 126, 129 (slot 3), 137 and 138; and `WORLD04` AREA159, 190, 194 and 195. The words after the id are data. The two 128-byte slot-3 stubs (`WORLD02/AREA089` and `WORLD03/AREA129`) differ only in the id word, and `WORLD04/AREA190` is a table of pointers into its own slot (`0x801F2C04` to `0x801F2C18`). The entry at `base+4` reaches no return in any of them.

## Open questions

| Question                                                                                | What would settle it                                                 |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Bytecode opcodes of the script bank                                                     | a decode of the interpreter that `Actor_BeginScript` feeds           |
| Names behind byte-code values; operands of the `+0x20` and `+0x22` record lists         | the dispatch tables `D_8017F8F0` and `D_8017F8FC` and their handlers |
| Header word `scroll` (map bundle `+0x1E`)                                               | the reader of that field, or a map that uses it                      |
| Which battle background upload a battle draws, and its palette                          | the battle code that selects a `BATL_*` upload                       |
| The loader and palette of the world-map uploads in `AREA000` and the 11 world-map areas | the code that reads entries 5 and 7                                  |
| The script that ends the 10 enemies with HP `0xFFFF`                                    | a trace of one such fight                                            |

## Sources and confidence

- **Confidence:** medium. The block formats, the script bank and the map bundle header are read and checked on all 200 archives, but the opcodes, the byte-code names, the `scroll` field and the battle and world-map graphics are not decoded.
- **Evidence:** the 200 area archives, the loader and the area, field and battle functions named above. The opcodes that the community [bof3-script-editor](https://github.com/glitch-in-the-herring/bof3-script-editor) (MIT) lists are a lead for the script bank, not evidence ([sources](../../appendix/sources/)).

## Related

- [Areas and the field](../../systems/areas/): how the engine loads and runs these blocks.
- [EMI container](../emi/): the entry types and the archive shapes that hold the blocks.
- [Graphics formats](../graphics/): the colour word, the CLUT and the texture-to-palette join.
- [Game records](../../data/records/): the encounter and enemy record fields by group.
- [Game text](../../data/text/): the message bank and its control codes.
- [Edit maps and scripts](../../guides/maps/): what can change in a map or script.
