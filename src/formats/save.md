# Memory card save format

*Read this if you edit or validate a memory card save.*

One save file: header, payload, checksum, naming, and the card calls that move it. The save and
load flow is in [saving](../game/architecture/saving.md); the payload fields are in
[game records](../game/records.md#save-layout). Evidence tags: `read` (code read), `measured`
(checked over every instance on this disc), `inferred`, `unknown`. All code is in the
`etc/start/08`, `etc/start/09` and `etc/shop/00` overlays.

## File summary

| Fact                   | Value                                                                     | Evidence                                                           |
| ---------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| File name              | `BASLUS-00422BOF3` + `%02d` slot number                                   | `read` (`D_801D0C20`, `D_801D0EC8`)                                |
| Listing prefix         | first 16 characters of the name, `CardScanDirectory(..., 0x10)`           | `read` (`func_801E54A4`, `func_801E7348`)                          |
| Blocks per save        | 1 (8 KiB); created with block count 1                                     | `read` (`func_801D5894`: `CardAccessFile(1, name, 0x200, ...)`)    |
| Bytes written and read | `0x12B0` from file offset 0, rounded up to `0x1300`                       | `read` (`CardTransferFile` rounds size up to a multiple of `0x80`) |
| RAM image              | `0x800C1800`; file offset `n` is `0x800C1800 + n`                         | `read`                                                             |
| Rows in the save menu  | 3 (the listing keeps names whose last digit is 0-2)                       | `read` (`func_801E77F0`)                                           |
| Card capacity check    | 15 blocks: `total + (blocks << 13) > 0x1E000` fails with a capacity event | `read` (`CardOpenFile`)                                            |

The game writes only the first `0x1300` bytes of the 8 KiB block. What the card holds beyond
that is whatever the card file creation left; no reader looks at it (`inferred`).

## Layout

|   Offset |        Size | Field                                                               | Evidence                                                      |
| -------: | ----------: | ------------------------------------------------------------------- | ------------------------------------------------------------- |
|   `0x00` |           2 | magic `"SC"`                                                        | `read` (`CardBuildFileHeader`)                                |
|   `0x02` |           1 | icon display flag: `0x11`, `0x12` or `0x13` (1, 2 or 3 icon frames) | `read`                                                        |
|   `0x03` |           1 | block count (the game passes 1)                                     | `read` (`func_801D69E0`: `CardBuildFileHeader(1, 0x13, ...)`) |
|   `0x04` |          64 | title, Shift-JIS, zero padded                                       | `read`                                                        |
|   `0x44` |          28 | zero                                                                | `read` (zeroed by `CardBuildFileHeader`)                      |
|   `0x60` |      `0x20` | icon palette: 16 `u16` colors                                       | `read`                                                        |
|   `0x80` |      `0x80` | icon frame 0: 16x16, 4 bits per pixel                               | `read`                                                        |
|  `0x100` |      `0x80` | icon frame 1                                                        | `read`                                                        |
|  `0x180` |      `0x80` | icon frame 2                                                        | `read`                                                        |
|  `0x200` |    `0x10B0` | payload copied from RAM `0x801448D8..0x80145987` (see below)        | `read`                                                        |
|  `0x270` |           2 | checksum, inside the payload (payload offset `0x70`)                | `read`                                                        |
| `0x12B0` | to `0x1300` | zero pad written by the transfer (rounded up to `0x80`)             | `read`                                                        |
| `0x1300` | to `0x2000` | not written by the game                                             | `read`                                                        |

Header size is `0x200`. The save payload is not a separate file: it is
the 4,272-byte span of the live game state that starts at `0x801448D8` (the save work block;
`g_SceneEventFlags`, `0x80144F28`, is at `+0x650`). File offset `n >= 0x200`
is RAM address `0x801446D8 + n`; the field names and
offsets in [game records](../game/records.md#save-layout) use that frame.

### Icons

The three frames come from three TIM-wrapped icon records in the save overlay, not from a
separate file. `CardBuildFileHeader` copies the 32-byte CLUT of icon 0 to `0x60` and 128-byte
pixel blocks to `0x80`, `0x100` and `0x180`. By flag value (`read`):

|   Flag | Frame 0 | Frame 1 | Frame 2 |
| -----: | ------: | ------: | ------: |
| `0x11` |  icon 0 |  icon 0 |  icon 0 |
| `0x12` |  icon 0 |  icon 1 |  icon 1 |
| `0x13` |  icon 0 |  icon 1 |  icon 2 |

The game always saves with `0x13`. Each icon record is `0xC0` bytes: TIM
header (magic `0x10`, flags `8` = 4 bpp with CLUT), CLUT block (`0x2C` bytes, 16 colors, VRAM
position (256, 480)), image block (`0x8C` bytes, 4 x 16 words). They sit at payload offsets
`0x1254`, `0x1314` and `0x13D4` (RAM `0x801EFE54`, `0x801EFF14`, `0x801EFFD4`) of
`ETC/START.EMI` entry 9 and of `ETC/SHOP.EMI` entry 8, which are the same 5,268-byte overlay
(`measured`: byte-identical; a scan of every `.EMI` for the 12-byte TIM and CLUT header finds
exactly these six records and no other). Nothing reads the TIM headers or uploads them to VRAM
(`read`); only the palette and pixel bytes are copied.

An editor that changes the icon edits both archives, because the save and the title flows load
different overlays. Only icon 0's CLUT is used; icons 1 and 2 share it (`read`).

### Title

The title buffer `g_UiFormatBuffer` is zeroed over 64 bytes and filled by `sprintf` with a full-width
Shift-JIS format (`D_801D0C98`, 0x44 bytes) that takes seven `%s` arguments: an area label
(`D_801E5434[D_801E6108]`; whether it is an area label or the slot digit is `unknown`, and [saving](../game/architecture/saving.md) lists the same seven arguments), two hour digits, two minute digits, Ryu's level tens digit and one more
digit. Every argument is a two-byte full-width digit or label from the `D_801E5434` table
(`read`, `func_801D7080`). The seventh digit is read from the byte at `0x8014496E` modulo 10; the
format places it last, after the level label. Whether that byte is the level's units digit is
`unknown` (the address is named for the shop clock's seconds byte). The longest result fits the 64-byte field (`inferred`;
all inputs are two-byte characters).

## Checksum

`read` in `func_801E5A00` (load) and `func_801D69E0` (save):

- Region: 4,272 bytes (`0x10B0`) from file offset `0x200`.
- Algorithm: unsigned 32-bit sum of the bytes; the low 16 bits (mask `0xFFFF`) are the
  value.
- Slot: the halfword at file offset `0x270`. On load the game reads it,
  zeroes it, sums the region, compares. On save the byte at that position is already zero when
  summed, because `D_80144948` is cleared before the copy (`read`, same function), then the
  result is stored.
- Failure: a mismatch sets `g_SaveCardStatus` to 7 and plays the error cue (`read`).

To patch a save by hand: change bytes in `0x200..0x12AF`, set the halfword at `0x270` to 0, sum
all 4,272 bytes from `0x200`, store the low 16 bits at `0x270` (little endian). The load
routine `func_801E5A00` checks only this sum; it does not test the `"SC"` header, the title or the
icons (`read`).

## Card calls

| Function (address)                      | Role                                                                                                                                                                | Evidence |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `CardAccessFile` (`func_801EEC30`)      | wait for the card, open, transfer; modes 0 (probe), 1 (read), 2 (write), `0x200` (create, then reopen to write). Its first parameter is the block count, not a port | `read`   |
| `CardOpenFile` (`func_801EF96C`)        | prefix `bu00:` or `bu10:` by `g_SaveCardPort`, `open`; creation flag is the block count shifted left 16 bits, ORed with `0x200`; retries 120 frames                 | `read`   |
| `CardTransferFile` (`func_801EFB44`)    | `lseek`, then `read` or `write` at `0x800C1800 + offset`; size rounded up and offset rounded down to `0x80`                                                         | `read`   |
| `CardScanDirectory` (`func_801EFCA8`)   | `firstfile` and `nextfile` over the `BASLUS-00422BOF3` pattern into `D_8018E990` (24-byte entries: name 20, size 4)                                                 | `read`   |
| `CardBuildFileHeader` (`func_801EF27C`) | writes bytes 0-3, title, palette, frames                                                                                                                            | `read`   |

The save menu lists names with a read of 28 bytes at file offset `0xEA0` (`func_801E77F0`):
the transfer rounds the offset down to `0xE80` and the size up to `0x80`, so it fetches
`0xE80..0xEFF`, which holds the save name (`+0xEA0`), portrait ids (`+0xEA5`), level (`+0xEA8`), timer (`+0xEAC`) and fairy job
(`+0xEF0`). The directory of the card itself (block 0 and its
128-byte frames) is owned by the BIOS; the game never writes it.

## Open items

| Item                                                | Status                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| Meaning of unknown payload bytes                    | `unknown`; [records](../game/records.md#save-layout) lists the named ones |
| Whether the load path rejects a wrong `"SC"` header | `unknown` (the BIOS may; the game code does not)                          |
| Seventh title digit source                          | `unknown`                                                                 |
| Behavior when two files share a slot digit          | `unknown`                                                                 |

Emulator wrappers (raw 128 KiB images, DexDrive headers) are outside the game. Their frame
layout and the directory block follow [psx-spx](https://psx-spx.consoledev.net/memorycards/)
([sources](../sources.md)); the community save editor cited in
[records](../game/records.md#save-layout) agrees on the checksum region.
