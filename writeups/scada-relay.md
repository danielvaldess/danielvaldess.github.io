# SCADA Relay

**Flag:** `WHOAMI{str1ngs_4nd_b64}`

> SCADA relay firmware SN-441 (ELF Linux x64). Retrieve the token `WHOAMI{...}`.
> **Hint:** `strings`, `file` and `chmod +x`. Run on Kali/WSL/Linux VM.

---

## Solution

The challenge provides a stripped SCADA relay binary that asks for an authorization code. By examining its strings and symbols, the expected token can be found encoded in base64 and decoded without any disassembly.

### 1. Binary Reconnaissance

**Tool:** `file`. **Why:** identifies the file type before touching it.

```bash
$ file scada_relay
ELF 64-bit LSB executable, x86-64, statically linked, ... not stripped
$ chmod +x scada_relay
```

The challenge hint (strings, file, chmod +x) reveals that the flag can be obtained without decompiling anything: just by examining the binary's strings.

### 2. Run and Observe Behavior

**Tool:** run the binary. **Why:** seeing what input it expects helps understand the logic.

```bash
$ ./scada_relay
=== Red LATAM | Relé SCADA SN-441 ===
Modo: restablecimiento post-blackout
Codigo de autorizacion: █
```

It asks for an authorization code: it's a *flag checker* (compares your input against an expected value).

### 3. Search for Clues in the Strings

**Tool:** `strings`. **Why:** extracts readable text strings from a binary; it's the first step to avoid disassembling blindly.

**Parameters:** `-n 6` (only strings of 6+ characters, to filter noise), `grep -iE "autoriz|codigo"` (search for code-related terms).

```bash
$ strings -n 6 scada_relay | grep -iE "autoriz|codigo"
Codigo de autorizacion:
[DENEGADO] Codigo invalido.
```

The key is in an eloquent symbol: `TOKEN_B64`. **What I saw:** the symbol name tells us the expected token is stored in **base64** inside the `.rodata` section.

**Tool:** `rabin2`. **Why:** displays symbols and constants of a binary; `-z` lists strings from data sections.

```bash
$ rabin2 -z scada_relay | grep TOKEN_B64
0x0047eb80  .rodata   ascii   V0hPQU1Je3N0cjFuZ3NfNG5kX2I2NH0=
```

### 4. Decode the Base64

```bash
$ echo "V0hPQU1Je3N0cjFuZ3NfNG5kX2I2NH0=" | base64 -d
WHOAMI{str1ngs_4nd_b64}
```

The token in leetspeak reads — exactly the technique used.

### 5. Confirm

```bash
$ echo "WHOAMI{str1ngs_4nd_b64}" | ./scada_relay
[OK] Relé autorizado. Enviar token al arena CTF.
```

## Lesson

Before opening a decompiler, always run `strings` on the binary and look for revealing variable/constant names (like `TOKEN_B64`): many "binary" category challenges are just base64/hex-encoded text hidden in `.rodata`.
