# Frame loop

After [boot](boot.md), `SYS_Main (exe/slus_004_22@0x8014AAC8)` never returns. It repeats one loop for the rest of the session, and every frame of the game, from the title to the credits, is one pass through it. The loop owns the display, the controller read and the CD loader tick. It owns no game logic: it hands that to the four callback threads that the [scheduler](scheduler.md) runs. Primitives that the callbacks queue are drawn by the GPU on the next pass ([rendering](rendering.md)).

## The double-buffered frame

The game keeps two copies of everything the GPU needs for one picture. Each copy is a 144-byte render record at `g_GfxDisplayFrames (exe/slus_004_22@0x80143D48)`. A record holds the display and draw environments, an 8-word ordering table and the arena in which the frame's primitives are built. VRAM holds two 320 x 240 frame buffers, one at y = 0 and one at y = 0xF0. Each record draws into one buffer and displays the other.

While the GPU draws the picture of frame N from one record, the CPU builds frame N + 1 in the other record. `g_FrameBufferIndex (exe/slus_004_22@0x80143D44)` says which record is being built, and the loop flips it once per pass. The GPU starts early in the pass and runs in parallel with the controller read, the callbacks and the loader tick. The pass ends by waiting for the GPU to finish. A picture therefore appears one pass after the game logic that built it.

Game code reaches the primitive arena through `GFX_AddPrim (exe/slus_004_22@0x8014E5A0)`. Each call appends one primitive to one of eight layer chains. At the end of the pass `SYS_SubmitFrame (exe/slus_004_22@0x8014B0F0)` splices the eight chains into the record's ordering table.

## The callback threads

`CallbackRun (exe/slus_004_22@0x8014B73C)` is the only place game code runs. The game logic is not a function that the loop calls. It is up to four cooperative kernel threads, one per callback slot. Each thread runs until it calls `CallbackWait` (give control back and run again after n passes) or `CallbackExit`. Control then returns to `CallbackRun`, which moves on to the next slot. A thread that never yields would freeze the game, because nothing pre-empts it.

Every frame is therefore a short turn for each live thread. Slot 0 usually holds the main game loop, slot 1 the title during the title, and slot 2 a screen effect such as a fade. [Scheduler](scheduler.md) lists what each slot runs and how a thread is started, yielded and replaced.

## Order of one pass

`SYS_Main` runs these steps in order, once per pass. The GPU work started in step 5 overlaps steps 6 to 11, and step 12 waits for it to finish.

| Step | Call                                                                            | Effect                                                                                   |
| ---: | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
|    1 | `VSync(2)`                                                                      | wait until two vertical blanks have passed since the previous `VSync` call               |
|    2 | `rand()`                                                                        | advance the PsyQ random state once                                                       |
|    3 | `PutDispEnv`, `PutDrawEnv`                                                      | apply the environments of the record that the previous pass built                        |
|    4 | `GFX_UploadPalette`, `GFX_RunTransferQueue`                                     | copy the staged palette and the queued images to VRAM                                    |
|    5 | `DrawOTag`                                                                      | start the GPU on the ordering table that the previous pass built                         |
|    6 | `SYS_UpdateKeyState`                                                            | read controller 1                                                                        |
|    7 | `SND_UpdateVoiceStatus (exe/slus_004_22@0x8015D044)`                            | refresh the status bytes of the 24 SPU voices                                            |
|    8 | flip `g_FrameBufferIndex`; `ClearOTagR`; `SYS_PrepareFrame`                     | select the other record and reset its table, layer chains and primitive cursor           |
|    9 | reset-combo check on `g_InputHeld`                                              | request the soft reset when Select and Start have been held long enough                  |
|   10 | `CallbackRun`                                                                   | run every active callback thread until it yields                                         |
|   11 | `EMI_LoaderService`                                                             | tick the CD loader or the XA audio player                                                |
|   12 | `g_SysLastVSync = VSync(1)`; `DrawSync(0)`; `SYS_SubmitFrame`; `g_FrameCount++` | wait for the GPU, then link the new layer chains into the ordering table; count the pass |

`VSync(2)` caps the loop at one pass per two vertical blanks. On an NTSC display, which `SYS_InitHardware (exe/slus_004_22@0x8014AD28)` selects, that is 30 passes per second. A pass that needs longer runs slower, so the game slows down instead of dropping frames. `[inferred]` The rate follows from the PsyQ `VSync` contract and the NTSC mode that the code sets. The play clock agrees: `func_80198CAC (emi/etc/game/00@0x80198CAC)` adds one tick per main-loop pass and rolls 30 ticks into one second.

The overlap of GPU drawing with steps 6 to 11 follows from the PsyQ contract that `DrawOTag` starts a DMA and returns. `[inferred]`

## Render records and the primitive arena

| Offset | Content                                                          |
| -----: | ---------------------------------------------------------------- |
| `0x00` | `DISPENV`                                                        |
| `0x14` | `DRAWENV`                                                        |
| `0x70` | ordering table, 8 words, cleared in reverse by `ClearOTagR`      |
| `0x8C` | the last word of the table, the address that `DrawOTag` receives |

`SYS_PrepareFrame (exe/slus_004_22@0x8014B020)` resets the record that is about to be built. For buffer index b it:

- sets the primitive cursor `g_GfxPrimCursor` to `0x80020000 + b * 0x9000`;
- seeds the eight layer chain heads from the packet table, `b * 0x20` bytes in;
- resets 56 cell records of 48 bytes at `D_80142CC0` `[inferred]`, which the area map engine uses;
- sets `D_801459F8` to `0x800E4800` and `D_801459FC` to `0x800F5000`, the area work window and the area code base.

`GFX_AddPrim` appends a primitive only while the cursor plus the primitive size stays below `0x80028FCC + b * 0x9000`. The arena of one buffer is therefore 36,812 bytes. When it is full the call returns without a signal and the primitive is lost. Every sprite, window, glyph and map cell of one frame draws from this one arena. Layer order and primitive layouts are in [rendering](rendering.md).

## Input

`SYS_UpdateKeyState (exe/slus_004_22@0x8014AFC0)` calls `PadRead(0)`, which returns both ports in one 32-bit word. It stores the held buttons of each half, keeps the previous values, and computes the newly pressed bits as `pad & (pad ^ previous)`. The rest of the game reads `g_InputHeld (exe/slus_004_22@0x80145AA4)` and `g_InputPressed (exe/slus_004_22@0x80145AA8)`, which are the port 1 words. The port 2 half is stored, and no reader of it is known. `[unknown]`

## Soft reset

Holding Select and Start together returns the game to the first boot callback. The test is `(g_InputHeld & (PADselect | PADstart)) == 0x900`. A counter `g_SysResetHoldFrames (exe/slus_004_22@0x80143F44)` counts the passes in which it holds and clears when it stops holding. On the pass where the counter already equals 60, so the 61st pass in a row, and only if `EMI_LoaderIsReady` is true, the loop runs `SND_Exit` and `CallbackStopAll`, then `CallbackRegister(0, SYS_StartFrontend)`. The game reloads `FIRST.EMI` and `GAME.EMI` and reaches the title again. It plays no logo. If the loader is busy, the reset waits.

## What the loader tick does

`EMI_LoaderService (exe/slus_004_22@0x80163010)` looks at `g_EmiServiceMode`. In mode 1 it runs `EMI_LoaderServiceStream`, the disc read for overlays and data. In mode 2 it runs `SND_ServiceXa`, the XA audio player. In any other mode it does nothing. [Loading](loading.md) covers the loader and [audio](audio.md) covers XA.

## Limits

| Limit                         | Value                                                     | Source                                                                      |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| Ordering table layers         | 8                                                         | `ClearOTagR(..., 8)` in `SYS_Main`; `SYS_PrepareFrame`; `SYS_SubmitFrame`   |
| Primitive arena per buffer    | `0x80020000 + b * 0x9000`, size 36,812                    | `SYS_PrepareFrame`, `GFX_AddPrim`                                           |
| Display                       | 320 x 240, buffers at y = 0 and y = 0xF0                  | `SYS_InitDisplay (exe/slus_004_22@0x8014AE08)`                              |
| Queued VRAM uploads per frame | 20                                                        | `GFX_RunTransferQueue` reads halves from `D_80145A54[0..19]` and `[20..39]` |
| Upload kinds                  | 3: raw `LoadImage`, RGB555 expand (1), LZSS (2)           | `GFX_RunTransferQueue (exe/slus_004_22@0x8014E6D0)`                         |
| Staged palette                | 0x100 x 0x20 pixels at VRAM (0, 0x1E0), from `0x80037800` | `GFX_UploadPalette (exe/slus_004_22@0x8014E22C)`                            |
| Soft reset hold               | 61 passes, about 2 seconds                                | `SYS_Main`                                                                  |

A random encounter does not start in a frame whose drawing ended late. `SYS_CaptureDrawTime (exe/slus_004_22@0x8014B17C)` is the `DrawSync` callback and stores `VSync(1)` in `D_80143EFC`. `Area_CanStartEncounter (emi/etc/game/00@0x801B3EB0)` returns 0 when `D_80143EFC >= 0xF1` and `g_GameRequestFlags` bit 0 is clear. By the PsyQ contract `VSync(1)` returns the horizontal blanks elapsed since the last `VSync` call, so the limit is about 240 scan lines. `[inferred]`

## Gaps

| Gap                                                            | What would settle it                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Whether a 21st queued VRAM upload overflows the 20-entry queue | Read the producers of `D_80145A00` for a bound check                   |
| Any use of the port 2 controller                               | Search for readers of the high halves that `SYS_UpdateKeyState` writes |
| Real frame time and the CPU and GPU overlap                    | A timed run; static reading cannot measure it                          |
| The unit of `D_80143EFC`                                       | The PsyQ `VSync` documentation, then compare with `0xF1`               |
