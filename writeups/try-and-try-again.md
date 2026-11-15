# Try and Try Again

> Same capture, different question: which challenge-response mechanism is configured on the Engineering Workstation?
> **Flag:** `Basic authentication`

---

## Solution

### 1. Inventory the capture

```bash
$ capinfos -c -a -e TryAgain-TargetAcquired.pcap
```

```text
2,005 packets, one TCP conversation
192.0.2.100:3452 <-> 10.125.10.97:80
```

### 2. Read the server challenge

Every failed login returns the challenge in the `401` response:

```bash
$ tshark -r TryAgain-TargetAcquired.pcap -Y "http.response.code == 401" \
    -T fields -e http.www_authenticate | sort -u
Basic realm="Secure Area"
```

### 3. Check the client responses

```bash
$ tshark -r TryAgain-TargetAcquired.pcap -Y "http.authorization" \
    -T fields -e http.authorization | sort -u
Basic b3BlcmF0b3I6b3BlcmF0b3I=
```

All 1,001 requests are `GET http://lab.example/login` with `Authorization: Basic`
— credentials sent without TLS.

### 4. Confirm the successful login

```bash
$ tshark -r TryAgain-TargetAcquired.pcap -Y "http.response.code == 200" \
    -T fields -e http.file_data | xxd -r -p
Hostname: EWSTX20
```

The matching request (frame 2004) decodes to `operator:operator`.

### 5. Flag

```text
Basic authentication
```

The platform is case-sensitive: `Basic`, `HTTP Basic authentication` and
`Basic Auth` were rejected.

## Lesson

`WWW-Authenticate` names the scheme in plain text. When Basic authentication is
used over HTTP, every credential in the capture is already compromised.

---

### Source

Offline PCAP analysis (no live instance).
