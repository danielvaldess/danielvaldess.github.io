# Coordenadas del apagón

> Paquete incompleto del mapa de verificación (sector 14). Recompone el mapa y envía `WHOAMI{...}`.
>
> **Consejo:** tres imágenes son una sola pieza partida.

**Flag:** `WHOAMI{m4p4_bl4ck0ut_c00rd3n4d4s}`

---

## Resolución

El paquete trae tres piezas de QR (`qr_a`, `qr_b`, `qr_c`), un `comunicado.html` y `cargas.csv`. Antes de nada conviene identificar cada archivo y leer el comunicado, porque el reto ya avisa ("tres imágenes son una sola pieza partida") y el comunicado suele contener el orden de ensamblaje.

```bash
$ file qr_a.png qr_b.png qr_c.png
qr_a.png: PNG image data, 296 x 98, ...
qr_b.png: PNG image data, 296 x 98, ...
qr_c.png: PNG image data, 296 x 100, ...
```

Tres tiras horizontales del mismo ancho → son cortes verticales de un mismo QR. El comunicado confirma que se recomponen **de arriba hacia abajo** y que el código devuelve coordenadas para cruzar con la columna `sigilo` del CSV.

### 1. Reconstruir el mapa (unir los tres QR)

**Herramienta:** ImageMagick (`convert`). **Por qué:** `convert` permite combinar imágenes; aquí sirve para apilar las tres tiras y recomponer el QR completo.

**Parámetro:** `-append` apila las imágenes **verticalmente** (una debajo de otra), que es justo el orden que pide el comunicado.

```bash
$ convert qr_a.png qr_b.png qr_c.png -append qr_full.png
```

Las alturas 98+98+100 = 296 dan un QR cuadrado de 296×296, como debe ser.

### 2. Leer el código

**Herramienta:** `zbarimg`. **Por qué:** es un lector de códigos de barras/QR por línea de comandos.

**Parámetros:** `--quiet` suprime el ruido, `--raw` devuelve el contenido crudo sin etiquetas.

```bash
$ zbarimg --quiet --raw qr_full.png
REDLATAM-2026|coords=1,1;1,4;2,2;3,3;4,1;4,4|read=sigilo
```

El QR revela las coordenadas de las celdas a consultar: `(1,1)`, `(1,4)`, `(2,2)`, `(3,3)`, `(4,1)`, `(4,4)` y confirma que hay que leer la columna `sigilo`.

### 3. Cruzar con `cargas.csv`

**Herramienta:** `base32 -d`. **Por qué:** los valores de la columna `sigilo` tienen el patrón de mayúsculas y `=` típico del base32.

| Coordenada | Valor `sigilo` | Decodificado (base32) |
|---|---|---|
| 1,1 | `K5EE6QKNJF5Q====` | `WHOAMI{` |
| 1,4 | `NU2HANC7` | `m4p4_` |
| 2,2 | `MJWDIY3LGA======` | `bl4ck0` |
| 3,3 | `OV2F6YZQ` | `ut_c0` |
| 4,1 | `GBZGIM3O` | `0rd3n` |
| 4,4 | `GRSDI435` | `4d4s}` |

```bash
$ echo "K5EE6QKNJF5Q====" | base32 -d
WHOAMI{
```

### 4. Concatenar

Siguiendo el orden exacto que devuelve el QR:

```
WHOAMI{ + m4p4_ + bl4ck0 + ut_c0 + 0rd3n + 4d4s}
```

**`WHOAMI{m4p4_bl4ck0ut_c00rd3n4d4s}`**

> La flag en leetspeak dice *.

## Lección

Cuando un reto entregue varias tiras de imagen, únelas primero (`convert -append`) y decodifica con `zbarimg` antes de analizar nada más — el código puede contener el orden de lectura de los datos.