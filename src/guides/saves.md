# Editing saves

A save is one file on a memory card. It has a 512-byte header that the BIOS card menu reads, then a byte
for byte copy of the game's live state. The game keeps no other save structure. Editing a save means
changing bytes of that copy and fixing one checksum. The file layout is in
[memory card save](../formats/save.md), the state it holds is in [persistent state](../systems/state.md),
and the field names are in [game records](../data/records.md#save-layout). Nothing on the disc holds a
save.

## Where the data is

- **File name.** `BASLUS-00422BOF3` plus a two-digit slot number: `00`, `01` or `02`. Each file uses one
  card block.
- **Header.** File offsets 0 to 511: the `SC` magic, the title (64 bytes of Shift-JIS), the icon palette and
  three icon frames.
- **Payload.** 4,272 bytes at file offset `0x200`. It is a copy of the RAM block that starts at
  `0x801448D8`, so file offset `n` of `0x200` or more is RAM address `0x801446D8 + n`.
- **Checksum.** A 16-bit value at file offset `0x270`, inside the payload.

## What to change

1. Find the field in [persistent state](../systems/state.md#one-persistent-block) (party records, inventory,
   zenny, flags) and convert its RAM address to a file offset: subtract `0x801446D8`.
2. Change the bytes. Every field keeps its width.
3. Recompute the checksum ([checksum rule](../formats/save.md#checksum)):
   - Set the 16-bit value at file offset `0x270` to 0.
   - Add up the 4,272 payload bytes as unsigned numbers.
   - Store the low 16 bits of the sum at `0x270`, low byte first.
4. Write the file back to the card under the same name, or any name that follows the pattern above.

## Limits and pitfalls

- **The checksum is the only check on load.** The game tests no magic, title, icon, version or per-record
  value ([validation](../systems/saving.md#validation-and-errors)). A wrong sum shows the card error and
  the load stops.
- **A bad file still changes memory.** The game copies the payload into live memory before it checks the
  sum. After a failed load, the bad bytes stay there until the next load or a new game `[inferred]`.
- **File name.** The load screen lists only names that start with `BASLUS-00422BOF3` and end in 00, 01 or
  02. Other names do not show.
- **File size.** The game writes the first 4,864 bytes of the block: the header, the payload and 80 bytes of
  zeros. Keep that size.
- **Header and icons only affect the BIOS menu.** Whether the BIOS rejects a damaged `SC` header is
  `[unknown]`.
- **Unnamed bytes.** Some payload bytes have no known meaning ([open questions](../appendix/open-questions.md)).
  Leave them as they are.
- **Disc data is not in the save.** Item rows, enemy stats and text come from the disc. To change them for
  every save, edit the disc data ([items](items.md), [characters](characters.md), [text](text.md)).

## Check in the game

Put the card in the slot that matches the file name. Open the continue menu and check that the save is
listed with the expected summary. Load it and read the changed value on the status or inventory screen. The
card error after a load means the checksum is wrong.
