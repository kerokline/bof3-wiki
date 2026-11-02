# Documentation coverage

This page counts how much of the disc the wiki documents, by file kind. The unit is the ISO9660 file size (`size` in the directory record), which counts every Form 2 sector as 2,048 bytes. The 887 files total 385,249,350 bytes, and the tables below add up to that figure. A kind is a name this wiki gives to a class of disc content ([glossary](glossary.md#disc-and-containers)).

A range is placed once, at the level of its weakest part:

- Fully documented: every field an editor changes has a cited reader or a check over every instance on this disc.
- Partly documented: the container and the main fields are known, but some fields, instances or the meaning of the contents are not.
- Unknown: the purpose or the structure is not identified.
- Code is a separate axis. Executable bytes are not a data format, and the architecture pages cover them.

| Level             | Bytes       |
| ----------------- | ----------- |
| Fully documented  | 193,173,639 |
| Partly documented | 114,261,995 |
| Unknown           | 61,550,578  |
| Code              | 16,263,138  |
| Total             | 385,249,350 |

The total is the sum of the 887 file sizes ([disc and files](../formats/disc.md#directories)). The Form 1 and audio sector counts come from the subheader of every sector of the `.STR` files (byte 2 is the submode). The texture split counts the textures that have a proven palette row.

## Fully documented

| Range                                                         | Bytes       | Page                               |
| ------------------------------------------------------------- | ----------- | ---------------------------------- |
| EMI container overhead (headers, TOCs, padding; 880 archives) | 9,242,257   | [emi](../formats/emi.md)           |
| audio-bank: VAB header and body (1,020 banks)                 | 84,062,336  | [audio](../formats/audio.md)       |
| audio-sequence: SEP packages (119)                            | 1,836,303   | [audio](../formats/audio.md)       |
| texture, depth and palette proven (212 textures)              | 55,132,160  | [graphics](../formats/graphics.md) |
| palette: CLUT words (620)                                     | 1,121,696   | [graphics](../formats/graphics.md) |
| area-message (200)                                            | 852,489     | [area](../formats/area.md)         |
| area-encounters (200)                                         | 232,000     | [area](../formats/area.md)         |
| area-actor-defs (200)                                         | 22,352      | [area](../formats/area.md)         |
| resource-table (44)                                           | 639,720     | [text](../data/text.md)            |
| MAGIC00.STR audio sectors (14,856)                            | 30,425,088  | [str](../formats/str.md)           |
| VOICE.STR (3,536 sectors: audio, end-of-file and zero fill)   | 7,241,728   | [str](../formats/str.md)           |
| CAPCOM30.STR (1,155 sectors)                                  | 2,365,440   | [str](../formats/str.md)           |
| SYSTEM.CNF                                                    | 70          | [exe](../formats/exe.md)           |
| subtotal                                                      | 193,173,639 |                                    |

## Partly documented

| Range                                              | Bytes       | Page                                 |
| -------------------------------------------------- | ----------- | ------------------------------------ |
| audio-cues (904)                                   | 34,432      | [audio](../formats/audio.md)         |
| texture, no proven depth or palette (381 textures) | 57,180,160  | [graphics](../formats/graphics.md)   |
| character-bank (144)                               | 18,686,544  | [character](../formats/character.md) |
| area-map (200)                                     | 10,247,719  | [area](../formats/area.md)           |
| area-cells (191)                                   | 955,000     | [area](../formats/area.md)           |
| area-script (200)                                  | 3,820,164   | [area](../formats/area.md)           |
| battle-script (42)                                 | 155,064     | [area](../formats/area.md)           |
| area-module (9)                                    | 34,368      | [area](../formats/area.md)           |
| S_XA00.STR audio and end-of-file sectors (11,303)  | 23,148,544  | [str](../formats/str.md)             |
| subtotal                                           | 114,261,995 |                                      |

## Unknown

| Range                                             | Bytes      | Page                     |
| ------------------------------------------------- | ---------- | ------------------------ |
| bmagic-table (37)                                 | 30,762     | [emi](../formats/emi.md) |
| reserve: zero fill, no consumer (53)              | 765,896    | [emi](../formats/emi.md) |
| S_XA00.STR Form 1 sectors, non-zero data (29,113) | 59,623,424 | [str](../formats/str.md) |
| MAGIC00.STR Form 1 sectors, non-zero data (552)   | 1,130,496  | [str](../formats/str.md) |
| subtotal                                          | 61,550,578 |                          |

## Code

| Range                              | Bytes      | Page                     |
| ---------------------------------- | ---------- | ------------------------ |
| code entries in EMI archives (548) | 14,694,370 | [emi](../formats/emi.md) |
| SLUS_004.22                        | 1,445,888  | [exe](../formats/exe.md) |
| LOGO.EXE                           | 122,880    | [exe](../formats/exe.md) |
| subtotal                           | 16,263,138 |                          |

## What keeps a range from the next level

| Range                 | Missing                                                                                                         | Evidence                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| audio-cues            | byte 2 low nibble of the cue record: copied to voice state, role unknown (27 records differ from `0x10`/`0x11`) | `read` ([audio](../formats/audio.md#emi-type-8-cue-records))                                             |
| texture, 381 unproven | bit depth and palette: no draw rule found in the executable or an overlay                                       | `measured`: 212 of 593 textures have a rule ([graphics](../formats/graphics.md#texture-to-palette-join)) |
| character-bank        | node pixel and script formats                                                                                   | `read` ([character](../formats/character.md#readers-and-open-questions))                                 |
| area-map              | the `+0x1E` header field, record-list operands, byte-code names, collision meaning of cell values               | `read` ([area](../formats/area.md#0x80104000-map-bundle))                                                |
| area-cells            | cell value meaning (4-bit classes)                                                                              | `unknown`                                                                                                |
| area-script           | record opcodes                                                                                                  | `unknown` ([area](../formats/area.md#0x800d3800-area-script-bank))                                       |
| battle-script         | opcodes beyond `Actor_BeginScript`                                                                              | `unknown` ([EMI](../formats/emi.md#open-questions))                                                      |
| area-module           | the consumer of eight of nine modules                                                                           | `unknown` ([area](../formats/area.md#0x80117000-auxiliary-module-window))                                |
| S_XA00.STR audio      | the cue array has no bounding symbol; 340 audio sectors in channels 4-7 are not reached by the 11 scanned cues  | `inferred` for the cue count, `measured` for the 340 sectors ([STR](../formats/str.md#xa-cue-tables))    |
| bmagic-table          | everything but the load address                                                                                 | `unknown`                                                                                                |
| reserve               | no consumer: 44 BPLCHAR fillers of 16,384 zero bytes and 9 all-zero cell slots                                  | `measured`                                                                                               |
| XA Form 1 sectors     | content of 29,665 non-zero sectors (S_XA00 and MAGIC00); the hardware filter never delivers them                | `measured` ([STR](../formats/str.md#sector-classes))                                                     |

## Outside the 887 files

These items are not part of the totals above.

| Item                                                                                                                                                                             | Size                  | State                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| Sectors before the first file (LBA 0-24): the 12 license sectors (`license_data.dat`, 28,032 bytes, read by the BIOS only), then volume descriptors, path tables and directories | 25 sectors            | the count is `measured`; the content split after LBA 11 is `inferred`                                 |
| Gaps between files                                                                                                                                                               | 38 sectors in 16 gaps | `measured`                                                                                            |
| Sectors after the last file (LBA 188174-188323)                                                                                                                                  | 150 sectors           | `measured`; LBA 188323 keeps stray parity ([sector sealing](../formats/conversion.md#sector-sealing)) |
| CDDA track 2                                                                                                                                                                     | 37,044,044 bytes      | every sample is zero (`measured`); no matched function issues `CdlPlay`                               |

Track 1 has 188,324 sectors: 188,111 in files and 213 outside them (`measured`).
