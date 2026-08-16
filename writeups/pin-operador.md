# PIN del operador

> Hash MD5 del PIN del panel local de la subestación Norte y un ZIP cifrado con esa misma clave. Recupera `WHOAMI{...}`.
>
> **Consejo:** identifica el tipo de hash (`hashid`, `john --format=`) y trabaja los tres archivos del pack.

**Flag:** `WHOAMI{md5_p1n_0p3r4d0r}`

---

## Resolución

El pack contiene un hash MD5 del PIN de un panel SCADA y un ZIP cifrado con ese mismo PIN. Si se recupera el PIN a partir del hash, se abre el ZIP y se obtiene la flag.

### 1. Descomprimir el pack y ver los archivos

```bash
$ unzip pin_operador.zip
```

Tres archivos:

- `pin_operador.hash` — el hash del PIN
- `leeme.txt` — contexto del reto
- `nota_recuperacion.zip` — el ZIP cifrado

### 2. Leer el contexto y el hash

```bash
$ cat leeme.txt
Export parcial — terminal de guardia subestación Norte.
El PIN del operador protege la nota de recuperación (ZIP).
Hash encontrado en caché del panel SCADA.

$ cat pin_operador.hash
operador.turno:14a4d10c5f5e2cc97fdaf07b06ed3771
```

El hash tiene 32 caracteres hexadecimales, longitud típica de **MD5**. El prefijo `operador.turno:` es solo el nombre del campo, no parte del valor.

### 3. Identificar el tipo de hash con `hashid`

**Herramienta:** `hashid`. **Por qué:** sirve para reconocer el algoritmo a partir del formato del hash, como aconseja el reto, antes de intentar romperlo.

```bash
$ hashid 14a4d10c5f5e2cc97fdaf07b06ed3771
Analyzing '14a4d10c5f5e2cc97fdaf07b06ed3771'
[+] MD2
[+] MD5
[+] MD4
...
```

El tamaño y el formato apuntan a **MD5** (los demás son candidatos por coincidir en longitud, no en algoritmo).

### 4. Comprobar que el ZIP está cifrado

**Herramienta:** `unzip -t` (test). **Por qué:** `-t` valida la integridad del archivo y, si está protegido, avisa que no puede leer el contenido sin contraseña.

```bash
$ unzip -t nota_recuperacion.zip
   skipping: flag.txt    unable to get password
```

Confirma que el ZIP está cifrado y que la clave es la que buscamos.

### 5. Fuerza bruta del MD5 con `john`

**Herramienta:** `john` en modo `--incremental`. **Por qué:** un PIN corto sin sal se puede romper probando combinaciones; el modo incremental prueba caracteres imprimibles de longitud creciente hasta dar con el valor.

**Parámetros:** `--format=raw-md5` fija el algoritmo a MD5 puro (evita que john adivine), y `--incremental` activa el ataque de fuerza bruta de máscaras progresivas.

```bash
$ echo "14a4d10c5f5e2cc97fdaf07b06ed3771" > pin.hash
$ john --format=raw-md5 --incremental pin.hash
sector14         (?)
```

**Lo que vi:** john recuperó el valor **`sector14`** en segundos. No era un PIN numérico, sino una palabra ligada al contexto del reto (el sector 14), por eso una fuerza bruta numérica no lo hubiera encontrado.

### 6. Verificar el hash y abrir el ZIP

**Herramienta:** `python3` con `hashlib` y `unzip -P`. **Por qué:** confirmamos que `sector14` genera exactamente el hash del pack, y luego usamos `-P` para pasar la contraseña directamente sin que unzip la pida.

```bash
$ python3 -c "import hashlib; print(hashlib.md5(b'sector14').hexdigest())"
14a4d10c5f5e2cc97fdaf07b06ed3771   # coincide

$ unzip -P sector14 nota_recuperacion.zip
extracting: flag.txt
```

### 7. Leer la flag

```bash
$ cat flag.txt
WHOAMI{md5_p1n_0p3r4d0r}
```

## Lección

Un PIN corto y predecible (como `sector14`) se recupera en segundos de su hash MD5 sin sal mediante fuerza bruta incremental, por lo que nunca debe usarse para cifrar datos sensibles.