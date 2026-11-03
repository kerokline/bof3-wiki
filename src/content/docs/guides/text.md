---
title: "Edit text and dialogue"
description: "Every string in the game is a byte string in one custom encoding."
---

Every string in the game is a byte string in one custom encoding. Dialogue sits in a message bank of each area, menu and battle text in a shared resource table, and names in fixed-width fields of the record tables. This guide shows how to change each kind. The encoding and the control codes are in [game text](../../data/text/).

## Where the data is

| What                                             | Where                                                                                                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Area dialogue                                    | the entry that loads at `0x80010000` in each `WORLDn/AREAnnn.EMI`: entry 11 in 162 of the 165 text banks ([area message bank](../../formats/area/#0x80010000-area-message-bank)) |
| Shared strings                                   | the 44 entries that load at `0x8001A000`: `BOSS#11`, `BOSS#8`, `BATTLE#11`, `FIRST.EMI#11` and `AFLDKWA.EMI#0` ([references](../../data/text/#references))                       |
| Item, weapon, armor, accessory and ability names | the name field of each row of the [`GAME.EMI` tables](../../data/records/#gameemi-fixed-tables)                                                                                  |
| Enemy and fairy names                            | the 1,160-byte encounter block of each area archive ([name tables](../../data/text/#fixed-width-name-tables))                                                                    |
| Character and master names                       | the first five bytes of each character record in `START.EMI#8` and `STATUS.EMI#0`; master names in `AFLDKWA.EMI#0` and `FIRST.EMI#11`                                            |

## What to change

### Message edits

1. Decode the bank and find the record of the slot ([message bank](../../data/text/#message-bank)).
2. Decode the bytes of the record with the [byte classes](../../data/text/#byte-classes). Letters and digits
   keep their ASCII values, and `0xFF` is the space.
3. Write the new text with the same control codes, such as `{NEWLINE}` and `{COLOR:nn}`
   ([control codes](../../data/text/#control-codes)). End the record with `{END}`, the byte `0x00`.
4. Rebuild the offset table. A longer or shorter record moves every later record, so rewrite the offset of
   each slot after it. Slots that shared a record keep sharing it. Keep every slot number: the game
   addresses a message by its slot index.
5. Put the bank back into its entry and follow the [editing cycle](../#the-editing-cycle).

### Name edits

A name field has a fixed width, and a name may fill all of it with no terminator. A shorter name ends with `0x00` padding. In the item table, for example, `Bread` is 5 letters followed by seven 0 bytes in a 12-byte field. The widths are in the [row layouts](../../data/records/#row-layouts).

## Limits and pitfalls

- **Bank size.** A message bank must end below `0x8001A000`, where the resource table loads, so it holds at most 40,960 bytes. The largest shipped bank is 21,547 bytes (`AREA153.EMI#11`).
- **Resource ids.** A resource id is local to the payload loaded at `0x8001A000`. The same id can name different strings under different payloads, so edit the string in the payload that you mean.
- **Glyphs.** One byte is one glyph, and the byte-to-cell formula is code. A byte with no glyph (`unresolved` in the [byte classes](../../data/text/#byte-classes)) draws nothing known. A new glyph needs a free cell in the [font sheet](../graphics/#the-font-sheet).
- **Byte-exact round trips.** Two punctuation marks have two bytes each. A tool that must reproduce a bank exactly keeps which byte the original used.
- **Windows.** Window rectangles and menu rows are not data: they are arguments in overlay code. A box takes a style operand (`{BOX:nn}`), but the style table behind it is `[unknown]`, and so are the units of the window arguments. Moving a window means patching code.

## Check in the game

Play to the scene that shows the message, or open the menu that shows the name. No static map from a message slot to its scene exists ([open questions](../../appendix/open-questions/#strings)), so expect to try the slots that a script could use. A wrong offset shows text from the wrong record, or garbage.

## Related

- [Game text](../../data/text/): the encoding, control codes and containers.
- [Game records](../../data/records/): the tables that hold item, ability and master names.
- [Area formats](../../formats/area/): the area message bank and its load address.
- [Edit graphics and textures](../graphics/): the font sheet that new glyphs need.
- [Edit the game](../): the editing cycle and the limits that apply to every edit.
