# Cartel en la subestación

> Durante el apagón LATAM, un operador documentó la subestación Norte. Analiza la foto y encuentra `WHOAMI{...}`.
>
> **Consejo:** las cámaras y los SCADA suelen guardar más datos de los que se ven en la imagen.

**Flag:** `WHOAMI{3x1f_r3v34l4d_sub3st4c10n}`

---

## Resolución

La pista ("guardan más datos de los que se ven en la imagen") apunta a los **metadatos EXIF**: información extra que se guarda dentro del archivo, junto a los píxeles. Lo primero es identificar el tipo de archivo y, según el consejo del reto, revisar sus metadatos — no empezar por estego visual. Empezamos identificando el archivo y leyendo todos sus metadatos:

```bash
$ file subestacion.jpg
JPEG image data, JFIF standard 1.01, ... Exif Standard: [TIFF image data,
big-endian, ... description=Inspeccion post-blackout — Subestacion Norte,
software=Panel SCADA export v2.1], baseline, precision 8, 1200x675

$ exiftool -a -u -g1 subestacion.jpg
...
---- ExifIFD ----
User Comment    : WHOAMI{3x1f_r3v34l4d_sub3st4c10n}
```

La flag estaba directamente en el campo `User Comment`. Los demás campos (`Software: Panel SCADA export v2.1`, `Artist: Operador turno noche (Red LATAM)`, `Copyright: Uso interno...`) son ambientación del reto.

> **Sobre los parámetros:** `-a` muestra todos los campos (incluso duplicados, que por defecto se ocultan y a veces esconden la flag), `-u` muestra valores en bruto sin transformar, y `-g1` agrupa la salida por sección para leerla ordenada.

## Lección

Antes de buscar estego o hacer análisis pesado, revisa siempre los metadatos: `exiftool -a -u -g1 archivo`. Muchos retos de forensics/misc esconden la flag en campos como `User Comment`, `Artist`, `Software` o `Copyright`.