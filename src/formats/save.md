# Memory card save format

A save is one file on a PlayStation memory card. The file is a standard memory card save frame: a 0x200-byte header that the BIOS card menu reads (title and animated icon), followed by a copy of the game's live state. The game keeps no separate save structure. It copies a block of RAM to the card and copies it back on load. [Saving](../game/architecture/saving.md) describes the menu flow around this, and [game records](../game/records.md#save-layout) names the fields inside the copied block. This page describes the file around those fields: its name, header, icons, checksum and the card calls that move it. All of it is `read` from the `etc/start/08`, `etc/start/09` and `etc/shop/00` overlays unless a row says otherwise.

## File summary

| Fact                   | Value                                                                     |
| ---------------------- | ------------------------------------------------------------------------- |
| File name              | `BASLUS-00422BOF3` followed by a two-digit slot number (`%02d`)           |
| Listing prefix         | the first 16 characters of the name, `CardScanDirectory(..., 0x10)`       |
| Blocks per save        | 1 (8 KiB); the file is created with block count 1                         |
| Bytes written and read | `0x12B0` from file offset 0, rounded up to `0x1300`                       |
| RAM image              | `0x800C1800`; file offset `n` is at `0x800C1800 + n`                      |
| Rows in the save menu  | 3 (the listing keeps names whose last digit is 0 to 2)                    |
| Card capacity check    | 15 blocks: `total + (blocks << 13) > 0x1E000` fails with a capacity event |

`CardTransferFile` rounds the size up to a multiple of `0x80`, which gives the `0x1300` figure. The game writes only the first `0x1300` bytes of the 8 KiB block. Whatever the card holds beyond that is what file creation left, and no reader looks at it (`inferred`).

## Layout

| Offset   |        Size | Field                                                                   |
| -------- | ----------: | ----------------------------------------------------------------------- |
| `0x00`   |           2 | magic `"SC"`                                                            |
| `0x02`   |           1 | icon display flag: `0x11`, `0x12` or `0x13` (1, 2 or 3 icon frames)     |
| `0x03`   |           1 | block count (the game passes 1)                                         |
| `0x04`   |          64 | title, Shift-JIS, zero padded                                           |
| `0x44`   |          28 | zero                                                                    |
| `0x60`   |      `0x20` | icon palette: 16 `u16` colors                                           |
| `0x80`   |      `0x80` | icon frame 0: 16x16 pixels, 4 bits per pixel                            |
| `0x100`  |      `0x80` | icon frame 1                                                            |
| `0x180`  |      `0x80` | icon frame 2                                                            |
| `0x200`  |    `0x10B0` | payload: a copy of the game state from RAM `0x801448D8` to `0x80145987` |
| `0x270`  |           2 | checksum, inside the payload (payload offset `0x70`)                    |
| `0x12B0` | to `0x1300` | zero pad written by the transfer                                        |
| `0x1300` | to `0x2000` | not written by the game                                                 |

`CardBuildFileHeader (emi/etc/start/09@0x801EF27C)` writes bytes `0x00` to `0x1FF`. The call `SAVE_BuildSlotImage (emi/etc/shop/00@0x801D69E0)` passes block count 1 and flag `0x13`.

The payload is the 4,272-byte span of live game state that starts at `0x801448D8`, the save work block. The scene event flags `g_SceneEventFlags (exe/slus_004_22@0x80144F28)` are at `+0x650` in it. A file offset `n` of `0x200` or more is RAM address `0x801446D8 + n`, and the field offsets in [game records](../game/records.md#save-layout) use that frame.

### Icons

The BIOS card menu shows one to three 16x16 icon frames. The game does not store them in a separate file. It copies them out of three records in its own overlay. Each record is `0xC0` bytes and has the layout of a Sony TIM image:

| Part        |   Size | Content                                                 |
| ----------- | -----: | ------------------------------------------------------- |
| TIM header  |      8 | magic `0x10`, flags `8` (4 bits per pixel, with a CLUT) |
| CLUT block  | `0x2C` | 16 colors, VRAM position (256, 480)                     |
| image block | `0x8C` | 4 by 16 words                                           |

`CardBuildFileHeader` copies the 32-byte CLUT of icon 0 to file offset `0x60` and a 128-byte pixel block to each of `0x80`, `0x100` and `0x180`. The flag byte at `0x02` decides which icon feeds which frame:

|   Flag | Frame 0 | Frame 1 | Frame 2 |
| -----: | ------: | ------: | ------: |
| `0x11` |  icon 0 |  icon 0 |  icon 0 |
| `0x12` |  icon 0 |  icon 1 |  icon 1 |
| `0x13` |  icon 0 |  icon 1 |  icon 2 |

The game always saves with `0x13`. Only the CLUT of icon 0 is used, so the three icons share one palette. Nothing reads the TIM headers or uploads them to VRAM; the code copies the palette and pixel bytes only.

The records sit at payload offsets `0x1254`, `0x1314` and `0x13D4` (RAM `0x801EFE54`, `0x801EFF14` and `0x801EFFD4`) of `ETC/START.EMI` entry 9 and of `ETC/SHOP.EMI` entry 8. These two entries are the same 5,268-byte overlay (`measured`: byte-identical). A scan of every archive for the TIM and CLUT header finds exactly these six records and no other. A change to an icon must be made in both archives, because the title flow and the save flow load different ones.

### Title

The title shown by the card menu is built when the save is written. `g_UiFormatBuffer (exe/slus_004_22@0x80145AD4)` is cleared over 64 bytes and filled by `sprintf` with a full-width Shift-JIS format string (`D_801D0C98`, `0x44` bytes). The format takes seven `%s` arguments, in this order (1 + 2 + 2 + 1 + 1):

1. an area label from the table at `D_801E5434` (whether this argument is an area label or the slot digit is `[unknown]`; [saving](../game/architecture/saving.md) lists the same seven arguments);
2. two hour digits;
3. two minute digits;
4. the tens digit of Ryu's level;
5. one more digit.

Each argument is a two-byte full-width digit or label from the `D_801E5434` table (`func_801D7080`). The seventh digit is the byte at `0x8014496E` modulo 10, and the format prints it last, after the level label. Whether that byte is the level's units digit is `[unknown]`, because the address is named for the shop clock's seconds byte. The longest result fits the 64-byte field (`inferred`, since every input is a two-byte character).

## Checksum

The checksum covers the payload. `SAVE_RunLoadVerify (emi/etc/start/08@0x801E5A00)` checks it on load, and `SAVE_BuildSlotImage` writes it on save.

- Region: 4,272 bytes (`0x10B0`) from file offset `0x200`.
- Algorithm: the unsigned 32-bit sum of the bytes, masked with `0xFFFF`.
- Slot: the halfword at file offset `0x270`. On load the game reads it, zeroes it, sums the region and compares. On save the halfword is already zero when summed, because `D_80144948` is cleared before the copy, and the result is stored afterwards.
- Failure: a mismatch sets `g_SaveCardStatus (exe/slus_004_22@0x8018E228)` to 7 and plays the error cue.

To patch a save by hand, change bytes in `0x200` to `0x12AF`, set the halfword at `0x270` to 0, sum all 4,272 bytes from `0x200`, and store the low 16 bits at `0x270` (little endian). The load routine checks only this sum. It does not test the `"SC"` header, the title or the icons.

## Card calls

The overlay `etc/start/09` holds the card routines. The save menu and the shop overlay also carry copies of some of them.

| Function (all `emi/etc/start/09`)   | Role                                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CardAccessFile (@0x801EEC30)`      | waits for the card, opens the file and transfers it. Modes: 0 probe, 1 read, 2 write, `0x200` create then reopen to write. Its first parameter is the block count, not a port              |
| `CardOpenFile (@0x801EF96C)`        | builds the path with prefix `bu00:` or `bu10:` from `g_SaveCardPort`, then `open`. The creation flag is the block count shifted left 16 bits, ORed with `0x200`. It retries for 120 frames |
| `CardTransferFile (@0x801EFB44)`    | `lseek`, then `read` or `write` at `0x800C1800 + offset`. The size rounds up and the offset rounds down to a multiple of `0x80`                                                            |
| `CardScanDirectory (@0x801EFCA8)`   | `firstfile` and `nextfile` over the `BASLUS-00422BOF3` pattern into `D_8018E990` (24-byte entries: name 20, size 4)                                                                        |
| `CardBuildFileHeader (@0x801EF27C)` | writes bytes 0 to 3, the title, the palette and the frames                                                                                                                                 |

The save menu fills its rows with a read of 28 bytes at file offset `0xEA0`. The transfer rounds the offset down to `0xE80` and the size up to `0x80`, so it fetches `0xE80` to `0xEFF`. That span holds the save name (`+0xEA0`), portrait ids (`+0xEA5`), level (`+0xEA8`), timer (`+0xEAC`) and fairy job (`+0xEF0`). The BIOS owns the card's own directory (block 0 and its 128-byte frames), and the game never writes it. The frame layout and the directory block follow [psx-spx](https://psx-spx.consoledev.net/memorycards/) ([sources](../sources.md)). Raw 128 KiB emulator images and DexDrive headers wrap this format and are outside the game. The community save editor listed in [sources](../sources.md) agrees on the checksum region.

## Open questions

| Question                                            | What would settle it                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Meaning of unnamed payload bytes                    | [records](../game/records.md#save-layout) lists the named ones; readers for the rest |
| Whether the load path rejects a wrong `"SC"` header | a load test with a damaged header (the BIOS may reject it; the game code does not)   |
| Source of the seventh title digit                   | the writer of the byte at `0x8014496E`                                               |
| Behavior when two files share a slot digit          | a card with two such files                                                           |
