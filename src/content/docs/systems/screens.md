---
title: "Screens"
description: "Besides the field, the game runs full-screen modes: the in-game menu, shops, the save screen, the fishing pond, the fairy village, the master menu, the world map, and the BATE and SHISU screens."
---

Besides the field, the game runs full-screen modes: the in-game menu, shops, the save screen, the fishing pond, the fairy village, the master menu, the world map, and the BATE and SHISU screens. Most stream their code from the disc into a shared window and run inside the same main loop. This page maps what opens each screen: the request code or flag, the entry state that runs it, the overlay that holds its code, and how control returns to the field. Save and load card paths are in [saving](../saving/), window and panel drawing in [UI and text drawing](../ui/), and the codes in [phases](../phases/).

## Terms

The [glossary](../../appendix/glossary/) defines request code and entry state.

| Term            | Meaning                                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry substate  | `g_GameEntrySubstate`: index into the 3 or 4 entry handler table that the state owns.                                                                                        |
| Menu step bytes | `D_80148650`, `D_80148651`, `D_80148652`: the step and sub-steps that STATUS, SHOP, BATE and SHISU dispatch on.                                                              |
| Scene event     | An entry of `g_SceneEvents[64]` (`0x801C84BC`), selected by `D_801448EB` and stepped by `D_801448EC`. It runs inside the field state ([scenario](../scenario/#event-stage)). |

## From request to screen

`Game_RunFieldState (emi/etc/game/00@0x80197378)` is entry state 2. Each frame it maps the request code to the next entry state ([phases](../phases/) covers codes 2 to 5: message wait, battle, camera and area change). The table lists the screens.

| Request or trigger                                                 | Entry state | Overlay (slot)                   | Screen                                                          |
| ------------------------------------------------------------------ | ----------: | -------------------------------- | --------------------------------------------------------------- |
| Code 1, written by `func_801B2A00` (actor step table `D_801CD110`) |           3 | STATUS (`0x269`), start/08       | The in-game menu. The button that triggers it is `[unknown]`.   |
| Code 6, written by `Party_JoinMember` when the party is full       |           7 | SHOP (`0x266`)                   | Step 6 (`func_801DE188`), `[inferred]` a party-swap screen.     |
| Actor of kind 5 (`func_801A18C8`)                                  |           7 | SHOP                             | Step = actor field `+0x18` plus 2.                              |
| Scene event 10, cases 6 and 23 (`Scene_RunShopSaveEvent`)          |           7 | SHOP                             | Step = `D_80148698` plus 2. Step 3 is the save screen.          |
| Code 7, written by `scena06` (`func_801F97C0`, `func_801F9DF4`)    |           9 | BATE (`0x257`)                   | Equipment screen or stat tally for record 7, by `D_8018E244`.   |
| Code 8, written by `scena11` (`func_801F8B84`)                     |          10 | SHISU (`0x265`)                  | Item minigame with a score and a rank from 0 to 5.              |
| Code 9, Start in the field (`func_801B5910`, `func_80167428`)      |          11 | none (field overlay)             | Scene dispatch with camera control. `[inferred]` Start meaning. |
| Area load flag `0x08` (`g_GameRequestFlags & 8`)                   |           8 | `area030/04` at `0x801D0C00`     | The fishing pond.                                               |
| Scene event 4 (`g_SceneEvents[4]`)                                 |   2 (stays) | SISYOU (`0x267`)                 | The master menu. The trigger is `[unknown]`.                    |
| Area load flag `0x10`                                              |   2 (stays) | COMMU00 (`0x258`), COMMU01 to 05 | The fairy village.                                              |
| Area load flag `0x01`                                              |  2, mode 10 | World area overlay               | The world map. The map code is `[inferred]`.                    |

```mermaid
flowchart TD
    A["actor kind 5 or<br/>scene event 10"] -->|"g_GameEntryState = 7"| S["state 7: shop and save<br/>SHOP 0x266"]
    F["state 2: field<br/>Game_RunFieldState"]
    F <-->|"enter: code 6<br/>return: func_801983D8"| S
    F <-->|"enter: code 1<br/>return: func_801976EC"| M["state 3: menu<br/>STATUS 0x269"]
    F <-->|"enter: code 9<br/>return: code 0"| C["state 11:<br/>scene camera"]
```

```mermaid
flowchart TD
    F["state 2: field<br/>Game_RunFieldState"]
    F <-->|"enter: code 7<br/>return: map load<br/>handshake"| B["state 9:<br/>BATE 0x257"]
    F <-->|"enter: code 8<br/>return: map load<br/>handshake"| H["state 10:<br/>SHISU 0x265"]
    F <-->|"enter: code 5<br/>return: else"| L["state 1: area load<br/>Game_RunAreaLoadState"]
    L <-->|"enter: flag 0x08<br/>return: func_801985C8"| P["state 8: fishing<br/>area030/04"]
```

Every screen state has the same three substates. Substate 0 starts the overlay stream and waits for `EMI_LoaderIsReady`. The middle substate runs one frame of the screen and `Menu_RunPanelTasks`. The last substate re-streams the character bank (`EMI_StreamFamilyArchive` with the `PL` family) and returns to state 2 with `g_GameEntrySubstate = 0` and `g_GameStateIndex = 0`.

The state functions are `Game_RunMenuState (emi/etc/game/00@0x801975E4)` (state 3), `Game_RunShopState (emi/etc/game/00@0x80198234)` (7), `Game_RunFishingState (emi/etc/game/00@0x801984AC)` (8), `Game_RunAbilityMenuState (emi/etc/game/00@0x80198744)` (9), `Game_RunStatusMenuState (emi/etc/game/00@0x80198904)` (10) and `Game_RunSceneCameraState (emi/etc/game/00@0x80198AC4)` (11).

## In-game menu (entry state 3)

Code 1 calls `UI_SetMode(2)` and `func_80198BC4(0)`, then sets state 3, substate 0. The substates are `g_GameEntryHandlers` (`0x801C7B44`):

| Substate | Function (`emi/etc/game/00`) | Work                                                                                         |
| -------: | ---------------------------- | -------------------------------------------------------------------------------------------- |
|        0 | `func_80197620`              | Stream STATUS, copy palettes 1 and 2, `D_80148650 = 0`, `UI_SetMode(3)`, `func_80198C38(1)`. |
|        1 | `func_80199368`              | `Game_RunScenarioEntry`, `Menu_DispatchStep`, `Menu_RunPanelTasks`.                          |
|        2 | `func_801976EC`              | Leave: restore the character bank, reload the fairy village, re-enter the area, state 2.     |

`Menu_DispatchStep (emi/etc/start/08@0x801D1740)` runs `D_801EC35C[D_80148650]`, nine step functions. The program is STATUS entry 0. The start menu (New Game, Load Game) runs the same bytes from `START.EMI` entry 8, a copy of `BIN/ETC/STATUS.EMI` entry 0. The nine steps have no established names or roles `[unknown]`. The load-game steps are in [saving](../saving/).

`func_801976EC` leaves in one of four ways, by the conditions in the table:

| Condition                                                              | Result                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `D_8014869C != 0`, `D_8014504A == 0`, and the world map or area `0xBD` | Save the party position and area in `D_80145040..D_80145048`, request the staged area.      |
| `D_8014869C != 0`, any other case                                      | Clear the flag bytes at `D_8014504A - 0x122`, request the saved area `D_80145048` (kind 4). |
| `D_8014869C == 0`, `D_8014869D != 0`                                   | `Game_RequestAreaChange(D_8014869D, 0x430000, 0x160000, 4)`: jump to that area.             |
| Both zero                                                              | `g_GameStateIndex = 0`. The field resumes.                                                  |

The writers of `D_8014869C` and `D_8014869D` are not traced, so their meaning is `[unknown]`.

## Shop and save (entry state 7)

State 7 runs `g_GameStateHandlers` (`0x801C7B7C`):

| Substate | Function (`emi/etc/game/00`) | Work                                                                                                                          |
| -------: | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
|        0 | `Game_LoadShopOverlay`       | If a shop actor is selected and its `+0x18` is 9, return to state 2 at once. Otherwise stream SHOP and copy palettes 1 and 2. |
|        1 | `func_80199398`              | Field frame, `Area_RunParty`, panels, `Shop_DispatchStep`.                                                                    |
|        2 | `func_801983D8`              | Restore the character bank, stream COMMU00 when the area has flag `0x10`, return to state 2.                                  |

`Shop_DispatchStep (emi/etc/shop/00@0x801D0EA0)` runs `D_801E5144[11]` by `D_80148650`. Entry 0, `func_801D0EDC`, is the selector. It reads `D_8014865C`. A negative value (a script or code origin) sets the step to `D_80148698 + 2`. A shop-actor index copies the actor row's `+0x18` and adds 2, and copies `+0x1C` to `D_80148699`. Actor kind 9 never reaches the screen (see `Game_LoadShopOverlay`). The other ten entries are the screens. Only step 3 is identified, the save screen ([saving](../saving/)). The roles of steps 2 and 4 to 10 are `[unknown]`.

## BATE and SHISU (entry states 9 and 10)

States 9 and 10 have the same shape. Substate 0 (`func_80198780` and `func_80198940`) calls `UI_SetMode(2)`, waits two frames, streams the slot (BATE `0x257`, SHISU `0x265`), copies palettes 1 and 2, and advances. Substate 1 (`func_801993F0` and `func_80199418`) runs `func_801D0D9C` or `func_801D0D80` plus `Menu_RunPanelTasks`. Substate 2 (`GameRunMapLoadHandshake`) streams the character bank, calls `UI_SetMode(3)`, waits for the effect, and returns to state 2.

Each overlay starts with an `OverlayHeader`, then a step entry that dispatches a step table by `D_80148650`, with sub-tables indexed by `D_80148651` and `D_80148652`. Only `scena06` stores request code 7, and only `scena11` stores code 8. No other program on the disc stores either value to `g_GameStateIndex`.

### BATE: equipment and tally for record 7

BATE works on `g_Characters[7]` (`0x80144DE4`), the eighth [character record](../../data/records/#character-and-master-data). `func_801D0D9C (emi/etc/bate/00@0x801D0D9C)` runs `D_801D86E0[D_80148650]`, a table of four steps:

| Step | Function        | Work                                                                                    |
| ---: | --------------- | --------------------------------------------------------------------------------------- |
|    0 | `func_801D0DD8` | Selector. Sets the step to `D_8018E244 + 2` and clears both sub-steps.                  |
|    1 | `func_801D0E04` | Leave. `Menu_ResetPanelTasks`, then `g_GameEntrySubstate` plus 1.                       |
|    2 | `func_801D0E38` | The equipment screen: open, run and close, by `D_801D8700[D_80148651]`. Ends in step 1. |
|    3 | `func_801D2070` | The stat tally: open, count and close, by `D_801D8764[D_80148651]`. Ends in step 1.     |

`scena06` picks the step. `func_801F97C0` stores 0 to `D_8018E244` with each of its three writes of code 7. `func_801F9DF4` stores 1 with one write and 0 with the other. Value 0 opens the equipment screen and value 1 the tally.

The equipment screen:

- On open, `func_801D0EE4` copies five bytes from `0x801D86F8` over the record's name (`strncpy`). On close, `func_801D15E4` copies five bytes from `0x801D86F0` over it.
- It offers two slots. The help line of `func_801D1044` reads the record's weapon byte (`+0x0E`) or armor byte (`+0x11`) with `Item_GetDescription`.
- `func_801D1FA0` builds a trial set for the stat preview: the record's six equipment bytes, with the chosen item in the cursor's slot. It writes index 4 twice and never index 5, so index 5 keeps its old value.
- `func_801D1E8C (emi/etc/bate/00@0x801D1E8C)` applies the set. For each of the six slots that changed, it calls `Item_Remove` on the new item and `Item_Add` on the old one, and stores the new item. It then calls `Char_RebuildStats` on the record.

The tally draws its window with `func_801D2304(0x37, 0x37)`. When the open effect ends, `func_801D211C` calls `func_801D259C (emi/etc/bate/00@0x801D259C)` once. That function clears six shown counters at `0x801D8F00` and sets six targets at `0x801D8EE8` from three values in the `scena06` image:

|  Target | Value                                                                              |
| ------: | ---------------------------------------------------------------------------------- |
| 0 and 3 | the byte at `0x801FE4EF`                                                           |
|       1 | the word at `0x801FE4E8`                                                           |
|       2 | the word at `0x801FE4F0`                                                           |
|       4 | the word at `0x801FE4E8` divided by 20                                             |
|       5 | 2 when the word at `0x801FE4F0` is below `0x32`, 4 when it is below `0x50`, else 6 |

It then raises the record's stats at once. Target 3 goes to defense and base defense (`Char_AddStat`), target 4 to max HP and base max HP (`Char_AddCappedStat`, capped at 999), and target 5 to power and base power (`Char_AddStat`). What the three `scena06` values count is `[unknown]`.

### SHISU: the item minigame

`func_801D0D80 (emi/etc/shisu/00@0x801D0D80)` runs `D_801D96DC[D_80148650]`, a table of five steps:

| Step | Function        | Work                                                                                                                  |
| ---: | --------------- | --------------------------------------------------------------------------------------------------------------------- |
|    0 | `func_801D0DBC` | Counts four held items into `g_MenuStatusItems.held`, clears `used` and `unk_08`-`unk_0A`, sets `unk_0B`.             |
|    1 | `func_801D0E4C` | Open: `UI_SetMode(3)`, then wait for the effect.                                                                      |
|    2 | `func_801D11A4` | The play, by `D_801D9700[D_80148651]`.                                                                                |
|    3 | `func_801D0F24` | Close: `UI_SetMode(2)`, then wait for the effect.                                                                     |
|    4 | `func_801D1018` | Use the items, score, rank and leave (`Menu_ResetPanelTasks`, then `g_GameEntrySubstate` plus 1).                     |

The four items are `0x4D`, `0x23`, `0x24` and `0x56` (`ITEM_MACKEREL`, `ITEM_SHALY_SEED`, `ITEM_VINEGAR`, `ITEM_HORSERADISH`). The play moves one item at a time from `held[i]` to `used[i]` (`func_801D14C0`). `used[0]` stops at 1 and `used[1]` stops at 20. `func_801D11F4` adds 1 to `unk_08`, the round count.

`func_801D1E60` maps the byte `D_80144FF9` to an index `unk_0B` from 9 to 16: below `0x26` gives 9, `0x26` to `0x27` 10, `0x28` to `0x2C` 11, `0x2D` to `0x31` 12, `0x32` to `0x3B` 13, `0x3C` to `0x40` 14, `0x41` to `0x43` 15, and above that 16. What `D_80144FF9` holds is `[unknown]`.

When `unk_08` is 0, step 4 leaves the items as they are and sets `D_80146875` to 5. Otherwise it removes the `used` counts (`Item_Remove`), sets `D_80146875` to `0x14`, scores with `func_801D1EE8`, and ranks the score `D_801DA044`:

| Score          | `g_ScriptVars[3]` (`0x80146867`) | Rank (`D_80144E5E`) |
| -------------- | -------------------------------: | ------------------: |
| `0x32` or less |                                1 |           unchanged |
| `0x33`-`0x59`  |                                2 |                   0 |
| `0x5A`-`0x77`  |                                2 |                   1 |
| `0x78`-`0x95`  |                                2 |                   2 |
| `0x96`-`0xA9`  |                                2 |                   3 |
| `0xAA`-`0xB3`  |                                2 |                   4 |
| `0xB4` or more |                                2 |                   5 |

`func_801D1EE8 (emi/etc/shisu/00@0x801D1EE8)` reads `used[1]`, `used[2]`, `used[3]`, the round count `r` (`unk_08`) and the index `k` (`unk_0B`). `used[0]` does not enter the score. Let `match(b, a)` be 0 when `a` is 0, `100 * b / a` when `b < a`, and `200 - 100 * b / a` otherwise, so that a term peaks at 100 when `b` equals `a`. A term below 0 becomes 0, and each division truncates.

| Term | Address      | Value                                                  |
| ---- | ------------ | ------------------------------------------------------ |
| `t0` | `0x801DA034` | `match(5 * (used[1] - r), 4 * k)`                      |
| `t1` | `0x801DA038` | `match(4 * used[2], used[1])`                          |
| `t2` | `0x801DA03C` | `50 + 25 * r` when `r` is below 2, else `150 - 25 * r` |
| `t3` | `0x801DA040` | `match(used[1] - r + used[3], k + used[2])`            |

The score is `(10 * k * t0 + used[1] * (t1 * t2 / 100) + 16 * t3) / 100`. Which prize each rank gives is `[unknown]`: `scena11` does not read `D_80144E5E`.

## Fishing (entry state 8)

`Game_RunAreaLoadState` (state 1) sets `g_GameEntryState = 8` right after `func_8019FAA0` when `g_GameRequestFlags & 8`; bit 3 of the area record's `flag_32` marks a fishing area ([area](../areas/)). The substates are `g_GameSubstateHandlers[4]` (`0x801C7B88`):

| Substate | Function                                   | Work                                                                                         |
| -------: | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
|        0 | `func_801984E8` (`emi/etc/game/00`)        | `UI_SetMode(1)`, redraw, copy a framebuffer strip, call substate 1 once, clear `D_80143F22`. |
|        1 | `func_801E0BD0` (`emi/world00/area030/04`) | The pond frame: `func_801E09B4` and the field draw.                                          |
|        2 | `func_801985C8` (`emi/etc/game/00`)        | Restore the character bank, fade, `Game_RequestAreaChange(D_80143F04, ..., 4)`, state 1.     |
|        3 | `func_801E0C20` (`emi/world00/area030/04`) | `func_800F500C`. The caller of this substate is not found.                                   |

The fishing program is part of the pond area's own image. `world00/area030/04` has `D_801D0C00 = 22` at its head (the code-overlay id convention), and its functions start at `0x801D0C90`, in the window the other overlays use. States 1 and 8 stream no separate screen slot `[inferred]`. Substates 1 and 3 resolve to addresses that exist only in this image, which is why `emi/etc/game/00` references them as undefined symbols. Substate 2 returns through the area load (state 1), not directly to the field. The rod and lure row layouts are in [field](../../data/field/#fairy-village-and-fishing).

## Master (scene event 4)

The master menu is not an entry state. `g_SceneEvents[4]` is `Master_RunSceneEvent (emi/etc/game/00@0x801A7CF0)`, stepped by `D_801448EC`.

| Step | Work                                                                                             |
| ---: | ------------------------------------------------------------------------------------------------ |
|    0 | Set bits 0 to 2 (`0x7`) of `g_AreaWalkFlags` and stream SISYOU (`0x267`).                        |
|    1 | When ready, copy palette 2 and call `Master_ResetPanel` (overlay init).                          |
|    2 | `Master_DispatchMenu`: one frame of the menu, every frame.                                       |
|    3 | Stream the character bank (the `PL` family).                                                     |
|    4 | When ready, clear bits 0 to 2 of `g_AreaWalkFlags` and reset the scene event (`D_801448EB = 0`). |

`Master_DispatchMenu (emi/etc/sisyou/00@0x801D25D8)` indexes `g_MasterMenuFuncs[7]` by `g_MasterStep`. The last step function is `Master_ApplyMaster`. The script that selects scene event 4 (`D_801448EB = 4`) is `[unknown]`. The menu is `[inferred]` to be where a character takes a master and its skills.

## Fairy village

The fairy village is an area (`flag_32` bit 4), not an entry state.

- After the menu (`func_801976EC`) and the shop and save screens (`func_801983D8`) return, the code streams COMMU00 (`0x258`) and calls `func_801F03D0` when the area has the flag. The reload is likely needed because the screen overlays take over the shared window `[inferred]`.
- `Fairy_VillageInit` (`emi/etc/commu00/00`) acts when `g_GameAreaId != D_80143F04`. When no fairy is active it calls `Fairy_JoinVillage` three times (one per party slot) and seeds five counters from `g_BattleCount`.
- COMMU01 to 05 (`0x259`, `0x25A` and `0x25B`, `0x25C`, `0x25D`, `0x25E`) are streamed one per step by `func_801F1770`, `func_801F1EB0`, `func_801F1FD8`, `func_801F222C` and `func_801F22C8`. Each advances `D_801448EC`, and all dispatch on the COMMU step byte `D_801F294C`, which COMMU00 owns.

That the five COMMU screens are scene events, and which game action opens each, is `[inferred]`. The fairy job rows and the 60-job table are in [field](../../data/field/#fairy-village-and-fishing).

## World map

The world map is an area with `g_GameRequestFlags & 1`. It stays in entry state 2.

- `Game_RunAreaLoadState` sets `g_GameEntryMode = 10` (instead of 0, or 20 for area `0xBD`) and applies the area's screen effect with `UI_SetMode(g_GameRequestKind)`. With the flag set it also calls `func_801A0048` on the camera cell.
- The field step `func_801B146C` tests the cell under the party with `Area_GetCellCode`. The value `0xAF` requests an area change (`Game_RequestAreaChange`, `g_GameRequestKind = 0xC`).
- Random encounters on the world map skip the `D_80143EFC >= 0xF1` test in `Area_CanStartEncounter`. Its last test reads the cell class ahead of the party instead of building a formation ([battle](../battle/)).

The world-map code is in the `world*` area overlays, which were not read `[unknown]`.

## Data and limits

The table lists the limits that the screen code enforces. Counts of entry states, request codes, battle substates, scene events and panel tasks are in [phases](../phases/), [battle flow](../battle/), [scenario](../scenario/) and [scheduler](../../concepts/scheduler/).

| Limit                           | Value                                                                                                                                                         | Source                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Menu, shop, fishing substates   | 3, 3, 4                                                                                                                                                       | `g_GameEntryHandlers`, `g_GameStateHandlers`, `g_GameSubstateHandlers` |
| BATE, SHISU, state 11 substates | 3 each                                                                                                                                                        | `g_MenuAbilityOpen`, `g_MenuStatusOpen`, `g_GameFlowHandlers`          |
| STATUS menu steps               | 9                                                                                                                                                             | `D_801EC35C[9]`                                                        |
| SHOP steps                      | 11 (selector, then 10)                                                                                                                                        | `D_801E5144[11]`                                                       |
| SHOP actor kinds                | 0 to 8 select a screen (`+0x18` plus 2 must stay at 10 or less). Kind 9 skips it. `[inferred]`                                                                | `func_801D0EDC`, `Game_LoadShopOverlay`                                |
| Master steps                    | 7                                                                                                                                                             | `g_MasterMenuFuncs`                                                    |
| BATE, SHISU step tables         | 4 and 5 entries. Two five-byte names follow BATE's table, at `0x801D86F0` and `0x801D86F8`.                                                                   | `D_801D86E0`; `D_801D96DC`                                             |
| Fishing rod rows                | The code does not bound the selector: it indexes `sel * 10`. [Field](../../data/field/#fairy-village-and-fishing) owns the rod and lure rows and their count. | `func_801DDE2C (emi/world00/area030/04@0x801DDE2C)`                    |
| COMMU archives                  | 7 slots, `0x258` to `0x25E`                                                                                                                                   | [disc slot ids](../../formats/emi/#disc-slot-ids)                      |
| Screen overlay slots            | BATE `0x257`, SHISU `0x265`, SHOP `0x266`, SISYOU `0x267`, START `0x268`, STATUS `0x269`                                                                      | [disc slot ids](../../formats/emi/#disc-slot-ids)                      |

The dispatch indexes the step byte into the owning overlay's table with no bound check, so an edited screen must keep the byte inside the table. A shop actor kind above 8 reads past `D_801E5144` `[inferred]` from the 11-entry table and the `+2` in `func_801D0EDC`.

## Open questions

| Question                                                                    | What would settle it                                                                            |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Button that writes request code 1 (menu open)                               | Read the callers of the actor step table `D_801CD110`.                                          |
| Names of the 9 STATUS steps and the 10 SHOP screens                         | Read each step function after `D_801EC35C` and `D_801E5144`.                                    |
| What the BATE tally counts                                                  | Find the writers of `0x801FE4E8`, `0x801FE4EF` and `0x801FE4F0` in the `scena06` image.         |
| Which prize each SHISU rank gives                                           | Find the readers of `D_80144E5E`, and of `g_ScriptVars[3]` after code 8.                        |
| Which script selects scene event 4 (master) and scene events for COMMU01-05 | Search the area setup streams and scenarios for `D_801448EB` stores.                            |
| Caller of fishing substate 3 (`func_801E0C20`)                              | Search `area030` for stores to `g_GameEntrySubstate` (only `func_801DDC54` stores 3).           |
| World-map code                                                              | Read the world area overlays selected by flag `0x01`.                                           |
| Ending and credits screens                                                  | `scena17` loads `ENDKANJI` (`0x260`) at `0x801F8554`; read `scena17` to `scena19` `[inferred]`. |
| `D_8014869C` and `D_8014869D`, set by the menu overlay                      | Find their writers in `emi/etc/start/08`.                                                       |

## Sources and confidence

- **Confidence:** medium. The entry-state routes, the substate tables and the return paths are read in the code. The BATE and SHISU steps and the SHISU score are read in the code and the assembly. The roles of the STATUS and SHOP steps, the sources of the BATE tally, the SHISU prizes, and the world-map and master triggers are `[inferred]` or `[unknown]`.
- **Evidence:** the state functions in `emi/etc/game/00`, the heads and step tables of the STATUS, SHOP, BATE, SHISU, SISYOU, COMMU and `area030` overlays, the BATE functions `func_801D1FA0`, `func_801D1E8C` and `func_801D259C`, the SHISU functions `func_801D1018`, `func_801D1E60` and `func_801D1EE8`, and the writers of the request codes in the scenario overlays.

## Related

- [Game phases](../phases/): the entry states and request codes that route to each screen.
- [UI and text drawing](../ui/): the panels and text that every screen draws.
- [Saving and loading](../saving/): the save and load screens that run inside the menu and shop overlays.
- [Areas and the field](../areas/): the area load that opens the fishing pond, the fairy village and the world map.
- [Field and party records](../../data/field/): the fishing and fairy village records.
