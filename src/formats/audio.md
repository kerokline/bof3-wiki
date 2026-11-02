# Audio

Breath of Fire III plays sound by two routes. Voice lines, magic effects and the logo soundtrack stream from the disc as XA ADPCM through the CD hardware. Music and sound effects are synthesized on the SPU by the PsyQ `libsnd` and `libspu` runtime. That route uses three kinds of data: a sound bank (VAB), sound-effect cue tables, and music sequences (SEP). This page describes the sample data and the three kinds. The sector layout of the streamed files is in [STR and XA](str.md). How the game requests and schedules sound is in [audio (runtime)](../systems/audio.md). How the loader moves these entries into RAM is in the [EMI loader chain](emi.md#loader-chain).

## Content on disc

Each `BIN/BGM/BGMxxx.EMI` is a bank plus a sequence package: type 6 is the VAB header (VH), type 7 the VAB body (VB) and type 10 the SEP package. The named tracks are `BGMOPN`, `BGMEND`, `BGMSPC` and `BGMBAT00` to `BGMBAT06`. The rest are numbered `BGM000` to `BGM197`, some with `A` and `B` variants. The disc holds 81 BGM archives, 2,040 type-6 and type-7 entries (1,020 pairs), 904 type-8 cue tables and 119 type-10 packages. Sound banks also appear in the area, enemy, boss, battle and character archives ([EMI](emi.md#entry-types)).

## XA ADPCM

An XA audio sector holds 18 sound units of 128 bytes in its 2,324-byte payload; [STR and XA](str.md#sector-layout) describes the rest of the sector and the stream files. The subheader byte `coding` has bit 0 for stereo (1) or mono (0), and bit 2 for 18,900 Hz (1) or 37,800 Hz (0). The game uses `0x00` (mono, 37,800 Hz) and `0x01` (stereo, 37,800 Hz). The `channel` field separates interleaved streams. The last sector of a channel (submode bit `0x80`) is valid audio.

A 128-byte sound unit holds four 4-byte parameter blocks, then 112 bytes of samples (4 groups of 28 bytes). In parameter byte 0, bits 0 to 3 are `shift` and bits 4 to 5 are `filter`. A mono unit repeats the same parameter in all four blocks and decodes to 224 samples. A stereo unit sends blocks 0 and 2 to the left channel and blocks 1 and 3 to the right, which gives 112 samples per channel.

## VAB bank

A VAB is the PsyQ sound bank: a header (VH) that describes programs and tones, and a body (VB) that holds the samples. The loader loads them as two EMI entries (types 6 and 7) that share their load argument, in all 1,020 pairs. The header field `fsize` equals `len(VH) + len(VB)` in all 1,020 banks.

A program is an instrument. It owns one or more tones, and each tone maps a note range to one sample (a VAG) with volume, pan, pitch and envelope settings. A game or a sequence picks a program, and a note then selects the tones whose range contains it.

### `VabHdr` (32 bytes at `0x00`)

The 32-byte PsyQ `VabHdr` opens the file.

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
| `0x18` |    1 | `mvol` (bank volume)                             |
| `0x19` |    1 | `pan` (bank pan)                                 |
| `0x1A` |    1 | `attr1`                                          |
| `0x1B` |    1 | `attr2`                                          |
| `0x1C` |    4 | `reserved1`                                      |

### Bank layout

The header is followed by the program table, the tone table and the VAG size table. The tone table length depends on `ps`.

| Region         |           Position |                                Size |
| -------------- | -----------------: | ----------------------------------: |
| `VabHdr`       |            `0x000` |                                  32 |
| program table  |            `0x020` |             128 x 16-byte `ProgAtr` |
| tone table     |            `0x820` | `ps` blocks x 16 x 32-byte `VagAtr` |
| VAG size table | `0x820 + ps*0x200` |                   256 x `u16` units |

`len(VH) == 0x820 + ps*0x200 + 0x200` in all 1,020 banks. `SsVabOpenHeadWithMode (exe/slus_004_22@0x80173CB0)` in the linked library places the tone table at `VH + 0x20 + limit*16`, where the limit is a fixed 0x80 records (0x40 below version 5). It rejects a `ps` above that limit and places the size table at `tone table + ps*0x200`.

**Program table.** The table always has 128 records. `ps` counts the records whose `tones` byte is nonzero, not the table length. The `tones` bytes of those records sum to `ts` (1,020 of 1,020). Their indices are the playable program numbers, and they may run past `ps`. The linked code walks all 128 records and writes the running count of nonzero-`tones` records into `ProgAtr.reserved1`. That count is the tone block that the program's notes select.

**Tone table.** The table has `ps` blocks of 16 slots, one block per playable record, packed in record order. Block *b* belongs to the *b*-th record with `tones != 0` (1,020 of 1,020). A slot is live when its `vag` field is nonzero. The live slots of a block are its first `tones` slots (4,416 of 4,416 blocks), and every live slot's `prog` field names its own record's index (4,416 of 4,416). Slots past the live count are stale authoring bytes, and a writer must keep them unchanged. 35 of them carry a volume with no `vag`.

**VAG size table.** Unit 0 is 0, the null sample. Units 1 to `vs` add up to the body size: `sum(units[1..=vs]) * 8 == len(VB)` in all 1,020 banks, and every nonzero unit is a multiple of 16 bytes. Units past `vs` are stale in 180 headers. They are never read, and a writer keeps them unchanged. The linked code sums `vs + 1` units at 8 bytes per unit from version 5 on, stops at 256 units and rejects a body above 512 KiB.

**Body.** Each VAG's range starts where the previous range ended. The first 16 bytes of the body are zero in all 1,020 banks: this is the null sample's block header, which the game transfers and plays rather than strips. The second byte of each 16-byte ADPCM block holds the shape flags. Bit 2 marks the loop-return block, bit 0 ends the sample, and bit 1 on the end block makes the marked block the loop start. All 8,330 non-empty ranges set the end flag, and 938 of them also loop. A one-pass decode is the number of blocks up to the end flag, times 28 samples. The loop window runs from the loop-start block through the block after the end block, times 28.

### `VagAtr` (32 bytes each)

Each tone is one `VagAtr` record.

| Offset | Size | Field                                                  |
| -----: | ---: | ------------------------------------------------------ |
| `0x00` |    1 | `prior` (priority)                                     |
| `0x01` |    1 | `mode`                                                 |
| `0x02` |    1 | `vol`                                                  |
| `0x03` |    1 | `pan`                                                  |
| `0x04` |    1 | `center` note                                          |
| `0x05` |    1 | `shift` (pitch tune), added as `shift / 128` semitones |
| `0x06` |    1 | `min` note                                             |
| `0x07` |    1 | `max` note                                             |
| `0x08` |    1 | `vibW` (vibrato width)                                 |
| `0x09` |    1 | `vibT` (vibrato time)                                  |
| `0x0A` |    1 | `porW` (portamento width)                              |
| `0x0B` |    1 | `porT` (portamento time)                               |
| `0x0C` |    1 | `pbmin` (bend range down, in semitones)                |
| `0x0D` |    1 | `pbmax` (bend range up, in semitones)                  |
| `0x0E` |    2 | `reserved1`, `reserved2`                               |
| `0x10` |    2 | `adsr1`                                                |
| `0x12` |    2 | `adsr2`                                                |
| `0x14` |    2 | `prog` (parent program)                                |
| `0x16` |    2 | `vag` (VAG index, 1-based)                             |
| `0x18` |    8 | `reserved[4]`, four halfwords                          |

The pitch-bend range is tone-local. Several fields never vary on the disc: `VabHdr.id`, `attr1` and `attr2` are 0 in all 1,020 banks. `reserved0` is `0xEEEE` and `reserved1` is `0xFFFFFFFF`. `ProgAtr.attr` is 0 in the 4,416 playable records. `VagAtr.vibW`, `vibT`, `porW` and `porT` are 0 in all 70,656 slots, and `VagAtr.reserved1` is `0xB1 0xB2` and `reserved[4]` is `C0 00 C1 00 C2 00 C3 00` in all slots.

### Playback

A note-on uses `fine = 0`: `_SsNoteOn`, `_SsVmKeyOn` and `_SsVmSelectToneAndVag` call `note2pitch(note, 0, center, shift)`. The channel's stored bend applies only on a pitch-bend event (`_SsVmPitchBend (exe/slus_004_22@0x801728E0)`). The voice manager layers every tone whose `min <= note <= max`, one SPU voice per layer. The physical tone block is the count of non-empty programs before the logical program, and `VagAtr.prog` is the lookup key a renderer uses.

`SsPitchFromNote` quantizes the combined fine tune to 16 steps per semitone and reads the linked integer table at `0x8018445C` (executable file offset `0xEE45C`). The table has 386 bytes, and it is the only pitch table. The addresses `0x800FDA84` and `0x800FDC5C` hold zeros and are not pitch data. The renderer applies bank volume and pan with the selected program and tone attributes, and no bass boost or EQ.

## EMI type-8 cue records

A type-8 entry is one bank's cue table for sound effects. It is a list of 4-byte records. Each record names an SPU voice, a VAB program and a tone. The loader copies the payload into a fixed chunk, and the dispatcher `SND_PlayCue (exe/slus_004_22@0x8015DF18)` turns one record into `SsUtKeyOnV` and `SsUtSetDetVVol` calls. A cue id names a record by bank and index.

| Item   | Value                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| Record | 4 bytes; payload size is a multiple of 4 (904 of 904 entries; 8,608 records)                                              |
| Bank   | TOC load argument 0 to 6; type-8 selectors are a subset of the container's type-6 selectors in 731 of 731 containers      |
| Chunk  | `0x801486A0 + 124 * bank`, banks 0 to 6; 31 records per chunk, at most 24 on the disc                                     |
| Reader | `g_SndCueReaders[bank]`: `0x8015E994`, `0x8015EFAC`, `0x8015F5C8`, `0x8015FBE4`, `0x80160200`, `0x8016081C`, `0x80160E38` |
| Cue id | `(bank << 8) \| record_index`; `SND_PlayCue` splits it into `(cue_id >> 8) & 0xF` and `cue_id & 0xFF`                     |

[EMI load argument](emi.md#load-argument) lists the bank selectors by archive kind. A record has these fields:

| Byte |   Bits | Field            | Meaning                                                                                                                                        |
| ---: | -----: | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
|  `0` | 0 to 2 | `alias_bank`     | bank whose record supplies the voice index; `0` own bank, `1`-`4` that bank; also takes its VAB volume, pan and tune; `0` in all 8,608 records |
|  `0` | 3 to 7 | -                | zero in all 8,608; role unknown                                                                                                                |
|  `1` |      7 | `use_cue_volume` | set in 8,584 of 8,608: follow the key-on with `SsUtSetDetVVol`; clear keeps the tone volume                                                    |
|  `1` | 0 to 6 | `program`        | VAB program 0 to 7; `SsUtKeyOnV` argument 3                                                                                                    |
|  `2` | 4 to 7 | `tone`           | tone slot 0 to 14; `SsUtKeyOnV` argument 4                                                                                                     |
|  `2` | 0 to 3 | -                | copied to voice state and compared with the previous cue; `0x10` (8,342), `0x11` (239), other values in 27; role unknown                       |
|  `3` |      7 | -                | zero in all 8,608                                                                                                                              |
|  `3` | 5 to 6 | `layers`         | extra voices: 0 (525), 1 (7,662), 2 (248), 3 (173)                                                                                             |
|  `3` | 0 to 4 | `voice`          | first SPU voice 0 to 23, mostly 16, 18, 20 and 22; values of 24 or more wrap modulo 24 when `layers > 0`                                       |

To set up a voice, the reader indexes the bank's VAB header at `0x820 + 512*program + 32*tone` and copies `VagAtr` bytes 2 (volume), 3 (pan), 5 (pitch tune) and 6 (min note) into voice state. It keys the base voice with `note = min note` and `fine = pitch tune`, plus `layers` extra voices on `voice + n` with tone slot `tone + n`. Tone volume and pan become SPU volumes only in the layered paths, as `vol * (128 - pan) / 128` and `vol * pan / 128`. The record has no envelope, so `adsr1` and `adsr2` come from the `VagAtr`.

Record checks:

- `program` stays below the bank's VAB program count in all 8,608 records.
- `tone` sits inside the program's declared tone count in 8,601 records. The other 7 name one slot past the last tone.
- Layered records stay inside the count in 8,050 of 8,083 cases.
- `0x820 + 512*program + 32*tone` holds a tone whose `VagAtr.prog` equals the record's `program` in all 8,585 records that have a sample there. 23 records name a tone slot with no sample, and 17 of the 8,677 layer requests land on such a slot.

### Program offset quirk

The seven reader routines (`0x8015E994` and its six twins) compute the tone offset as `0x820 + g_VabToneOffsets[tone] + g_VabProgramOffsets[program]`. `g_VabToneOffsets (exe/slus_004_22@0x801821E8)` holds `32 * n`, and `g_VabProgramOffsets (exe/slus_004_22@0x801821E0)` holds four halfwords `{0, 512, 1024, 0}`. The readers index that table with the record's program, 0 to 7, so programs 4 to 7 read past it into the first tone-table halfwords. Program 3 reads 0, and programs 4 to 7 read 0, 32, 64 and 96.

This hits 1,248 records, all in bank 6 with programs 3 to 7 (the 200 `BIN/BENEMY` banks). They read attributes from a different slot than the record names. The other 7,360 records agree with the table. This is how the shipped engine behaves, not what the record means.

## SEP package

The disc list labels type 10 "SEQ", but the container is SEP, a sequence package. All 119 packages hold exactly 4 sequences: 81 in `BIN/BGM`, 35 in `BIN/BOSS`, 2 in `BIN/BATTLE` and 1 in `BIN/ETC`.

The file header is 6 bytes: the magic `70 51 45 53` (`pQES` in file order, `SEQp` as a little-endian word) and a `u16` big-endian version, 0. A 13-byte header opens each sequence:

| Offset | Size | Field                                                           |
| -----: | ---: | --------------------------------------------------------------- |
| `0x00` |    2 | `seq_id` (`u16` big-endian)                                     |
| `0x02` |    2 | resolution (`u16` big-endian, always 48 ticks per quarter note) |
| `0x04` |    3 | tempo (big-endian, microseconds per quarter note)               |
| `0x07` |    2 | time signature (numerator, then log2 of the denominator)        |
| `0x09` |    4 | `data_size` (`u32` big-endian)                                  |

The headers and payloads tile the package exactly in all 119 packages. Each payload is a stream of MIDI-like events: variable-length delta times, running status, note on and off, program change, control change and pitch bend. Only the tempo and end-of-track events are meta events, and meta events carry a Standard MIDI File length. The end-of-track event is `FF 2F 00` and it closes all 476 sequences. No sequence contains a tempo meta event, so the tempo is the header field. A pitch-bend event has two MIDI data bytes. The linked renderer uses the second as the 7-bit coarse value, centered at 64, and ignores the first.

The control changes include NRPN-style extensions: loop start (20), loop end (30) and VAB attribute control. The select pairs seen are CC 99 (934 events), CC 98 (186) and CC 6 (282).

Over the 476 sequences (508,471 events):

- Each package has 4 sequences with ids 0 to 3, and resolution 48 in all 476.
- Note-on: 231,343 events with a velocity and 231,343 with velocity 0. No `0x8x` note-off, `0xA0` or `0xD0` event occurs.
- Control change: 10 pan (3,842), 7 volume (1,905), and 99, 98 and 6 for the loop and NRPN events (934, 186 and 282).
- Program change: 1,902. Pitch bend: 36,258.
- Running status appears exactly when the status byte differs from the last one (508,471 of 508,471). Delta times and meta lengths use the shortest encoding.
- Three sequences declare a time signature of 128/5, which no 7-bit MIDI field can hold.

## Sound control

The main executable has these entry points for sound.

|      Address | Name                    | Role                                                                             |
| -----------: | ----------------------- | -------------------------------------------------------------------------------- |
| `0x8015CEBC` | `SND_Exit`              | all-key-off, close active VAB ids, release seven slots, disable reverb           |
| `0x8015D044` | `SND_UpdateVoiceStatus` | poll all 24 SPU voices into the game voice-state table                           |
| `0x8015DF18` | `SND_PlayCue`           | queued cue dispatcher; `SsUtKeyOnV` and detailed voice-volume operations         |
| `0x80161BBC` | `SND_RequestBgm`        | ensure one logical audio bank is active, starting the EMI stream when it differs |
| `0x80161C20` | `SND_PlayBgm`           | start the selected BGM cue and record its id in `g_SndBgmId`                     |
| `0x80161CD0` | `SND_FadeOutBgm`        | fade out the selected BGM cue                                                    |

All are in `exe/slus_004_22`. `SND_Exit` is not the music scheduler or the bootstrap entry. A standalone player must reproduce the tables that the EMI loader fills before it calls the cue-start path.

## Open questions

| Question                                                     | What would settle it                                                                                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Role of type-8 cue byte 0 bits 3 to 7 and byte 2 bits 0 to 3 | the voice-state consumer of the compared nibble                                                                                                                          |
| The bank and sequence tables a standalone player needs       | the code that fills them: the linked `SsSepSetCrescendo` (`0x8016AE7C`), `SsSepPlay` (`0x8016B9CC`), `SsSepStop` (`0x8016D6C4`) and `SsSepSetVol` (`0x8016DBA0`) callers |
| SPU RAM base addresses for each bank                         | a trace of the transfer calls                                                                                                                                            |
| Which BGM an area plays                                      | the area-to-BGM table                                                                                                                                                    |

The SPU hardware model (ADPCM, ADSR, interpolation, reverb) follows [psx-spx](https://psx-spx.consoledev.net/soundprocessingunitspu/) ([sources](../appendix/sources.md)). The record layouts are the PsyQ 3.7 `libsnd` structures.
