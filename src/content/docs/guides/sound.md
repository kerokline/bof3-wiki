---
title: "Edit sound and music"
description: "The game plays sound by two routes."
---

The game plays sound by two routes. The SPU synthesizes music and effects from sound banks and cue tables, and the CD hardware streams voices and long effects as XA audio. This guide covers four tasks: sound effects, music, sound banks and streamed audio. The formats are in [audio formats](../../formats/audio/) and [STR and XA](../../formats/str/). How the game requests a sound is in [audio system](../../systems/audio/).

## Sound effects

**Where.** An effect bank is a pair of VAB entries (types 6 and 7) plus a cue table (type 8). Banks sit in `BATTLE/COMN_SE.EMI`, `BATTLE/BATL_SE.EMI`, `ETC/A085SE2.EMI`, `ETC/A108SE2.EMI`, the 200 `BENEMY` enemy archives, the `BMAGIC` spell archives and the area archives. The disc holds 904 cue tables ([entry types](../../formats/emi/#entry-types)).

**What to change.** A cue record is 4 bytes: an SPU voice, a VAB program, a tone and a layer count. A cue id is `(bank << 8) | record_index`. To change what a cue sounds like, edit its `program` and `tone` so that they name another sound in the VAB of the bank ([cue records](../../formats/audio/#emi-type-8-cue-records)). To change the sound itself, replace the bank ([sound banks](#sound-banks)).

**Limits.**

- The `program` must be below the program count of the bank, and the `tone` must be a tone of that program.
- The bank selector in the load argument of the entry (0 to 6) must match the bank that the record belongs to.
- A cue table is a multiple of 4 bytes. The game copies it into a 124-byte chunk that holds 31 records, and no shipped table has more than 24 ([budgets](../../systems/audio/#data-and-limits)).
- A caller names a cue by its id, which includes the record index. Reordering the records breaks every caller.
- 1,248 records in bank 6 (the `BENEMY` banks) read their program and tone from a shifted slot. Leave `program` and `tone` as they are in those records ([program offset quirk](../../formats/audio/#program-offset-quirk)).

**Check.** Trigger the sound in the game: a menu cursor move, a spell or an enemy action.

## Music

**Where.** A music track is a SEP package (type 10) beside its bank in `BIN/BGM/BGMxxx.EMI`. The disc holds 119 packages: 81 in `BGM`, 35 in `BOSS`, 2 in `BATTLE` and 1 in `ETC`. Each holds 4 sequences.

**What to change.** A sequence is a stream of MIDI-like events, so it converts to a Standard MIDI File and back ([SEP package](../../formats/audio/#sep-package) and [conversion](../../formats/conversion/#sound-banks)). Edit the notes in a MIDI tool and convert the result back to the package.

**Limits.**

- Keep 4 sequences per package, with ids 0 to 3, and a resolution of 48 ticks per quarter note.
- A note plays through the VAB beside the package, so each program number in the sequence must exist in that bank.
- The package and its bank must fit the [RAM and SPU budget](../../systems/audio/#ram-and-spu-budget-per-layout). The SPU spans there are `[inferred]`.
- A MIDI file carries no sequence id, so a rebuilt package takes its ids from the original.
- Loop points are NRPN control changes 20 (loop start) and 30 (loop end). Their meaning beyond the observed pairs is `[unknown]`.

**Which track an area plays.** The track comes from the zone list of the area in the executable ([zone list](../../systems/areas/#zone-list)). Byte 6 of a zone rectangle holds the track selector `[inferred]`. The full area-to-track map is `[unknown]`.

**Check.** Enter the area, or start the battle, that plays the track.

## Sound banks

**Where.** Every audio-bearing archive holds a VAB as two entries: a header (VH, type 6) and a body (VB, type 7). The disc holds 1,020 pairs.

**What to change.** Replace the VH and the VB as raw bytes, together. The header has 128 program records and the tone records that follow ([bank layout](../../formats/audio/#bank-layout)). A VAB header and body pair through the load argument, so keep it on both entries. A converted bank keeps `fsize` equal to the VH size plus the VB size.

**Limits.**

- The body is SPU ADPCM in 16-byte blocks and must fit the SPU span of its bank ([budgets](../../systems/audio/#ram-and-spu-budget-per-layout)).
- The header size sets the program count `ps`, and the header window of each bank limits it.
- The tone count of a program must cover every tone that the cue table references.

**Check.** Play every cue and every sequence that uses the bank.

## Streamed voices and effects

**Where.** XA audio sits in three files: `BIN/SCE_XA/S_XA00.STR`, `BIN/SCE_XA/VOICE.STR` and `BIN/BMAG_XA/MAGIC00.STR`. They are not movies. Each is a stream of 2,336-byte sectors that interleaves several channels. `LOGO/CAPCOM30.STR` is the Capcom logo movie ([files](../../formats/str/#files)).

**What to change.** A request is a key, `(stream << 12) | cue_index`. The cue table gives the first and last sector of the cue. The table is in the executable, as `u16` values that count periods of 8 sectors (`S_XA00.STR`) or 16 sectors (the other two). To retime or reorder a cue, edit those values ([XA cue tables](../../formats/str/#xa-cue-tables)). The counts are 880 cues for `MAGIC00.STR` and 5 for `VOICE.STR`. The 11 cues of `S_XA00.STR` are `[inferred]`, because nothing bounds the end of the array.

To replace the audio of a cue, write new 4-bit ADPCM sectors at 37,800 Hz with the same channel and coding. Coding 1 is stereo and coding 0 is mono. Each sector needs its 8-byte subheader and an EDC ([sector layout](../../formats/str/#sector-layout)).

**Limits.**

- A stream file cannot grow past its last sector, so a longer clip needs a shorter one elsewhere in the file, with new audio and new cue values together.
- The file table of the executable keeps the start sector of each file ([file table](../../formats/exe/#the-disc-file-table)).
- Form 1 sectors in these files are never played, because the hardware filter drops them. Their content is `[unknown]`.

**Check.** Play the scene or cast the spell that uses the cue.

## Related

- [Audio formats](../../formats/audio/): VAB banks, cue records and SEP packages.
- [STR and XA playback](../../formats/str/): XA sectors, cue tables and the stream files.
- [Audio system](../../systems/audio/): how the game requests sounds, and the RAM and SPU budgets.
- [Converting game data](../../formats/conversion/): how banks and sequences convert.
- [Areas and the field](../../systems/areas/): the zone list that selects an area track.
- [Edit the game](../): the editing cycle and the limits that apply to every edit.
