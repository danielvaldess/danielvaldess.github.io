# Blackout Coordinates

> Incomplete verification map package (sector 14). Reassemble the map and submit `WHOAMI{...}`.
> **Hint:** three images are a single piece split apart.

**Flag:** `WHOAMI{m4p4_bl4ck0ut_c00rd3n4d4s}`

---

## Solution

The package contains three QR pieces (`qr_a`, `qr_b`, `qr_c`), a `comunicado.html` and `cargas.csv`. First, identify each file and read the announcement, as the challenge already warns ("three images are a single piece split apart") and the announcement usually contains the assembly order.

```bash
$ file qr_a.png qr_b.png qr_c.png
qr_a.png: PNG image data, 296 x 98, ...
qr_b.png: PNG image data, 296 x 98, ...
qr_c.png: PNG image data, 296 x 100, ...
```

Three horizontal strips of the same width → vertical cuts from a single QR. The announcement confirms they are reassembled **top to bottom** and that the code returns coordinates to cross-reference with the `sigilo` column in the CSV.

### 1. Reassemble the map (join the three QRs)

**Tool:** ImageMagick (`convert`). **Why:** `convert` combines images; here it stacks the three strips to reassemble the complete QR.

**Parameter:** `-append` stacks images **vertically** (one below another), which is exactly the order the announcement specifies.

```bash
$ convert qr_a.png qr_b.png qr_c.png -append qr_full.png
```

The heights 98+98+100 = 296 produce a square 296×296 QR, as expected.

### 2. Read the code

**Tool:** `zbarimg`. **Why:** it is a command-line barcode/QR code reader.

**Parameters:** `--quiet` suppresses noise, `--raw` returns the raw content without labels.

```bash
$ zbarimg --quiet --raw qr_full.png
REDLATAM-2026|coords=1,1;1,4;2,2;3,3;4,1;4,4|read=sigilo
```

The QR reveals the coordinates of the cells to query: `(1,1)`, `(1,4)`, `(2,2)`, `(3,3)`, `(4,1)`, `(4,4)` and confirms that the `sigilo` column must be read.

### 3. Cross-reference with `cargas.csv`

**Tool:** `base32 -d`. **Why:** the values in the `sigilo` column follow the uppercase pattern with `=` typical of base32.

| Coordinate | `sigilo` value | Decoded (base32) |
|---|---|---|
| 1,1 | `K5EE6QKNJF5Q====` | `WHOAMI{` |
| 1,4 | `NU2HANC7` | `m4p4_` |
| 2,2 | `MJWDIY3LGA======` | `bl4ck0` |
| 3,3 | `OV2F6YZQ` | `ut_c0` |
| 4,1 | `GBZGIM3O` | `0rd3n` |
| 4,4 | `GRSDI435` | `4d4s}` |

```bash
$ echo "K5EE6QKNJF5Q====" | base32 -d
WHOAMI{
```

### 4. Concatenate

Following the exact order returned by the QR:

```
WHOAMI{ + m4p4_ + bl4ck0 + ut_c0 + 0rd3n + 4d4s}
```

**`WHOAMI{m4p4_bl4ck0ut_c00rd3n4d4s}`**

> The flag in leetspeak reads *.

## Lesson

When a challenge provides multiple image strips, join them first (`convert -append`) and decode with `zbarimg` before analyzing anything else — the code may contain the reading order for the data.

---

*Part of the **Blackout LATAM** CTF by [Whoami-Labs](https://whoami-labs.com/).*
