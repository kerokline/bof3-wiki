---
title: "Edit saves"
description: "A save is one file on a memory card: a 512-byte header that the BIOS card menu reads, then a byte-for-byte copy of the live game state."
---

A save is one file on a memory card: a 512-byte header that the BIOS card menu reads, then a byte-for-byte copy of the live game state. Editing a save means changing bytes of that copy and fixing one checksum. The file layout is in [memory card save](../../formats/save/), the state it holds is in [persistent state](../../systems/state/), and the field names are in [game records](../../data/records/#save-layout). Nothing on the disc holds a save.

## Where the data is

- **File.** One card block per file, named `BASLUS-00422BOF3` plus a slot number `00`, `01` or `02` ([file summary](../../formats/save/#file-summary)).
- **Header.** File offsets 0 to 511: the `SC` magic, the title, the icon palette and three icon frames ([layout](../../formats/save/#layout)).
- **Payload.** 4,272 bytes at file offset `0x200`, a copy of the RAM block that starts at `0x801448D8`. File offset `n` of `0x200` or more is RAM address `0x801446D8 + n`.
- **Checksum.** A 16-bit value at file offset `0x270`, inside the payload ([checksum](../../formats/save/#checksum)).

## What to change

1. Find the field in [persistent state](../../systems/state/#one-persistent-block) (party records, inventory, zenny, flags) and convert its RAM address to a file offset: subtract `0x801446D8`.
2. Change the bytes. Every field keeps its width.
3. Recompute the checksum with the [checksum rule](../../formats/save/#checksum). Set the value at `0x270` to 0, sum the payload, and store the low 16 bits of the sum at `0x270`, low byte first.
4. Write the file back to the card under the same name, or any name that follows the pattern above.

## Limits and pitfalls

- **The checksum is the only check on load.** The game tests no magic, title, icon, version or per-record value ([validation](../../systems/saving/#validation-and-errors)). A wrong sum shows the card error and stops the load.
- **A bad file still changes memory.** The game copies the payload into live memory before it checks the sum. After a failed load, the bad bytes stay there until the next load or a new game `[inferred]`.
- **File name.** The load screen lists only names that start with `BASLUS-00422BOF3` and end in 00, 01 or 02. Other names do not show.
- **File size.** Keep the size that the game writes ([file summary](../../formats/save/#file-summary)): the header, the payload and a zero pad.
- **Header and icons.** They affect only the BIOS menu. Whether the BIOS rejects a damaged `SC` header is `[unknown]`.
- **Unnamed bytes.** Some payload bytes have no known meaning ([open questions](../../appendix/open-questions/#saving-and-persistent-state)). Leave them as they are.
- **Disc data is not in the save.** Item rows, enemy stats and text come from the disc. To change them for every save, edit the disc data ([items](../items/), [characters](../characters/), [text](../text/)).

## Check in the game

Put the card in the slot that matches the file name. Open the continue menu and check that the save is listed with the expected summary. Load it and read the changed value on the status or inventory screen. A card error after a load means the checksum is wrong.

## Related

- [Memory card save](../../formats/save/): the file layout, icons, title and checksum.
- [Persistent state](../../systems/state/): the block that the payload copies.
- [Saving and loading](../../systems/saving/): how the game writes, reads and validates a file.
- [Game records](../../data/records/): the names of the save fields.
- [Edit characters and enemies](../characters/): the starting table that a save does not follow.
