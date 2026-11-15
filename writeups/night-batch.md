# Night Batch

> GnuCOBOL load module that validates an 18-digit account key with 23 modular checks before decrypting the flag.
> **Flag:** `hiCTF{c0b0l_p4ck3d_d3c1mal_n1ghtly_b4tch!}`

---

## Summary

`night-batch` is a GnuCOBOL program compiled to a native x86-64 ELF with the
GnuCOBOL runtime (libcob) linked in. It takes an 18-digit account key as
`argv[1]`, validates it with a long chain of COBOL arithmetic checks, and on
success decrypts the flag with a SHA-256 keystream derived from the key.

The checks turned out to be weighted sums/products of the key digits reduced
modulo 10 (and one modulo 100). Recovering the check values dynamically, fitting
each check as a quadratic form, and solving the resulting modular system with
Z3 gives a unique key.


## 1. Triage

```
$ sha256sum night-batch.zip
64ad99c6d690a7fac13b7d7cb56e2cc7c8553feceda2b503305dcb3ff6afcc9c
$ unzip -o night-batch.zip
$ file night-batch
ELF 64-bit LSB executable, x86-64, dynamically linked, stripped
```

`strings` shows libcob messages (`key out of range`, `record key already
exists`, `GnuCOBOL information`, `COB_*` config names), so this is a GnuCOBOL
load module. The program only links libm/libc; the COBOL runtime is statically
included.

`main` (0x400940) is the usual GnuCOBOL stub: `cob_init` -> module function at
0x400a70 -> `cob_stop_run`. The module body is at 0x400a70.

## 2. Input handling

The module reads the key via COBOL `ACCEPT ... FROM ARGUMENT-VALUE`:

- 40-byte buffer at 0x460140 is filled with spaces,
- argv is fetched and moved into it,
- the length is compared with 18 at 0x400c0e (`[0x460130] == 0x12`),
- `cob_is_numeric(field)` (0x404bc0) is called on the 18-byte field,
- any non-numeric or wrong-length input goes to `account rejected`.

So the key is exactly 18 decimal digits.

## 3. The validation chain

The 18 digits are copied into working storage at 0x460100..0x460111 (one byte
per digit). The module then runs 23 checks, each of the form:

```
if (MOD(expression, modulus) != constant) goto reject;
```

The comparison helper is `cob_cmp_int` at 0x413920 (returns 0 on equality), and
the modulo is the COBOL intrinsic `FUNCTION MOD` (0x41e530): modulus `10` for
the first 22 checks and `100` for the last one.

Each `expression` is built from single-digit fields and small integer literals
(1, 2, 3, 4, 5, 9, 10, 100) using `+` and `*` only, so every check is a
quadratic form in the 18 digits with no constant term.

## 4. Recovering the checks dynamically

Instead of hand-decoding every COBOL operation, the checks were evaluated
dynamically. The binary was run under GDB with a breakpoint on `cob_cmp_int`
(0x413920) that logs the compared value and forces the function to return 0,
so execution continues to the next check:

```
set $p = *(unsigned long*)($rdi+8)
printf "CHK %ld %ld %02x%02x%02x%02x\n", $esi, *(long*)$rdi, ...
return (int)0
```

The compared field is a 3-byte COMP-3 (packed decimal) value. Its bytes are
decimal nibbles (`00 00 1f` = 1, `00 11 1f` = 11), so the value is read from
the nibbles, not as hex.

Running once per input yields all 23 `(modulus constant, computed value)` pairs.
Sampling with zero, unit vectors `e_i` (one digit set to 1), `2*e_i`, and all
pairs `e_i + e_j` gives the coefficients of each check as a quadratic form:

```
f(x) = sum a_i x_i + sum b_i x_i^2 + sum c_ij x_i x_j
```

with all arithmetic taken modulo 10 (mod 100 for check 22). The fitted model
reproduced every random test input exactly, confirming the degree-2 form.

The recovered system (mod 10 unless noted; `d0..d17` are the key digits):

```
d1*d10 = 8
d3 + d4 + d8 = 3
3d2 + d3 + 2d4 + 3d5 + d6 = 1
d2 + d10 + d17 = 7
3d5 + d6 + 2d7 + 3d8 = 7
3d8 + d9 + 2d10 + 3d11 = 7
3d11 + d12 + 2d13 = 9
d0 + 3d14 + d15 + 2d16 + 3d17 = 2
d0 + d11 + d17 = 7
d6 + d10 + d14 = 6
d7 + d9 + d14 = 2
d0 + d13 + d17 = 3
d7 + d8 + d12 = 2
d0 + 2d1 + 3d2 + 2d16 + 3d17 = 2
d12 + 2d13 + 3d14 = 5
d0 + d12 + d13 = 5
2d7 + 3d8 + d9 + 2d10 = 1
3d5 + d6 + 2d7 = 9
d12 + 2d13 + 3d14 + d15 = 4
d4 + d5 + d16 = 4
d1*d9 = 4
d0 + d4 + d8 = 0
4d3 + 5d6 + 5d10 + 2d15 + 9d16 = 94   (mod 100)
```

## 5. Solving

The two products (`d1*d10 = 8`, `d1*d9 = 4` mod 10) and the weighted sums pin
the digits. Encoding the system in Z3 over `0 <= d_i <= 9`:

```python
from z3 import *
d = [Int(f'd{i}') for i in range(18)]
s = Solver()
for x in d: s.add(x >= 0, x <= 9)
# add the 23 congruences ...
s.check()
```

produced exactly one solution:

```
481702596318740925
```

## 6. Flag decryption

On success the module calls 0x402f40 with the key, which:

1. computes `H0 = SHA256(key_18_bytes)`,
2. XORs the 42-byte blob at 0x44d0c0 with `SHA256(H0 || be32(block))`,
3. verifies `SHA256(plaintext)` against the hard-coded digest
   `0x2c146846b66a3fbd 0x181654efa527e488 0x6dbc8ff6323aeadb 0xb0a680efaef6a08f`,
4. prints the plaintext if the digest matches, otherwise prints the static
   `account rejected`.

The real key passes all checks and the digest check.

## 7. Verification (real run)

```
$ ./night-batch 481702596318740925
hiCTF{c0b0l_p4ck3d_d3c1mal_n1ghtly_b4tch!}
```

## Flag

```
hiCTF{c0b0l_p4ck3d_d3c1mal_n1ghtly_b4tch!}
```

## Lesson

Hand-decoding 23 COBOL checks is slow and error-prone. Breaking on the comparison
helper, forcing success, and sampling the value with unit vectors recovers the
quadratic form in a few runs; a constraint solver then does the rest. Dynamic
extraction beats static reverse engineering when the language runtime is hostile.

---

### Credits

This writeup is part of **hiCTF** (HI Cyber Con 2026).
