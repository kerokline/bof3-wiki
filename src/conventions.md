# Notation and conventions

Every reference page writes numbers, field types, offsets and citations the same way. This page defines
that notation once. Read it before the [formats](formats/emi.md), [data](data/records.md) and
[systems](systems/boot.md) pages. The [glossary](appendix/glossary.md) defines the terms.

## Numbers and sizes

- **Hexadecimal** values carry the prefix `0x` and use upper-case digits: `0x1F`, `0x800E4000`. No other
  form appears (no `$1F`, `1Fh` or `0X1F`). A RAM address has eight digits. An offset or a mask has as
  many digits as its table column needs, with at least two.
- **Decimal** values have no prefix. A number of four or more digits has commas: `6,344`.
- **Sizes** are in bytes unless the text says otherwise. `KiB` is 1,024 bytes and `MiB` is 1,048,576
  bytes. A CD-ROM sector holds `0x800` bytes (2,048 bytes).
- **Ranges.** `A-B` includes both ends: `0x10-0x1F` is 16 values. `A..B` stops before `B`, so `B` is the
  first byte after the range: `0x80000000..0x80200000` is the 2 MiB of RAM. In prose, "0 to 6" is
  inclusive.
- **Counts.** Slots, entries, rows and indexes start at 0. "Entry 3" is the fourth entry of an archive.
  "N of N" says a check covered every instance on the disc.

## Bits and bit ranges

Bit 0 is the least significant bit, so bit *n* has the value `1 << n`. A single bit is written "bit 3". A
range goes from the low bit to the high bit: "bits 4 to 6". A mask names the same bits by value: bits 4 to 6 are mask
`0x70`. A **nibble** is four bits. The low nibble is bits 0 to 3 and the high nibble is bits 4 to 7.

A table that splits a value into fields has a `Bits` column in the same form, for example `24 to 31`.

## Byte order

All multi-byte values are little-endian: the low byte comes first. The CPU is a MIPS R3000A that runs in
little-endian mode, so a `u32` stored as the bytes `00 08 00 00` is `0x800`. The same holds on the disc: the
first four bytes of an EMI archive are the entry count, and `FIRST.EMI` starts `0E 00 00 00`, which is 14.

A few fields are big-endian because they come from other file formats, such as the MIDI-like
[SEP packages](formats/audio.md#sep-package). A page marks each of those fields `big-endian`. A signature
shown "in file order" lists its bytes as stored, such as `70 42 41 56` for the VAB tag `pBAV`.

## Field types

| Type          | Meaning                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| `u8`          | unsigned 8-bit integer (one byte)                                                                           |
| `u16`         | unsigned 16-bit integer                                                                                     |
| `u32`         | unsigned 32-bit integer                                                                                     |
| `s8`          | signed 8-bit integer, two's complement                                                                      |
| `s16`         | signed 16-bit integer                                                                                       |
| `s32`         | signed 32-bit integer                                                                                       |
| `T[n]`        | an array of `n` values of type `T`, for example `u8[8]`                                                     |
| `char[n]`     | `n` bytes of text; the game's own byte encoding ([text](data/text.md)) unless the page says ASCII           |
| `s32 (16.16)` | fixed point: the high 16 bits are the integer part and the low 16 bits the fraction, so `0x00018000` is 1.5 |

The MIPS terms **halfword** (16 bits) and **word** (32 bits) appear in prose about code. In prose about VRAM
and palettes, a *word* is one 16-bit VRAM cell, as in "a 16-bit CLUT word". Layout tables use `u16` and `u32`
for fields, so one field type has one name on every page.

## Offsets and addresses

Four kinds of position appear. Each page says which one a number is.

| Kind           | Counted from                                                      | Written as                                 |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| RAM address    | the start of the console's address space                          | `0x80195800` (eight digits)                |
| file offset    | byte 0 of a file, such as an executable or a save file            | `0x270`                                    |
| archive offset | byte 0 of an `.EMI` file, which starts with its table of contents | `0x33964`                                  |
| payload offset | the first byte of one entry's payload                             | `0x33164`                                  |
| record offset  | the first byte of one record in a table                           | `0x1C` in a table, `+0x1C` in running text |

The archive offset of a payload byte is the payload offset plus the offset at which the payload starts in the
file. For the first entry of an archive, that start is `0x800`. A code entry loads at the RAM address in its
table-of-contents row, so a RAM address in that entry is the load address plus the payload offset
([EMI container](formats/emi.md#load-argument)).

An entry is named `ARCHIVE.EMI#n`, for example `GAME.EMI#0`, or by its path `BIN/ETC/GAME.EMI`, entry 0.
A fixed-address RAM table is named by its address, for example `0x801448D8`.

## Images and citations

An **image** is one program that the game loads. Its id is a path, written in lower case.

| Image id                    | What it is                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `exe/slus_004_22`           | the main executable, `SLUS_004.22`, resident from boot to power-off                                                     |
| `exe/logo`                  | the logo program, `LOGO/LOGO.EXE`                                                                                       |
| `emi/<folder>/<archive>/NN` | the code in entry `NN` of an EMI archive, for example `emi/world02/area078/13` is entry 13 of `BIN/WORLD02/AREA078.EMI` |

A claim about the game's code names the function and its image in one code span: `Name (image@0xADDR)`.
For example, `SYS_Main (exe/slus_004_22@0x8014AAC8)` is the function `SYS_Main` at address `0x8014AAC8` in the
image `exe/slus_004_22`. Read the address together with its image, because overlays reuse addresses. A
paragraph that has already named the image may give the address alone: `Name (@0xADDR)`.

The name is a label from this research, not a name that the game stores.

- `func_801A0048` is an address name: the function is located but has no role name yet.
- `D_801448D8` is the same for data.
- A `g_` prefix marks a named global and an `s_` prefix a named static table, such as `g_SpadWork` and
  `s_ScriptOpcodeLengths`.

## Evidence tags

Every page states facts that come from reading the retail code or data. A claim with no tag is such a read:
the code or the data shows it. Only two tags exist, and they mark the exceptions.

| Tag          | Meaning                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `[inferred]` | deduced from several reads or from a community source; treat it as a lead                                           |
| `[unknown]`  | not established; the page says what would settle it, and [open questions](appendix/open-questions.md) collects them |

The site holds no retail bytes. Layouts, offsets and counts come from reading the game and checking every
instance on the disc.

## Reading a record layout table

A record is a fixed-size row of a table. A layout table lists its fields in the order they sit in memory or
in the file.

| Offset | Size | Type  | Field     | Meaning                 |
| -----: | ---: | ----- | --------- | ----------------------- |
| `0x00` |    2 | `u16` | `item_id` | the item this row gives |
| `0x02` |    1 | `u8`  | `count`   | how many; 0 means one   |
| `0x03` |    1 | `u8`  | unused    | always zero             |

This table is synthetic. The columns mean:

- **Offset**: where the field starts, counted from the first byte of the record. Gaps between rows are
  bytes the page does not describe. A table of RAM structures may use an **Address** column with absolute
  RAM addresses instead.
- **Size**: the field length in bytes. A page leaves this column out when the **Type** column already
  fixes it.
- **Type**: a type from the table above. A field with no type is a run of bytes, or flags.
- **Field**: the name this wiki uses for the field.
- **Meaning**: what the game does with the value, with its units and legal values.
- **Evidence** (some pages): the functions that read or write the field, cited as above.

In the example, the record is 4 bytes long. Reading `item_id` at record offset `0x00` from the bytes `0A 00 02 00`
gives `item_id = 0x000A` and `count = 2`.
