# Substation Sign

**Flag:** `WHOAMI{3x1f_r3v34l4d_sub3st4c10n}`

> During the LATAM blackout, an operator documented the North substation. Analyze the photo and find `WHOAMI{...}`.
> **Tip:** cameras and SCADA systems usually store more data than what is visible in the image.

---

## Resolution

The hint ("they store more data than what is visible in the image") points to **EXIF metadata**: extra information stored inside the file alongside the pixels. The first step is to identify the file type and, following the challenge's hint, review its metadata — not start with visual steganography. We begin by identifying the file and reading all its metadata:

```bash
$ file subestacion.jpg
JPEG image data, JFIF standard 1.01, ... Exif Standard: [TIFF image data,
big-endian, ... description=Inspeccion post-blackout — Subestacion Norte,
software=Panel SCADA export v2.1], baseline, precision 8, 1200x675

$ exiftool -a -u -g1 subestacion.jpg
...
---- ExifIFD ----
User Comment    : WHOAMI{3x1f_r3v34l4d_sub3st4c10n}
```

The flag was directly in the `User Comment` field. The remaining fields (`Software: Panel SCADA export v2.1`, `Artist: Operador turno noche (Red LATAM)`, `Copyright: Uso interno...`) are challenge flavor text.

> **About the parameters:** `-a` shows all fields (including duplicates, which are hidden by default and sometimes contain the flag), `-u` shows raw values without transformation, and `-g1` groups the output by section for easy reading.

## Lesson

Before looking for steganography or performing heavy analysis, always check the metadata: `exiftool -a -u -g1 <file>`. Many forensics/misc challenges hide the flag in fields like `User Comment`, `Artist`, `Software`, or `Copyright`.
