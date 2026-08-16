# Shift Validator

**Flag:** `WHOAMI{k3yg3n_bl4ck0ut}`

> `turno_guard` validator (ELF Linux x64). Only accepts an exact token `WHOAMI{...}`.
> **Hint:** `chmod +x`. Try Ghidra, Cutter or `objdump -d`.

---

## Solution

The binary is a flag checker that validates input against an expected token using a progressive XOR cipher. By disassembling the validation routine, the XOR key sequence and the masked expected value can be extracted from the binary, then reversed to recover the flag.

### 1. Run

**Tool:** run the binary. **Why:** observe behavior with a test input to confirm it's a *flag checker*.

```bash
$ chmod +x turno_guard && echo "AAAA" | ./turno_guard
=== Validador turno BLACKOUT-2026 ===
Token operador: [FAIL] Token rechazado.
```

It's a flag checker. Disassemble `main`:

**Tool:** `objdump`. **Why:** it's the CLI disassembler; shows the assembly code of the function.

**Parameters:** `-d` (disassemble), `-M intel` (Intel syntax), `sed -n '/<main>:/,/^$/p'` (extract only the `main` function).

```bash
$ objdump -d -M intel turno_guard | sed -n '/<main>:/,/^$/p'
```

### 2. Understand the Validation

```asm
cmp rax, 0x17          ; the token must be 23 characters long
lea rcx, [rip+...]     ; 47eb10 <MASKED>  (expected string, obfuscated)
mov edx, 0x7           ; initial key
loop:
  movzx esi, BYTE PTR [rax]   ; input char
  xor   esi, edx              ; char ^ key
  cmp   sil, BYTE PTR [rcx]   ; compare with MASKED[i]
  je    next
  ...
next:
  add edx, 0xd         ; key += 13 per character
  add rax, 0x1
  add rcx, 0x1
  cmp dl, 0x32         ; 7 + 13*23 = 306 ≡ 50 (0x32) at the end
  je   [OK]
```

The logic: each token character is compared against `MASKED[i]` **after XORing it with a progressive key** starting at 7 and incrementing by 13 per position:

```
input[i] ^ (7 + 13*i) == MASKED[i]      →   input[i] = MASKED[i] ^ (7 + 13*i)
```

### 3. Extract MASKED and Reverse the XOR

`MASKED` is in `.rodata` at `0x47eb10`:

**Tool:** `objdump -s`. **Why:** dumps raw section content as hex, to read the constant.

**Parameters:** `-s -j .rodata` (display the `.rodata` section as hex data).

```bash
$ objdump -s -j .rodata turno_guard
 47eb10  505c6e6f 76012e09 5c05eea5 cdefdfa6  P\nov...\.......
 47eb20  e3879ace 7e6c5800 ...
```

**Tool:** `python3`. **Why:** apply the inverse operation `MASKED[i] ^ (7 + 13*i)` byte by byte.

```python
masked = bytes.fromhex('505c6e6f76012e095c05eea5cdefdfa6e3879ace7e6c58')
flag = ''.join(chr(m ^ ((7 + 0xd*i) & 0xff)) for i, m in enumerate(masked))
print(flag)   # WHOAMI{k3yg3n_bl4ck0ut}
```

### 4. Confirm

```bash
$ echo "WHOAMI{k3yg3n_bl4ck0ut}" | ./turno_guard
[OK] Turno autorizado. Envia el token al arena.
```

## Lesson

A comparator with a "progressive key" (XOR with counter) is easily reversed: reconstruct the key sequence (`7, 20, 33, 46, …`) and apply `masked[i] ^ key[i]`. The final counter value (`0x32`) also reveals the exact token length.
