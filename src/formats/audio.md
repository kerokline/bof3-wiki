# Audio

*Read this if you extract or edit sound banks, sequences or cue tables.*

The audio formats: XA ADPCM sectors, VAB banks, EMI type-8 cue records, SEP sequences and the
sound control entry points. BOF3 has two audio paths: streaming XA ADPCM through the CD hardware,
and synthesized music through the PsyQ `libsnd`/`libspu` runtime (VAB sample banks plus SEP
sequences). The EMI loader chain is in [EMI](emi.md#loader-chain).

## Content on disc

Each `BIN/BGM/BGMxxx.EMI` is a VAB plus SEP bundle: type 6 is the VAB header (VH), type 7 the VAB
body (VB), type 10 the SEP sequence package. Named tracks are `BGMOPN`, `BGMEND`, `BGMSPC` and
`BGMBAT00`-`BGMBAT06`; the rest are numbered `BGM000`-`BGM197`, some with `A`/`B` variants. The
disc holds 81 BGM archives, 2,040 type-6/7 entries (1,020 pairs), 904 type-8 cue tables and 119
type-10 packages.

## XA ADPCM

A 2336-byte sector:

```text
Offset  Size  Field
0x000     4   Subheader: [file_number, channel, submode, coding]
0x004     4   Subheader copy
0x008  2304   18 sound units × 128 bytes
0x908    20   Zero-filled
0x91C     4   EDC (zero-filled)
```

A 128-byte sound unit holds four 4-byte parameter blocks at offset 0 and 112 bytes of samples
(4 groups × 28 bytes). Parameter byte 0 is `shift` in bits 0-3 and `filter` in bits 4-5. Mono: all
four blocks identical, 224 samples. Stereo: blocks 0 and 2 are left, blocks 1 and 3 right, 112
samples per channel. Coding byte bit 0 is stereo (1) versus mono (0); bit 2 is 18900 Hz (1) versus
37800 Hz (0). BOF3 uses `0x00` (mono 37800) and `0x01` (stereo 37800). The `channel` field
separates streams in round-robin order; EOF sectors (submode `& 0x80`) are valid audio.

## VAB bank

The bank is a header (VH) and a body (VB) loaded as two EMI entries that share their load argument
(1,020/1,020 pairs). The header's `fsize` is `len(VH) + len(VB)` in 1,020/1,020 banks.

### `VabHdr` (32 bytes at `0x00`)

| Offset | Size | Field                                            |
| -----: | ---: | ------------------------------------------------ |
| `0x00` |    4 | magic bytes `70 42 41 56` (`pBAV` in file order) |
| `0x04` |    4 | version (7)                                      |
| `0x08` |    4 | `id`                                             |
| `0x0C` |    4 | `fsize` (VH + VB)                                |
| `0x10` |    2 | `reserved0` (`0xEEEE`)                           |
| `0x12` |    2 | `ps` (programs)                                  |
| `0x14` |    2 | `ts` (total tones)                               |
| `0x16` |    2 | `vs` (VAGs)                                      |
| `0x18` |    1 | `mvol`                                           |
| `0x19` |    1 | `pan`                                            |
| `0x1A` |    1 | `attr1`                                          |
| `0x1B` |    1 | `attr2`                                          |
| `0x1C` |    4 | `reserved1`                                      |

This is the full 32-byte PsyQ `VabHdr`. The renderer applies bank volume and pan with
the selected program and tone attributes; it applies no post-render bass boost or EQ.

### Bank layout

| Region         |           Position |                                Size |
| -------------- | -----------------: | ----------------------------------: |
| `VabHdr`       |            `0x000` |                                  32 |
| program table  |            `0x020` |             128 × 16-byte `ProgAtr` |
| tone table     |            `0x820` | `ps` blocks × 16 × 32-byte `VagAtr` |
| VAG size table | `0x820 + ps*0x200` |                   256 × `u16` units |

`len(VH) == 0x820 + ps*0x200 + 0x200` in 1,020/1,020 banks. The linked `SsVabOpenHeadWithMode`
`SsVabOpenHeadWithMode (exe/slus_004_22@0x80173CB0)` places the tone table at `VH + 0x20 + limit*16` with a fixed limit
of 0x80 records (0x40 below version 5), rejects a `ps` above that limit, and places the size table
at `tone table + ps*0x200`.

**Program table.** `ps` counts the records whose `tones` byte is nonzero, not the table length,
which is always 128. Those records' `tones` bytes sum to `ts` (1,020/1,020); their indices are the
playable program numbers and may run past `ps`. The linked code walks all 128 records and writes
the running count of nonzero-`tones` records into `ProgAtr.reserved1`: the tone block a program's
notes select.

**Tone table.** `ps` blocks of 16 slots, one block per playable record, packed in record order:
block *b* belongs to the *b*-th record with `tones != 0` (1,020/1,020). A slot is live when its
`vag` field is nonzero; a block's live slots are its first `tones` slots (4,416/4,416 blocks), and
every live slot's `prog` field names its own record's index (4,416/4,416). Slots past the live
count are stale authoring bytes a writer must put back unchanged; 35 carry a volume with no `vag`.

**VAG size table.** Unit 0 is 0, the null sample. Units 1..`vs` accumulate the body:
`sum(units[1..=vs]) * 8 == len(VB)` in 1,020/1,020, and every nonzero unit is a multiple of 16
bytes. Units past `vs` are stale in 180 headers and are written back unchanged, never read. The
linked code sums `vs + 1` units at 8 bytes per unit from version 5 on, stops at 256 units, and
rejects a body above 512 KiB.

**Body.** Each VAG's range starts where the previous range ended, and the body's first 16 bytes are
zero in 1,020/1,020 banks (the null sample's block header, transferred and played, not stripped).
The second byte of each 16-byte ADPCM block carries the shape flags: bit 2 marks the loop-return
block, bit 0 ends the sample, and bit 1 on the end block makes the marked block the loop. All 8,330
non-empty ranges set the end flag and 938 also loop. A one-pass decode is the blocks up to the end
flag times 28 samples; the loop window is the loop-start block through the block after the end
block, both times 28.

### `VagAtr` (32 bytes each)

Key fields: `vol` (byte 2), `pan` (3), `center` note (4), unsigned `shift`/pitch tune (5, added as
`tune / 128` semitones), min/max note (6-7), `adsr1` (16-17), `adsr2` (18-19), parent program
(20-21), `vag` index (22-23, 1-based). Pitch-bend range is tone-local: bytes 12-13 hold the
downward/upward range in semitones. The records are the PsyQ `VabHdr`, `ProgAtr` and `VagAtr`.

| Offset | Size | Field                         |
| -----: | ---: | ----------------------------- |
| `0x00` |    1 | `prior` (priority)            |
| `0x01` |    1 | `mode`                        |
| `0x02` |    1 | `vol`                         |
| `0x03` |    1 | `pan`                         |
| `0x04` |    1 | `center` note                 |
| `0x05` |    1 | `shift` (pitch tune)          |
| `0x06` |    1 | `min` note                    |
| `0x07` |    1 | `max` note                    |
| `0x08` |    1 | `vibW` (vibrato width)        |
| `0x09` |    1 | `vibT` (vibrato time)         |
| `0x0A` |    1 | `porW` (portamento width)     |
| `0x0B` |    1 | `porT` (portamento time)      |
| `0x0C` |    1 | `pbmin` (bend range down)     |
| `0x0D` |    1 | `pbmax` (bend range up)       |
| `0x0E` |    2 | `reserved1`, `reserved2`      |
| `0x10` |    2 | `adsr1`                       |
| `0x12` |    2 | `adsr2`                       |
| `0x14` |    2 | `prog` (parent program)       |
| `0x16` |    2 | `vag` (VAG index, 1-based)    |
| `0x18` |    8 | `reserved[4]`, four halfwords |

At playback, `SsPitchFromNote` quantizes combined fine tune to 16 steps per semitone and uses the
linked integer table at `0x8018445C` (raw payload offset `0xEE45C`); its 386 bytes are the table the
standalone player uses. The table at `0x8018445C` is the only pitch table; the
addresses `0x800FDA84` and `0x800FDC5C` hold zeros and are not evidence.

Fields the data leaves open: `VabHdr.id`, `attr1`, `attr2` are 0 in 1,020/1,020; `reserved0` is
`0xEEEE` and `reserved1` is `0xFFFFFFFF`; `ProgAtr.attr` is 0 in the 4,416 playable records;
`VagAtr.vibW`, `vibT`, `porW`, `porT` are 0 in all 70,656 slots; `VagAtr.reserved1` is `0xB1 0xB2`
and `reserved[4]` is `C0 00 C1 00 C2 00 C3 00` in all slots.

Note-on uses `fine = 0`: `_SsNoteOn -> _SsVmKeyOn -> _SsVmSelectToneAndVag` calls
`note2pitch(note, 0, center, shift)`. The channel's stored bend applies only on a pitch-bend event
(`_SsVmPitchBend` at `0x801728E0`). Tone selection layers every tone whose `min <= note <= max`,
one SPU voice per layer. The physical tone block is the count of non-empty programs before the
logical program; `VagAtr.prog` is the renderer's lookup key.

## EMI type-8 cue records

Type 8 is one VAB bank's sound-effect cue table: 4-byte records naming the SPU voice, the VAB
program and the tone. The loader copies the payload into a fixed chunk; the dispatcher
`0x8015DF18` turns one record into `SsUtKeyOnV`/`SsUtSetDetVVol` calls.

| Item   | Value                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| Record | 4 bytes; payload size is a multiple of 4 (904/904 entries; 8,608 records)                                                 |
| Bank   | TOC load argument `0`-`6`; type-8 selectors are a subset of the container's type-6 selectors in 731/731 containers        |
| Chunk  | `0x801486A0 + 124 * bank`, banks `0`-`6`; 31 records per chunk, at most 24 on the disc                                    |
| Reader | `g_SndCueReaders[bank]`: `0x8015E994`, `0x8015EFAC`, `0x8015F5C8`, `0x8015FBE4`, `0x80160200`, `0x8016081C`, `0x80160E38` |
| Cue id | `(bank << 8) \| record_index`; `SND_PlayCue` splits it into `(cue_id >> 8) & 0xF` and `cue_id & 0xFF`                     |

Bank selectors by archive kind are in [EMI load argument](emi.md#load-argument).

| Byte | Bits | Field            | Meaning                                                                                                                                             |
| ---: | ---: | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
|  `0` |  2-0 | `alias_bank`     | bank whose record supplies the voice index; `0` own bank, `1`-`4` that bank; also takes its VAB volume, pan and tune; disc value `0` in 8,608/8,608 |
|  `0` |  7-3 | -                | zero in 8,608/8,608; role unknown                                                                                                                   |
|  `1` |    7 | `use_cue_volume` | set in 8,584/8,608: follow the key-on with `SsUtSetDetVVol`; clear keeps the tone volume                                                            |
|  `1` |  6-0 | `program`        | VAB program `0`-`7`; `SsUtKeyOnV` argument 3                                                                                                        |
|  `2` |  7-4 | `tone`           | tone slot `0`-`14`; `SsUtKeyOnV` argument 4                                                                                                         |
|  `2` |  3-0 | -                | copied to voice state and compared with the previous cue; disc `0x10` (8,342), `0x11` (239), other values in 27; role unknown                       |
|  `3` |    7 | -                | zero in 8,608/8,608                                                                                                                                 |
|  `3` |  6-5 | `layers`         | extra voices: `0` (525), `1` (7,662), `2` (248), `3` (173)                                                                                          |
|  `3` |  4-0 | `voice`          | first SPU voice `0`-`23`, dominated by 16, 18, 20, 22; values `>= 24` wrap mod 24 when `layers > 0`                                                 |

The byte-2 low nibble has no proven role.

Voice setup: the reader indexes the bank's VAB header at `0x820 + 512*program + 32*tone` and copies
`VagAtr` byte 2 (volume), 3 (pan), 5 (pitch tune) and 6 (min note) into voice state. It keys the
base voice with `note = min note` and `fine = pitch tune`, plus `layers` voices on `voice + n` and
tone slot `tone + n`. Tone volume and pan become SPU volumes only in the layered paths:
`vol * (128 - pan) / 128` and `vol * pan / 128`. The record carries no envelope; `VagAtr` supplies
`adsr1`/`adsr2`.

Record checks: `program` stays below the bank's VAB program count in 8,608/8,608; `tone` sits
inside the program's declared tone count in 8,601/8,608; the 7 others name one slot past the last
tone. Layered records stay inside that count in 8,050/8,083 cases. `0x820 + 512*program + 32*tone`
holds a tone whose `VagAtr.prog` equals the record's `program` in all 8,585 records with a sample
there; 23 records name a tone slot with no sample, and 17 of the 8,677 layer requests land on such
a slot. Measured: all 904 payloads rebuild byte-exactly from their decoded records.

Reader offset quirk: `0x8015E994` and its six twins compute the tone offset as
`0x820 + g_VabToneOffsets[tone] + g_VabProgramOffsets[program]`, where `g_VabToneOffsets`
(`0x801821E8`) holds `32 * n` and `g_VabProgramOffsets` (`0x801821E0`) holds four halfwords
`{0, 512, 1024, 0}`. The readers
index that table with the record's program 0-7, so programs 4-7 read the first tone-table halfwords:
program 3 reads 0, and programs 4-7 read 0, 32, 64 and 96. 1,248 records (all bank 6, programs
`3`-`7`, the 200 `BIN/BENEMY` banks) read attributes from a different slot; the other 7,360 agree.
That is shipped-engine behavior, not the record's meaning.

## SEP package

The disc list labels type 10 "SEQ"; the container is SEP, a sequence package. All 119 extracted
packages hold exactly 4 sequences: 81 in `BIN/BGM`, 35 in `BIN/BOSS`, 2 in `BIN/BATTLE`, 1 in
`BIN/ETC`.

File header (6 bytes): magic `70 51 45 53` ("SEQp" in file order), version `u16` big-endian = 0.
Per-sequence header (13 bytes): `seq_id` (`u16` BE), resolution (`u16` BE, always 48), tempo
(3 bytes BE, µs per quarter), time signature (2 bytes), `data_size` (`u32` BE). The headers and
payloads tile the package exactly (119/119).

Events are MIDI-like: VLQ delta times, running status, note on/off, program change, control change,
pitch bend; only tempo and EOT are meta events. Pitch bend takes two MIDI data bytes; the linked
renderer uses the second as the 7-bit coarse value centered at 64 and ignores the first. Meta
events carry an SMF length; EOT is `FF 2F 00` and closes all 476 sequences. No tempo meta event
occurs in any sequence. NRPN extensions: loop start (20), loop end (30), VAB attribute control; the
observed select pairs are CC 99 (934), CC 98 (186), CC 6 (282).

Facts over the 476 sequences (508,471 events), re-encoded byte-exactly:
4 sequences per package, ids 0..3, resolution 48 (476/476); note-on 231,343 with velocity and
231,343 with velocity 0, no `0x8x` note-off, no `0xA0` or `0xD0`; control change 10 pan (3,842), 7
volume (1,905), 99/98/6 loop and NRPN (934/186/282); program change 1,902, pitch bend 36,258;
running status appears exactly when the status byte differs (508,471/508,471); deltas and meta
lengths are minimally encoded; three sequences declare 128/5, which no 7-bit MIDI field holds.

## Sound control

The EMI type 6-10 handlers are in the [loader chain](emi.md#loader-chain). The main executable's
sound entry points:

|      Address | Name                    | Role                                                                             |
| -----------: | ----------------------- | -------------------------------------------------------------------------------- |
| `0x8015CEBC` | `SND_Exit`              | all-key-off, close active VAB ids, release seven slots, disable reverb           |
| `0x8015D044` | `SND_UpdateVoiceStatus` | poll all 24 SPU voices into the game voice-state table                           |
| `0x8015DF18` | `SND_PlayCue`           | queued cue dispatcher; `SsUtKeyOnV` and detailed voice-volume operations         |
| `0x80161BBC` | `SND_RequestBgm`        | ensure one logical audio bank is active, starting the EMI stream when it differs |
| `0x80161C20` | `SND_PlayBgm`           | start the selected BGM cue and record its id in `g_SndBgmId`                     |
| `0x80161CD0` | `SND_FadeOutBgm`        | fade out the selected BGM cue                                                    |

`SND_Exit` is not the music scheduler or bootstrap entry. A standalone player must reproduce the
EMI-populated tables before calling the cue-start path.

Open: the bank and sequence tables a standalone player needs; the linked sequence calls
`SsSepSetCrescendo` (`0x8016AE7C`), `SsSepPlay` (`0x8016B9CC`), `SsSepStop` (`0x8016D6C4`) and
`SsSepSetVol` (`0x8016DBA0`); the type-8 byte-2 low nibble; the SPU RAM base addresses; the
area-to-BGM mapping.

## Sources

VAB, SEP and cue facts are measured from the retail archives and the linked PsyQ `libsnd` code. The
SPU hardware model (ADPCM, ADSR, interpolation, reverb) follows
[psx-spx](https://psx-spx.consoledev.net/soundprocessingunitspu/) ([sources](../sources.md)). The record layouts are the
PsyQ 3.7 `libsnd` structures.
