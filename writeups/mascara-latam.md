# Máscara LATAM

> Clave maestra del temporizador SCADA documentada solo como SHA256. La misma clave protege `boveda.zip`. Recupera `WHOAMI{...}`.
>
> **Consejo:** SHA256 sin salt → diccionario o ataque por máscara (`hashcat -m 1400`).

**Flag:** `WHOAMI{m4sk_r3gl4s_s3ct0r14}`

---

## Resolución

El paquete tiene el hash SHA256 de la clave maestra y `boveda.zip` (protegido con la misma clave). La pista del ingeniero revela el formato de la clave.

### 1. Entender el material

```bash
$ cat hash_maestra.sha256
f87aeda6548379cbef181c6090e753e0d0d0ced60b5da9bd43f34600c36913d7
```

```bash
$ cat pista_ingeniero.txt
La clave maestra sigue el prefijo corporativo LATAM + el número de sector repetido (dos veces).
Ejemplo de forma: LATAM + 14 + 14
```

**Decisión:** la pista da el formato exacto → `LATAM` + `14` + `14` = **`LATAM1414`**. Como conozco la estructura, no necesito fuerza bruta genérica: solo un ataque por máscara con esa forma.

### 2. Atacar el hash con máscara (hashcat -m 1400)

**Herramienta:** `hashcat`. **Por qué:** es el crackeador de hashes por GPU/CPU más rápido; el modo máscara prueba solo las combinaciones que coinciden con un patrón, ideal cuando se conoce la forma.

**Parámetros:**
- `-m 1400` → SHA2-256 sin salt.
- `-a 3` → ataque por máscara.
- `'LATAM?d?d?d?d'` → `LATAM` fijo seguido de 4 dígitos (`?d`), probando `LATAM0000`…`LATAM9999`.

```bash
$ echo "f87aeda6548379cbef181c6090e753e0d0d0ced60b5da9bd43f34600c36913d7" > hash.txt
$ hashcat -m 1400 -a 3 hash.txt 'LATAM?d?d?d?d' --force
Status...........: Cracked
Hash.Mode........: 1400 (SHA2-256)
Candidate.Engine.: Device Generator
Candidates.#01...: LATAM1234 -> LATAM7394
```

La clave recuperada es **`LATAM1414`**.

### 3. Desbloquear la bóveda

**Herramienta:** `unzip`. **Por qué:** abrir el zip con la contraseña recuperada.

**Parámetros:** `-o` (sobrescribir sin preguntar) y `-P LATAM1414` (proveer la contraseña).

```bash
$ unzip -o -P LATAM1414 boveda.zip
extracting: flag.txt
$ cat flag.txt
WHOAMI{m4sk_r3gl4s_s3ct0r14}
``` — el ataque por máscara según las reglas del sector 14.

## Lección

Ante un SHA256 sin salt, no hay que invertirlo matemáticamente: se adivina. Si hay una pista de formato (prefijo + dígitos), un ataque por máscara (`hashcat -m 1400 -a 3`) con la forma exacta resuelve en segundos.