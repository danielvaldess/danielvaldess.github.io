# DNS Exfiltration

> Anomalous DNS queries to `exfil.blackout.redlatam`. Reconstruct the sequence and submit `WHOAMI{...}`.
> **Hint:** filter `dns.qry.name` or DNS protocol in Wireshark.

**Flag:** `WHOAMI{dns_3xf1l_bl4ck0ut}`

---

## Solution

DNS queries are the exfiltration vector: the queried name hides data in base32, numbered by fragment.

### 1. View DNS traffic

**Tool:** `tshark`. **Why:** it analyzes PCAPs from the CLI; the first step is to list the packets to see what is there.

```bash
$ tshark -r exfil_dns.pcap
  1  DNS  Standard query 0x0000 TXT 03-gn4gmmlml5rgynddnmyhk5d5.exfil.blackout.redlatam
  2  DNS  Standard query 0x0000 TXT 02-mrxhgxy.exfil.blackout.redlatam
  3  DNS  Standard query 0x0000 TXT 01-k5ee6qknjf5q.exfil.blackout.redlatam
```

Each query is `NN-<base32 payload>.exfil.blackout.redlatam`: a sequence number plus a base32 fragment. **What I saw:** the numeric prefix suggests sorting by that number.

### 2. Extract names and sort by sequence

**Tool:** `tshark` with display filters and fields. **Why:** extract only the queried names and sort them, instead of reading loose lines.

**Parameters:** `-Y "dns.qry.type == 16"` filters TXT queries (type 16, which carry data); `-T fields -e dns.qry.name` extracts only the name field; `sort` orders them.

```bash
$ tshark -r exfil_dns.pcap -Y "dns.qry.type == 16" -T fields -e dns.qry.name | sort
01-k5ee6qknjf5q.exfil.blackout.redlatam
02-mrxhgxy.exfil.blackout.redlatam
03-gn4gmmlml5rgynddnmyhk5d5.exfil.blackout.redlatam
```

### 3. Decode base32 in order

**Tool:** `base32 -d`. **Why:** the fragments are base32. Base32 uses uppercase; the domain is in lowercase, so it is normalized to uppercase before decoding:

```bash
$ echo "K5EE6QKNJF5Q" | base32 -d   # WHOAMI{
$ echo "MRXHGXY"      | base32 -d   # dns_
$ echo "GN4GMMLML5RGYNDDNMYHK5D5" | base32 -d   # 3xf1l_bl4ck0ut}
```

Concatenating `01` → `02` → `03`:

```
WHOAMI{ + dns_ + 3xf1l_bl4ck0ut}  =  WHOAMI{dns_3xf1l_bl4ck0ut}
```

## Lesson

In a PCAP with suspicious DNS, filter by `dns.qry.name`, look for odd domains with numbered prefixes, and decode each fragment: DNS exfiltration usually hides the flag in base32/base64 within the queried names.

---

### Credits

This writeup is part of the **Blackout LATAM** CTF hosted by [Whoami-Labs](https://whoami-labs.com/).
