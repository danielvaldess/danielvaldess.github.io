# Control Traffic

> Partial PCAP from the SCADA portal during the blackout. The operator authenticated in plaintext; retrieve `WHOAMI{...}`.
> **Hint:** filter HTTP traffic on port 80.

**Flag:** `WHOAMI{http_pl41nt3xt_4p4g0n}`

---

## Solution

The PCAP captures a single HTTP POST request to the SCADA authentication endpoint in plaintext. By filtering for HTTP traffic and extracting the POST body, the operator's credentials and the flag can be recovered directly.

### 1. View the Packets

**Tool:** `tshark`. **Why:** lists packets in a capture to see what the traffic is about.

```bash
$ tshark -r blackout_control.pcap
    1   0.000000   10.14.0.21 → 10.14.0.5   TCP 40 44102 → 80 [SYN]
    2   0.000854   10.14.0.5 → 10.14.0.21   TCP 40 80 → 44102 [SYN, ACK]
    3   0.001432   10.14.0.21 → 10.14.0.5   TCP 40 44102 → 80 [ACK]
    4   0.002804   10.14.0.21 → 10.14.0.5   HTTP 285 POST /scada/auth HTTP/1.1
    5   0.003634   10.14.0.5 → 10.14.0.21   TCP 40 80 → 44102 [ACK]
```

**What I saw:** a single `POST /scada/auth` to port 80 → it's an authentication; the data must be there.

### 2. Filter HTTP and Extract the POST Body

**Tool:** `tshark` with display filter and field. **Why:** extract only the POST body, not the entire capture.

**Parameters:** `-Y "http"` filters HTTP protocol; `-T fields -e http.file_data` extracts the request body (payload).

```bash
$ tshark -r blackout_control.pcap -Y "http" -T fields -e http.file_data
757365723d6f70657261646f722e7475726e6f26706173733d5265644c6174616d3230323621266e6f74615f...
```

The body travels in hexadecimal (form-urlencoded). Decode it to text:

**Tool:** `python3`. **Why:** `bytes.fromhex` reverts the hex body to plain text.

```bash
$ tshark -r blackout_control.pcap -Y "http" -T fields -e http.file_data | \
    python3 -c "import sys; print(bytes.fromhex(sys.stdin.read().strip()).decode())"
user=operador.turno&pass=RedLatam2026!&nota_recuperacion=WHOAMI{http_pl41nt3xt_4p4g0n}&sector=14
```

The flag is in `nota_recuperacion`. "HTTP in plaintext = blackout", confirming the operator sent unencrypted credentials over port 80.

## Lesson

In a PCAP, always filter by protocol (`http`) and inspect POST bodies — plaintext authentication exposes sensitive data (and flags). To decode form-urlencoded, extract `http.file_data` and revert the hex.

---

*Part of the **Blackout LATAM** CTF by [Whoami-Labs](https://whoami-labs.com/).*
