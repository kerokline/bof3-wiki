# Game text

*Read this if you edit dialogue, names or any in-game string.*

The game's text encoding, control codes, string containers and string references. Every string the
game prints is a byte string in one encoding.

## Byte classes

| Class          | Bytes                                                         | Meaning                                         |
| -------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| characters     | `0x30`-`0x39`, `0x41`-`0x5A`, `0x61`-`0x7A`                   | digits and letters, ASCII order                 |
| special glyphs | `0x3A`-`0x3E`, `0x5C`, `0x5D`, `0x8B`, `0x8D`, `0x8E`, `0x8F` | punctuation                                     |
| space          | `0xFF`                                                        | the space glyph (`TEXT_SPACE`)                  |
| controls       | `0x00`-`0x16`, `0x90`                                         | message codes (`TEXT_*`)                        |
| unresolved     | everything else                                               | no glyph or behavior proven; kept as `{RAW:xx}` |

Letters and digits are ASCII; every other byte has a name (`TEXT_SPACE`). The message font's space
is `0xFF`; the plain ASCII space `0x20` belongs to the interface font. The fullwidth slots `0x8D` and
`0x8F` draw the same shapes as `0x3C` and `0x3A`. `func_8014FC00` (`exe/slus_004_22@0x8014FC00`)
selects the font texture page; `UI_DrawTextGlyphs` (`exe/slus_004_22@0x8014F84C`) maps bytes to its
31-column atlas at `u = ((c - 0x30) % 31) * 8`, `v = ((c - 0x30) / 31) * 12 + 0x48`. `UI_DrawGlyphString` and code `0x15` in `UI_DrawTextString` draw from a second 8 by 8 sheet of 32 columns starting at `0x20`.

| Byte range    | Characters | Glyph slot |
| ------------- | ---------- | ---------- |
| `0x30`-`0x39` | `0`-`9`    | 0-9        |
| `0x41`-`0x5A` | `A`-`Z`    | 17-42      |
| `0x61`-`0x7A` | `a`-`z`    | 49-90      |

| Byte            | Glyph | Name                                  |
| --------------- | ----- | ------------------------------------- |
| `0x3C` / `0x8D` | `,`   | `TEXT_COMMA` / `TEXT_FULLWIDTH_COMMA` |
| `0x3D`          | `-`   | `TEXT_HYPHEN`                         |
| `0x3E`          | `.`   | `TEXT_PERIOD`                         |
| `0x5C`          | `?`   | `TEXT_QUESTION`                       |
| `0x5D`          | `!`   | `TEXT_EXCLAMATION`                    |
| `0x3A` / `0x8F` | `:`   | `TEXT_COLON` / `TEXT_FULLWIDTH_COLON` |
| `0x3B`          | `;`   | `TEXT_SEMICOLON`                      |
| `0x8B`          | `+`   | `TEXT_PLUS`                           |
| `0x8E`          | `'`   | `TEXT_APOSTROPHE`                     |

`0x3A`/`0x8F` and `0x3C`/`0x8D` are two slots for one shape; text spells the high slot with the
fullwidth character so both re-encode to their own byte. Executable images use the `ascii` codec:
`0x20`-`0x7E` as themselves, tab/newline/return as tags, `0x00` as `{END}`, anything else as
`{RAW:nn}`.

## Control codes

The line printer `UI_DrawTextGlyphs` (`exe/slus_004_22@0x8014F84C`) and the message engine
`0x8015083C`-`0x80151D3C` switch on the same byte.

| Byte     | Tag           | Name             | Behavior                                                                                                                  |
| -------- | ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `0x00`   | `{END}`       | `TEXT_END`       | ends the string                                                                                                           |
| `0x01`   | `{NEWLINE}`   | `TEXT_NEWLINE`   | `x = line origin`, `y += 12` px                                                                                           |
| `0x02`   | `{PAGE}`      | `TEXT_PAGE`      | engine sets the wait state                                                                                                |
| `0x03`   | `{GOTO}`      | `TEXT_GOTO`      | save the stream pointer, redirect to the character record `0x80144968 + 0xA4 * g_CharSlot[byte[0x80145F09]]`, budget 6    |
| `0x04 n` | `{INSERT:nn}` | `TEXT_INSERT`    | advance and save the pointer, redirect to the `0xA4` record the operand `n` indexes, budget 6                             |
| `0x05 n` | `{COLOR:nn}`  | `TEXT_COLOR`     | load `0x7800 \| (n & 0xF)`; operands red `0x02`, blue `0x03`                                                              |
| `0x06`   | `{NOCOLOR}`   | `TEXT_NOCOLOR`   | restore the saved color                                                                                                   |
| `0x07 n` | `{VAR:nn}`    | `TEXT_VAR`       | print the 32-byte string at `0x801490D8 + n * 32`, budget 33                                                              |
| `0x08 n` | `{LINK:nn}`   | `TEXT_LINK`      | redirect to the string that `u16[2*n]` of the table at `0x80010000 + u32[0x80010004]` selects, budget 17                  |
| `0x09`   | `{NOP09}`     | `TEXT_NOP`       | shared tail advances one byte                                                                                             |
| `0x0A n` | `{SE:nn}`     | `TEXT_SE`        | play `n \| 0x200` through `SND_PlayCue` (`exe/slus_004_22@0x8015DF18`)                                                    |
| `0x0B`   | `{GAP}`       | `TEXT_GAP`       | the script step `func_8015083C` enters state 1 with the glyph delay raised by 8 frames; the draw routine ignores the code |
| `0x0C n` | `{BOX:nn}`    | `TEXT_BOX`       | start a box; operand is the window/menu style                                                                             |
| `0x0D`   | `{NOP0D}`     | `TEXT_OFFSET`    | `UI_DrawMessageScript` draws following glyphs at the state's `x`/`y` plus deltas                                          |
| `0x0E`   | `{NOP0E}`     | `TEXT_CURSOR`    | `UI_DrawMessageScript` clears the flag and draws at the script cursor                                                     |
| `0x0F`   | `{STYLE0F}`   | `TEXT_STYLE`     | load three per-style parameters from `0x8017F5B8`, `0x8017F5BA`, `0x8017F5B9`                                             |
| `0x10`   | `{STYLE10}`   | `TEXT_STYLE_ALT` | same body as `0x0F`                                                                                                       |
| `0x11`   | `{WAIT}`      | `TEXT_WAIT`      | `flags ^= 0x10`; the step returns while set                                                                               |
| `0x12 n` | `{SKIP12:nn}` | `TEXT_SKIP`      | advance one byte; no other proven effect                                                                                  |
| `0x13 n` | `{SKIP13:nn}` | `TEXT_SKIP_ALT`  | same body as `0x12`                                                                                                       |
| `0x14 n` | `{CHOICE:nn}` | `TEXT_CHOICE`    | answers follow as `0x00`-separated labels                                                                                 |
| `0x15 n` | `{NUM:nn}`    | `TEXT_NUM`       | print a decimal number                                                                                                    |
| `0x16 n` | `{BOXEND:nn}` | `TEXT_BOXEND`    | store the operand, state 7                                                                                                |
| `0x90`   | `{BACKSPACE}` | `TEXT_BACKSPACE` | step the glyph cursor back 8 px and redraw                                                                                |

A redirect (`{GOTO}`, `{INSERT}`, `{VAR}`, `{LINK}`) moves the read pointer into another string and
sets a budget: `UI_DrawMessageScript` (`exe/slus_004_22@0x80150470`) counts one per byte read and, when the
budget runs out or the other string reaches `{END}`, resumes after the code that redirected. The
budgets are 6 for `{GOTO}` and `{INSERT}`, 17 for `{LINK}` and 33 for `{VAR}`; they bound the
inserted text, not a message-engine state.

The operand widths are what the case bodies prove: a case that advances the pointer owns one
operand byte; the shared tail advances one byte for the code. No control byte is unresolved. A byte
that is neither a case nor in the printer's glyph range stays `{RAW:nn}`.

## Containers

**Message bank.** A payload opening with a little-endian `u16` offset table describes itself:
`offset[0]` is the table end, so the table holds `offset[0]/2` slots, and every slot points at a
record running to the next distinct slot offset. Several slots may point at one record. All 200
area entries load at `0x80010000` and parse as banks; 165 are kept as text banks with 10,494 proven
strings, 162 at slot 11. The engine resolves a message with `D_80010000[g_MessageRequest] + 0x80010000`
and the loader descriptor table at `0x8014677C` stages the payload.

**Fixed-width name tables.** Item/weapon/armor/accessory/ability tables in `GAME.EMI` entry 0
(strides `0x12`, `0x18`, `0x16`, `0x14`, `0x14`), master names in `AFLDKWA.EMI`/`FIRST.EMI`,
fairy names (stride 9) and enemy names in the 1,160-byte type-0 payload of each area archive
(stride `0x88`, name `[8]`). A name may fill its field and carry no terminator (item 3,
`Healing\xffHerb`, is 12 bytes in a 12-byte field). The base-stat character names in
`START.EMI`/`STATUS.EMI` are not a fixed-width table; each name is the first five bytes of its
`0xA4`-byte character record.

**Loose records.** Anything else ends at `0x00`: menu labels, battle text, help banks and result
lines. A record may open with a control code. Entry types 3 and 6-10 are graphics and audio and
hold no text.

## Which payloads hold text

A payload holds text when it has a message bank (read from its own offset table), a known string table, or a loose record. The known tables are the fixed tables of `ETC/GAME.EMI` entry 0, the base-stat character names, and the enemy names of an area encounter block. Shared resource tables (`0x8001A000`) are string tables. A code image holds text when it has a run of four labels or a loose record with two words; the code, sprite, texture and map payloads that only decode as stray tags hold none.

Each string has a position (the entry, the byte offset in the entry, and the RAM address when the entry names a load address), a kind (message, string table or loose) and a source of discovery (bank header, known table or scan). A message also has every bank slot that reaches it. An entry's offset, its archive's first sector and the string's logical disc offset locate the same bytes on the disc.

## References

| Kind           | Width | Where                                               | Reaches                                                                                        |
| -------------- | ----- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `bank-index`   | `u16` | the bank's own offset table, `payload + slot * 2`   | the record the slot selects                                                                    |
| `text-id`      | `u16` | a record of a name table                            | the string through the `0x4000`-based id space (`Resource_Resolve`, RAM table at `0x8001A000`) |
| `absolute-u32` | `u32` | code or data of any payload                         | the string's runtime address                                                                   |
| `resource-id`  | `u16` | the group table of a payload loaded at `0x8001A000` | the string the id resolves to                                                                  |

`Resource_Resolve` (`0x801502D0`-`0x80150300`) resolves an id against the payload at `0x8001A000`:

The two top bits of the id (`id >> 14`) select one of four base words at the start of the payload. The base word gives
the group's base inside the payload, where a `u16` offset table sits. The slot is `base + 2 * (id & 0x3FFF)`, and the
string's runtime address is `0x8001A000 + base + u16(slot)`.

44 disc entries carry exactly the load address `0x8001A000` (38 at slot 11, five `BOSS` at slot 8,
`ETC/AFLDKWA` slot 0), so the mapping is in the payload bytes. The id space is archive-local: a
text-id field in another file cannot be tied statically to one string.
