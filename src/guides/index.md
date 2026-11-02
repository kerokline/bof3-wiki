# Editing the game

This section explains how to change data on the *Breath of Fire III* disc: text, items, characters, sound,
maps, graphics and saves. Each guide covers one task. It says where the data lives, what to change, which
limits the game enforces and how to check the result in the game. The layouts themselves are in the
[file format](../formats/emi.md) and [game data](../data/records.md) pages, and the guides link to them
instead of repeating them. Numbers and offsets follow the [conventions](../conventions.md).

## Choose a task

The write path says how a change gets back into the game: *in place* means that the guide lists the
fields to edit, *partly* that some of the data is only editable as raw bytes, and *raw bytes* that nothing
beyond the container is documented.

| Task                                    | Write path         | What is still unknown                                                   |
| --------------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| [Text and dialogue](text.md)            | in place (strings) | glyph-less bytes, window layout, a map from a text id to its string     |
| [Items, skills and shops](items.md)     | partly             | the shop and master-skill fields, some unnamed bytes, ability flag bits |
| [Characters and enemies](characters.md) | in place           | the unnamed spans of the character and enemy records                    |
| [Sound and music](sound.md)             | partly             | the area-to-music map, the SPU memory budget, an encoder for XA audio   |
| [Maps and scripts](maps.md)             | partly             | script opcodes, the meaning of cell values                              |
| [Graphics and textures](graphics.md)    | partly             | depth and palette of 381 of 593 textures, the pixel format of sprites   |
| [Saves](saves.md)                       | partly             | the unnamed payload bytes                                               |

## The editing cycle

Every edit of disc data follows the same six steps.

1. **Find the entry.** [Disc and files](../formats/disc.md) lists the files, and
   [asset kinds](../formats/assets.md) says what each entry holds. An entry is written `ARCHIVE.EMI#n`
   ([conventions](../conventions.md#offsets-and-addresses)).
2. **Extract the payload.** A type-1 entry is [LZ77](../formats/lz77.md) data. Decode it, edit the decoded
   bytes and encode again. Every other entry type is stored raw.
3. **Change the bytes.** Edit a field in place when the guide gives its layout. A field keeps its size and
   its offset.
4. **Rebuild the archive.** Keep the archive version and the type and load argument of every entry, because
   the game cannot recover them from the payload. Lay the payloads out again with the
   [padding rules](../formats/emi.md#padding). A payload that changes size moves every entry after it
   ([rebuilding an archive](../formats/conversion.md#rebuilding-an-emi-archive)). All 880 archives rebuild
   byte for byte from their own entries, so a rebuild with no edit tests your tool.
5. **Put the file back on the disc.** A replacement file keeps its original sectors. It can shrink, but it
   cannot grow past its last sector, because the disc has no room to move the files after it. A change that
   moves or grows a file also needs the directory record and the executable's
   [file table](../formats/exe.md#the-disc-file-table) rewritten. Every Form 1 sector needs a new EDC and
   parity ([sector sealing](../formats/conversion.md#sector-sealing)).
6. **Test in the game.** Start the rebuilt disc image in an emulator or on a console and reach the data
   through the check that the guide gives.

## Limits that apply to every edit

- **Fixed windows.** A code or data entry loads at the address in its table-of-contents row, and each
  address belongs to a window that one entry at a time fills ([memory map](../systems/memory.md#the-map)).
  An entry that is larger than its window overwrites the next range.
- **Copies.** Some data ships twice, and the game does not say which copy a screen reads. Change both
  copies together:
  - `START.EMI#8` and `STATUS.EMI#0`: the character records, 117,986 bytes each and identical.
  - `FIRST.EMI#11` and `AFLDKWA.EMI#0`: a text resource table, 16,872 bytes each and identical.
  - `FIRST.EMI#3` and `ENDKANJI.EMI#0`: the font sheet, 32,768 bytes each and identical.
- **Fixed row counts.** Tables hold a fixed number of rows of a fixed size. No layout stores a count, so
  edit rows in place. Adding a row has no documented reader.
- **Code changes.** The wiki documents data. A change to code, such as a changed constant, edits an
  instruction in an overlay or in `SLUS_004.22`, and it must keep the file within its size. Each guide
  says when a goal needs a code change.
- **Unknown fields.** A field marked `[unknown]` has no known effect. Leave it as it is.
