# Converting game data

This page maps stored game bytes to common interchange formats, for someone who writes a converter or a mod tool. The stored bytes are the authority. A converted file is a view of them, and it must not replace an EMI entry, a media sector stream or an executable. Keep the original bytes, convert with the row that matches the stored bytes, and check the round trip. The layouts themselves are in the format pages. This page adds the mappings, the sector rules for writing a disc file back, and the sound-bank conversion.

## Conversion map

| Stored bytes                    | What the game does with it                    | Standard form                                                        | What to check                                                          |
| ------------------------------- | --------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| EMI archive                     | sector-aligned container and TOC              | the original `.EMI`, plus entry bytes and a TOC listing              | entry hashes; the container rebuilds byte for byte                     |
| type 0                          | direct RAM payload                            | raw `.bin`                                                           | entry hash and load argument                                           |
| types 1, 2                      | queued RAM transfer                           | raw `.bin`                                                           | [LZ77](lz77.md) decode for type 1                                      |
| type 3                          | packed VRAM upload descriptor plus raw chunks | raw words plus the descriptor; PNG once depth and palette are proven | `0x800` chunk geometry ([graphics](graphics.md))                       |
| type-0 palette bytes            | PSX colour words selected by draw state       | little-endian `u16` words plus the RAM destination; PNG strip        | 16 colours are `0x20` bytes, 256 colours `0x200`; the words round-trip |
| indexed texture with TPage/CLUT | GPU texture sampling                          | texture words, palette words, TPage, CLUT and UV rectangle; PNG      | the draw site that names the row                                       |
| STR and XA sectors              | 2,336-byte sectors                            | the original stream, wrapped in 2,352-byte raw sectors               | sector round trip; [timing](str.md#capcom30-timing)                    |
| types 6, 7                      | VAB header and body                           | original `.vh` and `.vb`; SoundFont for desktop players              | header and body identity, selector                                     |
| type 10                         | SEP package                                   | original `.seq`; Standard MIDI File for playback                     | package size, selector                                                 |
| PSX TIM, if one is found        | self-describing image                         | `.tim`; PNG                                                          | TIM magic, dimensions and block sizes                                  |

Converting a SEP sequence to MIDI is not lossless. Type 9 has no shipped entry on this disc.

The disc holds six TIM records and no other. Three are the memory card icons in `ETC/START.EMI` entry 9 and three the same icons in `ETC/SHOP.EMI` entry 8, which are one byte-identical overlay ([save format](save.md#icons)). The scan covered every stored byte of the 880 `.EMI` files and both executables. A record counted as TIM when it had the magic, a flag word of 0 to 3 or 8 to 11, and block lengths equal to `12 + 2 * width * height`. 38,044 magic matches gave 6 valid records. The 65 LZ77 entries were scanned only in compressed form. No texture payload is a TIM, so a `.tim` made from a texture is a conversion, not stored bytes.

## Record layouts

One record has one layout, and these pages own the byte offsets and field names.

| Record                                          | Layout                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| items, vital items, weapons, armor, accessories | [game records](../data/records.md#gameemi-fixed-tables)                         |
| abilities, shops, level growth                  | [game records](../data/records.md#gameemi-fixed-tables)                         |
| base stats                                      | [game records](../data/records.md#character-and-master-data)                    |
| encounters, enemies                             | [encounters and enemy records](area.md#0x800e4000-encounters-and-enemy-records) |
| scene records                                   | [scene/step table](area.md#0x800e3800-scenestep-table)                          |
| cue records                                     | [cue records](audio.md#emi-type-8-cue-records)                                  |
| VAB bank                                        | [VAB bank](audio.md#vab-bank)                                                   |
| character bank                                  | [character bank](character.md)                                                  |
| message banks, strings                          | [game text](../data/text.md)                                                    |

The second ability byte of a `level-growth` record is `extra_ability` in the layout. The two packed stat bytes are `power << 4 | defense` and `agility << 4 | intellect`.

## Rebuilding an EMI archive

An archive rebuilds from its entries when each entry keeps its payload, type and load argument and the archive keeps its version. The payloads are laid out again with the [padding rules](emi.md#padding). A payload that changes size moves every entry after it. All 880 archives rebuild byte for byte from their own entries, and replacing one entry changes only that entry.

## Sector sealing

A disc file is a run of CD sectors, and writing one back means writing its sectors again. The data track is Mode 2 Form 1. A 2,352-byte sector holds a 12-byte sync, a 4-byte address, an 8-byte sub-header, 2,048 user bytes, a 4-byte EDC and 276 bytes of parity.

- EDC: a CRC-32 over bytes 16 to 2071 (sub-header and user data) with the reflected polynomial `0xD8018001`. It is stored little endian at byte 2072.
- Parity: the ECMA-130 Annex B product code over bytes 12 to 2247, with the address (bytes 12 to 15) counted as zero. P is 86 columns of 24 bytes at byte 2076. Q is 52 columns of 43 bytes at byte 2248, and it covers P.
- Form 2: XA and STR sectors (sub-header submode bit `0x20`) have no parity. Copy them as stored.

On the retail disc, all 161,720 Form 1 sectors match these rules. One sector after the last file (LBA 188323) keeps stray parity bytes and does not match, so it stays as stored. Rewriting every non-XA file with its own bytes gives a byte-identical disc: 883 files and 128,479 sealed sectors.

A replacement file keeps the original sectors. It can shrink but cannot grow past its last sector, because the disc has no room to move the files after it, and the start sectors in the [file table](exe.md#the-disc-file-table) stay valid. A shrunk file has its tail sectors zeroed. The directory record that holds the size is rewritten in both byte orders and its sector is sealed again. The audio track is unchanged.

## Sound banks

A VAB bank ([layout](audio.md#vab-bank)) converts to a SoundFont 2 file with one preset for each playable program, numbered by the program, in bank 0. A MIDI file that selects program `p` on bank 0 then plays through preset `p`. A VAG at pitch `0x1000` plays at 44,100 Hz, and a decoded sample is 16-bit PCM at that rate. A SEP sequence converts to a format 0 Standard MIDI File with a tempo and a time signature at time zero and a second end-of-track. A MIDI file carries no sequence id, so a rebuilt package needs the id from the original. On the retail disc, all 476 sequences of the 119 packages read back from their MIDI, and the packages encode to their stored bytes. XA streams decode to PCM at 37,800 Hz ([STR and XA](str.md)).

| VAB field              | SoundFont field                    | Mapping                                                                                 |
| ---------------------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| program record `p`     | preset `p`, bank 0, instrument `p` | one preset and one instrument per playable program                                      |
| tone `min`, `max` note | zone key range                     | keys `min` to `max`                                                                     |
| tone `center` note     | zone root key                      | the key that plays the sample at its recorded rate                                      |
| tone `shift`           | zone coarse and fine tune          | `shift / 128` semitone, rounded to the cent                                             |
| tone `vol`             | zone initial attenuation           | `200 * log10(127 / vol)` centibels                                                      |
| tone `pan`             | zone pan                           | `(pan - 64) * 500 / 64` tenths of a percent                                             |
| tone `vag`, VAG loop   | sample and sample loop             | VAG decoded to 16-bit PCM at 44,100 Hz; the loop from its loop blocks                   |
| tone `adsr1`, `adsr2`  | volume envelope                    | attack and decay times, sustain level and release time, timed by the SPU envelope steps |

The envelope times are the ones the SPU voice plays. The envelope steps once per output sample, and the waits of each phase add up. Attack and decay are timed from full scale and from the level where decay ends. Release is timed from the level where decay ends, which is where key-off starts it. Times become timecents, `1200 log2(seconds)`, between `-12000` and `8000`. Sustain becomes centibels below full scale, `200 log10(0x8000 / level)`, with the level `(N + 1) * 0x800` from the decay register.

The conversion leaves out the reverb send, the program's own volume and pan, and any sustain change after the start (a SoundFont sustain holds its level). The PS1 exponential curves become SoundFont linear and decibel curves, so the phase times match and the curve shapes do not. Tones with `vol` 0, an empty VAG or an empty key range are dropped. Every phase of every register value moves at least one step, so the timing always ends.

On the retail disc, all 1,020 converted files parse, with every zone's sample in range and every loop inside its sample. Most of the 15,537 zones have attack and decay at the shortest time (`-12000`) and sustain at full level (`0`). The longest release is 7,885 timecents, about 95 seconds, from a slow-release register.

A tone past its program's declared tone count still plays, because the voice manager walks all 16 slots of a block ([playback](audio.md#playback)). The conversion keeps every usable slot of each block. Sixteen samples in 16 banks are used only by such tones.
