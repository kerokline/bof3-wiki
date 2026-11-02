# Memory

The console has 2 MB of main RAM at `0x80000000..0x80200000`, and the game uses all of it. Some ranges are permanent. The main executable and the resident game program stay in RAM from boot to power-off. Other ranges are windows, and each window holds one overlay at a time. A load writes the new overlay over whatever the window held. This page gives the map: which image or data owns each range, which overlays share a window, and where the scratchpad, stacks, CD ring and sound banks sit. [Loading](loading.md) explains how each range gets filled.

Sizes in this page that say "up to" are the largest entry measured over every archive on the disc. Overlay addresses are image-local. `exe/logo` and `exe/slus_004_22` are separate programs that share this one RAM.

## Three kinds of range

The map has three kinds of range:

- **Fixed code.** The executable `exe/slus_004_22` (`0x80149800..0x80190C60`) and the resident game program `emi/etc/game/00` (`0x80195800..0x801CD958`) never move and are never replaced.
- **Data banks.** Low RAM (`0x80010000..0x8003B800`) and the area band (`0x800D3800..0x80117000`) hold per-area data: text, tables, palettes, scripts and the map. Entering a new area overwrites them.
- **Overlay windows.** Five windows hold code that other code calls by fixed address: `0x801CE400`, `0x801D0C00`, `0x801EEC00`, `0x801F2C00` and `0x801F6C00`. The boss and battle data windows `0x800C1800` and `0x80096800` work the same way.

The persistent block at `0x801448D8..0x80145988` lies in the executable's work variables, so no overlay overwrites it. [State](state.md#one-persistent-block) owns its layout. Variables that belong to an overlay, such as the working state of a menu or a scenario, live inside that overlay's window and do not survive a swap. The next archive loaded into the window overwrites them.

Nothing in the code records which overlay a window holds. The resident code calls into a window at a fixed address and relies on the caller to have loaded the right archive first. `[inferred]` The loader checks only the first word of each entry against its table. It does not look at what the range held before. No unload code exists, so a later load simply overwrites an earlier one.

## The map

The table runs from low to high addresses.

| Range                        | Owner                              | Content                                                                                                                        |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `0x1F800000` +0x400          | scratchpad                         | `g_SpadWork` pointer cell at `0x1F800044`; the LZ77 decoder window                                                             |
| `0x80010000`, up to +0x542B  | area archive                       | per-area text bank                                                                                                             |
| `0x8001A000`, up to +0x41E8  | `FIRST`, `BATTLE`, `BOSS` archives | text resource table                                                                                                            |
| `0x80020000..0x80032000`     | `SYS_PrepareFrame`                 | two primitive banks of `0x9000` bytes, picked by the buffer index                                                              |
| `0x80032000`, +0x1388        | area archive                       | area table, read as nibbles by `func_801C6FD4`                                                                                 |
| `0x800327A0`                 | `EMI_DecodeBegin`                  | LZ77 decoder context                                                                                                           |
| `0x80033800`, +0x4000        | `GFX_ResetPalette`                 | palette arena; archives load CLUT slices at `0x80033A00`, `0x80033C00`, `0x80033E00`, `0x80035800`, `0x80036C00`, `0x80036E00` |
| `0x80037800`, +0x4000        | `g_GraphicsPaletteDst`             | palette work area: 32 rows of `0x200` bytes, uploaded by `GFX_UploadPalette`                                                   |
| `0x8003B800`                 | `PLCHAR`, `BPLCHAR`, `BMAGIC`      | decompression destination for character and effect graphics                                                                    |
| `0x80096800`, up to +0x208C4 | `BATTLE`, `BOSS` archives          | battle data module (`battle/15`), loaded with `battle/03`                                                                      |
| `0x800C1800`, up to +0x1E14  | `BOSS` archives                    | boss module                                                                                                                    |
| `0x800C3800`, up to +0xC4C   | `BMAGIC` archives                  | spell table                                                                                                                    |
| `0x800D3800`, up to +0xFED4  | area archive                       | area script bank                                                                                                               |
| `0x800E3800`, up to +0x19C   | area archive                       | scene table                                                                                                                    |
| `0x800E4000`, +0x488         | area archive                       | encounter table                                                                                                                |
| `0x800E4800..0x800F0800`     | `EMI_LoaderStreamInitSlot`         | CD ring: one header slot and 23 ring slots of `0x800` bytes; the area work window shares it                                    |
| `0x800F0800`, +0xE6C         | `BATTLE`, `BOSS` archives          | battle script bank                                                                                                             |
| `0x800F5000`, up to +0x2250  | 3 area archives                    | extra area code block                                                                                                          |
| `0x80104000`, up to +0x14A68 | area archive                       | map bundle                                                                                                                     |
| `0x80117000`, up to +0x174C  | 9 area archives                    | auxiliary area module                                                                                                          |
| `0x8011A000..0x8012C000`     | `SND_SetBankLayout`                | sound bank RAM; the end depends on the layout `[inferred]`                                                                     |
| `0x80143B40..0x801448D8`     | `exe/slus_004_22`                  | work variables below the persistent block, such as `D_80143B40`; the lower bound is the lowest one seen                        |
| `0x801448D8..0x80145988`     | `exe/slus_004_22`                  | the persistent block: party, flags, clock and scenario state, `0x10B0` bytes ([state](state.md#one-persistent-block))          |
| `0x80145988..0x80149800`     | `exe/slus_004_22`                  | work variables above the persistent block, such as `g_EmiRingBase`                                                             |
| `0x80149800..0x8018B2B8`     | `exe/slus_004_22`                  | rodata, data and code                                                                                                          |
| `0x8018B2B8..0x80190C60`     | `exe/slus_004_22`                  | BSS, cleared by `stup2`                                                                                                        |
| `0x80195800`, +0x38158       | `emi/etc/game/00`                  | resident game code and tables, from `GAME.EMI` entry 0                                                                         |
| `0x801CE000`, +0x1D800       | `exe/logo`                         | the logo program, to `0x801EB800` (BSS to `0x801ECEC0`)                                                                        |
| `0x801CE400`, up to +0x26CC  | `PLCHAR` archives                  | character code window                                                                                                          |
| `0x801D0C00`, up to +0x1CDD0 | scene window                       | one menu, title, scenario-effect, battle or area overlay; `battle/03` is the largest                                           |
| `0x801EEC00`, up to +0x3ECC  | shared code window                 | battle end and game over, spell code, dialogue, `START` entry 9, `SHOP` entry 8, some area code                                |
| `0x801F2C00`, up to +0x3FC4  | area program window                | the program of the current area, from 200 archives                                                                             |
| `0x801F6C00`, up to +0x7E80  | scenario window                    | the controller of the current scenario, one of 20, ends at `0x801FEA80`                                                        |
| `0x801FF000`                 | `SYS_RunLogo`                      | stack for the `Exec` of `LOGO.EXE`                                                                                             |
| `0x801FF400..0x801FFC00`     | `CallbackInitThreads`              | four `0x200`-byte callback thread stacks                                                                                       |

The area band is the busiest. A typical area archive writes, in order: the sound bank and cue table, the scene table, the script bank, graphics, three palette slices, the area table, the encounter table, the text bank, the map bundle and last the area program at `0x801F2C00`. [Loading](loading.md#area) walks through this.

## The executable image

The header of `SLUS_004.22` states `t_addr 0x80096800`, `t_size 0x160800`, `pc0 0x8014AA0C` and `s_addr 0x801FFFF0`. A RAM address equals `0x80096000` plus the file offset.

The first `0xB3000` bytes of the payload are zero with a few stamp words. They reserve RAM for later loads. The real code and data sit at `0x80149800..0x8018B2B8`. The reserved ranges are `0x80096800` (`0x2B000` bytes), `0x800C1800` (`0x33800`), `0x800F5000` (`0x22000`) and `0x80117000` (`0x32800`). The payload is also zero from `0x8018B2B8` to `0x801D0400`, apart from stamp words at `0x80195800` and `0x801CE400`, and has a tail pad at `0x801F6800`. The stamp words hold values `6` to `0xF`, and their meaning is `[unknown]`. The executable therefore does not occupy its own `t_addr`. The first data that lands at `0x80096800` is `battle/15`, and the resident game program lands in the zero gap at `0x80195800`.

## Overlay windows

| Window       | Occupants, one at a time                                                                             | Replaced when                              |
| ------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `0x801CE400` | character code (`PLCHAR` and `PLP` archives)                                                         | another character archive loads            |
| `0x801D0C00` | title (`GAME.EMI` entry 1), `START`, `STATUS`, `SHOP`, `SISYOU`, `BATE`, `battle/03`, some area code | the next menu, battle or area archive      |
| `0x801EEC00` | `START` entry 9, `SHOP` entry 8, `COMMU00`, `BMAGIC`, `BATL_END`, `BATL_OVR`, some area code         | the next archive with code at this address |
| `0x801F2C00` | the area program of the current area                                                                 | the next area archive                      |
| `0x801F6C00` | the scenario controller of the current scenario                                                      | the next `SCENA` archive                   |
| `0x800C1800` | boss module                                                                                          | the next `BOSS` archive                    |

An overlay's own variables sit in its window and are lost when another archive replaces it. Only the persistent block and the other executable variables outlive a swap.

Resident code reaches overlay code through tables of function pointers:

- The area script opcode table `D_801C7C70` and the scene event table `g_SceneEvents` mix handlers in the resident program (`0x8019xxxx`, `0x801Axxxx`) with handlers in the scene window (`0x801Dxxxx`), the area program window and the scenario window.
- `g_SceneScenes (emi/etc/game/00@0x801C8454)` holds 20 pointers into the scenario window, and `Game_RunScenarioEntry (emi/etc/game/00@0x801A782C)` calls `entry_00` of the selected one.
- `g_GameModeHandlers (emi/etc/game/00@0x801C7B54)` holds `Battle_Update (emi/battle/battle/03@0x801D1014)` at index 5.
- `battle/03` (`0x801D0C00`) and `battle/15` (`0x80096800`) come from one battle archive and coexist. `BATTLE.EMI` and `BATTLE2.EMI` are byte-identical.

The logo (`0x801CE000..0x801EB800`) overlaps only the character window and the scene window. Both are empty while the logo runs, because no overlay loads before it. `[inferred]` for "empty".

## Scratchpad

The scratchpad is the 1 KB of fast RAM at `0x1F800000`. `g_SpadWork` is a pointer cell at `0x1F800044`, which the overlay handlers use to reach the record they step ([scheduler](scheduler.md)). `EMI_DecodeBegin (exe/slus_004_22@0x80164028)` points the LZ77 source at scratchpad offset 6 and its limit at `0x400`, so the decoder treats the whole scratchpad as a sector window. How the two uses share the space is `[unknown]`. The decoder runs only during a load.

## Stacks

| Stack                      | Top                            | Set by                                             |
| -------------------------- | ------------------------------ | -------------------------------------------------- |
| Main                       | `0x80200000`                   | `stup1`; it replaces the header value `0x801FFFF0` |
| `LOGO.EXE` `Exec`          | `0x801FF000`                   | `SYS_RunLogo`                                      |
| Callback slot `i` (0 to 3) | `0x801FF400 + 0x200 * (i + 1)` | `CallbackInitThreads`                              |

`stup1` leaves 0x8000 bytes for the main stack: the heap ends at `0x801F8004`. The range `0x801F8000..0x80200000` already holds most of the scenario window and the thread stacks. The thread stacks end at `0x801FFC00`, so the main stack has `0x400` bytes above them. A deeper main stack writes into slot 3's stack. `[inferred]` The game does its work in the threads, and the real depth of the main stack is `[unknown]`. The `Exec` stack is used only while the logo runs.

## Heap and buffers

- **Heap.** `stup1` calls `InitHeap` over `0x80190C64..0x801F8004`, which overlaps the resident program and the overlay arena. The executable has no allocator thunk, so the heap is unused. `[inferred]` ([boot](boot.md))
- **Primitive banks.** `SYS_PrepareFrame` sets `g_GfxPrimCursor` to `0x80020000 + buffer_index * 0x9000`. Two banks end at `0x80032000`. Each bank accepts primitives only up to `0x8FCC` bytes ([frame loop](frame-loop.md)).
- **CD ring.** `g_EmiRingBase` is `0x800E4800`. The 23 ring slots of `0x800` bytes end at `0x800F0800`, and slot 0 receives the header sector of the archive. `SYS_LoadExec` reads its header sector to the same address.
- **Area work window.** `AREA_WORK_WINDOW` is also `0x800E4800`. It shares the range with the CD ring, so no area work data is safe there while an archive streams. `[inferred]` `D_801459FC` holds `0x800F5000`, the area code base.
- **Palettes.** `GFX_ResetPalette` zeroes rows 28 to 31 of the 16 KB arena at `0x80033800`, then copies 32 rows of `0x200` bytes to the work area at `0x80037800`. `GFX_UploadPalette` sends the rectangle (0, 0x1E0, 0x100, 0x20) from there to VRAM whenever `g_GfxPalettePending` is set.

## Sound memory

`SND_SetBankLayout (exe/slus_004_22@0x80161808)` starts at `0x8011A000` and advances by two per-bank size tables, `D_8018239C` and `D_801823F0`. The SPU RAM address of each bank comes from `D_80182348[3][7]`. The sums put the end of the bank RAM at `0x8012C000` (layout 0), `0x8012B840` (layout 1) and `0x8012B5E0` (layout 2). `[inferred]`

| Layout | Set by                                        | Banks | SPU addresses                                                              |
| -----: | --------------------------------------------- | ----: | -------------------------------------------------------------------------- |
|      0 | `SYS_StartFrontend`, `Game_StartSelectedGame` |     3 | `0x1010`, `0x3E0A0`, `0x4F210`                                             |
|      1 | battle entry `func_80197AA4`                  |     7 | `0x1010`, `0x3E0A0`, `0x520F0`, `0x5B170`, `0x62A90`, `0x6A3A0`, `0x71CC0` |
|      2 | `Game_BeginTitle`                             |     2 | `0x1010`, `0x6C6D0`                                                        |

All three layouts put bank 0 at SPU address `0x1010`, so a layout change reuses SPU RAM. [Audio](audio.md) covers the banks. XA audio does not use main RAM, because the CD hardware sends it straight to the SPU.

## VRAM

The code addresses VRAM only through `LoadImage` rectangles. Three uses are fixed in code:

| Rectangle                                                     | Source                    | Writer                                                            |
| ------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| (0, 0x1E0, 0x100, 0x20)                                       | `0x80037800` palette work | `GFX_UploadPalette`                                               |
| 32 by 32 blocks at `x = column * 32`, `y = (row & 0x3F) * 32` | ring sectors              | `EMI_LoaderUploadSector`, bounded to x below 1001 and y below 501 |
| 24-wide slices                                                | logo decode buffer        | `Logo_DecodeSlice`                                                |

The full split of VRAM between frame buffers, textures and palettes is `[unknown]`; see [rendering](rendering.md).

## Gaps

| Gap                                                                                                    | What would settle it                                                                          |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Meaning of the stamp words `6` to `0xF` in the executable                                              | Find a reader, or compare with the linker map                                                 |
| Whether the area table at `0x80032000` is live while the LZ77 context at `0x800327A0` is in use        | The two ranges overlap; trace their uses during an area load                                  |
| The final VRAM split                                                                                   | A VRAM dump during play                                                                       |
| The field that each per-bank size block feeds; the real end of used SPU RAM; the real main stack depth | A trace of `SND_SetBankLayout` users, an SPU dump, a stack watermark                          |
| Whether anything between `0x8012C000` and `0x80143B40` is in use                                       | `D_8012D880`, the cell-row pool, is the one symbol seen there; search the assembly for others |
| Which occupant of a shared window is live at a given moment                                            | The code does not record it; a runtime watch on the loader                                    |
| Callers of the `BOSS` slot `0x1B3`                                                                     | No immediate use of `0x1B3` exists in the assembly; find where a caller builds the slot id    |
