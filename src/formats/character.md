# Character bank

*Read this if you work on character and battle sprite banks.*

The character sprite bank: container, sections, nodes, palettes and load addresses. `BPLCHAR`
(battle) and `PLCHAR` (field) archives carry one character's sprite bank: a container of
three sections, each a table of nodes. `ETC/START.EMI` carries one more bank at the same address and
three `BMAGIC` entries carry a single block of the same address family. A bank ships raw (entry
type 0) or LZ77-packed (type 1); both forms land on the load arguments below. The loader path is
proven; no shipped code addresses the bank, so field semantics stop where the bytes and the loader
prove them.

144 entries are character blobs: the 66 whole containers (45 + 1 + 19 + 1), 75 standalone section
entries and 3 `BMAGIC` blocks. The 44 further `BPLCHAR` type-0 entries at `0x8003B800` are
all-zero 16,384-byte fillers and classify as `reserve`, not as banks.

## Load arguments

| Family          | Type | Load argument | Entries | Payload                                                                |
| --------------- | ---: | ------------- | ------: | ---------------------------------------------------------------------- |
| `BPLCHAR`       |    1 | `0x8003B800`  |      45 | whole container, LZ77                                                  |
| `BPLCHAR`       |    0 | `0x8003B800`  |       1 | whole container (raw)                                                  |
| `BPLCHAR`       |    0 | `0x8003B80C`  |      19 | section 0                                                              |
| `BPLCHAR`       |    0 | `0x8005680C`  |      13 | section 1 (section 0 is `0x1B000`)                                     |
| `BPLCHAR`       |    0 | `0x8005F80C`  |      17 | section 1 (section 0 is `0x24000`)                                     |
| `BPLCHAR`       |    0 | `0x8007180C`  |      13 | section 2 (sections 0+1 are `0x1B000` each)                            |
| `BPLCHAR`       |    0 | `0x8007A80C`  |      13 | section 2 (section 1 is `0x24000`)                                     |
| `BPLCHAR`       |    0 | `0x8003B800`  |      44 | all-zero 16,384-byte filler (reserve)                                  |
| `PLCHAR`        |    1 | `0x8003B800`  |      19 | whole container, LZ77, per-character sizes                             |
| `ETC` (`START`) |    1 | `0x8003B800`  |       1 | whole container, LZ77, per-character sizes                             |
| `BMAGIC`        |    0 | `0x8003B800`  |       3 | one 34,924-byte block, head `u32 4`; identical in `KAIZAR_D`/`_F`/`_N` |
| `PLCHAR`        |    0 | `0x801CE400`  |      19 | not bank data: 4.6-9.9 KB of MIPS code                                 |

The five `BPLCHAR` section addresses are `0x8003B800` plus the container offsets `0x0C`, `0x1B00C`,
`0x2400C`, `0x3600C` and `0x3F00C`. A `BPLCHAR` archive ships either the whole container at
`0x8003B800` or one section at its section position. `PLCHAR` splits the bank from its code:
`PLxxxx.EMI` holds the audio entries and the packed container, and `PLPxxx.EMI` holds a
per-character code overlay at `0x801CE400` (6,616 bytes, 27 functions for `PLP012`). The overlay's
entry point is a dispatcher through its own tail table (`0x801CE404`, `0x801CFD80`); no `PLP`
payload reads the bank.

## Container

```text
0x00 u32 section offset 0   /* always 0x0C */
0x04 u32 section offset 1
0x08 u32 section offset 2
0x0C section 0
     section 1
     section 2
```

Measured over the 65 type-1 payloads decoded with the in-game decoder plus
`BIN/BPLCHAR/BPLU349/0.bin` (entry 0 of `BIN/BPLCHAR/BPLU349.EMI`), a raw container shipped as
type 0: `header[0] == 0x0C` in 66/66,
and the three offsets tile the body exactly; section *n* runs to offset *n+1*, section 2 to the
body end. `BPLU349` proves the header without the decoder: its 331,788-byte payload is `0x0C`,
`0x1B00C`, `0x3600C` followed by 3 × 110,592 bytes.

Section sizes differ per family. Packed-only banks (`PLCHAR` 19, `ETC/START` 1) use per-character
sizes (75,724 / 73,708 / 120,724 / 59,252 / 82,728 …). `BPLCHAR` banks use slot sizes 110,592
(`0x1B000`) or 147,456 (`0x24000`) in 136 of their 138 sections, with two smaller `DRG*` sections
(11,796, 17,400); that is what lets a `BPLCHAR` archive ship one section at a fixed address.

## Section

```text
0x00 u32 node count          /* 16 in 198/198 sections */
0x04 u32 node offset[16]     /* in-section byte offsets, not sorted */
```

The offsets appear in the exporter's order, not ascending: `BPLD012` section 0 stores
`0x976C 0x97B0 0xACD8 0x3C 0x378 … 0x7B28`, the sorted order rotated by 13. Over the extracted
data 3,070/3,168 table values fall inside their section (≥ `0x30`, below the section size), and
187/198 sections hold 16 distinct values. The 98 outlying values are small numbers or values with a
high 16-bit field (`0x100080`, `0x200080`, `0x500080`, `0x28000000`), so a table entry is
occasionally a `flags | offset` pair; the flag bits are not decoded.

## Node

```text
node +0x00  16 bytes, layout unverified
node +0x10  u16 0x0080   record tag, present in 2,476/3,070 nodes
node +0x12  u16 width    multiple of 8 in 2,476/2,476 tagged records (8..80)
node +0x14  u32 count    1 or 2 in 2,476/2,476
node +0x18  u32 size     == width * 0x100 in 1,507/1,718 records with a nonzero size
node +0x1C  record body
```

The 16 bytes before the tag have no verified layout: some nodes hold four further in-section
offsets, others packed bytes or zeros. Whether they are a child list, a per-node header or the tail
of the preceding record is unresolved; 594 of the table values show no `0x0080` halfword in the
following 64 bytes at all.

One node is not image-shaped. `BPLD012` section 0's node at `0x976C` is 68 bytes, `u32 4` followed
by 64 bytes with no tag; it reads like a palette or parameter block (`0x7FFF` at `+0x1A`, halfwords
`0x6583 0x5104 0x28A5 0x6B94 …`, small values `0x0190`, `0x0234`, `0x02DB` near its end). The three
`BMAGIC` blocks open with the same `u32 4` head; whether they are banks without a container header
or single nodes is unverified.

Byte-level pixel or script formats inside a node are not decoded.

## Palette layer

A section's word at `+4` is the offset of its palette table, relative to the section. The table
starts with the word `4n` for `n` palettes, then the palette offsets `4n + 0x40k`. Each palette is 32
16-bit colors.

`func_80166C48` copies palette `mode` into the palette RAM of a work slot (`0x80035600 + slot *
0x40`). It reads the section from work `+0x4C`, which `func_801C1254` stages. The callers seen pass
`mode` 0 except `func_8019C664`, which passes 1.

The layout holds for all 141 bank entries on the disc: 66 containers (three tables each) and 75
section entries, with `n` of 1, 2 or 8. The three `BMAGIC` blocks do not have it and stay raw.

## Loader path

`EMI_OnCdReady` dispatches by entry type through `g_EmiEntryHandlers`: type 0 runs
`EMI_LoaderCopyPayload`, types 1 and 2 run `EMI_LoaderQueuePayload` ([loader chain](emi.md#loader-chain)).
The destination is the TOC load argument. A type-1 entry streams to the load argument and decodes in
place, so the container's sections arrive at their final RAM addresses in one step. A type-0 entry
is a plain copy: whole container, one section, or the 16,384-byte filler.

## Reader and open questions

A field-side reader exists. `func_801C1254 (emi/etc/game/00@0x801C1254)` reads the container's section offsets
(`MEM(s32, 0x8003B800 + idx*4) + 0x8003B800`) and stores the section in work `+0x4C`;
`func_80166C48 (exe/slus_004_22@0x80166C48)` reads `section+4` (the palette table), then `table[field]`, and copies
32 colors. The `BPLCHAR` section readers for `0x8005680C`, `0x8007180C` and `0x8007A80C` are not
found (no game function read names those addresses). The field reader forms its base with `lui`/`ori`
(`0x801C12D0`), so a search for these addresses has to fold `ori` pairs as well as `addiu`. No
payload or executable contains the little-endian word of any load argument. `LoadImage` has 8 direct `jal` sites, all in
`exe/slus_004_22`; no overlay uploads an image. The loader publishes the destinations in `D_80146844`,
`D_8014677C` and `0x801464B8`, and no overlay reads them.

Open: the node's 16-byte prefix; the tag `0x0080` semantics (`width`, `count`, `size =
width*0x100`); `flags | offset` table entries; the pixel or script format inside a node; whether the
five addresses are section positions or party-slot buffers.
