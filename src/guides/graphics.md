# Editing graphics and textures

The game keeps pictures in three forms: textures that the loader uploads to VRAM, palettes that sit in a
palette arena, and character banks that hold sprites with their own palettes. This guide shows how to change
each one. The formats are in [graphics](../formats/graphics.md) and [character bank](../formats/character.md).

## Textures

**Where.** The disc holds 593 type-3 entries, 112,312,320 bytes in all. A type-3 payload is a run of
`0x800`-byte chunks, and each chunk is a 32 by 32 rectangle of 16-bit VRAM words. The load argument gives
the first VRAM column, the first VRAM row and the number of rectangles per row
([type-3 load argument](../formats/graphics.md#type-3-load-argument)).

**What to change.** Edit the words of a chunk. Read the payload as 16-bit words if the depth is unknown. For
a texture whose depth and palette are known, edit it as indexed pixels, and for a direct-colour texture edit
the colour words.

**Limits.**

- The payload size must stay a multiple of `0x800` and match the rectangle count in the load argument. A
  rectangle uploads only if its whole extent lies inside the 1,024 by 512 word VRAM.
- Several sheets can cover the same VRAM words, for example slots 5 and 7 of `AREA024`. Which one is
  resident depends on the stream order.
- Depth and palette are proven for 212 of the 593 textures ([coverage](../appendix/coverage.md)). The other
  381 are `[unknown]`: a draw rule that names the texture's page and palette is the only evidence, and the
  rule is missing. Edit those as raw 16-bit words only.
- An indexed edit must keep the palette row that the texture joins to
  ([join](../formats/graphics.md#texture-to-palette-join)).

## Palettes

**Where.** The disc holds 620 palette entries (type 0), from 32 to 6,144 bytes each. They load into the
palette arena at `0x80033800` and reach VRAM rows 480 to 511 ([palette arena](../formats/area.md#palette-arena)).

**What to change.** A palette is a run of 16-bit colour words, `STP | blue | green | red` with 5 bits per
channel ([palettes](../formats/graphics.md#palettes)). Edit a word to change a colour. A word of `0x0000` is
never drawn, so keep it for transparent texels.

**Limits.** A bank is a multiple of 32 bytes (one 16-colour row), and a 256-colour row is 512 bytes. Each
bank has a fixed slot in the arena, so keep its size and its position.

## The font sheet

**Where.** `ETC/FIRST.EMI#3` and `ETC/ENDKANJI.EMI#0` are two identical type-3 entries of 32,768 bytes with the
load argument `0x1E000200`: VRAM column 30 (x = 960), row 0, 2 rectangles per row. The text drawer selects
the texture page at column 15 of 64-word pages, which is the same x = 960, in 4-bit mode. That these entries
are the font sheet is `[inferred]` from the shared target. The text colours are 16 palette rows at
`(16 * n, 480)`.

**What to change.** Edit the sheet as 4-bit pixels. A byte of text selects one 8 by 12 pixel cell of a
31-column atlas ([glyph atlas](../data/text.md#glyph-atlas)).

**Limits.** The byte-to-cell formula is code in the executable. A new glyph needs a free cell in the grid,
and a change to the grid needs a code change that keeps `SLUS_004.22` within its size. Change both entries
together. Which entry the game uses on screen is `[unknown]`.

## Character sprites

**Where.** Character banks sit in `PLCHAR` (19 LZ77 containers), `BPLCHAR` (45 LZ77 containers, 1 raw
container and 75 standalone sections) and `BMAGIC` (3 blocks), 144 blobs in all. Each bank loads at
`0x8003B800` ([load arguments](../formats/character.md#load-arguments)).

**What to change.** Edit the palette tables only. A bank has one palette layer per section, and each palette
is 32 colour words ([palette layer](../formats/character.md#palette-layer)). Decode the bank, change the
palette, and write the table back over the decoded bank. Every other byte stays the same.

**Limits.**

- The 3 `BMAGIC` blocks have no palette layer, so 141 of the 144 blobs have palettes.
- The pixel format and the animation script inside a node are not decoded (`[unknown]`). Treat them as
  read-only.
- A changed bank must compress again to fit its window and its archive's sectors.
- Monster sprites are not located: the `BENEMY` archives hold audio only, so an enemy keeps its look.

## Check in the game

Go to the screen or area that draws the picture: the field for a character palette, a battle for a battle
sprite, a text box for the font. A texture that you cannot place has no known screen, so check it by
changing a distinctive area of the picture and looking for it.
