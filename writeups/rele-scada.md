# Relé SCADA

> Firmware del relé SCADA SN-441 (ELF Linux x64). Recupera el token `WHOAMI{...}`.
>
> **Consejo:** `strings`, `file` y `chmod +x`. Ejecutar en Kali/WSL/VM Linux.

**Flag:** `WHOAMI{str1ngs_4nd_b64}`

---

## Resolución

### 1. Reconocimiento del binario

**Herramienta:** `file`. **Por qué:** identifica el tipo de archivo antes de tocarlo.

```bash
$ file scada_relay
ELF 64-bit LSB executable, x86-64, statically linked, ... not stripped
$ chmod +x scada_relay
```

El consejo del reto (strings, file, chmod +x) delata que la flag se consigue sin llegar a decompilar nada: solo mirando las cadenas del binario.

### 2. Ejecutar y ver el comportamiento

**Herramienta:** ejecutar el binario. **Por qué:** ver qué espera de entrada ayuda a entender la lógica.

```bash
$ ./scada_relay
=== Red LATAM | Relé SCADA SN-441 ===
Modo: restablecimiento post-blackout
Codigo de autorizacion: █
```

Pide un código de autorización: es un *flag checker* (compara tu entrada contra un valor esperado).

### 3. Buscar pistas en las cadenas

**Herramienta:** `strings`. **Por qué:** extrae las cadenas de texto legibles de un binario; es el primer paso para no desensamblar a ciegas.

**Parámetros:** `-n 6` (solo cadenas de 6+ caracteres, para filtrar ruido), `grep -iE "autoriz|codigo"` (buscar términos del código).

```bash
$ strings -n 6 scada_relay | grep -iE "autoriz|codigo"
Codigo de autorizacion:
[DENEGADO] Codigo invalido.
```

La clave está en un símbolo elocuente: `TOKEN_B64`. **Lo que vi:** el nombre del símbolo dice que el token esperado está guardado en **base64** dentro de la sección `.rodata`.

**Herramienta:** `rabin2`. **Por qué:** muestra los símbolos y constantes de un binario; `-z` lista las cadenas de las secciones de datos.

```bash
$ rabin2 -z scada_relay | grep TOKEN_B64
0x0047eb80  .rodata   ascii   V0hPQU1Je3N0cjFuZ3NfNG5kX2I2NH0=
```

### 4. Decodificar el base64

```bash
$ echo "V0hPQU1Je3N0cjFuZ3NfNG5kX2I2NH0=" | base64 -d
WHOAMI{str1ngs_4nd_b64}
```

El token en leetspeak dice — justo la técnica usada.

### 5. Confirmar

```bash
$ echo "WHOAMI{str1ngs_4nd_b64}" | ./scada_relay
[OK] Relé autorizado. Enviar token al arena CTF.
```

## Lección

Antes de abrir un decompilador, pasa siempre `strings` por el binario y busca nombres de variables/constantes reveladores (como `TOKEN_B64`): muchos retos de categoría "binarios" son solo un texto en base64/hex escondido en `.rodata`.