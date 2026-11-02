# STR and XA playback

The disc carries one video and three banks of streamed audio, stored as CD-ROM XA sectors outside the ISO9660 data. `LOGO/CAPCOM30.STR` is the Capcom logo movie: MDEC-compressed video interleaved with stereo XA audio. The three `.STR` files under `BIN/` are not movies. They are audio banks that hold many short sounds (magic effects and voice) as interleaved XA channels, and the game plays one by sector range. The video plays at boot from `LOGO.EXE` ([executables](exe.md#boot-chain)). The audio banks play through `SND_StartXaStream` ([audio](../systems/audio.md)). This page covers the sector layout of the files, the table that maps a sound request to a sector range, and the logo movie.

## Sector layout

The extracted STR files store each sector as 2,336 bytes, without the 12-byte sync and 4-byte header of a raw 2,352-byte CD sector:

```text
[XA subheader 8][payload 2324][EDC 4]
```

To read a file with a tool that expects raw sectors, prepend the sync and a 4-byte header to each 2,336-byte sector. Removing those 16 bytes again gives back the stored sector byte for byte.

The XA subheader holds `[file, channel, submode, coding]` twice. The CD hardware passes only the sectors whose submode has the audio bit (`0x04`) and whose file and channel match the filter set with `CdlSetfilter`. Coding `1` is stereo and coding `0` is mono; both are 4-bit ADPCM at 37,800 Hz.

### Files

| Path                      | Content                   |
| ------------------------- | ------------------------- |
| `LOGO/CAPCOM30.STR`       | MDEC video plus stereo XA |
| `BIN/BMAG_XA/MAGIC00.STR` | multiplexed mono XA       |
| `BIN/SCE_XA/S_XA00.STR`   | multiplexed stereo XA     |
| `BIN/SCE_XA/VOICE.STR`    | multiplexed mono XA       |

### Sector classes

The counts cover every sector of each file (`measured`). Audio sectors have submode `0x64`, or `0xE4` for the last sector of a channel.

| File           | Sectors |         Audio sectors | Coding | Channels | Other sectors                                                    |
| -------------- | ------: | --------------------: | -----: | -------: | ---------------------------------------------------------------- |
| `S_XA00.STR`   |  40,416 |                11,302 |      1 |        8 | 29,113 Form 1 (submode 0), 1 end-of-file sector (submode `0x80`) |
| `MAGIC00.STR`  |  15,408 |                14,856 |      0 |       16 | 552 Form 1 (submode 0)                                           |
| `VOICE.STR`    |   3,536 |                   297 |      0 |        5 | 3,238 Form 1 (user data all zero), 1 end-of-file sector          |
| `CAPCOM30.STR` |   1,155 | 143 stereo and 1 mono |   1, 0 |        2 | 1,010 video (submode `0x42`) and 1 last video sector (`0xC2`)    |

The Form 1 sectors of `S_XA00.STR` (72.0 percent of its sectors) and `MAGIC00.STR` hold non-zero user data. About 1,400 of 2,048 bytes are non-zero, and 14,227 of the 29,113 blocks in `S_XA00.STR` are distinct. The hardware filter drops these sectors, so the game never plays them, and their content is `[unknown]`. In `VOICE.STR` the same sectors are zero.

In `S_XA00.STR`, after the first 463 sectors, each 8-sector period holds one sector each of channels 1 and 3 and six Form 1 sectors (`measured`: 5,045 and 5,052 sectors for channels 1 and 3).

## XA cue tables

A sound request is a key, and `SND_ResolveXaStream (exe/slus_004_22@0x80163744)` turns it into the first and last sector of one cue in the stream.

The key is `(stream << 12) | cue_index`. Stream 0 is `S_XA00.STR`, stream 1 is `MAGIC00.STR` and stream 2 is `VOICE.STR`. The three slot ids are in `D_80183230` (`0x2A9`, `0x1B2`, `0x2AA`), and the file start is `g_EmiSlotLbas[slot]` ([executables](exe.md#the-disc-file-table)). The cue array for each stream is `D_8018323C[stream]`, a pointer to a `u16` array in the executable at `0x801839C4`, `0x801832C4` and `0x80183298`.

The resolver reads the array like this (`read`):

- A cue is the value at index `i` and the value at `i + 1`, both masked with `0x7FFF`.
- A value with bit 15 set ends a channel. The code skips the following word and counts one channel.
- The period is 8 sectors for stream 0 and 16 for streams 1 and 2. A channel's sectors repeat once per period.
- The first sector is `start * period + channel`, where `channel` is the number of flagged words before the cue.
- The end bound is `next_start * period + channel`. The bound that the reader stores last has 150 sectors (`0x96`) taken off. The reason for the 150-sector offset is `[unknown]`.

Walking every array this way (a pair of zero words ends the walk) gives `measured` results: in all three files every cue has `end >= start`, its first sector is an audio sector of the right channel, and every period step inside it is an audio sector of that channel (0 bad).

| Stream        | Cues | Channels |   Array words scanned | Note                                                                                                                                      |
| ------------- | ---: | -------: | --------------------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `MAGIC00.STR` |  880 |       16 |                   896 | clean terminator                                                                                                                          |
| `VOICE.STR`   |    5 |        5 |                    22 | clean terminator                                                                                                                          |
| `S_XA00.STR`  |   11 |        4 | 1,024 (to next array) | no symbol bounds the array end, so the cue count is `inferred`. Sector channels 4 to 7 hold 340 audio sectors that no scanned cue reaches |

The cue values exist only in `SLUS_004.22`, at file offset `address - 0x80096000`. Changing a cue's start or length means editing those `u16` values.

## CAPCOM30 stream layout

`CAPCOM30.STR` has 1,155 sectors (`measured`): 1,011 video sectors (1,010 with submode `0x42` and the last with `0xC2`), 143 stereo audio sectors and 1 mono audio sector. Each video sector starts with a 32-byte STR chunk header, and the magic is `0x80010160` in all 1,011. Sony's STR chunk format defines the header ([psx-spx](https://psx-spx.consoledev.net/cdromformat/)). A frame spans several video sectors, one chunk each. The table lists the header fields and what the disc holds.

| Header offset | Size | Field                         | Value on this disc              |
| ------------: | ---: | ----------------------------- | ------------------------------- |
|           `0` |    4 | magic                         | `0x80010160`                    |
|           `4` |    2 | chunk number within the frame | 0-4                             |
|           `6` |    2 | chunks in the frame           | 4 (144 frames) or 5 (87 frames) |
|           `8` |    4 | frame number                  | 1-231 (231 distinct)            |
|          `12` |    4 | demux size                    | varies per frame                |
|          `16` |    2 | width                         | 320 in 1,011 of 1,011           |
|          `18` |    2 | height                        | 240 in 1,011 of 1,011           |
|          `20` |    2 | MDEC words                    | varies per frame                |
|          `22` |    2 | id                            | `0x3800`                        |
|          `24` |    2 | quantiser scale               | varies                          |
|          `26` |    2 | version                       | 2                               |

`LOGO.EXE` reads the stream from LBA 186,252, a constant in the logo executable ([executables](exe.md#boot-chain)).

## CAPCOM30 timing

The video has 231 frames. The stereo audio is 143 sectors of 2,016 samples per channel at 37,800 Hz. The stream is read at double CD speed (150 sectors per second), so 1,155 sectors take 7.7 seconds, and 231 frames at 30 frames per second also take 7.7 seconds. The audio is shorter than the video:

| Measurement                 |        Result |
| --------------------------- | ------------: |
| Video frames                |           231 |
| Main stereo XA sectors      |           143 |
| XA sample rate              |     37,800 Hz |
| Decoded stereo XA duration  |    7.626667 s |
| Video duration at 30 fps    |       7.700 s |
| Gap                         |    0.073333 s |
| Gap in samples per channel  | 2,772 samples |
| 1,155 sectors at 2x CD rate |       7.700 s |

To play video and audio together outside the game, pad the audio with the gap:

```text
video_seconds = frame_count / frames_per_second
audio_seconds = samples_per_channel / sample_rate
pad_samples   = max(0, round((video_seconds - audio_seconds) * sample_rate))
```

The 30 frames per second and double-speed figures come from the stream's size and the CD rate. They are not read from the game's timing code. `Logo_Init (exe/logo@0x801CE760)` and `Logo_DrawFrame (exe/logo@0x801CEA98)` run the playback, and the game schedule is `[unknown]` here. The trailing mono sector is a separate stream and is not part of the stereo track. No code that controls CDDA playback is recovered; XA and CDDA are different things.
