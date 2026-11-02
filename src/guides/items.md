# Editing items, skills and shops

Items, equipment, abilities (skills and magic), shop stock and level growth sit in eight fixed tables
in one entry, `GAME.EMI#0`. A row has a fixed size, and the game finds a row by multiplying its index by the
table's stride. This guide shows how to change a row. The field layouts are in
[game records](../data/records.md#row-layouts).

## Where the data is

`GAME.EMI#0` is 229,720 bytes and loads at `0x80195800`. It holds the item, vital item, weapon, armor,
accessory, shop, ability and level-growth tables. The
[table of offsets](../data/records.md#gameemi-fixed-tables) gives the archive offset, payload offset,
runtime address, row count and row size of each. A row's runtime address is `0x80195800` plus its payload
offset. The payload offset is the archive offset minus `0x800`.

Two things live elsewhere:

- Drops and steals are fields of the enemy record ([characters and enemies](characters.md)).
- A description is a 16-bit resource id into the table that loads at `0x8001A000`, so changing a
  description is a [text edit](text.md), not a table edit.

## What to change

1. Find the table and the row: payload offset plus row index times row size.
2. Edit the fields of the row in place. A name is 12 bytes in the [text encoding](../data/text.md#byte-classes)
   and ends with `0x00` padding unless it fills the field.
3. Write the table back at the same payload offset in entry 0, then follow the
   [editing cycle](index.md#the-editing-cycle).

What the common fields do:

- **Equipment** rows carry an equipability mask with one bit per character
  ([masks](../data/records.md#masks-and-value-ranges)) and a weight. Weapons and armor also carry a power.
- **Weapons** carry a `sound` byte that indexes the cue table, so a new value must name an existing cue
  ([sound and music](sound.md#sound-effects)).
- **Abilities** carry a type, a cost, a power, an element and targeting flags
  ([ability targeting](../data/records.md#ability-targeting)).
- **A shop row** holds an item count and eleven two-byte references, each an item type and an item index.
  Only the first `count` references are valid.

## Limits and pitfalls

- **Row counts are fixed.** The tables hold 92 items, 16 vital items, 83 weapons, 68 armor pieces, 52
  accessories, 40 shops and 228 abilities. A new row has no documented reader, so reuse an existing row.
- **The entry keeps its size and address.** Entry 0 loads at a fixed address, and every table sits at a fixed
  payload offset from it. A table that changes size moves its neighbours.
- **Row 0 is empty.** Each equipment table starts with a `Nothing` row and ability 0 is zeroed. Leave them.
- **The gap before the abilities.** A `0xE8`-byte block lies between the shops and the abilities, and its use
  is `[unknown]`. Leave it as it is.
- **Unnamed bytes.** One byte of the item row, the high nibble of `kind` and the ability flag bits beyond
  the named ones are `[unknown]`.
- **No field list for shops by town.** Which shop row a town uses is not documented.

## Check in the game

Items and equipment show their name and price in the item and equipment menus, and a changed ability shows
its cost in the ability list. A changed power or element shows its effect in a battle. A changed shop row
shows in the shop that reads it. A row with a wrong stride shows names from a neighbouring row.
