# Target Acquired

> HTTP brute-force against an internal Engineering Workstation. Which asset was originally compromised and led to the larger internal compromise?
> **Flag:** `EWSTX20`

---

## Solution

### 1. Inventory the capture

```bash
$ capinfos -c -a -e TryAgain-TargetAcquired.pcap
```

```text
2,005 packets
One TCP conversation: 192.0.2.100:3452 <-> 10.125.10.97:80
```

### 2. Map the HTTP requests

All traffic is HTTP to one host, so the victim is the HTTP server:

```bash
$ tshark -r TryAgain-TargetAcquired.pcap -Y "http.request" \
    -T fields -e ip.src -e ip.dst -e http.request.full_uri | sort -u
```

```text
192.0.2.100 -> 10.125.10.97  GET http://lab.example/login   (1,001 requests)
```

### 3. Find the successful authentication

One `200` among 1,000 `401` responses marks the moment of compromise:

```bash
$ tshark -r TryAgain-TargetAcquired.pcap -Y "http.response.code == 200" \
    -T fields -e frame.number -e http.file_data | xxd -r -p
```

```text
frame 2005: Hostname: EWSTX20
```

### 4. Confirm the credential

The request right before it (frame 2004) carries:

```text
Authorization: Basic b3BlcmF0b3I6b3BlcmF0b3I=
```

```bash
$ echo b3BlcmF0b3I6b3BlcmF0b3I= | base64 -d
operator:operator
```

### 5. Flag

```text
EWSTX20
```

## Lesson

Brute-force traffic is easy to spot in aggregate, but the answer usually lives at
the single successful response. Filter on `200` and read the body, then tie it
back to the request that produced it.

---

### Credits

This writeup is part of the **Dragos CTF**. Offline PCAP analysis (no live instance).
