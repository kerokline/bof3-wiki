---
title: "Open questions"
description: "The wiki leaves these questions open, grouped by topic."
---

The wiki leaves these questions open, grouped by topic. Each row says what would settle it. A check is static, meaning more code or data to read, unless the row says a run is needed. Each topic lists the pages that hold the evidence and the code involved. [Notation and conventions](../../concepts/notation/#evidence-tags) defines the evidence tags.

## Startup, frame loop and scheduler

Pages: [boot](../../systems/boot/#open-questions), [frame loop](../../concepts/frame-loop/#open-questions), [scheduler](../../concepts/scheduler/#open-questions).

| Question                                                                 | What would settle it                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| How the BIOS loads the executable and returns from `Exec`                | A trace of a run, or the BIOS source. The game files do not show it.    |
| Whether PsyQ library code uses the `InitHeap` memory                     | Search the linked PsyQ objects for heap users.                          |
| Other readers of `D_80143EFC`, the `DrawSync` callback value             | `Area_CanStartEncounter` is the only reader found. Search the overlays. |
| The unit of `D_80143EFC`                                                 | The PsyQ `VSync` documentation, then compare with the `0xF1` gate.      |
| Why the soft reset waits for `EMI_LoaderIsReady`                         | Read the loader state machine ([loading](../../concepts/loading/)).     |
| Whether a 21st queued VRAM upload overflows the 20-entry queue           | Read the producers of `D_80145A00` for a bound check.                   |
| Any use of the port 2 controller                                         | Search for readers of the high halves that `SYS_UpdateKeyState` writes. |
| Real frame time and the CPU and GPU overlap                              | A timed run. Static reading cannot measure it.                          |
| Whether 512 bytes of stack suffice for the deepest call chain            | Worst-case stack analysis, or a run with stack watermarks.              |
| Any writer of the `SWITCH` state of a scheduler slot                     | Search the overlays for stores of 4 to a slot state halfword.           |
| Callers of `CallbackRegister` and `CallbackReplace` in overlays not read | Search those overlays for calls to the two functions.                   |

## Memory and loading

Pages: [memory](../../concepts/memory/#open-questions), [loading](../../concepts/loading/#open-questions), [EMI slot ids](../../formats/emi/#open-questions).

| Question                                                                                          | What would settle it                                                                             |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Meaning of the stamp words `6` to `0xF` in the executable                                         | Find a reader, or compare with the linker map.                                                   |
| Whether the area table at `0x80032000` is live while the LZ77 context at `0x800327A0` is in use   | The two ranges overlap. Trace their uses during an area load.                                    |
| The final VRAM split                                                                              | A VRAM dump during play.                                                                         |
| The field that each per-bank size block feeds, the end of used SPU RAM, the real main stack depth | A trace of `SND_SetBankLayout` users, an SPU dump, a stack watermark.                            |
| Whether anything between `0x8012C000` and `0x80143B40` is in use                                  | `g_AreaCellPrims`, the cell-row pool, is the one symbol seen. Search the assembly for others.    |
| Which occupant of a shared window is live at a given moment                                       | The code does not record it. A runtime watch on the loader.                                      |
| Whether a load into a window can start while its previous overlay still runs                      | No guard was found. A runtime watch on the loader.                                               |
| Whether anything awaits the completion of a `LoadImage`                                           | Read the draw and loader code for a `DrawSync` after the upload.                                 |
| Whether a wider game state keeps `SND_StartXaStream` from starting during an EMI stream           | No check exists in its callers. Trace a run that plays XA during a load.                         |
| What restores the non-audio data after a battle                                                   | `func_801D7108` reloads only area audio, and `BATTLE.EMI` writes the text table at `0x8001A000`. |
| Callers of the slots `0x1B3` (`BOSS`), `0x263` (`MTEST`) and `0x264` (`RTEST`)                    | No immediate use of the slot id exists in the assembly. Find where a caller builds the id.       |
| The conditions in `func_8019FAA0` that choose a world or area change                              | The function branches on state values not yet traced.                                            |
| BMAGIC loading: which code maps a spell id to a row of the table at `0x800B65F8`                  | The code that fills `BattleSelection.id`.                                                        |

## Game flow, scenario and areas

Pages: [phases](../../systems/phases/#open-questions), [scenario](../../systems/scenario/#open-questions), [area](../../systems/areas/#open-questions).

| Question                                                                     | What would settle it                                                                                  |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| What entry states 9 and 10 show (request codes 7 and 8)                      | Read the step tables of `BATE` and `SHISU`; the writers are known (`scena06`, `scena11`).             |
| The menu trigger for code 1 and Start-in-field for code 9                    | Read the callers of `func_801B2A00` and `func_801B5910`.                                              |
| Where name entry runs                                                        | Read the camp substate tables `D_801ECCF8`, `D_801ECD1C` and `D_801ED138`.                            |
| Whether name entry reaches `Party_InitDefaults` before the first field frame | `Party_InitDefaults` runs in camp substate 2. Trace the chain from there to `Game_StartSelectedGame`. |
| Entry paths of the shop, master, fishing and the fairy village               | Callers of `EMI_LoaderStreamInitSlot` with `0x266`, `0x267`, `0x258` and the area flags.              |
| World map code                                                               | Read the world area overlays that load flag bit 0 selects.                                            |
| Boss entry                                                                   | Read the callback table `D_801EB298` of `battle/03` and its callers.                                  |
| What reaches the credits and the end-of-game restart                         | Trace the `scena15` to `scena19` assembly and the users of `ENDKANJI` (`0x260`).                      |
| The exit from `BATL_END` to the field                                        | Read the exit calls in `batl_end/00`.                                                                 |
| What scenario 16 draws, and when it raises the popup request                 | Read the `scena16` overlay.                                                                           |
| Story meaning of each scenario and each flag bit                             | Read each controller's mode table and the `SYS_SetFlag` sites.                                        |
| Mode and state counts of the 18 undecoded controllers                        | Read the five-word block and the table after it for each.                                             |
| The caller that enters `Scene_RunEffect`, and the `SCE15EF*` overlays        | Find the call into `0x801D0C10` from `SCENA10` and `SCENA15`.                                         |
| Purpose of `SCENA17`                                                         | Trace the ending path.                                                                                |
| Roles of event ids 5, 6, 10, 27, 44, 55 and the `0x801F....` handlers        | Read each handler and the writers of `D_801448EB` (`func_801B6674` and others).                       |
| Reader of the `flags_01 & 0x20` bit set by `func_8019A904`                   | Find its readers.                                                                                     |
| Setup record kinds 1 to 9, A and B (`func_801A50C0` to `func_801A6C98`)      | Read each handler and match its fields to the entity row.                                             |
| Meaning of the condition tests in `D_8018217C`                               | Read the 32 entries and the scenario code that shares them.                                           |
| Meaning of `D_8014820C`                                                      | Find its readers.                                                                                     |
| `func_801C57F4`, `func_80199440`, `func_801BDAB8`, `func_8019625C`           | Read the four functions.                                                                              |
| Whether `func_8019FAA0` waits for the palette `LoadImage` to finish          | Read `GFX_ResetPalette` and the following upload.                                                     |
| Owner of each `g_SceneEvents` and `g_SceneObjects` target                    | Map each address to an area program with the list of unresolved symbol addresses.                     |

## Battle

Pages: [battle engine](../../systems/battle/#open-questions), [battle records](../../data/battle/#open-questions), [field](../../data/field/#open-questions).

| Question                                                                                                                                          | What would settle it                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| The writer of mode-5 step 3 (`D_801EAD0C`, the area reload)                                                                                       | Search the `batl_end` and boss overlays for `g_BattleStep = 3`.              |
| Meaning of the seven boss event codes                                                                                                             | Read `Boss_HandleBattleEvent` in several modules.                            |
| The `D_801EB298` index to module mapping for 34 of 35 bosses                                                                                      | Read each module's head for the installer address and match it to the table. |
| Reward payout (experience, money, drops) in `BATL_END`                                                                                            | Read the `BATL_END` functions after `Battle_GrantQueuedItems`.               |
| Trait ids `(3, 0x14)` and `(3, 0x15)` for the step threshold                                                                                      | Read `func_801C38F4` and the ability trait table.                            |
| Meaning of the `D_80143EFC >= 0xF1` gate                                                                                                          | Find its writers in the field engine.                                        |
| Scene `0x19`, requested by the area `0xBD` defeat hook                                                                                            | Read the scenario that owns it.                                              |
| Mode names (party commands, turn order, actions, round end, result)                                                                               | Read the mode 1 to 4 steps in full, or an emulator trace.                    |
| Scripted-battle starts in scenario overlays not read                                                                                              | Search the scenario overlays for calls to `Battle_StartScripted`.            |
| The script that ends the 10 enemies with HP `0xFFFF`                                                                                              | A trace of one such fight ([area](../../formats/area/#open-questions)).      |
| The roles of the unnamed cells in the battle work rows ([battle](../../data/battle/#open-questions))                                              | A write trace per cell.                                                      |
| Readers of battle state bit `0x0008`                                                                                                              | Search the battle overlays for tests of the bit.                             |
| The roles of the unnamed cells in the actor rows and field slots ([field](../../data/field/#open-questions))                                      | A write trace per cell.                                                      |
| The widths of the lure float-rate groups ([field](../../data/field/#open-questions))                                                              | Read the lure tables once their addresses are known.                         |
| The rod and lure table addresses: the strides are read, but `0x801E2748` lies in the panel-icon array ([field](../../data/field/#open-questions)) | A read breakpoint on `func_801DDE2C`.                                        |

## Screens and interface

Pages: [screens](../../systems/screens/#open-questions), [UI](../../systems/ui/#open-questions).

| Question                                                                  | What would settle it                                                                                                                                |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| The button that writes request code 1 (menu open)                         | Read the callers of the actor step table `D_801CD110`.                                                                                              |
| Names of the 9 STATUS steps and the 10 SHOP screens                       | Read each step function after `D_801EC35C` and `D_801E5144`.                                                                                        |
| What BATE and SHISU show, and the other scenarios that open them          | Enumerate every scenario write of `g_GameStateIndex = 7` or 8 and read the step tables.                                                             |
| Which script selects scene event 4 (master) and the events for COMMU01-05 | Search the area setup streams and scenarios for `D_801448EB` stores.                                                                                |
| The caller of fishing substate 3 (`func_801E0C20`)                        | Search `area030` for stores to `g_GameEntrySubstate`. Only `func_801DDC54` stores 3.                                                                |
| Which addresses hold the fishing rod and lure tables                      | The strides are read from `func_801DDE2C`, but both addresses lie in the `D_801E2424` panel-icon array ([field](../../data/field/#open-questions)). |
| Ending and credits screens                                                | `scena17` loads `ENDKANJI` at `0x801F8554`. Read `scena17` to `scena19` `[inferred]`.                                                               |
| `D_8014869C` and `D_8014869D`, set by the menu overlay                    | Find their writers in `emi/etc/start/08`.                                                                                                           |
| Per-step roles of message states 4, 5 and 7                               | Read the 8, 6 and 2 step functions and the shop and start-menu callers.                                                                             |
| Source of `D_80144950` (message speed) and the row count of `D_8017F5B4`  | Search writers of `D_80144950` in the options menu.                                                                                                 |
| Who writes `g_UiWindowEffectBusy`                                         | Read `func_801D74D4`, `func_80198780`, `func_801985C8`.                                                                                             |
| Overlay owners of six panel handlers of `g_MenuPanelHandlers`             | Map each address to its overlay window and archive.                                                                                                 |
| Panel fill drawing and the pass-order meaning of modes 0, 1, 2            | Read `func_80158FE0`, `func_801598F4`, `func_80159A20`.                                                                                             |
| The separate path of battle messages (`g_BattleMessageState`)             | Read the `emi/battle/battle/03` message functions.                                                                                                  |
| Camera-spin effects (modes 10 to 20)                                      | Read `func_8014EF80`, `func_8014F024`, `func_8014F24C`, `func_8014F2F0`, `func_8014F460`.                                                           |

## Rendering and graphics

Pages: [rendering](../../systems/rendering/#open-questions), [graphics](../../formats/graphics/#open-questions).

| Question                                                                              | What would settle it                                                                                                       |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Ordering meaning of each layer number, and layers above 7 passed to `GFX_AddPrim`     | List every `GFX_AddPrim` layer literal per overlay and compare with screenshots. Search call sites for non-literal values. |
| VRAM page allocation between area, character, battle and font sheets                  | A VRAM dump from an emulator at each phase.                                                                                |
| Whether `LoadImage` finishes before `DrawOTag` in the same frame                      | PsyQ `LoadImage` queue behavior, or a trace of the GPU DMA.                                                                |
| Purpose of the (0x340, 0x100, 0xC0, 0x100) draw area                                  | Trace which records set record flag `0x08`.                                                                                |
| Page 16 mismatch between sheet upload and draw formulas                               | Read the page bytes of shipped sprite records.                                                                             |
| Behavior of `func_8014BC70`                                                           | A full read of its assembly.                                                                                               |
| The palette and depth of the 381 textures with no proven join                         | The resident banks of the scene and the callers' arguments for the battle, `SCENARIO` and `ETC` draw sites.                |
| Which of several overlapping sheets is resident (for example `AREA024` slots 5 and 7) | The stream order of `EMI_LoaderUploadSector`.                                                                              |

## Audio

Pages: [audio runtime](../../systems/audio/#open-questions), [audio formats](../../formats/audio/#open-questions), [STR and XA](../../formats/str/).

| Question                                                                                    | What would settle it                                                                  |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Bank targets of the common and battle effect archives, and which archives fill banks 1 to 6 | Read the load arguments in those archives' type-6 and type-8 entries.                 |
| Whether the loader checks any window or SPU size                                            | Trace `EMI_LoaderCopySector` and the ring stage for a bound against the window sizes. |
| Concurrent open SEP count (`SsSetTableSize` meaning)                                        | PsyQ sound library documentation, or a trace of `SsSepOpenJ` returning -1.            |
| Which of `func_801D7234` and `func_80197F48` resumes the field track                        | Trace the order of both with that option clear and result bit `0x10` set.             |
| Writers of `D_80144954` (duck gate) and `g_SndMono` (mono)                                  | Search overlays and `emi/etc/start/08` for stores to the two addresses.               |
| Meaning of the cue volume ladders `D_80182290` to `D_80182308`                              | Find readers of those tables beyond `SND_QueueCueVolume`.                             |
| XA group sizes, group 2 callers, and the content of each table entry                        | Read the three tables against the XA file sector map.                                 |
| The seven bank readers' per-bank differences                                                | Read `func_8015E994` to `func_80160E38`.                                              |
| Opcode `0xBD` (`func_8015D820`) in event scripts                                            | Read `func_8015D820`.                                                                 |
| Role of type-8 cue byte 0 bits 3 to 7 and byte 2 bits 0 to 3                                | The voice-state consumer of the compared nibble.                                      |
| Consumer of the BGM cue tables in BGM004, BGM108 and BGM117                                 | The sound-request code that indexes bank cue tables.                                  |
| Which BGM an area plays                                                                     | The area-to-BGM table.                                                                |
| The use of the 29,665 non-zero Form 1 sectors of `S_XA00.STR` and `MAGIC00.STR`             | A reader that bypasses the hardware filter, or proof that none exists.                |

## Saving and persistent state

Pages: [saving](../../systems/saving/#open-questions), [state](../../systems/state/#open-questions), [save format](../../formats/save/#open-questions).

| Question                                                                                                          | What would settle it                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Which scripts or objects select scene event 10, and whether other callers set `D_8014865C = -2`                   | Search the scenario and area event data for the event byte.                               |
| Any game-over, continue or autosave path to the card                                                              | None was found. Search for other callers of `CardAccessFile`.                             |
| The setter of save status 11, `D_801E6110` and `D_80143BB4` in state 18, and the strings behind each message      | Read the writers and decode the text resources `0x85` and `0xA6` onward.                  |
| Whether a load resumes the save-point event (bytes `0x801448EB` to `0x801448ED` are inside the saved block)       | Save during the event, then trace `Scene_RunEventHandler` after the load.                 |
| Driver `open`, `format` and `_card_*` semantics                                                                   | PsyQ documentation `[inferred]`. A read of the library would confirm them.                |
| Entry values at `D_80145E98`, `D_80145EC4` and `D_80145EC8`                                                       | Trace the writers of those cells in the area code `[inferred]`.                           |
| Block content between `0x80144F60` and `0x80144FC0`, `0x80144FC4` and `0x80144FE4`, `0x80145025` and `0x8014504C` | Find readers and writers of those addresses.                                              |
| `D_80145030` (second zenny total) has no reader                                                                   | Search every image for loads from `0x80145030`.                                           |
| Meaning of bit `0x02` of the `Party_AddMember` flag byte                                                          | Find the readers of that bit in the party and battle code `[unknown]`.                    |
| Which scenario overlays write which flag bits                                                                     | Decode the flag opcodes of each scenario overlay.                                         |
| Whether the load path rejects a wrong `"SC"` header                                                               | A load test with a damaged header. The BIOS may reject it, the game code does not.        |
| Source of the seventh title digit, and the behavior when two files share a slot digit                             | The writer of the byte at `0x8014496E`, and a card with two such files.                   |
| Meaning of the unnamed payload bytes                                                                              | Readers of those bytes ([records](../../data/records/#save-layout) lists the named ones). |

## Data formats

Pages: [EMI](../../formats/emi/#open-questions), [LZ77](../../formats/lz77/#open-questions), [character banks](../../formats/character/#open-questions), [area data](../../formats/area/#open-questions).

| Question                                                                                                                                                  | What would settle it                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Readers of the `BPLCHAR` section addresses `0x8005680C`, `0x8007180C` and `0x8007A80C`                                                                    | A battle overlay that reads them. A search must fold `ori` pairs as well as `addiu`.           |
| Whether the BPLCHAR section addresses are section positions or party-slot buffers                                                                         | The code that selects a slot for a character.                                                  |
| Purpose of the 44 `BPLCHAR` fillers (16 KiB of zeros at `0x8003B800`)                                                                                     | A reader, or proof that nothing reads it.                                                      |
| The node pixel and script formats of a character bank, and who uploads the pixels                                                                         | A reader of node fields in battle or field code, and a trace of the node bytes to a primitive. |
| Type-0 slots with no named reader: BATTLE script bank beyond `Actor_BeginScript`, BMAGIC blocks at `0x80036C00` and `0x800C3800`, modules at `0x80117000` | Readers of those addresses.                                                                    |
| The reader of the 16-entry offset table in the LZ77 payload                                                                                               | A reader of the table in the loader or an overlay.                                             |
| Opcodes of the area script bank                                                                                                                           | A decode of the interpreter that `Actor_BeginScript` feeds.                                    |
| Names behind byte-code values, and the operands of the `+0x20` and `+0x22` record lists                                                                   | The dispatch tables `D_8017F8F0` and `D_8017F8FC` and their handlers.                          |
| The map bundle header field `scroll` (`+0x1E`)                                                                                                            | The reader of that field, or a map that uses it.                                               |
| Which battle background upload a battle draws, and its palette                                                                                            | The battle code that selects a `BATL_*` upload.                                                |
| The loader and palette of the world-map uploads in `AREA000` and the 11 world-map areas                                                                   | The code that reads entries 5 and 7.                                                           |
| The reason for the 150-sector offset in the XA cue end bound                                                                                              | The code that stores the end bound ([STR and XA](../../formats/str/#xa-cue-tables)).           |

## Strings

Pages: [text guide](../../guides/text/), [game text](../../data/text/#open-questions), [asset kinds](../../formats/assets/#message-banks).

| Question                                                                                                                  | What would settle it                           |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| The 165 text banks hold 10,510 messages, and 10,494 are proven strings. The other 16 are short or start with a zero byte. | Read the 16 messages.                          |
| Which payload sits at `0x8001A000` when a `text-id` resolves ([text](../../data/text/#open-questions))                    | A trace of the resolver call.                  |
| The effect of `{SKIP12}` and `{SKIP13}` beyond advancing one byte                                                         | Read the text drawer's handling of both codes. |
