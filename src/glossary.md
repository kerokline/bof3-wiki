# Glossary

The terms these pages use without explaining each time. Read the first two sections before any page that cites functions or addresses.

## Evidence citations

A claim about the game's code names the function and the program that holds it: `Name (image@0xADDR)`. For example, `SYS_Main (exe/slus_004_22@0x8014AAC8)` is the function `SYS_Main` at address `0x8014AAC8` in the image `exe/slus_004_22`. The symbol name at that address is a result of this research, not a name the game stores. A name of the form `func_8014AAC8` is an address name: the function is located but not yet given a role. `D_80146840` is the same for data, and a `g_` prefix marks a named global. A `u8`, `u16`, `s32` and so on is an unsigned (`u`) or signed (`s`) integer of 8, 16 or 32 bits; all multi-byte values are little endian.

An address alone is not enough, because overlays reuse addresses. Always read the address together with its image.

### Image ids

An image is one program the game loads. Its id is a path:

| Image id                    | What it is                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `exe/slus_004_22`           | the main executable, `SLUS_004.22`, resident from boot to power-off                                                     |
| `exe/logo`                  | the logo program, `LOGO/LOGO.EXE`                                                                                       |
| `emi/<folder>/<archive>/NN` | the code in entry `NN` of an EMI archive, for example `emi/world02/area078/13` is entry 13 of `BIN/WORLD02/AREA078.EMI` |

### Evidence tags

| Tag                        | Meaning                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| `read` or `[read]`         | read directly in the code or data                                             |
| `measured`                 | checked over every instance on the disc; the count is given                   |
| `inferred` or `[inferred]` | deduced from several reads; treat as a lead                                   |
| `unknown` or `[unknown]`   | not established; [gaps](game/architecture/gaps.md) lists what would settle it |

## Disc and containers

| Term           | Meaning                                                                                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EMI            | the game's archive format (`.EMI` files): a sector-aligned table of contents and typed entries ([EMI container](formats/emi.md))                                                                            |
| entry          | one item in an EMI archive; written `ARCHIVE#n` or `archive/n`; its type (0 to 10) says how the loader treats it                                                                                            |
| slot           | an index. An archive slot id is the archive's index in the disc file list. A text slot is an index in a message bank's offset table. A battler slot is a position in the battle party. Each page says which |
| payload        | the bytes of an entry after its table-of-contents record                                                                                                                                                    |
| load argument  | a type-dependent 32-bit value in an entry's table record: a RAM address for code and data, a VRAM position for textures                                                                                     |
| LBA            | logical block address: a sector number on the disc                                                                                                                                                          |
| Form 1, Form 2 | the two CD-ROM XA sector layouts; Form 1 has error correction and 2,048 data bytes, Form 2 has 2,324 data bytes and none                                                                                    |
| STR, XA        | the game's streamed video and interleaved audio sectors ([STR and XA](formats/str.md))                                                                                                                      |
| CDDA           | CD audio tracks on the disc, outside the data track                                                                                                                                                         |
| kind           | a name this wiki gives to a class of disc content, such as `area-map`, `texture` or `audio-bank` ([asset kinds](formats/assets.md))                                                                         |

## Game runtime

| Term           | Meaning                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| overlay        | code or data streamed from the disc into a fixed RAM window, replacing the previous overlay at that address             |
| window         | a RAM range that overlays share, such as `0x801D0C00` for scene overlays ([memory](game/architecture/memory.md))        |
| area           | one of the 200 `WORLDnn/AREAnnn.EMI` maps: a town, dungeon, world map, battlefield, fishing pond, fairy village or camp |
| scenario       | one of 20 story controller overlays, `SCENA00` to `SCENA19` ([scenario](game/architecture/scenario.md))                 |
| boss module    | the code overlay of one boss battle                                                                                     |
| callback slot  | one of the four cooperative tasks the main loop runs each frame ([scheduler](game/architecture/scheduler.md))           |
| scratchpad     | the PlayStation's 1 KiB fast memory at `0x1F800000`                                                                     |
| ordering table | the GPU's linked list of primitives drawn in depth order                                                                |
| primitive      | one GPU draw command (sprite, textured quad, line)                                                                      |
| staging buffer | RAM where data waits before it is copied to VRAM, the card or the SPU                                                   |

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
