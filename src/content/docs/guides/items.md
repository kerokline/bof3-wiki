---
title: "Edit items, skills and shops"
description: "Items, equipment, abilities (skills and magic), shop stock and level growth sit in eight fixed tables in one entry, GAME.EMI#0."
---

Items, equipment, abilities (skills and magic), shop stock and level growth sit in eight fixed tables in one entry, `GAME.EMI#0`. A row has a fixed size, and the game finds a row by multiplying its index by the stride of the table. This guide shows how to change a row. The field layouts are in [game records](../../data/records/#row-layouts).

## Where the data is

`GAME.EMI#0` loads at `0x80195800` and holds the item, vital item, weapon, armor, accessory, shop, ability and level-growth tables. The [table of offsets](../../data/records/#gameemi-fixed-tables) gives the archive offset, payload offset, runtime address, row count and row size of each.

Two things live elsewhere:

- Enemy drops are the two item rows of the enemy record ([characters and enemies](../characters/)).
- A description is a 16-bit resource id into the table that loads at `0x8001A000`. Changing a description is a [text edit](../text/), not a table edit.

## What to change

1. Find the table and the row: payload offset plus row index times row size.
2. Edit the fields of the row in place. A name is 12 bytes in the [text encoding](../../data/text/#byte-classes) and ends with `0x00` padding unless it fills the field.
3. Write the table back at the same payload offset in entry 0, then follow the [editing cycle](../#the-editing-cycle).

What the common fields do:

- **Equipment** rows carry an equipability mask with one bit per character ([masks](../../data/records/#masks-and-value-ranges)) and a weight. Weapons and armor also carry a power.
- **Weapons** carry a `sound` byte that indexes the cue table, so a new value must name an existing cue ([sound effects](../sound/#sound-effects)).
- **Abilities** carry a type, a cost, a power, an element and targeting flags ([ability targeting](../../data/records/#ability-targeting)).
- **A shop row** holds an item count and eleven two-byte references, each an item type and an item index. Only the first `count` references are valid.

## Limits and pitfalls

- **Row counts are fixed.** The tables hold 92 items, 16 vital items, 83 weapons, 68 armor pieces, 52 accessories, 40 shops and 228 abilities. A new row has no documented reader, so reuse an existing row.
- **The entry keeps its size and address.** Entry 0 loads at a fixed address, and every table sits at a fixed payload offset from it. A table that changes size moves its neighbors.
- **Row 0 is empty.** Each equipment table starts with a `Nothing` row, and ability 0 is zeroed. Leave them.
- **The gap before the abilities.** A 232-byte block lies between the shops and the abilities. Its use is `[unknown]`. Leave it as it is.
- **Unnamed bytes.** One byte of the item row, the high nibble of `kind` and the ability flag bits beyond the named ones are `[unknown]`.
- **Shops by town.** Which shop row a town uses is not documented.

## Check in the game

Items and equipment show their name and price in the item and equipment menus. A changed ability shows its cost in the ability list and its effect in a battle. A changed shop row shows in the shop that reads it. A row with a wrong stride shows names from a neighboring row.

## Related

- [Game records](../../data/records/): the row layouts, masks and targeting flags.
- [Edit text and dialogue](../text/): descriptions and names.
- [Edit characters and enemies](../characters/): level growth and enemy drops.
- [Edit sound and music](../sound/): the cue table that a weapon sound names.
- [Edit the game](../): the editing cycle and the limits that apply to every edit.
