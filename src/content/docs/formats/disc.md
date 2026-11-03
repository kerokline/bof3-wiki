---
title: "Disc and files"
description: "The US disc (SLUS-00422) holds 887 files in 18 directories: 880 EMI archives, 3 XA audio streams, 1 movie, 2 executables and the boot configuration."
---

The US disc (`SLUS-00422`) holds 887 files in 18 directories: 880 EMI archives, 3 XA audio streams, 1 movie, 2 executables and the boot configuration. This page lists each directory and kind of file, gives its slot ids and sectors, and names the game code that reads it and when. How and when archives load is in [loading](../../concepts/loading/), and the memory card is in [saving](../../systems/saving/).

## Directories

The ISO9660 volume lists 887 files in 18 directories, one row each in the table below. `Bytes` is the directory record's size. `Sectors` rounds it up to 2,048-byte sectors. `Slot ids` are indexes into the executable's disc file table ([executable](../exe/#the-disc-file-table)), which follows ascending LBA. The loader finds a file by that index, never by name.

For example, the title overlay loads from slot `0x262`. That id falls in the `/BIN/ETC` row (`0x254` to `0x269`), so the file is the 15th of that directory (`0x262 - 0x254 = 14`, counting from zero): `GAME.EMI`.

| Directory       | Files |       Bytes | Sectors | Slot ids        | First LBA |
| --------------- | ----: | ----------: | ------: | --------------- | --------: |
| `/BIN/BATTLE`   |     9 |   1,937,408 |     946 | `0x0`-`0x8`     |        25 |
| `/BIN/BENEMY`   |   200 |   5,029,888 |   2,456 | `0x9`-`0xD0`    |       978 |
| `/BIN/BGM`      |    81 |  20,342,784 |   9,933 | `0xD1`-`0x121`  |     3,437 |
| `/BIN/BMAGIC`   |   144 |  13,731,840 |   6,705 | `0x122`-`0x1B1` |    13,375 |
| `/BIN/BMAG_XA`  |     1 |  31,555,584 |  15,408 | `0x1B2`         |    20,081 |
| `/BIN/BOSS`     |    40 |  28,297,216 |  13,817 | `0x1B3`-`0x1DA` |    35,491 |
| `/BIN/BPLCHAR`  |   121 |  22,126,592 |  10,804 | `0x1DB`-`0x253` |    49,312 |
| `/BIN/ETC`      |    22 |   4,485,120 |   2,190 | `0x254`-`0x269` |    60,117 |
| `/BIN/PLCHAR`   |    38 |   6,473,728 |   3,161 | `0x26A`-`0x28F` |    62,309 |
| `/BIN/SCENARIO` |    25 |     667,648 |     326 | `0x290`-`0x2A8` |    65,471 |
| `/BIN/SCE_XA`   |     2 |  90,013,696 |  43,952 | `0x2A9`-`0x2AA` |    65,798 |
| `/BIN/WORLD00`  |    38 |  29,847,552 |  14,574 | `0x2AB`-`0x2D0` |   109,752 |
| `/BIN/WORLD01`  |    38 |  30,056,448 |  14,676 | `0x2D1`-`0x2F6` |   124,328 |
| `/BIN/WORLD02`  |    38 |  30,298,112 |  14,794 | `0x2F7`-`0x31C` |   139,006 |
| `/BIN/WORLD03`  |    38 |  30,232,576 |  14,762 | `0x31D`-`0x342` |   153,802 |
| `/BIN/WORLD04`  |    48 |  36,218,880 |  17,685 | `0x343`-`0x372` |   168,566 |
| `/LOGO`         |     2 |   2,488,320 |   1,215 | `0x373`-`0x374` |   186,252 |
| `/`             |     2 |   1,445,958 |     707 | `0x375`-`0x376` |   187,467 |
| total           |   887 | 385,249,350 | 188,111 | `0x0`-`0x376`   |           |

The totals cover every file: 887 files and 385,249,350 bytes of directory-record sizes. Track 1 holds 188,324 sectors, and 188,111 of them are in files ([coverage](../../appendix/coverage/#outside-the-887-files)).

## File kinds

Every file is an archive, an audio or movie stream, an executable or the boot configuration. The table groups the 887 files by kind and names the code that reads each.

| Kind                                         | Files |       Bytes | Format                                       | Reader                                                                        |
| -------------------------------------------- | ----: | ----------: | -------------------------------------------- | ----------------------------------------------------------------------------- |
| EMI archive (`*.EMI`)                        |   880 | 259,745,792 | [EMI](../emi/)                               | `EMI_LoaderBeginRead (exe/slus_004_22@0x80162178)` and the loader steps below |
| XA audio (`*.STR` under `BMAG_XA`, `SCE_XA`) |     3 | 121,569,280 | [STR and XA](../str/)                        | `SND_ResolveXaStream`, `SND_XaStateSeek`, `SND_XaStateRead`                   |
| Movie (`LOGO/CAPCOM30.STR`)                  |     1 |   2,365,440 | [STR and XA](../str/#capcom30-stream-layout) | `LOGO.EXE`, `start_stream` and `playback`                                     |
| Executable (`SLUS_004.22`, `LOGO/LOGO.EXE`)  |     2 |   1,568,768 | [executables](../exe/)                       | BIOS, `SYS_LoadExec`                                                          |
| Boot configuration (`SYSTEM.CNF`)            |     1 |          70 | [executables](../exe/#systemcnf)             | BIOS                                                                          |
| Total                                        |   887 | 385,249,350 |                                              |                                                                               |

## Archive families

Each EMI archive has a header, a table of contents and 1 to 14 payloads ([EMI](../emi/)). `EMI_LoaderStreamInitSlot (exe/slus_004_22@0x80161FDC)` starts every archive read from its slot id. The sound code reads the three XA files, not the EMI loader ([loading](../../concepts/loading/#xa-audio)). The callers that choose a slot are in [EMI slot ids](../emi/#disc-slot-ids). The table says what each directory holds and when the game reads it.

Two rules give a slot id. A scenario overlay is at slot `scenario_id + 661` (`0x295` is the base), so scenario 3 is slot 664 (`0x298`) in `SCENARIO`. An area archive is at slot `area + 0x2AB`, so area 5 is slot `0x2B0` in `WORLD00`.

| Directory           | Files | What it holds                                                                                                                                                       | Format                                                                             | When read                                                     |
| ------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `BATTLE`            |     9 | battle overlays (`BATL_*`, `BATTLE`, `BATTLE2`), battle backgrounds and effect textures, common sound effects (`COMN_SE`, `BATL_SE`), the shared battle script bank | [EMI shapes](../emi/#archive-shapes), [graphics](../graphics/), [audio](../audio/) | fixed slot ids 0-8 at battle start                            |
| `BENEMY`            |   200 | one enemy sound bank each: header, cue table, body                                                                                                                  | [audio](../audio/)                                                                 | battle start, slot `9 + enemy id`                             |
| `BGM`               |    81 | one music bank each: VH, SEP package, VB (3 also a cue table)                                                                                                       | [audio](../audio/)                                                                 | on a music request, slot from the BGM id table                |
| `BMAGIC`            |   144 | spell effect overlays and their sound banks (`MAGIC000`-`MAGIC227`, three `KAIZAR_*`)                                                                               | [EMI code overlays](../emi/#code-overlays)                                         | when a spell is cast                                          |
| `BMAG_XA`           |     1 | `MAGIC00.STR`: spell voice and effect audio, 16 channels, 880 cues                                                                                                  | [STR and XA](../str/#xa-cue-tables)                                                | with the spell, by key `0x1000 + n`                           |
| `BOSS`              |    40 | boss battle modules, textures, banks and scripts                                                                                                                    | [EMI shapes](../emi/#archive-shapes)                                               | boss battles (no static caller found)                         |
| `BPLCHAR`           |   121 | battle character sprite banks, forms and VAB triples                                                                                                                | [character bank](../character/)                                                    | party member load, `EMI_StreamFamilyArchive` families 1 and 2 |
| `ETC`               |    22 | menu, shop, start, status, name entry, game tables, fonts and kanji, demo, tests                                                                                    | [records](../../data/records/), [text](../../data/text/)                           | fixed slot ids from `etc/game`                                |
| `PLCHAR`            |    38 | field character banks and party code (`PLxxx`, `PLPxxx`)                                                                                                            | [character bank](../character/)                                                    | party member load, families 0 and 3                           |
| `SCENARIO`          |    25 | scenario overlays and effect textures                                                                                                                               | [EMI](../emi/)                                                                     | `scenario_id + 661`                                           |
| `SCE_XA`            |     2 | `S_XA00.STR` (stereo) and `VOICE.STR` (mono)                                                                                                                        | [STR and XA](../str/#xa-cue-tables)                                                | story scenes and voice lines, by key                          |
| `WORLD00`-`WORLD04` |   200 | one archive per area: map bundle, cells, messages, script, actors, encounters, textures, palettes, sound bank, area program                                         | [area](../area/)                                                                   | area entry, slot `area + 0x2AB`                               |
| `LOGO`              |     2 | `LOGO.EXE`, `CAPCOM30.STR`                                                                                                                                          | [executables](../exe/), [STR](../str/)                                             | once, at boot                                                 |
| `/`                 |     2 | `SLUS_004.22`, `SYSTEM.CNF`                                                                                                                                         | [executables](../exe/)                                                             | the BIOS, at boot                                             |

## Entry kinds

Every EMI entry has a kind ([asset kinds](../assets/)). The table counts entries per directory family over all 6,344 entries (250,503,535 bytes), and the kinds sum to the entry total. The `text` kind (strings and message banks inside other kinds) and the `data-table` kind (tables inside `ETC/GAME.EMI` entry 0) are views of those entries and add no bytes. For example, `audio-bank` under `BGM` is 162: the 81 music archives hold a VH and a VB each, and their 3 cue tables sit in `audio-cues`.

| Kind              | BATTLE | BENEMY | BGM | BMAGIC | BOSS | BPLCHAR | ETC | PLCHAR | SCENARIO | WORLD00 | WORLD01 | WORLD02 | WORLD03 | WORLD04 | Entries |       Bytes |
| ----------------- | -----: | -----: | --: | -----: | ---: | ------: | --: | -----: | -------: | ------: | ------: | ------: | ------: | ------: | ------: | ----------: |
| `area-actor-defs` |      - |      - |   - |      - |    - |       - |   - |      - |        - |      38 |      38 |      38 |      38 |      48 |     200 |      22,352 |
| `area-cells`      |      - |      - |   - |      - |    - |       - |   - |      - |        - |      35 |      38 |      37 |      36 |      45 |     191 |     955,000 |
| `area-encounters` |      - |      - |   - |      - |    - |       - |   - |      - |        - |      38 |      38 |      38 |      38 |      48 |     200 |     232,000 |
| `area-map`        |      - |      - |   - |      - |    - |       - |   - |      - |        - |      38 |      38 |      38 |      38 |      48 |     200 |  10,247,719 |
| `area-message`    |      - |      - |   - |      - |    - |       - |   - |      - |        - |      38 |      38 |      38 |      38 |      48 |     200 |     852,489 |
| `area-module`     |      - |      - |   - |      - |    - |       - |   - |      - |        - |       - |       2 |       3 |       3 |       1 |       9 |      34,368 |
| `area-script`     |      - |      - |   - |      - |    - |       - |   - |      - |        - |      38 |      38 |      38 |      38 |      48 |     200 |   3,820,164 |
| `audio-bank`      |     20 |    400 | 162 |    256 |  310 |     414 |  34 |     38 |        - |      78 |      76 |      78 |      78 |      96 |   2,040 |  84,062,336 |
| `audio-cues`      |      8 |    200 |   3 |    128 |  120 |     207 |  16 |     19 |        - |      39 |      38 |      39 |      39 |      48 |     904 |      34,432 |
| `audio-sequence`  |      2 |      - |  81 |      - |   35 |       - |   1 |      - |        - |       - |       - |       - |       - |       - |     119 |   1,836,303 |
| `battle-script`   |      2 |      - |   - |      - |   40 |       - |   - |      - |        - |       - |       - |       - |       - |       - |      42 |     155,064 |
| `bmagic-table`    |      - |      - |   - |     37 |    - |       - |   - |      - |        - |       - |       - |       - |       - |       - |      37 |      30,762 |
| `character-bank`  |      - |      - |   - |      3 |    - |     121 |   1 |     19 |        - |       - |       - |       - |       - |       - |     144 |  18,686,544 |
| `code`            |      6 |      - |   - |    141 |  120 |       - |  20 |     19 |       25 |      40 |      38 |      40 |      40 |      59 |     548 |  14,694,370 |
| `palette`         |     10 |      - |   - |     93 |   80 |       - |  29 |      - |        2 |      78 |      76 |      78 |      78 |      96 |     620 |   1,121,696 |
| `reserve`         |      - |      - |   - |      - |    - |      44 |   - |      - |        - |       3 |       - |       1 |       2 |       3 |      53 |     765,896 |
| `resource-table`  |      2 |      - |   - |      - |   40 |       - |   2 |      - |        - |       - |       - |       - |       - |       - |      44 |     639,720 |
| `texture`         |     10 |      - |   - |     97 |   40 |       - |  36 |      - |        2 |      80 |      76 |      78 |      78 |      96 |     593 | 112,312,320 |
| total             |     60 |    600 | 246 |    755 |  785 |     786 | 139 |     95 |       29 |     543 |     534 |     544 |     544 |     684 |   6,344 | 250,503,535 |

## Readers by kind

The table names the function that reads each entry kind and the moment it does. A bare function name is in `exe/slus_004_22`.

| Kind              | Format                                                            | Reader (function, image, address)                                                                                                                     | Read when                   |
| ----------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `texture`         | [graphics](../graphics/)                                          | `EMI_LoaderLoadGraphics (exe/slus_004_22@0x80162698)` and `EMI_LoaderUploadSector (exe/slus_004_22@0x80163378)`: `LoadImage` of 32x32-word rectangles | archive load, type 3        |
| `palette`         | [graphics](../graphics/#palettes), [area](../area/#palette-arena) | `EMI_LoaderCopyPayload` to the palette arena; row upload by the draw code                                                                             | archive load, type 0        |
| `audio-bank`      | [audio](../audio/#vab-bank)                                       | `EMI_LoaderLoadVabHeader`, `EMI_LoaderLoadVabBody` (`SsVabOpenHeadSticky`, `SsVabTransBodyPartly`)                                                    | archive load, types 6 and 7 |
| `audio-cues`      | [audio](../audio/#emi-type-8-cue-records)                         | `EMI_LoaderLoadVabCues` to `0x801486A0 + 124 * bank`                                                                                                  | archive load, type 8        |
| `audio-sequence`  | [audio](../audio/)                                                | `EMI_LoaderLoadSequence`                                                                                                                              | archive load, type 10       |
| `character-bank`  | [character](../character/)                                        | `EMI_LoaderQueuePayload` (LZ77) then the sprite code                                                                                                  | party member load           |
| `area-message`    | [area](../area/#0x80010000-area-message-bank)                     | `UI_DrawText (exe/slus_004_22@0x8014F800)`                                                                                                            | area entry, window draw     |
| `area-cells`      | [area](../area/#0x80032000-packed-4-bit-cell-grid)                | `func_801C6FD4 (emi/etc/game/00@0x801C6FD4)`                                                                                                          | field movement              |
| `area-script`     | [area](../area/#0x800d3800-area-script-bank)                      | `Actor_BeginScript (exe/slus_004_22@0x8014D6DC)`                                                                                                      | actor activation            |
| `area-actor-defs` | [area](../area/#0x800e3800-scenestep-table)                       | `Area_FindSceneRecord (exe/slus_004_22@0x8014DD3C)`, `func_80167E00 (exe/slus_004_22@0x80167E00)`, `func_801ACE9C (emi/etc/game/00@0x801ACE9C)`       | area entry                  |
| `area-encounters` | [area](../area/#0x800e4000-encounters-and-enemy-records)          | `func_801C6A7C (emi/etc/game/00@0x801C6A7C)`, the encounter picker                                                                                    | random encounter            |
| `area-map`        | [area](../area/#0x80104000-map-bundle)                            | the area map engine ([runtime](../../data/programs/#map-kinds))                                                                                       | area draw                   |
| `area-module`     | [area](../area/#0x80117000-auxiliary-module-window)               | consumers not identified `[unknown]`                                                                                                                  | area entry                  |
| `battle-script`   | [EMI](../emi/#open-questions)                                     | `func_800AD26C (emi/battle/battle/15@0x800AD26C)`                                                                                                     | battle                      |
| `resource-table`  | [text](../../data/text/)                                          | `Resource_Resolve (exe/slus_004_22@0x801502D0)`                                                                                                       | any string lookup           |
| `bmagic-table`    | [EMI](../emi/#open-questions)                                     | not found `[unknown]`                                                                                                                                 | -                           |
| `code`            | [EMI code overlays](../emi/#code-overlays)                        | type-0 copy to the load address, then a jump from resident code                                                                                       | per family                  |
| `reserve`         | [character](../character/), [area](../area/)                      | none                                                                                                                                                  | -                           |

## Items that are not files

Two items on or beside the disc are not among the 887 files.

| Item            | Where                | Notes                                                                                 |
| --------------- | -------------------- | ------------------------------------------------------------------------------------- |
| Licence sectors | LBA 0-11             | read by the BIOS only                                                                 |
| CDDA track 2    | separate track image | 37,044,044 bytes, silent ([coverage](../../appendix/coverage/#outside-the-887-files)) |

## Unidentified

These byte ranges have no known reader or purpose.

| Item                                        |      Bytes | Why                                                                              |
| ------------------------------------------- | ---------: | -------------------------------------------------------------------------------- |
| Form 1 filler sectors in `S_XA00.STR`       | 59,623,424 | 29,113 sectors with non-zero data; the CD filter never delivers them to the game |
| Form 1 filler sectors in `MAGIC00.STR`      |  1,130,496 | 552 sectors, same                                                                |
| `bmagic-table` (37 entries at `0x800C3800`) |     30,762 | no reader found                                                                  |
| `reserve` (53 entries)                      |    765,896 | all-zero fill; no consumer                                                       |

The byte split by documentation level is in [coverage](../../appendix/coverage/).

## Sources and confidence

- **Confidence:** high. Counts, sizes and slot ids are measured over all 887 files and 6,344 entries; some entry kinds have no known reader.
- **Evidence:** the ISO9660 directory records, the executable's disc file table, every archive's table of contents, and the loader and caller functions named in the tables.

## Related

- [EMI container](../emi/): the archive layout and the loader chain.
- [Executables and boot files](../exe/): the disc file table that maps slot ids to sectors.
- [Asset kinds](../assets/): what each entry kind holds.
- [Loading](../../concepts/loading/): when archives load.
- [Game version](../../appendix/version/): the release and the Redump checksums of the disc image.
