# Editing characters and enemies

A playable character is one record of 164 bytes, and an enemy is one record of 136 bytes. Both sit in
fixed tables. Character growth comes from a level table and from master records. This guide shows where each
sits and how to change it. The field layouts are in
[game records](../data/records.md#character-and-master-data).

## Where the data is

| What                           | Where                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Starting stats of 8 characters | 8 records of 164 bytes at payload `0x1A914` of `START.EMI#8`, and the identical copy in `STATUS.EMI#0`                                                                                           |
| Level growth                   | 693 rows of 8 bytes in `GAME.EMI#0`: one block of 99 rows for each of characters 0 to 6 ([level growth](../data/records.md#level-growth-and-level-ups))                                          |
| Masters                        | 17 skill rows and 17 stat rows in `SISYOU.EMI#0`; 17 names in `AFLDKWA.EMI#0` ([masters](../data/records.md#masters))                                                                            |
| Enemies and encounters         | the 1,160-byte entry that loads at `0x800E4000` in each of the 200 area archives: 8 encounters of 9 bytes and 8 enemy records of 136 bytes ([enemy record](../data/records.md#the-enemy-record)) |
| Drops and steals               | fields of the enemy record ([drops](../data/records.md#drops))                                                                                                                                   |

## What to change

1. **A character.** Edit the fields of the record in place, in both copies. Names use the
   [text encoding](../data/text.md#byte-classes), and the name is the first five bytes of the record.
2. **Growth.** Row `character * 99 + level - 1` belongs to a level. Edit its experience, HP, AP and the two
   packed stat bytes (high nibble and low nibble). The level-up routine adds the row's stats to the base
   stats, adds the master's modifier, floors the gain at 0 and caps a stat at 999. The level caps at 99.
3. **A master.** A master's stat row is six signed bytes: HP, AP, power, defense, agility and intellect. A
   skill row is six pairs of level and ability. A pair with a high byte of `0xFF` is empty.
4. **An enemy.** Edit the enemy record in its area archive. An encounter lists up to eight enemy indexes into
   the same block, `0xFF` for an empty slot, and an appearance rate. Only slots 0 to 6 occur on the disc.
5. Put the entry back and follow the [editing cycle](index.md#the-editing-cycle).

## Limits and pitfalls

- **Counts and sizes are fixed.** The character table has 8 records, the level table 693 rows, the master
  tables 17 rows and each area block exactly 1,160 bytes.
- **Two copies.** Change `START.EMI#8` and `STATUS.EMI#0` together. Which copy a screen reads is
  `[unknown]`.
- **New games only.** The game copies the starting table into its live state when a new game starts. A
  save holds its own copy of the characters, so an edit to the table does not change a save that exists
  ([saves](saves.md)).
- **Signed fields.** The master bonuses and the level-up modifiers are signed bytes: a byte `0x80` to
  `0xFF` means the value minus 256.
- **Drop rates.** A drop rate is an index 0 to 7 into a chance table, not a percentage. Rate 0 and item 0
  never drop ([drops](../data/records.md#drops)).
- **Enemy graphics.** The `BENEMY` archives hold enemy audio only, and the enemy sprites are not located, so
  an enemy keeps its look ([graphics and textures](graphics.md#character-sprites)).
- **Unnamed bytes.** The unnamed spans of the character and enemy records are `[unknown]`.

## Check in the game

Start a new game and open the status screen to read the starting stats of a character, then gain levels to
check the growth rows. Fight an enemy of the edited area to check its stats and drops. A master's effect shows
when a character takes the master and gains levels.
