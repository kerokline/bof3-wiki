# Asset kinds

A kind is a name this wiki gives to a class of disc content, such as `area-map`, `texture` or `audio-bank` ([glossary](../appendix/glossary.md#disc-and-containers)). Each EMI entry belongs to one kind, chosen from its entry type, its load address and its contents. This page lists the kinds and points to the page that describes each one. It also holds the text kinds, which have no format page of their own. Per-kind sizes are in [coverage](../appendix/coverage.md).

## Where each kind is described

| Kind                                         | Entry type, load address           | Described in                                                                     |
| -------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| EMI container                                | `.EMI` file                        | [EMI](emi.md)                                                                    |
| `code`                                       | types 0, 1, 2, program windows     | [EMI](emi.md#archive-shapes), [area](area.md#0x801f2c00-area-program-code-arena) |
| `texture`                                    | type 3                             | [graphics](graphics.md#chunk-layout)                                             |
| `palette`                                    | type 0, palette arena              | [graphics](graphics.md#palettes)                                                 |
| `character-bank`                             | type 0, `0x8003B800` and siblings  | [character](character.md)                                                        |
| `audio-bank`, `audio-sequence`, `audio-cues` | types 6 and 7, 10, 8               | [audio](audio.md)                                                                |
| XA and STR streams                           | `.STR` files                       | [STR and XA](str.md)                                                             |
| `area-map`                                   | type 0, `0x80104000`               | [area](area.md#0x80104000-map-bundle)                                            |
| `area-cells`                                 | type 0, `0x80032000`               | [area](area.md#0x80032000-packed-4-bit-cell-grid)                                |
| `area-script`                                | type 0, `0x800D3800`               | [area](area.md#0x800d3800-area-script-bank)                                      |
| `area-actor-defs`                            | type 0, `0x800E3800`               | [area](area.md#0x800e3800-scenestep-table)                                       |
| `area-encounters`                            | type 0, `0x800E4000`               | [area](area.md#0x800e4000-encounters-and-enemy-records)                          |
| `battle-script`, `bmagic-table`              | type 0, `0x800F0800`, `0x800C3800` | [EMI](emi.md#open-questions)                                                     |
| `area-module`                                | type 0, `0x80117000`               | [area](area.md#0x80117000-auxiliary-module-window)                               |
| `area-message`                               | type 0, `0x80010000`               | [Message banks](#message-banks)                                                  |
| `resource-table`                             | type 0, `0x8001A000`               | [game text](../data/text.md#references)                                          |
| item, weapon, armor, shop and ability tables | `ETC/GAME.EMI` entry 0             | [game records](../data/records.md#gameemi-fixed-tables)                          |
| base stats of the eight characters           | `ETC/START.EMI` entry 8            | [game records](../data/records.md#character-and-master-data)                     |
| memory card save                             | `ETC/START.EMI` entry 9            | [save](save.md)                                                                  |
| executables                                  | `SLUS_004.22`, `LOGO.EXE`          | [executable](exe.md)                                                             |
| conversion to PNG, glTF, SoundFont, MIDI     |                                    | [conversion](conversion.md)                                                      |

The `reserve` kind is zero fill with no consumer: 44 character-bank fillers of 16,384 zero bytes and 9 all-zero cell slots ([coverage](../appendix/coverage.md#what-keeps-a-range-from-the-next-level)).

## Message banks

The dialogue is in message banks, the `0x80010000` payloads of the area archives. The bank layout is in [game text](../data/text.md#containers). A bank decodes to text and encodes back to its own bytes.

- Slots. A slot is its message's index, or none for the end of the bank. A message runs to the next distinct offset, and the slots past the last message point at the end of the bank. The bank is the table, then the messages in offset order.
- Text. Control codes are `{TAG}`. A code with one operand byte is `{TAG:hh}`. A byte with no proven meaning is `{RAW:hh}`. Letters and digits are ASCII. The fullwidth `，` and `：` are the high slots `0x8D` and `0x8F`. The codes and their evidence are in [text control codes](../data/text.md#control-codes).
- Name fields. A name field uses the same codes, with `{END}` as the only single-byte code. The C strings of an executable use plain ASCII with `{TAB}`, `{NEWLINE}` and `{CR}`.
- Not text. A payload that is not a bank has no message form. An unknown tag, an operand that is not one byte, a character the encoding lacks and an empty message have no encoding.

A payload is a message bank when `offset[0]` is even, at least 4 and no larger than the payload, every slot is at least `offset[0]` and no larger than the payload, and the slots never decrease. A bank is a text bank when at least half of its first 64 distinct records read as text. A record reads as text when, after its trailing zeros, it has at least 3 bytes and either 4 letters that make up 40 percent or more of it, or 3 letters and a `0xFF` space. The layout is in [game text](../data/text.md#message-bank).

The 200 entries that load at `0x80010000` hold 152 distinct payloads. 197 entries are banks. The three fishing entries (`AREA030`, `AREA089` and `AREA129`, entry 18) are one identical 4,293-byte payload whose slots do not ascend, so they hold other data in that slot. 165 of the 197 banks are text banks: 162 at entry 11, 2 at entry 7 and 1 at entry 12, and 33, 33, 29, 30 and 40 in WORLD00 to WORLD04. The other 32 banks (31 of 1,022 bytes and one of 512 bytes) hold only short or empty records. The 165 text banks hold 10,510 messages, a message being one distinct slot value below the payload size. 10,494 of them are proven strings: they do not start with a zero byte and have at least 3 bytes before their terminator. All 197 banks hold 11,006 messages, and the three other payloads add 330, which makes 11,336 for the 200 entries. Every text bank and every message of one encodes back to its own bytes, and every archive rebuilt from its banks reads back unchanged.

> WARNING: rewriting a bank changes the slot table and the messages only. A message that changes length moves every message after it, so any other offset that points into the bank is stale afterwards. `{LINK:nn}` reads such an offset ([control codes](../data/text.md#control-codes)). Check an edited bank in the game before it ships.

## Game strings

The strings outside text banks sit in the other payloads. The names in the game tables and the enemy records are fixed-width fields, and every other string is a record that ends at its terminator or where the pointer table that reaches it begins. A pointer table is two consecutive words that point inside the payload, and only a payload with a load address (types 0 to 2 in the RAM window) has one.

On the retail disc 831 payloads hold strings, 43,593 in all. 165 are text banks with 10,510 messages, and 666 are other payloads with 33,083 strings. A string is located by its offset and length, and a name also has a stride. The bytes between strings are not text.

- A name must fit its own field. A shorter name is padded with zeros, so the records after it keep their offsets.
- A record may change length, but a payload that holds a pointer to it does not follow the change.
- A record that overlaps a name or another record is left out, and the name wins. 19 of the 33,102 strings outside message banks overlap (1 name and 18 records, in 14 payloads), which leaves the 33,083.
- All 2,523 payloads that are not message banks decode and encode back to their own bytes, 666 of them with strings.

> WARNING: a record that changes length moves the bytes after it. A pointer table that reaches those bytes is stale afterwards. Check an edited payload in the game before it ships.

The executables hold 167 C string literals, which need the ASCII encoding. They are not in the 33,083.
