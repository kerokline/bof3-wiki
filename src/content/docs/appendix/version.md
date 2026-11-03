---
title: "Game version"
description: "Every page describes one release: Breath of Fire III (USA) for the PlayStation, serial SLUS-00422, as the Redump image with the checksums listed here."
---

Every page describes one release: *Breath of Fire III* (USA) for the PlayStation, serial `SLUS-00422`, in the Redump image whose files and checksums this page lists. Another region or revision can differ in addresses, sizes and contents, so check the image before you apply a page to it.

## Release

| Item         | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| Title        | Breath of Fire III                                             |
| Platform     | Sony PlayStation                                               |
| Region       | USA (NTSC-U)                                                   |
| Serial       | `SLUS-00422`                                                   |
| Main program | `SLUS_004.22` ([executables](../../formats/exe/))              |
| Redump name  | Breath of Fire III (USA)                                       |
| Image files  | one CUE sheet and two track files                              |
| Data track   | track 1: the ISO9660 volume with 887 files and 188,324 sectors |

## Redump image files

Each size is in bytes and each digest is lower-case hexadecimal, as Redump publishes it. A dump matches this wiki when all three track and sheet digests match.

| File                                   |        Size | CRC32      | MD5                                | SHA-1                                      |
| -------------------------------------- | ----------: | ---------- | ---------------------------------- | ------------------------------------------ |
| Breath of Fire III (USA).cue           |         218 | `ad7dc790` | `7d9dfbb032076bc86fc82af05dd4bb9f` | `046ea122a7720d758492ddc2545eb9e78d788461` |
| Breath of Fire III (USA) (Track 1).bin | 442,938,048 | `4d5b0d4b` | `9dd9a7c934b8b59d0ce76b0f25d18176` | `5745d9dde965ed0ec673ba071deb762355fa3e1a` |
| Breath of Fire III (USA) (Track 2).bin |  37,396,800 | `7976083e` | `2d7b5e8e94a91bf5423b2356f6a34863` | `d9f92af296360772e62caa4cb276de3fa74f5538` |

A raw sector is 2,352 bytes. Track 1 holds 188,324 sectors and track 2 holds 15,900. The files inside track 1 are listed on [disc and files](../../formats/disc/#directories).

## Sources and confidence

- **Confidence:** high. The names, sizes and digests are published values; the sector counts follow from the sizes.
- **Evidence:** the Redump database entry for Breath of Fire III (USA) at redump.org, which a public mirror of the Redump data at data.spludlow.co.uk reproduces. The sheet and both tracks match on size, CRC32, MD5 and SHA-1. The wiki holds no image and no retail bytes.

## Related

- [Disc and files](../../formats/disc/): the directories and file kinds inside track 1.
- [Executables and boot files](../../formats/exe/): the serial and the boot configuration.
- [Sources](../sources/): where the other claims come from.
