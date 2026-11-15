# Gotta Start Somewhere

> Reconstruct the OT attack chain from a hand-drawn network diagram and a DOCX of nine candidate CVEs. Which port let the attacker compromise the first device?
> **Flag:** `9000`

---

## Solution

### 1. Read the diagram

The top-most device is the SOC Monitor at `192.168.100.50`, running `v3.0`. The
link below it allows `22,443,502,5000,8080`; the next link (servers to HMI)
allows `22,443,502,1194,3389`, and the HMI link allows `22,443,8080,9000`.

Chain order:

```text
SOC Monitor -> Jump/Historian/Syslog -> HMI (10.10.1.10, v2021.1)
            -> Site A (S7-1200 v4.2, ABB drive v2.0)
            /  Site B (FX5U v3.1, ACS880 v1.5)
```

### 2. Extract the CVE list

```bash
$ unzip NetworkDrawing_CVE_Details.docx -d cve/
$ python3 -c "import re;print(re.sub('<[^>]+>',' ',open('cve/word/document.xml').read()))"
```

Nine CVEs with product, port and prerequisites.

### 3. Match the first device

SOC Monitor `v3.0` is named exactly by **CVE-2024-78789**: SQL injection in the
authentication query, reachable on port **9000**, CVSS 9.2, network access only.
No other device matches an exact product name in the list.

### 4. Discard the decoys

- `CVE-2024-00124` (Log Collector `v0.4-v0.8`) does not apply to `v1.0`.
- `CVE-2025-00031` matches Historian `v2.3`, but it is a file-upload vector with
  no port.
- `CVE-2025-00467` (SSH 22) and `CVE-2024-34561` / `CVE-2025-56788` (Modbus 502)
  are later hops, not the entry point.

### 5. Flag

```text
9000
```

## Lesson

Attack-chain questions are decided by exact product/version matches, not by the
highest CVSS. Cross-reference the diagram, the firewall rules and the CVE
prerequisites before committing to a hop.

---

### Credits

This writeup is part of the **Dragos CTF**. Offline document analysis (no live instance).
