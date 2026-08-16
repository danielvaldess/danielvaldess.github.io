# Tráfico de control

> PCAP parcial del portal SCADA durante el apagón. El operador autenticó en claro; recupera `WHOAMI{...}`.
>
> **Consejo:** filtra tráfico HTTP en el puerto 80.

**Flag:** `WHOAMI{http_pl41nt3xt_4p4g0n}`

---

## Resolución

La pista apunta al tráfico HTTP en el puerto 80. El PCAP es muy corto: una conexión TCP y un único POST al portal SCADA.

### 1. Ver los paquetes

**Herramienta:** `tshark`. **Por qué:** lista los paquetes de una captura para ver de qué va el tráfico.

```bash
$ tshark -r blackout_control.pcap
    1   0.000000   10.14.0.21 → 10.14.0.5   TCP 40 44102 → 80 [SYN]
    2   0.000854   10.14.0.5 → 10.14.0.21   TCP 40 80 → 44102 [SYN, ACK]
    3   0.001432   10.14.0.21 → 10.14.0.5   TCP 40 44102 → 80 [ACK]
    4   0.002804   10.14.0.21 → 10.14.0.5   HTTP 285 POST /scada/auth HTTP/1.1
    5   0.003634   10.14.0.5 → 10.14.0.21   TCP 40 80 → 44102 [ACK]
```

**Lo que vi:** un único POST `POST /scada/auth` hacia el puerto 80 → es una autenticación; ahí debe estar el dato.

### 2. Filtrar el HTTP y extraer el cuerpo del POST

**Herramienta:** `tshark` con filtro de display y campo. **Por qué:** extraer solo el cuerpo del POST, no toda la captura.

**Parámetros:** `-Y "http"` filtra el protocolo HTTP; `-T fields -e http.file_data` extrae el cuerpo (payload) de la petición.

```bash
$ tshark -r blackout_control.pcap -Y "http" -T fields -e http.file_data
757365723d6f70657261646f722e7475726e6f26706173733d5265644c6174616d3230323621266e6f74615f...
```

El cuerpo viaja en hexadecimal (form-urlencoded). Se decodifica a texto:

**Herramienta:** `python3`. **Por qué:** `bytes.fromhex` revierte el cuerpo hex a texto plano.

```bash
$ tshark -r blackout_control.pcap -Y "http" -T fields -e http.file_data | \
    python3 -c "import sys; print(bytes.fromhex(sys.stdin.read().strip()).decode())"
user=operador.turno&pass=RedLatam2026!&nota_recuperacion=WHOAMI{http_pl41nt3xt_4p4g0n}&sector=14
```

La flag está en `nota_recuperacion`. "HTTP en claro (plaintext) = apagón", confirmando que el operador mandó credenciales sin cifrar por el puerto 80.

## Lección

En un PCAP siempre filtra por protocolo (`http`) y mira los cuerpos de los POST — la autenticación en claro deja datos sensibles (y flags) a la vista. Para decodificar form-urlencoded, extrae `http.file_data` y revierte el hexadecimal.