# Glossary

This page defines the evidence tags and the terms that the other pages use without explaining each
time. Read the first section before any page that cites functions or addresses. Each term has one
definition here, and the other pages link to it.

## Evidence citations

A claim about the game's code names the function and the image that holds it: `Name (image@0xADDR)`.
For example, `SYS_Main (exe/slus_004_22@0x8014AAC8)` is the function `SYS_Main` at address `0x8014AAC8` in
the image `exe/slus_004_22`. Read the address together with its image, because overlays reuse
addresses.

The name is a label from this research, not a name that the game stores. A name of the form
`func_8014AAC8` is an address name: the function is located but has no role name yet. `D_80146840` is the
same for data, and a `g_` prefix marks a named global. A `u8`, `u16` or `s32` is an unsigned (`u`) or
signed (`s`) integer of 8, 16 or 32 bits. All multi-byte values are little endian.

### Image ids

An image is one program that the game loads. Its id is a path.

| Image id                    | What it is                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `exe/slus_004_22`           | the main executable, `SLUS_004.22`, resident from boot to power-off                                                     |
| `exe/logo`                  | the logo program, `LOGO/LOGO.EXE`                                                                                       |
| `emi/<folder>/<archive>/NN` | the code in entry `NN` of an EMI archive, for example `emi/world02/area078/13` is entry 13 of `BIN/WORLD02/AREA078.EMI` |

### Evidence tags

Every page states facts that come from reading the retail code or data. A claim with no tag is such a
read: the code or the data shows it. Only two tags exist, and they mark the exceptions.

| Tag          | Meaning                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `[inferred]` | deduced from several reads or from a community source; treat it as a lead                        |
| `[unknown]`  | not established; the page says what would settle it, and [gaps](open-questions.md) collects them |

The site holds no retail bytes. Layouts, offsets and counts come from reading the game and checking
every instance on the disc. A count such as "200 of 200" says a check covered every instance.

## Disc and containers

| Term           | Meaning                                                                                                                                                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EMI            | the game's archive format (`.EMI` files): a sector-aligned table of contents and typed entries ([EMI container](../formats/emi.md))                                                                                                                                                |
| entry          | one item in an EMI archive; written `ARCHIVE#n` or `archive/n`; its type (0 to 10) says how the loader treats it                                                                                                                                                                   |
| slot           | an index. An archive slot id is the archive's index in the disc file list. A text slot is an index in a message bank's offset table. A battler slot is a position in a battle (0-2 party, 3-10 enemies). A field slot is one row of the scene's object table. Each page says which |
| record         | one fixed-size row of a table (a character record, an enemy record, a drop row), or one string run in a message bank                                                                                                                                                               |
| message bank   | a payload that opens with a little-endian `u16` offset table. Each slot of the table points at a record of text; several slots can share one record ([text](../data/text.md#message-bank))                                                                                         |
| name table     | an array of fixed-stride records that each hold a name field ([text](../data/text.md#fixed-width-name-tables))                                                                                                                                                                     |
| fixed tables   | the eight tables in `GAME.EMI` entry 0: items, vital items, weapons, armor, accessories, shops, abilities and level growth ([records](../data/records.md#gameemi-fixed-tables))                                                                                                    |
| payload        | the bytes of an entry after its table-of-contents record                                                                                                                                                                                                                           |
| load argument  | a type-dependent 32-bit value in an entry's table record: a RAM address for code and data, a VRAM position for textures                                                                                                                                                            |
| LBA            | logical block address: a sector number on the disc                                                                                                                                                                                                                                 |
| Form 1, Form 2 | the two CD-ROM XA sector layouts; Form 1 has error correction and 2,048 data bytes, Form 2 has 2,324 data bytes and none                                                                                                                                                           |
| STR, XA        | the game's streamed video and interleaved audio sectors ([STR and XA](../formats/str.md))                                                                                                                                                                                          |
| CDDA           | CD audio tracks on the disc, outside the data track                                                                                                                                                                                                                                |
| kind           | a name this wiki gives to a class of disc content, such as `area-map`, `texture` or `audio-bank` ([asset kinds](../formats/assets.md))                                                                                                                                             |

## Game runtime

| Term             | Meaning                                                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| resident program | the main executable, which stays in RAM from boot to power-off; every overlay calls into it ([runtime](../data/programs.md))                                                                        |
| overlay          | code or data streamed from the disc into a fixed RAM window, replacing the previous overlay at that address                                                                                         |
| window           | a RAM range that overlays share, such as `0x801D0C00` for scene overlays ([memory](../systems/memory.md))                                                                                           |
| area             | one of the 200 `WORLDnn/AREAnnn.EMI` maps: a town, dungeon, world map, battlefield, fishing pond, fairy village or camp                                                                             |
| scenario         | one of 20 story controller overlays, `SCENA00` to `SCENA19` ([scenario](../systems/scenario.md))                                                                                                    |
| module           | a small overlay that a window swaps, such as a boss battle or a battle effect. Its first `u32` is its module id ([runtime](../data/programs.md#module-windows))                                     |
| boss module      | the module of one boss battle                                                                                                                                                                       |
| area program     | the code entry of an area, loaded at `0x801F2C00`; it places the area's objects and runs its scripts                                                                                                |
| map kind         | what an area is: world map, battlefield, fishing pond, fairy village, camp or walked area. Byte `+0x32` of the area's load row selects it ([runtime](../data/programs.md#map-kinds))                |
| entry state      | the value of `g_GameEntryState`: an index into the table `g_GameStates` of 12 full-screen modes, such as the field or the menu ([screens](../systems/screens.md))                                   |
| request code     | a byte, `g_GameStateIndex`, with values 0 to 9. Field, actor and scenario code write it, and the field state reads it to choose the next entry state ([phases](../systems/phases.md))               |
| zone list        | the executable's per-area list of 8-byte rectangles in map cells. A rectangle holds an encounter step class, a zone kind and a music selector (`[inferred]`; [area](../systems/areas.md#zone-list)) |
| work row         | a row that an overlay builds in RAM at run time, such as a player or enemy row of a battle ([battle](../data/battle.md))                                                                            |
| actor row        | one of 30 rows of `0x98` bytes at `0x80146888`: a map object or an interaction slot ([field](../data/field.md#actor-rows))                                                                          |
| field slot       | one of 20 rows of `0x74` bytes at `0x80143FC8` that the scene claims, fills and clears ([field](../data/field.md#field-slots))                                                                      |
| text id          | a 16-bit id that a record stores to name a string. The top two bits pick a group, and the rest index that group's offset table (`Resource_Resolve`, [text](../data/text.md#references))             |
| callback slot    | one of the four cooperative tasks the main loop runs each frame ([scheduler](../systems/scheduler.md))                                                                                              |
| scratchpad       | the PlayStation's 1 KiB fast memory at `0x1F800000`                                                                                                                                                 |
| ordering table   | the GPU's linked list of primitives drawn in depth order                                                                                                                                            |
| primitive        | one GPU draw command (sprite, textured quad, line)                                                                                                                                                  |
| staging buffer   | RAM where data waits before it is copied to VRAM, the card or the SPU                                                                                                                               |

## PlayStation hardware and formats

| Term        | Meaning                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| VRAM        | the GPU's 1 MiB video memory, 1,024 by 512 16-bit words                                                                      |
| CLUT        | colour lookup table: a row of palette words in VRAM that an indexed (4 or 8 bit) texture uses                                |
| TPage       | texture page: the VRAM region and colour depth a primitive samples                                                           |
| STP         | the semi-transparency bit of a 16-bit colour word                                                                            |
| GTE         | the geometry transformation engine: the coprocessor that rotates and projects vertices                                       |
| SPU         | the sound processing unit; it plays ADPCM samples with an envelope                                                           |
| ADPCM       | the 4-bit sample compression the SPU and XA audio use                                                                        |
| VAB         | a sound bank: a header of programs and tones plus a body of samples (`.vh` header, `.vb` body)                               |
| VAG         | one sample inside a VAB body                                                                                                 |
| SEP         | a music sequence package; each sequence plays through a VAB                                                                  |
| MDEC        | the motion decoder that turns STR frames into pictures                                                                       |
| PS-X header | the 2 KiB header of a PlayStation executable; it holds the load address (`t_addr`), size and start address                   |
| PsyQ        | Sony's PlayStation SDK, which the game links; its library names (`ResetGraph`, `LoadImage`, `CdControl`) appear in the pages |
