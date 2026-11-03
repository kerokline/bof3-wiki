---
title: "Edit characters and enemies"
description: "A playable character is one record of 164 bytes, and an enemy is one record of 136 bytes."
---

A playable character is one record of 164 bytes, and an enemy is one record of 136 bytes. Both sit in fixed tables. Character growth comes from a level table and from master records. This guide shows where each sits and how to change it. The field layouts are in [game records](../../data/records/#character-and-master-data).

## Where the data is

| What                           | Where                                                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starting stats of 8 characters | 8 records of 164 bytes at payload `0x1A914` of `START.EMI#8`, and the identical copy in `STATUS.EMI#0`                                                                                            |
| Level growth                   | 693 rows of 8 bytes in `GAME.EMI#0`: one block of 99 rows for each of characters 0 to 6 ([level growth](../../data/records/#level-growth-and-level-ups))                                          |
| Masters                        | 17 skill rows and 17 stat rows in `SISYOU.EMI#0`; 17 names in `AFLDKWA.EMI#0` ([masters](../../data/records/#masters))                                                                            |
| Enemies and encounters         | the 1,160-byte entry that loads at `0x800E4000` in each of the 200 area archives: 8 encounters of 9 bytes and 8 enemy records of 136 bytes ([enemy record](../../data/records/#the-enemy-record)) |
| Enemy drops                    | fields of the enemy record ([drops](../../data/records/#drops))                                                                                                                                   |

## What to change

1. **A character.** Edit the fields of the record in place, in both copies. Names use the [text encoding](../../data/text/#byte-classes), and the name is the first five bytes of the record.
2. **Growth.** Row `character * 99 + level - 1` belongs to a level. Edit its experience, HP, AP and the two packed stat bytes (high nibble and low nibble). The level-up routine combines the row with the base stats and the master's modifier ([level growth](../../data/records/#level-growth-and-level-ups)).
3. **A master.** Edit the stat row (six signed bytes) or the skill row (six pairs of level and ability) of the master ([masters](../../data/records/#masters)).
4. **An enemy.** Edit the enemy record in its area archive. An encounter lists up to eight enemy indexes into the same block, `0xFF` for an empty slot, and an appearance rate. Only slots 0 to 6 occur on the disc.
5. Put the entry back and follow the [editing cycle](../#the-editing-cycle).

## Limits and pitfalls

- **Counts and sizes are fixed.** The character table has 8 records, the level table 693 rows, the master tables 17 rows and each area block exactly 1,160 bytes.
- **Two copies.** Change `START.EMI#8` and `STATUS.EMI#0` together. Which copy a screen reads is `[unknown]`.
- **New games only.** The game copies the starting table into its live state when a new game starts. A save holds its own copy of the characters, so an edit to the table does not change an existing save ([saves](../saves/)).
- **Signed fields.** The master bonuses and the level-up modifiers are signed bytes, so write a negative value as its two's-complement byte ([masters](../../data/records/#masters)).
- **Drop rates.** A drop rate is an index 0 to 7 into a chance table, not a percentage ([drops](../../data/records/#drops)).
- **Enemy graphics.** The `BENEMY` archives hold enemy audio only, and the enemy sprites are not located, so an enemy keeps its look ([character sprites](../graphics/#character-sprites)).
- **Unnamed bytes.** The unnamed spans of the character and enemy records are `[unknown]`.

## Check in the game

Start a new game and open the status screen to read the starting stats of a character, then gain levels to check the growth rows. Fight an enemy of the edited area to check its stats and drops. A master's effect shows when a character takes the master and gains levels.

## Related

- [Game records](../../data/records/): the character, enemy, master and drop layouts.
- [Edit saves](../saves/): the live copy of the characters inside a save.
- [Edit items, skills and shops](../items/): the tables that share `GAME.EMI#0` with level growth.
- [Edit graphics and textures](../graphics/): palettes of character sprites.
- [Edit the game](../): the editing cycle and the limits that apply to every edit.
