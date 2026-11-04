---
title: "Edit the game"
description: "Every change to the Breath of Fire III disc follows one cycle: find the entry, extract its payload, change the bytes, rebuild the archive, put the file back and test."
---

Every change to the *Breath of Fire III* disc follows one cycle: find the entry, extract its payload, change the bytes, rebuild the archive, put the file back and test. Seven guides apply the cycle to text, items, characters, sound, maps, graphics and saves. Each one says where the data sits, what to change, which limits the game enforces and how to check the result. The guides link to the pages that own the layouts and do not repeat them.

## Tasks

The write path says how a change gets back into the game. *In place* means the guide lists the fields to edit. *Partly* means some of the data is editable only as raw bytes.

| Task                                       | Write path         | Not yet known                                                           |
| ------------------------------------------ | ------------------ | ----------------------------------------------------------------------- |
| [Edit text and dialogue](text/)            | in place (strings) | glyph-less bytes, window layout, a map from a text id to its string     |
| [Edit items, skills and shops](items/)     | partly             | the shop and master-skill fields, some unnamed bytes, ability flag bits |
| [Edit characters and enemies](characters/) | in place           | the unnamed spans of the character and enemy records                    |
| [Edit sound and music](sound/)             | partly             | the area-to-music map, the SPU memory budget, an encoder for XA audio   |
| [Edit maps and scripts](maps/)             | partly             | script opcodes, the meaning of cell values                              |
| [Edit graphics and textures](graphics/)    | partly             | depth and palette of 381 of 593 textures, the pixel format of sprites   |
| [Edit saves](saves/)                       | partly             | the unnamed payload bytes                                               |

## The editing cycle

1. **Find the entry.** [Disc and files](../formats/disc/) lists the files, and
   [asset kinds](../formats/assets/) says what each entry holds. An entry is written `ARCHIVE.EMI#n`
   ([notation](../concepts/notation/#offsets-and-addresses)).
2. **Extract the payload.** A type-1 entry is [LZ77](../formats/lz77/) data: decode it, edit the decoded
   bytes and encode them again. Every other entry type is stored raw.
3. **Change the bytes.** Edit a field in place when the guide gives its layout. A field keeps its size and
   its offset.
4. **Rebuild the archive.** Keep the archive version and the type and load argument of every entry, because
   the game cannot recover them from the payload. A rebuild with no edit tests your tool
   ([rebuilding an archive](../formats/conversion/#rebuilding-an-emi-archive)).
5. **Put the file back on the disc.** A replacement file keeps its original sectors. It can shrink but
   cannot grow past its last sector. A file that moves or grows needs new directory and file-table records
   ([file table](../formats/exe/#the-disc-file-table)). Every Form 1 sector needs a new EDC and parity
   ([sector sealing](../formats/conversion/#sector-sealing)).
6. **Test in the game.** Start the rebuilt disc image in an emulator or on a console and reach the data
   through the check that the guide gives.

## Limits and pitfalls

- **Fixed windows.** An entry loads at the address in its table-of-contents row, and each address belongs
  to a window that one entry at a time fills ([memory map](../concepts/memory/#the-map)). An entry that
  is larger than its window overwrites the next range.
- **Copies.** Some data ships twice, and the game does not say which copy a screen reads. Change both
  copies together:
  - `START.EMI#8` and `STATUS.EMI#0`: the character records, 117,986 bytes each and identical.
  - `FIRST.EMI#11` and `AFLDKWA.EMI#0`: a text resource table, 16,872 bytes each and identical.
  - `FIRST.EMI#3` and `ENDKANJI.EMI#0`: the font sheet, 32,768 bytes each and identical.
- **Fixed row counts.** Tables hold a fixed number of rows of a fixed size. No layout stores a count, so
  edit rows in place. Adding a row has no documented reader.
- **Code changes.** The wiki documents data. A change to code, such as a constant, edits an instruction in
  an overlay or in `SLUS_004.22`, and the file keeps its size. Each guide says when a goal needs a code
  change.
- **Unknown fields.** A field marked `[unknown]` has no known effect. Leave it as it is.

## Related

- [Disc and files](../formats/disc/): the files and sectors that every edit ends in.
- [EMI container](../formats/emi/): the archive layout that the rebuild step keeps.
- [Converting game data](../formats/conversion/): how archives, banks and sectors convert and rebuild.
- [Memory map](../concepts/memory/): the windows that bound every entry.
- [Notation and conventions](../concepts/notation/): how numbers, offsets and entries are written.
