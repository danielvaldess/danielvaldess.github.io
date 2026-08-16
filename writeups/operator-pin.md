# Operator PIN

> MD5 hash of the PIN from the North substation local panel and a ZIP encrypted with the same key. Recover `WHOAMI{...}`.
> **Tip:** identify the hash type (`hashid`, `john --format=`) and work with the three files in the pack.

**Flag:** `WHOAMI{md5_p1n_0p3r4d0r}`

---

## Solution

The pack contains an MD5 hash of a SCADA panel PIN and a ZIP encrypted with the same PIN. If the PIN is recovered from the hash, the ZIP can be opened to get the flag.

### 1. Unzip the pack and view the files

```bash
$ unzip pin_operador.zip
```

Three files:

- `pin_operador.hash` — the PIN hash
- `leeme.txt` — challenge context
- `nota_recuperacion.zip` — the encrypted ZIP

### 2. Read the context and the hash

```bash
$ cat leeme.txt
Export parcial — terminal de guardia subestación Norte.
El PIN del operador protege la nota de recuperación (ZIP).
Hash encontrado en caché del panel SCADA.

$ cat pin_operador.hash
operador.turno:14a4d10c5f5e2cc97fdaf07b06ed3771
```

The hash has 32 hexadecimal characters, the typical length of **MD5**. The prefix `operador.turno:` is just the field name, not part of the value.

### 3. Identify the hash type with `hashid`

**Tool:** `hashid`. **Why:** it identifies the algorithm based on the hash format, as the challenge suggests, before attempting to crack it.

```bash
$ hashid 14a4d10c5f5e2cc97fdaf07b06ed3771
Analyzing '14a4d10c5f5e2cc97fdaf07b06ed3771'
[+] MD2
[+] MD5
[+] MD4
...
```

The size and format point to **MD5** (the others match by length, not by algorithm).

### 4. Confirm the ZIP is encrypted

**Tool:** `unzip -t` (test). **Why:** `-t` validates the file integrity and, if protected, reports that it cannot read the content without a password.

```bash
$ unzip -t nota_recuperacion.zip
   skipping: flag.txt    unable to get password
```

Confirms the ZIP is encrypted and the key is what we are looking for.

### 5. Brute-force the MD5 with `john`

**Tool:** `john` in `--incremental` mode. **Why:** a short PIN without salt can be cracked by trying combinations; incremental mode tests printable characters of increasing length until the value is found.

**Parameters:** `--format=raw-md5` sets the algorithm to pure MD5 (prevents john from guessing), and `--incremental` activates progressive mask brute-force.

```bash
$ echo "14a4d10c5f5e2cc97fdaf07b06ed3771" > pin.hash
$ john --format=raw-md5 --incremental pin.hash
sector14         (?)
```

**What I saw:** john recovered the value **`sector14`** in seconds. It was not a numeric PIN but a word tied to the challenge context (sector 14), which is why a numeric brute force would not have found it.

### 6. Verify the hash and open the ZIP

**Tool:** `python3` with `hashlib` and `unzip -P`. **Why:** confirm that `sector14` generates exactly the hash from the pack, then use `-P` to pass the password directly without unzip prompting for it.

```bash
$ python3 -c "import hashlib; print(hashlib.md5(b'sector14').hexdigest())"
14a4d10c5f5e2cc97fdaf07b06ed3771   # matches

$ unzip -P sector14 nota_recuperacion.zip
extracting: flag.txt
```

### 7. Read the flag

```bash
$ cat flag.txt
WHOAMI{md5_p1n_0p3r4d0r}
```

## Lesson

A short, predictable PIN (like `sector14`) is recovered in seconds from its unsalted MD5 hash via incremental brute force, so it should never be used to encrypt sensitive data.

---

*Part of the **Blackout LATAM** CTF by [Whoami-Labs](https://whoami-labs.com/).*
