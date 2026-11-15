# What's Your Address

> Same diagram and CVE list as "Gotta Start Somewhere". With the SOC Monitor already compromised, which is the second device in the chain?
> **Flag:** `172.16.1.75`

---

## Solution

### 1. Recap the first hop

The SOC Monitor (`192.168.100.50`, `v3.0`) is compromised via **CVE-2024-78789**
(SQL injection, port 9000).

### 2. Read the firewall rule

The link from the SOC zone to the server zone allows:

```text
22, 443, 502, 5000, 8080
```

### 3. Match the next device by version

From the middle row of the diagram and the CVE list:

- Jump Server `172.16.1.100 v1.0` → CVE-2023-18239, but it requires an already
  authenticated SSH session (local privilege escalation, not a network entry).
- Historian `172.16.1.75 v2.3` → **CVE-2025-00031**: unsafe deserialization in
  industrial collection/monitoring platforms `v2-v2.5`, reachable through the file
  upload interface over HTTPS 443, which the rule allows.
- Syslog/Log Collector `172.16.90.4 v1.0` → CVE-2024-00124 affects `v0.4-v0.8`,
  so it does not apply.

### 4. Flag

The second device is the Historian:

```text
172.16.1.75
```

## Lesson

A CVE only counts as a hop if its prerequisites match the exposed port and the
device version. The Jump Server CVE is real but useless without a session.

---

### Source

Offline document analysis (no live instance).
