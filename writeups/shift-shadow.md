# Shift Shadow

> Partial /etc/shadow backup from the console server. The operador.turno password also opens the ZIP. Retrieve `WHOAMI{...}`.
> **Hint:** the hash starts with `$6$` → sha512crypt.

**Flag:** `WHOAMI{sh4d0w_turn0_n0rt3}`

---

## Solution

The pack contains a fragment of `/etc/shadow` with the hash for user `operador.turno` and an encrypted ZIP with the same password. Cracking the hash yields the key that unlocks the ZIP and the flag.

### 1. Unzip and Inspect the Files

```bash
$ unzip shadow_turno.zip
```

Three files:

- `shadow_turno.txt` — the user's hash
- `export_consola.txt` — context (indicates the same password opens the ZIP)
- `consola.zip` — the encrypted archive

### 2. Identify the Hash Type

**`shadow_turno.txt`:**
```
operador.turno:$6$blackoutlatam$j7D9JpButrtJLmv3QEEqQ4fNiuoCX2tLCMwPrAjBcJUhquW.2vMJvLr/uSjHTAQ6zf/F1JXlfjIGpgmr8FJkS/:20345:0:99999:7:::
```

The hash starts with **`$6$`**, which is the signature of **sha512crypt** (the password hashing algorithm used in Linux `/etc/shadow`). The salt is `blackoutlatam`.

### 3. Crack the Hash with john

**Tool:** `john`. **Why:** it's the standard password hash cracker; it natively supports the `sha512crypt` format and `/etc/shadow` formats.

**Parameters:** `--format=sha512crypt` sets the algorithm (prevents john from guessing), `--wordlist=/usr/share/wordlists/rockyou.txt` uses the common dictionary.

```bash
$ printf 'operador.turno:$6$blackoutlatam$j7D9JpButrtJLmv3QEEqQ4fNiuoCX2tLCMwPrAjBcJUhquW.2vMJvLr/uSjHTAQ6zf/F1JXlfjIGpgmr8FJkS/\n' > shadow.hash
$ john --format=sha512crypt --wordlist=/usr/share/wordlists/rockyou.txt shadow.hash
electric         (operador.turno)
```

**What I saw:** john recovered the password **`electric`** in under a second using the rockyou dictionary.

### 4. Open the ZIP with the Password

**Tool:** `unzip`. **Why:** opens the encrypted archive with the recovered key.

**Parameters:** `-P electric` provides the password directly without prompting interactively.

```bash
$ unzip -P electric consola.zip
extracting: flag.txt
```

### 5. Read the Flag

```bash
$ cat flag.txt
WHOAMI{sh4d0w_turn0_n0rt3}
```

## Lesson

A `$6$` (sha512crypt) hash from `/etc/shadow` cannot be mathematically inverted: it must be guessed. With a weak password in a dictionary, `john --format=sha512crypt` recovers it instantly, and that same key is often reused to unlock other challenge files.

---

*Part of the **Blackout LATAM** CTF by [Whoami-Labs](https://whoami-labs.com/).*
