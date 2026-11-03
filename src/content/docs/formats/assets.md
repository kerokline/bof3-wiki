---
title: "Asset kinds"
description: "Every EMI entry on the disc belongs to one kind, a name this wiki gives to a class of disc content, chosen from the entry type, the load address and the contents."
---

Every EMI entry on the disc belongs to one kind: a name this wiki gives to a class of disc content, chosen from the entry type, the load address and the contents ([glossary](../../appendix/glossary/#disc-and-containers)). This page maps each kind to the page that describes it. It also holds the message-bank and game-string kinds, which have no format page of their own. Per-kind sizes are in [coverage](../../appendix/coverage/).

## Where each kind is described

| Kind                                         | Entry type, load address           | Described in                                                                       |
| -------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| EMI container                                | `.EMI` file                        | [EMI](../emi/)                                                                     |
| `code`                                       | types 0, 1, 2, program windows     | [EMI](../emi/#archive-shapes), [area](../area/#0x801f2c00-area-program-code-arena) |
| `texture`                                    | type 3                             | [graphics](../graphics/#chunk-layout)                                              |
| `palette`                                    | type 0, palette arena              | [graphics](../graphics/#palettes)                                                  |
| `character-bank`                             | type 0, `0x8003B800` and siblings  | [character](../character/)                                                         |
| `audio-bank`, `audio-sequence`, `audio-cues` | types 6 and 7, 10, 8               | [audio](../audio/)                                                                 |
| XA and STR streams                           | `.STR` files                       | [STR and XA](../str/)                                                              |
| `area-map`                                   | type 0, `0x80104000`               | [area](../area/#0x80104000-map-bundle)                                             |
| `area-cells`                                 | type 0, `0x80032000`               | [area](../area/#0x80032000-packed-4-bit-cell-grid)                                 |
| `area-script`                                | type 0, `0x800D3800`               | [area](../area/#0x800d3800-area-script-bank)                                       |
| `area-actor-defs`                            | type 0, `0x800E3800`               | [area](../area/#0x800e3800-scenestep-table)                                        |
| `area-encounters`                            | type 0, `0x800E4000`               | [area](../area/#0x800e4000-encounters-and-enemy-records)                           |
| `battle-script`, `bmagic-table`              | type 0, `0x800F0800`, `0x800C3800` | [EMI](../emi/#open-questions)                                                      |
| `area-module`                                | type 0, `0x80117000`               | [area](../area/#0x80117000-auxiliary-module-window)                                |
| `area-message`                               | type 0, `0x80010000`               | [Message banks](#message-banks)                                                    |
| `resource-table`                             | type 0, `0x8001A000`               | [game text](../../data/text/#references)                                           |
| item, weapon, armor, shop and ability tables | `ETC/GAME.EMI` entry 0             | [game records](../../data/records/#gameemi-fixed-tables)                           |
| base stats of the eight characters           | `ETC/START.EMI` entry 8            | [game records](../../data/records/#character-and-master-data)                      |
| memory card save                             | `ETC/START.EMI` entry 9            | [save](../save/)                                                                   |
| executables                                  | `SLUS_004.22`, `LOGO.EXE`          | [executable](../exe/)                                                              |
| conversion to PNG, glTF, SoundFont, MIDI     |                                    | [conversion](../conversion/)                                                       |

The `reserve` kind is zero fill with no consumer: 44 character-bank fillers of 16,384 zero bytes and 9 all-zero cell slots ([coverage](../../appendix/coverage/#what-keeps-a-range-from-the-next-level)).

## Message banks

The dialogue is in message banks, the `0x80010000` payloads of the area archives. A bank decodes to text and encodes back to its own bytes. [Game text](../../data/text/#message-bank) owns the bank layout, the test for a bank and for a text bank, and the counts on the disc.

- **Slots.** A slot is its message's index, or none for the end of the bank. A message runs to the next distinct offset, and the slots past the last message point at the end of the bank. The bank is the table, then the messages in offset order.
- **Text.** Control codes are `{TAG}`. A code with one operand byte is `{TAG:hh}`. A byte with no proven meaning is `{RAW:hh}`. Letters and digits are ASCII. The fullwidth `，` and `：` are the high slots `0x8D` and `0x8F`. The codes and their evidence are in [text control codes](../../data/text/#control-codes).
- **Name fields.** A name field uses the same codes, with `{END}` as the only single-byte code. The C strings of an executable use plain ASCII with `{TAB}`, `{NEWLINE}` and `{CR}`.
- **Not text.** A payload that is not a bank has no message form. An unknown tag, an operand that is not one byte, a character the encoding lacks and an empty message have no encoding.

Every text bank and every message of one encodes back to its own bytes, and every archive rebuilt from its banks reads back unchanged.

:::caution
Rewriting a bank changes the slot table and the messages only. A message that changes length moves every message after it, so any other offset that points into the bank is stale afterwards. `{LINK:nn}` reads such an offset ([control codes](../../data/text/#control-codes)). Check an edited bank in the game before it ships.
:::

## Game strings

The strings outside text banks sit in the other payloads. The names in the game tables and the enemy records are fixed-width fields, and every other string is a record that ends at its terminator or where the pointer table that reaches it begins. A pointer table is two consecutive words that point inside the payload, and only a payload with a load address (types 0 to 2 in the RAM window) has one.

On the retail disc 831 payloads hold strings, 43,593 in all. 165 are text banks with 10,510 messages, and 666 are other payloads with 33,083 strings. A string is located by its offset and length, and a name also has a stride. The bytes between strings are not text.

- A name must fit its own field. A shorter name is padded with zeros, so the records after it keep their offsets.
- A record may change length, but a payload that holds a pointer to it does not follow the change.
- A record that overlaps a name or another record is left out, and the name wins. 19 of the 33,102 strings outside message banks overlap (1 name and 18 records, in 14 payloads), which leaves the 33,083.
- All 2,523 payloads that are not message banks decode and encode back to their own bytes, 666 of them with strings.

:::caution
A record that changes length moves the bytes after it. A pointer table that reaches those bytes is stale afterwards. Check an edited payload in the game before it ships.
:::

The executables hold 167 C string literals, which need the ASCII encoding. They are not in the 33,083.

## Sources and confidence

- **Confidence:** high. Each kind comes from the entry type, load address and contents of every entry on the retail disc, and the text kinds decode and encode back to their own bytes for all payloads.
- **Evidence:** the type and load argument of every EMI entry, a bank test over all 200 entries that load at `0x80010000`, string location in 831 payloads, and round-trip encoding of every payload and of every archive rebuilt from its banks.

## Related

- [EMI container](../emi/): entry types and load arguments that select a kind.
- [Game text](../../data/text/): message-bank layout, control codes and the counts on the disc.
- [Disc and files](../disc/): the files and archives that hold the kinds.
- [Converting game data](../conversion/): how each kind converts to and from open formats.
- [Documentation coverage](../../appendix/coverage/): bytes understood per kind.
