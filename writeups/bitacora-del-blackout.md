# Bitácora del blackout

> Export parcial del turno SCADA + alarma de audio. Reconstruye la secuencia y envía `WHOAMI{...}`.
>
> **Consejo:** no todas las líneas `[SYNC-FRAG]` son útiles.

**Flag:** `WHOAMI{b17ac0r4_4ud10_m0r53}`

---

## Resolución

El paquete trae dos archivos: un log (`turno.log`) y una alarma de audio (`alerta.wav`). Lo primero es ver qué son antes de tocar nada:

```bash
$ file turno.log alerta.wav
turno.log: ASCII text
alerta.wav: RIFF (little-endian) data, WAVE audio, Mono 8000 Hz
```

Un log de texto y un WAV mono de 8 kHz. La decisión: como hay un audio de corta duración, casi siempre conviene mirar su espectrograma — ahí suelen esconderse mensajes que no se oyen a simple vista.

### 1. Decodificar los fragmentos base32

**Herramienta:** `base32 -d`. **Por qué:** al leer el log, las líneas `[SYNC-FRAG]` tienen un `payload=` con un patrón de letras mayúsculas y `=`, que es la firma del **base32** (codificación en base 32 con relleno `=`).

```bash
$ echo "K5EE6QKNJF5Q====" | base32 -d   # WHOAMI{
$ echo "MIYTOYLDGBZDIXY=" | base32 -d   # b17ac0r4_
$ echo "GR2WIMJQL4======" | base32 -d   # 4ud10_
$ echo "NUYHENJTPU======" | base32 -d   # m0r53}
```

| Línea | Hora | payload (base32) | Decodificado |
|---|---|---|---|
| SYNC-FRAG-04 | 03:14:01 | `K5EE6QKNJF5Q====` | `WHOAMI{` |
| SYNC-FRAG-02 | 03:14:08 | `MIYTOYLDGBZDIXY=` | `b17ac0r4_` |
| SYNC-FRAG-03 | 03:14:15 | `GR2WIMJQL4======` | `4ud10_` |
| SYNC-FRAG-01 | 03:14:22 | `NUYHENJTPU======` | `m0r53}` |

> Ojo: la línea `[ERROR] FRAG falso positivo payload=JBSWY3DPEEQ====` decodifica a `Hello` — un señuelo. La pista del reto ("no todas las líneas SYNC-FRAG son útiles") avisa que hay fragmentos falsos. Por eso **no** me fié del número de fragmento.

### 2. Descifrar el orden: el audio es Morse

**Herramienta:** `sox` / espectrograma + lectura de intervalos. **Por qué:** como los fragmentos decodifican bien pero hay un orden correcto, el audio debe dar la instrucción de cómo ordenarlos.

`alerta.wav` es un tono de 879 Hz con ráfagas on/off. Al medir los intervalos de tono y silencio se ve el patrón:

- Tono corto (~3.4 s) = **punto**
- Tono largo (~10 s) = **raya**
- Silencio corto = separador entre símbolos
- Silencio largo (~13 s) = separador entre letras

```
—  ..  ——  .        →  T  I  M  E
```

El Morse dice **TIME**: la clave es el **orden temporal** (los timestamps), no el número de fragmento.

### 3. Reconstruir la flag

Ordenando por hora: `WHOAMI{` + `b17ac0r4_` + `4ud10_` + `m0r53}`

```
WHOAMI{b17ac0r4_4ud10_m0r53}
```

## Lección

Cuando un reto mezcle log + audio, mira qué hay *dentro* del audio (espectrograma/Morse) antes de adivinar el orden: suele contener la instrucción de cómo combinar los fragmentos del log.