# Game text

Every string the game prints is a byte string in one custom encoding. Digits and letters follow ASCII
order, a few punctuation marks sit in odd slots, the space is `0xFF`, and the low bytes are control
codes that drive the message window. This page covers that encoding, the control codes, the
containers that hold strings and the ways code and data refer to a string. Dialogue lives in the
area message banks (see [Game data records](records.md#which-archive-holds-what) for which archive
holds what). The message window itself is part of the [field](field.md) and [battle](battle.md)
screens.

Terms such as bank, record and slot are defined in the [glossary](../appendix/glossary.md).

## Byte classes

The encoding has five classes of byte. The table shows which bytes belong to each class.

| Class          | Bytes                                                         | Meaning                              |
| -------------- | ------------------------------------------------------------- | ------------------------------------ |
| characters     | `0x30`-`0x39`, `0x41`-`0x5A`, `0x61`-`0x7A`                   | digits and letters, in ASCII order   |
| special glyphs | `0x3A`-`0x3E`, `0x5C`, `0x5D`, `0x8B`, `0x8D`, `0x8E`, `0x8F` | punctuation                          |
| space          | `0xFF`                                                        | the message font's space glyph       |
| controls       | `0x00`-`0x16`, `0x90`                                         | message codes, listed below          |
| unresolved     | everything else                                               | no glyph or behaviour has been found |

Letters and digits equal their ASCII values. The message font has no `0x20` space; `0xFF` is the
space. The plain ASCII space `0x20` belongs to the interface font of
[`UI_DrawGlyphString`](#other-glyph-sheets).

### Glyph atlas

`UI_DrawTextGlyphs (exe/slus_004_22@0x8014F84C)` maps a byte to a cell of the 31-column message
atlas: `u = ((c - 0x30) % 31) * 8` and `v = ((c - 0x30) / 31) * 12 + 0x48`. The cell number is
`c - 0x30`, so the digit row starts at slot 0. `func_8014FC00 (exe/slus_004_22@0x8014FC00)` selects the
font texture page.

| Byte range    | Characters | Glyph slots |
| ------------- | ---------- | ----------- |
| `0x30`-`0x39` | `0`-`9`    | 0-9         |
| `0x41`-`0x5A` | `A`-`Z`    | 17-42       |
| `0x61`-`0x7A` | `a`-`z`    | 49-74       |

The special glyphs fill the gaps between those runs. Two shapes have two slots each. The fullwidth
slots `0x8D` and `0x8F` draw the same shapes as `0x3C` and `0x3A`, so a text that needs a byte-exact
round trip must keep which slot it used.

| Byte            | Glyph | Name                    |
| --------------- | ----- | ----------------------- |
| `0x3A` / `0x8F` | `:`   | colon / fullwidth colon |
| `0x3B`          | `;`   | semicolon               |
| `0x3C` / `0x8D` | `,`   | comma / fullwidth comma |
| `0x3D`          | `-`   | hyphen                  |
| `0x3E`          | `.`   | period                  |
| `0x5C`          | `?`   | question mark           |
| `0x5D`          | `!`   | exclamation mark        |
| `0x8B`          | `+`   | plus                    |
| `0x8E`          | `'`   | apostrophe              |

### Other glyph sheets

Two more sheets exist. `UI_DrawGlyphString (exe/slus_004_22@0x80150098)` draws 8 by 8 glyphs from a
sheet of 32 columns that starts at `0x20`, so its bytes are plain ASCII. It has no case for control
code `0x15`: the byte takes the ordinary glyph path and draws the cell for ASCII `5` (`0x35`).

`UI_DrawTextString (exe/slus_004_22@0x8014FC90)` reads control code `0x15` from the same 32-column
grid of 8 by 8 cells on texture page `0x2F`. The operand `n` selects the cell `n + 0x40`, which is
column `(n + 0x40) % 32` and row `(n + 0x40) / 32`, with the row shade added.

Control code `0x15` in `UI_DrawTextGlyphs (exe/slus_004_22@0x8014F84C)` draws a number glyph from a
third sheet of 21 columns and 12 px cells. The operand `n` selects the cell `n + 0x5B`, at
`u = ((n + 0x5B) % 21) * 12`. Operands 0 to 255 use rows 4 to 16 of that sheet.

### Worked example

The bytes `48 69 5D 01 4F 6B FF 4D 65 00` read `Hi!`, a new line, `Ok Me`, and the end of
the string: `0x48` is `H`, `0x69` is `i`, `0x5D` is `!`, `0x01` starts a new line, `0xFF` is the space, `0x00` ends the string.

## Control codes

Both text drawers switch on the same byte. `UI_DrawTextGlyphs (exe/slus_004_22@0x8014F84C)` draws a
line. The message engine, `func_8015083C (exe/slus_004_22@0x8015083C)` with `UI_DrawMessageScript`
(exe/slus_004_22@0x80150470), steps the window state. This page writes a control byte as a tag such as
`{NEWLINE}`; an operand byte follows the tag as `{COLOR:03}`.

The table lists each code, how many operand bytes it takes and what it does.

| Byte     | Tag           | Behaviour                                                                                                   |
| -------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| `0x00`   | `{END}`       | ends the string                                                                                             |
| `0x01`   | `{NEWLINE}`   | sets `x` to the line origin and adds 12 px to `y`                                                           |
| `0x02`   | `{PAGE}`      | the engine enters its wait state                                                                            |
| `0x03`   | `{GOTO}`      | redirects to the character record `0x80144968 + 0xA4 * g_CharSlot[byte[0x80145F09]]`, budget 6              |
| `0x04 n` | `{INSERT:nn}` | redirects to the 164-byte character record that operand `n` indexes, budget 6                               |
| `0x05 n` | `{COLOR:nn}`  | loads the colour `0x7800 \| (n & 0xF)`; red is operand `0x02`, blue is `0x03`                               |
| `0x06`   | `{NOCOLOR}`   | restores the saved colour                                                                                   |
| `0x07 n` | `{VAR:nn}`    | prints the 32-byte string at `0x801490D8 + n * 32`, budget 33                                               |
| `0x08 n` | `{LINK:nn}`   | redirects to the string that `u16[2 * n]` of the table at `0x80010000 + u32[0x80010004]` selects, budget 17 |
| `0x09`   | `{NOP09}`     | no effect; the shared tail advances one byte                                                                |
| `0x0A n` | `{SE:nn}`     | plays the cue `n \| 0x200` through `SND_PlayCue (exe/slus_004_22@0x8015DF18)`                               |
| `0x0B`   | `{GAP}`       | the engine enters state 1 and adds 8 frames to the glyph delay; the line drawer ignores the code            |
| `0x0C n` | `{BOX:nn}`    | starts a box; the operand is the window style                                                               |
| `0x0D`   | `{NOP0D}`     | `UI_DrawMessageScript` draws the following glyphs at the state's `x` and `y` plus deltas                    |
| `0x0E`   | `{NOP0E}`     | `UI_DrawMessageScript` clears the flag and draws at the script cursor                                       |
| `0x0F`   | `{STYLE0F}`   | loads three style parameters from `0x8017F5B8`, `0x8017F5BA` and `0x8017F5B9`                               |
| `0x10`   | `{STYLE10}`   | same body as `0x0F`                                                                                         |
| `0x11`   | `{WAIT}`      | toggles flag `0x10`; the step returns while the flag is set                                                 |
| `0x12 n` | `{SKIP12:nn}` | advances one byte; no other effect found                                                                    |
| `0x13 n` | `{SKIP13:nn}` | same body as `0x12`                                                                                         |
| `0x14 n` | `{CHOICE:nn}` | the answers follow as labels separated by `0x00`                                                            |
| `0x15 n` | `{NUM:nn}`    | draws the number glyph for operand `n` from the 21-column sheet                                             |
| `0x16 n` | `{BOXEND:nn}` | stores the operand and enters state 7                                                                       |
| `0x90`   | `{BACKSPACE}` | steps the glyph cursor back 8 px and redraws                                                                |

The operand widths come from the case bodies. A case that advances the pointer owns one operand
byte, and the shared tail advances one byte for the code itself. No control byte is unresolved. A
byte that is neither a case nor in the glyph range draws nothing and is `[unknown]`.

### Redirects

`{GOTO}`, `{INSERT}`, `{VAR}` and `{LINK}` move the read pointer into another string and set a
budget. `UI_DrawMessageScript` counts one per byte read. When the budget runs out, or the other
string reaches `{END}`, reading resumes after the code that redirected. The budgets are 6 for
`{GOTO}` and `{INSERT}`, 17 for `{LINK}` and 33 for `{VAR}`. They bound the inserted text and are not
a message-engine state.

For example, a line holding `{INSERT:01}` prints at most 6 bytes from the start of the record that
operand `1` selects. It stops early at an `{END}` byte, then reading resumes after the operand.

## Containers

Strings live in three kinds of container. The kind decides how the bytes are found.

### Message bank

A payload that opens with a little-endian `u16` offset table describes itself. The first entry,
`offset[0]`, is the end of the table, so the table holds `offset[0] / 2` slots. Each slot points at a
record that runs to the next larger slot offset, and the last record runs to the end of the payload.
Several slots may share one record.

Take a bank whose table is `0008 000F 000F 0014`. The table is 8 bytes, so it has four slots.
Slots 1 and 2 share the record at `0x0F`. Slot 0 is the 7 bytes from `0x08` to `0x0F`, and that record
ends with a `{END}`. Slot 3 starts at `0x14` and runs to the end of the payload.

A payload is a message bank when `offset[0]` is even, at least 4 and no larger than the payload, every slot is at least `offset[0]` and no larger than the payload, and the slots never decrease. A bank is a text bank when at least half of its first 64 distinct records read as text. A record reads as text when, after its trailing zeros, it has at least 3 bytes and either 4 letters that make up 40 percent or more of it, or 3 letters and a `0xFF` space.

The 200 entries that load at `0x80010000` hold 152 distinct payloads. 197 entries are banks. The three fishing entries (`AREA030`, `AREA089` and `AREA129`, entry 18) are one identical 4,293-byte payload whose slots do not ascend, so they hold other data in that slot. 165 of the 197 banks are text banks: 162 at entry 11, 2 at entry 7 and 1 at entry 12, and 33, 33, 29, 30 and 40 in WORLD00 to WORLD04. The other 32 banks (31 of 1,022 bytes and one of 512 bytes) hold only short or empty records. The 165 text banks hold 10,510 messages, a message being one distinct slot value below the payload size. 10,494 of them are proven strings: they do not start with a zero byte and have at least 3 bytes before their terminator. All 197 banks hold 11,006 messages, and the three other payloads add 330, which makes 11,336 for the 200 entries. The engine resolves a message as
`u16[0x80010000 + 2 * g_MessageRequest] + 0x80010000`, and the loader descriptor table at
`0x8014677C` stages the payload. The largest bank is 21,547 bytes.

### Fixed-width name tables

A name table is an array of records with one stride. The strings sit in a name field of each record:

- Item, weapon, armour, accessory and ability names in the [fixed tables of GAME.EMI](records.md#gameemi-fixed-tables).
  Their strides are `0x12`, `0x18`, `0x16`, `0x14` and `0x14`.
- Master names in `AFLDKWA.EMI` and `FIRST.EMI`.
- Fairy names, stride 9, and enemy names. Both sit in the 1,160-byte type-0 payload of each area
  archive. Enemy records have stride 136 and a name field of 8 bytes.

A name may fill its field and carry no terminator. Item 3 is 12 bytes in a 12-byte field. The base
stat character names in `START.EMI` and `STATUS.EMI` are not a table. Each is the first five bytes
of its 164-byte [character record](records.md#character-and-master-data).

### Loose records

Anything else ends at `0x00`: menu labels, battle text, help banks and result lines. A record may
open with a control code. Archive entries of types 3 and 6-10 are graphics and audio and hold no
text.

## References

Code and data reach a string in four ways. The table lists each kind, how wide the reference is,
where it sits and what it reaches.

| Kind           | Width | Where                                               | Reaches                                            |
| -------------- | ----- | --------------------------------------------------- | -------------------------------------------------- |
| `bank-index`   | `u16` | the bank's offset table, at `payload + slot * 2`    | the record that the slot selects                   |
| `text-id`      | `u16` | a record of a name table                            | a string through the resource id space (see below) |
| `absolute-u32` | `u32` | code or data of any payload                         | the string's runtime address                       |
| `resource-id`  | `u16` | the group table of a payload loaded at `0x8001A000` | the string that the id resolves to                 |

`Resource_Resolve (exe/slus_004_22@0x801502D0)` turns a resource id into a runtime address. It
works on the payload loaded at `0x8001A000`.

1. `id >> 14` selects one of four base words, at `0x8001A000 + 4 * (id >> 14)`.
2. The base word is the offset of a group inside the payload. The group opens with a `u16` offset
   table.
3. The slot is `0x8001A000 + base + 2 * (id & 0x3FFF)`.
4. The result is `0x8001A000 + base + u16[slot]`.

For example, the id `0x4003` has group 1 and index 3. If base word 1 is `0x0100` and the
`u16` at `0x8001A000 + 0x100 + 6` is `0x0040`, the string is at `0x8001A140`. Groups 0 and 1 are
hold strings in the shared table.

44 archive entries load at `0x8001A000`: entry 11 of `BOSS` (35 times), `BATTLE` (2) and `ETC/FIRST` (1),
entry 8 of `BOSS` (5 times) and entry 0 of `ETC/AFLDKWA` (1). The ids are local to the payload. A
`text-id` field in another file cannot be tied to one string unless you know which payload sits at
`0x8001A000` when the id resolves.

## Open questions

- `[unknown]` Which payload sits at `0x8001A000` when a given `text-id` resolves. A trace of the
  resolver call would settle it.
- `[unknown]` The effect of `{SKIP12}` and `{SKIP13}` beyond advancing one byte.
