# LATAM Mask

> SCADA timer master key documented only as SHA256. The same key protects `boveda.zip`. Recover `WHOAMI{...}`.
> **Tip:** SHA256 without salt → dictionary or mask attack (`hashcat -m 1400`).

**Flag:** `WHOAMI{m4sk_r3gl4s_s3ct0r14}`

---

## Solution

The package contains the SHA256 hash of the master key and `boveda.zip` (protected with the same key). The engineer hint reveals the key format.

### 1. Understand the material

```bash
$ cat hash_maestra.sha256
f87aeda6548379cbef181c6090e753e0d0d0ced60b5da9bd43f34600c36913d7
```

```bash
$ cat pista_ingeniero.txt
La clave maestra sigue el prefijo corporativo LATAM + el número de sector repetido (dos veces).
Ejemplo de forma: LATAM + 14 + 14
```

**Decision:** the hint provides the exact format → `LATAM` + `14` + `14` = **`LATAM1414`**. Since the structure is known, no generic brute force is needed: only a mask attack with that shape.

### 2. Attack the hash with a mask (hashcat -m 1400)

**Tool:** `hashcat`. **Why:** it is the fastest GPU/CPU hash cracker; mask mode tests only combinations matching a pattern, ideal when the format is known.

**Parameters:**
- `-m 1400` → SHA2-256 without salt.
- `-a 3` → mask attack.
- `'LATAM?d?d?d?d'` → fixed `LATAM` followed by 4 digits (`?d`), testing `LATAM0000`…`LATAM9999`.

```bash
$ echo "f87aeda6548379cbef181c6090e753e0d0d0ced60b5da9bd43f34600c36913d7" > hash.txt
$ hashcat -m 1400 -a 3 hash.txt 'LATAM?d?d?d?d' --force
Status...........: Cracked
Hash.Mode........: 1400 (SHA2-256)
Candidate.Engine.: Device Generator
Candidates.#01...: LATAM1234 -> LATAM7394
```

The recovered key is **`LATAM1414`**.

### 3. Unlock the vault

**Tool:** `unzip`. **Why:** open the zip with the recovered password.

**Parameters:** `-o` (overwrite without prompting) and `-P LATAM1414` (provide the password).

```bash
$ unzip -o -P LATAM1414 boveda.zip
extracting: flag.txt
$ cat flag.txt
WHOAMI{m4sk_r3gl4s_s3ct0r14}
``` — the mask attack following sector 14 rules.

## Lesson

When faced with a SHA256 without salt, do not try to reverse it mathematically: guess it. If there is a format hint (prefix + digits), a mask attack (`hashcat -m 1400 -a 3`) with the exact shape resolves it in seconds.
