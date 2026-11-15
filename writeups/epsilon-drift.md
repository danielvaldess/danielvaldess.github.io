# epsilon-drift

> Statically linked validator that only accepts a 32-byte vector of IEEE-754 doubles, and the last one must be a negative zero.
> **Flag:** `hiCTF{1eee754_s1gn3d_z3r0_1u1p_dr1ft_eps!}`

---

## Summary

`epsilon-drift` is a statically linked, stripped x86-64 ELF that validates a
single 32-byte "calibration vector" (64 hex chars) and, on success, prints the
run config containing the flag. The vector is four IEEE-754 doubles whose bit
patterns are constrained by exact bit-level arithmetic checks. The catch: the
fourth double must be a *negative* zero, so the final unlock token is only
produced for `-0.0` even though `+0.0` satisfies every numeric comparison.
The flag is XOR-encrypted in `.rodata` with a SHA-256-derived keystream and the
plaintext digest is checked against hard-coded constants.


## 1. Triage

```
$ sha256sum epsilon-drift.zip
993a5ed3ced717af48dedf7b18fd54396ba55e314ea4519613a96a9c6b05284f
$ unzip -o epsilon-drift.zip
$ file epsilon-drift
ELF 64-bit LSB executable, x86-64, statically linked, stripped
```

Running it with no/random argument prints `calibration residual out of band`.
The string is not present in the file (single-byte XOR encoded at 0x4e34a0),
so start from `_start` and follow the `__libc_start_main` argument to `main`
at 0x401d30. The real body is the call at 0x401d30 -> 0x401f10.

## 2. Input parsing

At 0x401f10 the program requires exactly one argument of 64 hex characters,
decodes it into 32 bytes at `[rsp+0x40]`, reinterprets them as four little-endian
doubles (d0, d1, d2, d3) and starts a chain of bit-pattern checks.

First check: `d3 == 0.0` (IEEE `ucomisd` against zero).

## 3. Bit-level constraints (Ghidra pseudo-code via patched r2mcp `pdg`)

Using 13-bit slice arithmetic on each 64-bit pattern `u`:

```
exponent E = (u >> 52) & 0x7ff
low13  a =  u        & 0x1fff
mid13  b = (u >> 13) & 0x1fff
mid13b c = (u >> 26) & 0x1fff
high13 h = (u >> 39) & 0x1fff
```

The checks require, with all arithmetic mod 0x2000 (exponents mod 0x800):

```
sign0 = sign1 = 0
bits(d0 + d1) == bits(d2)          ; exact IEEE addition result
E0 + E1          = 0x7ff
E0 + 2*E1        = 0x3ff
a0 + a1          = 0x1334     a0 + 2*a1 = 0x0cce
b0 + b1          = 0x1998     b0 + 2*b1 = 0x0664
c0 + c1          = 0x0ccc     c0 + 2*c1 = 0x1332
h0 + h1          = 0x0666     h0 + 2*h1 = 0x0999
```

Solving each pair (subtract the two equations):

```
E0 = 1023 (0x3ff)   E1 = 1024 (0x400)
a0 = a1 = 0x199a
b0 = b1 = 0x0ccc
c0 = c1 = 0x0666
h0 = h1 = 0x0333
```

The mantissa of both doubles is therefore `0x199999999999a`, i.e. the doubles
are `1.1` and `2.2`:

```
d0 = 0x1.199999999999ap+0 = 1.1
d1 = 0x1.199999999999ap+1 = 2.2
d2 = fl(d0 + d1)          = 3.3000000000000003  (0x400a666666666667)
```

This matches the log lines: `residual 3.300000000000000e+00  WARN rounding`.

## 4. The signed-zero trap

On success the code does:

```
movq rax, xmm1        ; bits of d3
test rax, rax
mov  eax, 1
cmovs esi, eax        ; esi = 1 only if d3's sign bit is set
jmp  shared_exit
```

`shared_exit` calls the run-config routine with `esi` as the "unlocked" flag,
and that routine immediately fails if `esi == 0`:

```
test esi, esi
je   fail
```

So the vector must contain `-0.0` (0x8000000000000000), not `+0.0`.
Both compare equal to zero, only the sign bit distinguishes them.

Final vector:

```
9a9999999999f13f 9a99999999990140 6766666666660a40 0000000000000080
```

## 5. Recovering the flag

The run-config routine at 0x402a70:

1. `H0 = SHA256(vector_32_bytes)`
2. For each 32-byte block `j`: `key_j = SHA256(H0 || be32(j))`
3. `plaintext = ciphertext XOR keystream` (42 bytes, ciphertext at 0x4e3500)
4. Verifies `SHA256(plaintext)` against four hard-coded qwords:
   `0x7ee08052b24c8222, 0xf7722162aec0b1f9, 0x24225a48a6865e8b, 0x62cbba471e1887c5`

Reproduction:

```python
import struct, hashlib
M = (0x333<<39)|(0x666<<26)|(0xCCC<<13)|0x199A
d0 = struct.unpack('<d', struct.pack('<Q', (1023<<52)|M))[0]   # 1.1
d1 = struct.unpack('<d', struct.pack('<Q', (1024<<52)|M))[0]   # 2.2
d2 = d0 + d1                                                    # 3.3000000000000003
vec = struct.pack('<d', d0)+struct.pack('<d', d1)+struct.pack('<d', d2)+b'\x00'*7+b'\x80'
H0 = hashlib.sha256(vec).digest()
ct = open('epsilon-drift','rb').read()[0xe3500:0xe3500+42]
pt = b''
for j in range(2):
    key = hashlib.sha256(H0 + struct.pack('>I', j)).digest()
    pt += bytes(c ^ k for c, k in zip(ct[j*32:(j+1)*32], key))
print(pt)
```

SHA-256 of the recovered plaintext equals the hard-coded digest
`22824cb25280e07ef9b1c0ae622172f78b5e86a6485a2224c587181e47bacb62`, so the
candidate is verified cryptographically before execution.

## 6. Verification (real run)

```
$ ./epsilon-drift 9a9999999999f13f9a999999999901406766666666660a400000000000000080
hiCTF{1eee754_s1gn3d_z3r0_1u1p_dr1ft_eps!}
```

## Flag

```
hiCTF{1eee754_s1gn3d_z3r0_1u1p_dr1ft_eps!}
```
