# Evidencia en HTTP

> Descarga PNG desde el portal forense capturada en sala de control. Extrae el archivo del PCAP y envía `WHOAMI{...}`.
>
> **Consejo:** hay una transferencia HTTP con `Content-Type: image/png`.

**Flag:** `WHOAMI{pcp4_c4rv3_4nd_m3rg3}`

---

## Resolución

### 1. Ver el tráfico

**Herramienta:** `tshark`. **Por qué:** es el analizador de PCAP por línea de comandos de Wireshark; sirve para listar los paquetes de una captura.

```bash
$ tshark -r sala_control.pcap
  4  10.14.0.40 → 10.14.0.8   HTTP  GET /export/evidencia_sala.png HTTP/1.1
  5  10.14.0.8  → 10.14.0.40  HTTP  HTTP/1.1 200 OK  (PNG)
```

**Lo que vi:** un GET descarga un PNG por HTTP. Como la pista habla de una transferencia con `Content-Type: image/png`, la decisión es extraer ese objeto del PCAP.

### 2. Extraer el objeto del PCAP

**Herramienta:** `tshark --export-objects`. **Por qué:** reensambla los archivos transferidos por un protocolo (aquí HTTP) y los guarda a disco.

**Parámetros:** `--export-objects "http,export"` exporta los objetos HTTP a la carpeta `export`.

```bash
$ tshark -r sala_control.pcap --export-objects "http,export"
$ file export/evidencia_sala.png
PNG image data, 48 x 48, 8-bit/color RGB, non-interlaced
```

Se recuperó el PNG completo.

### 3. Revisar los metadatos del PNG

**Herramienta:** `exiftool`. **Por qué:** el PNG mide solo 48×48 y no parece contener nada visible, así que la flag debe estar en sus metadatos, no en los píxeles.

```bash
$ exiftool -a export/evidencia_sala.png
...
Comment                         : WHOAMI{pcp4_c4rv3_4nd_m3rg3}
```

La flag está en el campo `Comment` del PNG. — extraer (carve) el objeto del PCAP y revisar sus metadatos.

## Lección

Ante un PCAP con transferencia de archivos, usa `--export-objects http` para extraer los archivos y luego lee sus metadatos (EXIF/`Comment`): los retos forenses suelen esconder la flag ahí y no en los píxeles.