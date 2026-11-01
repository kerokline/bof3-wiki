# Converting game data

*Read this if you convert game bytes to or from common formats.*

How stored game bytes map to interchange files and desktop derivatives, for a modder or a converter author. Convert from the archived original, never from a derivative. Keep the original bytes and hash as
the archival source, convert with the row for the stored bytes, validate the round trip, and record
provenance. A desktop derivative never replaces an EMI entry, a media sector stream
or a target binary.

## Conversion map

| Stored bytes                       | Runtime interpretation                        | Logical asset                        | Lossless interchange                                     | Desktop derivative                         | Validator                                                                         |
| ---------------------------------- | --------------------------------------------- | ------------------------------------ | -------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| EMI archive                        | sector-aligned container and TOC              | ordered entry set                    | original `.EMI` plus entry bytes and a TOC manifest      | none                                       | entry hashes; the container rebuilds byte-exactly                                 |
| type 0                             | direct RAM payload                            | code, data, palette or other bytes   | raw `.bin`                                               | domain-specific                            | entry hash and load argument; byte comparison of the code                         |
| types 1, 2                         | queued RAM transfer                           | code or data with loader bookkeeping | raw `.bin`                                               | domain-specific                            | loader state; [LZ77](lz77.md) for type 1                                          |
| type 3                             | packed VRAM upload descriptor plus raw chunks | texture-page words                   | raw `.img`/`.bin` plus descriptor                        | PNG after texture mode and CLUT are proven | `0x800` chunk geometry; [graphics](graphics.md)                                   |
| type-0 palette bytes               | PSX color words selected by draw state        | 4bpp or 8bpp CLUT row/bank           | little-endian `u16` words plus RAM destination           | PNG palette strip, RGBA JSON               | 16 colors `0x20`; 256 colors `0x200`; round-trip words                            |
| indexed texture plus TPage/CLUT    | GPU texture sampling                          | resolved image region                | texture words, palette words, TPage, CLUT, UV rectangle  | PNG                                        | reviewed metadata and raw-source hashes                                           |
| sprite draw data                   | primitive plus table-selected geometry        | resolved sprite instance or atlas    | source texture/CLUT plus table bytes and draw parameters | PNG atlas and metadata JSON                | table cross-references                                                            |
| STR/XA sectors                     | 2,336-byte inner sectors                      | MDEC video and/or XA channels        | original stream plus reversible 2,352-byte wrapper       | lossless H.264 + FLAC MKV                  | sector round-trip, codec probe, exact endpoints, [timing](str.md#capcom30-timing) |
| types 6, 7                         | VAB header/body pair                          | PsyQ sound bank                      | original `.vh` and `.vb`                                 | SoundFont or compatible player             | header/body identity, hashes, selector, pair ownership                            |
| type 10                            | sequence package                              | PsyQ SEP                             | original `.seq`                                          | compatible playback                        | payload hash, selector, parser acceptance                                         |
| header-validated PSX TIM, if found | self-describing PSX image                     | TIM image and optional CLUT          | original `.tim`                                          | PNG                                        | TIM magic, dimensions, block sizes, round-trip bytes                              |

The disc holds six header-validated TIM records and no other (`measured`): three memory-card
icons in `ETC/START.EMI` entry 9 and the same three in `ETC/SHOP.EMI` entry 8, which are one
byte-identical overlay ([save format](save.md#icons)). The scan covered every stored byte of the
880 `.EMI` files and both executables for the TIM magic, a flag word of 0-3 or 8-11, and block
lengths equal to `12 + 2 * width * height`; 38,044 magic matches gave 6 valid records. The 65
LZ77 entries were scanned only in their compressed form. No texture payload is a TIM, and the
`.tim` file made from a texture is a conversion, not stored bytes. A `.tim` extension
is not evidence. MIDI conversion is not
lossless. Type 9 has no shipped entry on this disc.

## Record layouts

One record, one layout: the layout tables own the byte offsets and field names.

| Record                                          | Layout                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| items, vital items, weapons, armor, accessories | [game records](../game/records.md#gameemi-fixed-tables)                         |
| abilities, shops, level growth                  | [game records](../game/records.md#gameemi-fixed-tables)                         |
| base stats                                      | [game records](../game/records.md#character-and-master-data)                    |
| encounters, enemies                             | [encounters and enemy records](area.md#0x800e4000-encounters-and-enemy-records) |
| scene records                                   | [scene/step table](area.md#0x800e3800-scenestep-table)                          |
| cue records                                     | [cue records](audio.md#emi-type-8-cue-records)                                  |
| VAB bank                                        | [VAB bank](audio.md#vab-bank)                                                   |
| character bank                                  | [character bank](character.md)                                                  |

The `level-growth` table's second ability byte is `extra_ability` in the layout; a converter may name it `ability candidate`. The two packed stat bytes are `power << 4 | defense` and `agility << 4 | intellect` ([data tables](assets.md#data-tables)).

## Provenance contract

Retain enough information to reconstruct and audit each conversion:

- disc/archive path, EMI slot, entry type, archive offset, payload size and hash;
- the type-dependent load argument and verified runtime load address;
- for indexed graphics: texture mode, VRAM placement/TPage, CLUT word or source RAM range, UV
  rectangle, and the table or call site that relates them;
- for STR/XA: original sector order, wrapper policy, file/channel selectors, decoder version, codec
  options, pixel format/range, timing formula, frame count, sample rate and measured packet
  endpoints;
- the converter name, version and output hash.

For a desktop mux, pad the audio by the
formula in [STR timing](str.md#capcom30-timing) and record the result as derived padding, not
missing source sectors.
