# STR and XA playback

*Read this if you play, extract or rebuild the video and XA audio streams.*

The sector layout of the extracted STR/XA files and the `CAPCOM30.STR` timing contract. BOF3 stores extracted STR/XA data as 2,336-byte sectors without the outer raw CD sync and header:

```text
[XA subheader 8][payload 2324][EDC 4]
```

Generic PSX media tools expect 2,352-byte raw sectors. Rewrap before decoding and do not alter the
inner payload: assert `len(sector) == 2336`, split it as subheader 8 + payload 2324 + EDC 4, and
prepend the 12-byte sync and 4-byte header. Removing the 16-byte header must reproduce
every original 2,336-byte sector byte for byte. Keep the extracted file and its hash as the
archival source; a desktop derivative never replaces it.

## Known files

| Path                      | Content                   |
| ------------------------- | ------------------------- |
| `LOGO/CAPCOM30.STR`       | MDEC video plus stereo XA |
| `BIN/BMAG_XA/MAGIC00.STR` | multiplexed mono XA       |
| `BIN/SCE_XA/S_XA00.STR`   | multiplexed stereo XA     |
| `BIN/SCE_XA/VOICE.STR`    | multiplexed mono XA       |

`CAPCOM30.STR` contains standard inner STR/MDEC chunk headers; the three `BIN/` files are audio
banks, not movies.

## Sector classes

Counts are over every sector of each extracted file (`measured`). A sector is `[file, channel,
submode, coding]` plus payload; the CD hardware passes only sectors whose submode has the audio
bit (`0x04`) and whose file and channel match the filter set by `CdlSetfilter`.

| File           | Sectors | Audio sectors (submode `0x64`/`0xE4`) | Coding | Channels | Other sectors                                              |
| -------------- | ------: | ------------------------------------: | -----: | -------: | ---------------------------------------------------------- |
| `S_XA00.STR`   |  40,416 |                                11,302 |      1 |        8 | 29,113 Form 1 (submode 0), 1 EOF sector (submode `0x80`)   |
| `MAGIC00.STR`  |  15,408 |                                14,856 |      0 |       16 | 552 Form 1 (submode 0)                                     |
| `VOICE.STR`    |   3,536 |                                   297 |      0 |        5 | 3,238 Form 1 (submode 0, user data all zero), 1 EOF sector |
| `CAPCOM30.STR` |   1,155 |                   143 stereo + 1 mono |   1, 0 |        2 | 1,010 video (submode `0x42`) + 1 video EOF (`0xC2`)        |

Coding 1 is stereo and coding 0 mono, both 37,800 Hz 4-bit ADPCM (the sector's coding byte).
The Form 1 sectors of `S_XA00.STR` (72.0% of its sectors) and `MAGIC00.STR` carry non-zero
user data: about 1,400 of 2,048 bytes are non-zero and 14,227 of 29,113 blocks in `S_XA00.STR`
are distinct. The game never reads them as audio (the hardware filter drops them), and their
content is `unknown`. In `VOICE.STR` the same position holds zeros. In `S_XA00.STR`, after the first 463
sectors, each 8-sector period holds the audio of channels 1 and 3 and six Form 1 sectors
(`measured`: 5,045 and 5,052 sectors for channels 1 and 3).

## XA cue tables

`SND_ResolveXaStream` (`0x80163744`) turns a request key into the first and last sector of a
cue. `read`:

- Key: `(stream << 12) | cue_index`. Stream 0 is `S_XA00.STR`, 1 is `MAGIC00.STR`, 2 is
  `VOICE.STR` (`D_80183230` = slot ids `0x2A9`, `0x1B2`, `0x2AA`; the file start is
  `g_EmiSlotLbas[slot]`, see [executable](exe.md#the-disc-file-table)).
- Period: 8 sectors for stream 0, 16 for streams 1 and 2.
- Cue array: `D_8018323C[stream]` points to a `u16` array in the executable
  (`0x801839C4`, `0x801832C4`, `0x80183298`). Each cue is the value at index `i` and the value at
  `i + 1`, both masked with `0x7FFF`. A value with bit 15 set ends a channel: the code skips the
  following word and counts one channel.
- First sector: `start * period + channel`, with `channel` the count of flagged words before the
  cue. The end bound is `next_start * period + channel`, minus 150 sectors (`0x96`) in the bound
  the reader stores last (`read`; the purpose of the 150-sector offset is `unknown`).

`measured` over all cues with the same walk (terminate on a pair of zero words): every cue in the
three files has `end >= start`, its first sector is an audio sector of the right channel, and
every period step inside it is an audio sector of that channel (0 bad).

| Stream        | Cues | Channels |   Array words scanned | Note                                                                                                                                      |
| ------------- | ---: | -------: | --------------------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `MAGIC00.STR` |  880 |       16 |                   896 | clean terminator                                                                                                                          |
| `VOICE.STR`   |    5 |        5 |                    22 | clean terminator                                                                                                                          |
| `S_XA00.STR`  |   11 |        4 | 1,024 (to next array) | the array end is not bounded by a symbol; cue count is `inferred`. Sector channels 4-7 hold 340 audio sectors that no scanned cue reaches |

To change a cue's length or start, edit the `u16` values in `SLUS_004.22` (file offset
`address - 0x80096000`); nothing else stores them. `import disc` replaces `SLUS_004.22` with a file
of equal or smaller size, so the edit is possible there; `import disc` refuses XA streams
(Form 2 cannot be replaced, `measured`).

## CAPCOM30 stream layout

`measured` over all 1,155 sectors: 1,011 video sectors (1,010 with submode `0x42`, the last with
`0xC2`), 143 stereo audio sectors, 1 mono audio sector. Every video sector starts with the 32-byte
STR chunk header; the magic is `0x80010160` in 1,011 of 1,011.

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

The header layout follows Sony's STR chunk format (libpress, `DecDCTvlc`; [psx-spx](https://psx-spx.consoledev.net/cdromformat/));
the values are measured. `LOGO.EXE` reads the stream from LBA 186,252, a constant in the
logo executable ([executable](exe.md#boot-chain)).

## CAPCOM30 timing

Derive desktop-mux timing from decoded measurements, not fixed asset constants:

```text
video_seconds = video_frame_count / selected_frames_per_second
audio_seconds = decoded_samples_per_channel / sample_rate
pad_samples_per_channel =
    max(0, round((video_seconds - audio_seconds) * sample_rate))
```

After padding, audio and video durations agree within one audio-sample period (or a stricter
muxer-supported tolerance). Desktop conversion uses lossless H.264 (`qp = 0`) and FLAC audio in
Matroska; keep decoder dimensions and chroma sampling, and never scale the image. Assign timestamps
from the frame index, `pts = frame_index / selected_frames_per_second`; do not combine timestamp
rescaling with an output-rate option, which can duplicate a boundary frame. Pad the selected XA
stream by the formula, then trim it to exactly `round(video_seconds * sample_rate)` samples.

The extracted file is exactly `1155 * 2336` bytes. A reversible 2,352-byte wrapper preserves all
1,155 inner sectors and decodes to these measured streams:

| Measurement                   |        Result |
| ----------------------------- | ------------: |
| Video frames                  |           231 |
| Main stereo XA packets        |           143 |
| XA sample rate                |     37,800 Hz |
| Decoded stereo XA duration    |    7.626667 s |
| Video duration at 30 fps      |       7.700 s |
| Padded desktop audio duration |       7.700 s |
| Padding delta                 |    0.073333 s |
| Silence per stereo channel    | 2,772 samples |
| 1,155 sectors at 2x CD rate   |       7.700 s |

ffmpeg's default time base is wrong for this stream: video plays at half the audio speed. That
default is not an accepted asset duration. The 30 fps/2x delivery is the supported
desktop-conversion setting, not a proven game-runtime contract; verify the scheduler in `Logo_Init`
(`0x801CE760`) and `Logo_DrawFrame` (`0x801CEA98`) before promoting it. `ffprobe` cannot read the
extracted 2,336-byte STR directly, so probe the wrapped output, not the raw
`CAPCOM30.STR`.

Keep the trailing mono stream separate rather than folding it into the main stereo track. No
source-backed CDDA runtime control algorithm is recovered; XA and CDDA are not synonyms.

## Sources

The sector layout follows the XA subheader and sector encoding in
[psx-spx](https://psx-spx.consoledev.net/cdromdrive/) ([sources](../sources.md)); the timing facts are measured from
the retail files.
