# HTTP Evidence

> Download the PNG from the forensic portal captured in the control room. Extract the file from the PCAP and submit `WHOAMI{...}`.
>
> **Hint:** there is an HTTP transfer with `Content-Type: image/png`.

**Flag:** `WHOAMI{pcp4_c4rv3_4nd_m3rg3}`

---

## Solution

### 1. Examine the traffic

**Tool:** `tshark`. **Why:** it is Wireshark's command-line PCAP analyzer; it lists the packets in a capture.

```bash
$ tshark -r sala_control.pcap
  4  10.14.0.40 → 10.14.0.8   HTTP  GET /export/evidencia_sala.png HTTP/1.1
  5  10.14.0.8  → 10.14.0.40  HTTP  HTTP/1.1 200 OK  (PNG)
```

**What I saw:** a GET downloads a PNG over HTTP. Since the clue mentions a transfer with `Content-Type: image/png`, the decision is to extract that object from the PCAP.

### 2. Extract the object from the PCAP

**Tool:** `tshark --export-objects`. **Why:** it reassembles files transferred over a protocol (here HTTP) and saves them to disk.

**Parameters:** `--export-objects "http,export"` exports HTTP objects to the `export` folder.

```bash
$ tshark -r sala_control.pcap --export-objects "http,export"
$ file export/evidencia_sala.png
PNG image data, 48 x 48, 8-bit/color RGB, non-interlaced
```

The complete PNG was recovered.

### 3. Review the PNG metadata

**Tool:** `exiftool`. **Why:** the PNG is only 48×48 and does not appear to contain anything visible, so the flag must be in its metadata, not in the pixels.

```bash
$ exiftool -a export/evidencia_sala.png
...
Comment                         : WHOAMI{pcp4_c4rv3_4nd_m3rg3}
```

The flag is in the PNG's `Comment` field — carve the object from the PCAP and review its metadata.

## Lesson

When facing a PCAP with file transfers, use `--export-objects http` to extract the files and then read their metadata (EXIF/`Comment`): forensic challenges usually hide the flag there, not in the pixels.
