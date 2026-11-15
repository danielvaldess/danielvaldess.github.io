# Working from Home

> Mixed capture: remote access, SCADA polling and corporate browsing. Which username is tied to the SCADA server (the victim)?
> **Flag:** `HMI_OPERATOR`

---

## Solution

### 1. Map the environment

```bash
$ tshark -r Workfromhome.pcap -q -z conv,tcp
```

```text
192.168.10.10:80/445   scada-hmi.plant.local
192.168.10.20:502      Modbus
192.168.10.42          WKS-42 -> 178.77.120.101:443
192.168.10.55          -> HMI
```

### 2. Credentials in HTTP

```bash
$ tshark -r Workfromhome.pcap -Y http -T fields -e http.authorization | sort -u
```

```text
GET /api/status HTTP/1.1
Host: scada-hmi.plant.local
Authorization: Basic SE1JX1ZJRVdFUjpSMzRkMG5seSE=
```

```bash
$ echo SE1JX1ZJRVdFUjpSMzRkMG5seSE= | base64 -d
HMI_VIEWER:R34d0nly!
```

### 3. Parse the SMB session

The SMB2 payloads are synthetic text. Filter and decode them:

```bash
$ tshark -r Workfromhome.pcap -Y "tcp.port==445 && tcp.len>0" \
    -T fields -e tcp.payload | xxd -r -p | strings
```

The NTLMSSP type 3 message (frame 51) carries, using its real offsets and lengths
(domain at 28, user at 36, workstation at 44, lengths 10/24/24):

```text
domain      = PLANT
user        = HMI_OPERATOR
workstation = WIN10-OT-HMI
```

Do not trust the concatenated strings output (`PLANTHMI_OPERATORWIN10-OT-HMI`):
it makes it look like domain `PLANTHMI` and user `OPERATOR`, which is wrong.

### 4. Review the remote access session

TLS traffic to `178.77.120.101` (`api.teamviewer.com`):

```text
TeamViewer 15.51.5
TVID 1 337 420 666
DESKTOP:WKS-42
USER:DESKTOP_USR
partner_id=133742066
display_name=SVC_CLIENT_01
auth_method=password
```

### 5. Flag

The username used against the SCADA server in the NTLM authentication to
`192.168.10.10` is:

```text
HMI_OPERATOR
```

## Lesson

NTLMSSP is offset-based: parse the lengths and offsets, never the concatenated
strings. And a plant with an exposed HMI still leaks credentials through plain
HTTP alongside the "secure" remote-access session.

---

### Credits

This writeup is part of the **Dragos CTF**. Offline PCAP analysis (no live instance).
