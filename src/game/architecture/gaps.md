# Open questions

*Read this if you want to help: every open question lists the check that would settle it.*

What the architecture pages do not establish, for a contributor who wants to settle one. Each item is a claim a page leaves `[unknown]` or `[inferred]`. The linked page holds the evidence, the code involved and the check that would settle it. Each check is
static (read more code, search more overlays) unless it says a run is needed. The tags are explained in the [glossary](../../glossary.md#evidence-tags).

Items are grouped by page.

## Strings

Source: [editor guide](editor-guide.md#3-strings-and-dialogue), [assets](../../formats/assets.md#message-banks)

- String payload count: [assets](../../formats/assets.md) counts 666 payloads with strings (33,083 strings); the editor guide's round trip counts 275. The two `measured` figures need the disc to reconcile.
- Message count: 10,494 strings are proven in the 165 banks and the bank JSON lists 10,510 messages; the 16 extra are not classified.

## Boot

Source: [boot](boot.md#gaps)

- BIOS load and `Exec` return semantics are assumed from PS1 BIOS behaviour
- The logo movie file name; only the literal LBA `0x2D78C` is read
- Whether `InitHeap` memory is ever used by SDK internals
- Whether other code reads `D_80143EFC` (the `DrawSync` callback's `VSync(1)` value)
- Why `g_SysResetHoldFrames` waits for `EMI_LoaderIsReady` before the soft reset

## Frame loop

Source: [frame-loop](frame-loop.md#gaps)

- Overflow behaviour of the 20-entry VRAM upload queue
- Second controller use
- Real frame time and the GPU/CPU overlap
- The unit of `D_80143EFC` (hsync count by PsyQ contract)

## Scheduler

Source: [scheduler](scheduler.md#gaps)

- The `0x200`-byte stack is enough for the deepest real call chain
- Writers of `CALLBACK_SLOT_SWITCH`
- Slot 3 purpose
- Callers of `CallbackRegister`/`CallbackReplace` in overlays not read

## Memory

Source: [memory](memory.md#gaps)

- Meaning of the stamp words `6` to `0xF` in the executable file.
- Whether the area table at `0x80032000` is live while the LZ77 context at `0x800327A0` is in
- The final VRAM split.
- The field each per-bank size block feeds, the end of the used SPU RAM, and the real main stack depth.
- Whether anything below `0x80143B40` and above `0x8012C000` is used; `D_8012D880` (the cell-row pool) is the one symbol seen there.
- Which occupant of a shared window is live at a given moment; the code does not record it.
- Callers of the `BOSS` slot `0x1B3`; none found in the code read, assembly not searched exhaustively.

## Loading

Source: [loading](loading.md#gaps)

- Whether `LoadImage` completion is awaited anywhere in the loader.
- Whether a wider game state keeps `SND_StartXaStream` from starting during an EMI stream; no check exists in its callers.
- What restores non-audio data after a battle. `func_801D7108` reloads only area audio, and `BATTLE.EMI` writes the text table at `0x8001A000`.
- Callers of the `BOSS` slot (`0x1B3`), `ENDKANJI` (`0x260`), `MTEST` (`0x263`) and `RTEST`
- Exact conditions in `func_8019FAA0` that choose a world or area change; the function does not
- Whether a load into a window can start while its previous overlay still runs. No guard was

## Phases

Source: [phases](phases.md#gaps)

- entry states 7 and 8 and indices 7 and 8: writers and purpose
- menu trigger for index 1 and Start-in-field for index 9
- name entry location
- entry paths for shop, master (SISYOU), fishing, fairy village
- world map code
- boss entry
- ending and credits
- BATL_END exit to the field
- whether scenario 16 is an attract demo
- FMV playback

## Scenario

Source: [scenario](scenario.md#gaps)

- Story meaning of each scenario and each flag bit
- Mode and state counts of the 18 undecoded controllers
- Caller that enters `Scene_RunEffect` and the `SCE15EF*` overlays
- Purpose of `SCENA16` and `SCENA17`
- Roles of event ids 5, 6, 10, 27, 44, 55 and the `0x801F....` handlers
- Whether the save image carries `g_SceneFlagWords` and `g_SceneEventFlags`
- Reader of the `flags_01 & 0x20` bit set by `func_8019A904`

## Area

Source: [area](area.md#gaps)

- Setup record kinds 1-9, A, B (`func_801A50C0` .. `func_801A6C98`)
- Meaning of condition tests in `D_8018217C`
- Meaning of `D_8014820C` and the 4-entry `D_80147A58`
- `func_801C57F4`, `func_80199440`, `func_801BDAB8`, `func_8019625C`
- Conditional exit row order
- Whether `func_8019FAA0` waits for the palette `LoadImage` to finish
- Owner of each `g_SceneEvents`/`g_SceneObjects` target

## Battle

Source: [battle](battle.md#gaps)

- Mode-5 step 3 writer (`D_801EAD0C`: area reload) is not reached by a read
- Meaning of the seven boss event codes
- Per-boss `D_801EB298` index to module mapping (34 of 35)
- Reward payout (experience, money, drops) in BATL_END
- Trait ids `(3, 0x14)` and `(3, 0x15)` for the step threshold
- Meaning of the `D_80143EFC >= 0xF1` gate
- Scene `0x19` requested by the area `0xBD` defeat hook
- Mode names (party commands, turn order, actions, round end, result)
- Scripted-battle starts in asm-only scenario overlays

## Screens

Source: [screens](screens.md#gaps)

- Button that writes request code 1 (menu open)
- Names of the 9 STATUS steps and the 10 SHOP screens
- What BATE and SHISU show, and the other scenarios that open them
- Which script selects scene event 4 (master) and scene events for COMMU01-05
- Caller of fishing substate 3 (`func_801E0C20`)
- World-map code
- Ending and credits screens
- `D_8014869C` and `D_8014869D` set by the menu overlay

## UI

Source: [ui](ui.md#gaps)

- Per-step roles of message states 4, 5 and 7
- Source of `D_80144950` (message speed) and the row count of `D_8017F5B4`
- Who writes `g_UiWindowEffectBusy`
- Overlay owners of six `g_MenuPanels` handlers
- Panel fill drawing and the pass-order meaning of mode 0, 1, 2
- Battle messages (`g_BattleMessageState`) use a separate path
- Camera-spin effects (modes 10 to 20)

## Rendering

Source: [rendering](rendering.md#gaps)

- Ordering meaning of each layer number
- VRAM page allocation between area, character, battle and font sheets
- Whether `LoadImage` finishes before `DrawOTag` in the same frame
- Purpose of the (0x340, 0x100, 0xC0, 0x100) draw area
- Page 16 mismatch between sheet upload and draw formulas
- Behaviour of `func_8014BC70`
- Layers above 7 passed to `GFX_AddPrim`

## Audio

Source: [audio](audio.md#gaps)

- Bank targets of `COMN_SE` and `BATL_SE`, and which archives fill banks 1 to 6
- Whether the loader checks any window or SPU size
- Concurrent open SEP count (`SsSetTableSize` meaning)
- Which of `func_801D7234` and `func_80197F48` resumes the field track
- Writers of `D_80144954` (duck gate) and `D_80144951` (mono)
- Meaning of cue volume ladders `D_80182290` to `D_80182308`
- XA group sizes, group 2 callers, and the content of each table entry
- The seven bank readers' per-bank differences
- Opcode `0xBD` (`func_8015D820`) in event scripts

## Saving

Source: [saving](saving.md#gaps)

- Which scripts or objects select scene event 10, and whether other callers set `D_8014865C = -2`,
- No game-over, continue or autosave path to the card was found. `[unknown]`
- The setter of save status `11`, the meaning of `D_801E6110` and `D_80143BB4` in state 18, and the
- Scene-event bytes at `0x801448EB`-`ED` are inside the saved block. A save taken during the
- `func_801D69E0` is read from its disassembly only; a loop shape other than the one read from asm could change
- The driver's `open`, `format` and `_card_*` semantics follow PsyQ documentation, not a read of
- The icon pixels and the title text were not decoded. `[unknown]`

## Persistent state

Source: [state](state.md#gaps)

- The meaning of `D_80145E98`, `D_80145EC4` and `D_80145EC8` as saved entry values rests on their
- The scene-event bytes at `0x801448EB`-`ED` are inside the block, so a save taken from the save
- The block's content between `0x80144F5A` and `0x80144FC0`, and between `0x80145025` and
- `D_80145030` (second zenny total) has no reader found. `[unknown]`
- Which scenario overlays write which flag bits was not traced. `[unknown]`
