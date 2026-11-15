# Obfuscated Flow

> Stripped validator hidden behind an obfuscated state machine with modular-arithmetic constraints and discrete logs.
> **Flag:** `hiCTF{m4th_c0ntr0l_fl0w_3ll1pt1c_dlog_4f7b2c9e}`

---

## Summary

`challenge` is a small stripped x86-64 ELF validator. It reads a "passkey"
from stdin, requires the exact form `hiCTF{...}` with 40 characters inside the
braces (47 bytes total), then routes it through an obfuscated state machine
that checks ten overlapping 32-bit words of the input against modular-arithmetic
constraints. Solving the constraints yields the flag.


## 1. Triage

```
$ sha256sum rev-obs-flow.zip
ddaca1f93d3f748482982814ed307b58f9fba73e6298bb4551594a2b344a2d30
$ unzip -o rev-obs-flow.zip
$ file challenge
ELF 64-bit LSB executable, x86-64, dynamically linked, stripped
```

`strings` shows the banner, `hiCTF{`, `[-] Access Denied.` and `%s`.

## 2. Input format

`main` (0x4010c0) reads up to 0x100 bytes with `fgets`, strips trailing CR/LF,
and requires:

- `strlen == 0x2f` (47) after stripping,
- `strncmp(input, "hiCTF{", 6) == 0`,
- last byte == `}`.

So the payload is `hiCTF{` + 40 bytes + `}`.

The 40 bytes inside the braces are read as ten consecutive little-endian
`uint32` words (`w0..w9`), overlapping windows at rsp+0x176, 0x17a, ..., 0x19e:

```
w0 offset 6    w1 offset 10   w2 offset 14   w3 offset 18   w4 offset 22
w5 offset 26   w6 offset 30   w7 offset 34   w8 offset 38   w9 offset 42
```

## 3. The obfuscated dispatcher

The validator is a state machine. Each state evaluates one or two constraints
and indexes a table of 32-bit state values. Every table stores the only valid
next state at index 0, and decoy states `0x0ddcbaXX` at all other indices.
Any failed constraint sends the machine into a decoy state and prints
`[-] Access Denied.`

The valid chain is:

```
0x2f71a8d4 -> 0x6b3e91f2 -> 0x19c45d80 -> 0x43b7e025
           -> 0x51e29f3a -> 0x3d087b16 -> 0x38a5f41c (print flag)
```

State `0x2f71a8d4` is a Fermat check (`3^(p-1) mod p == 1`, p = 2^31-1) used as
an always-true decoy before the real checks.

## 4. Constraints

Constants used: `M = 0x7fffffff`, `Q = 0xfffffffb`, `P = 0x3b9aca07`.

State 0x6b3e91f2 (w0, w1):

```
w0*w1            == 0x37c0f52c  (mod M)
w0^2 - 0x7a69*w1^2 == 0x1e054920  (mod M)
```

State 0x19c45d80 (w2, w3) plus a constant modular-exponentiation decoy:

```
(w2^3 + 0x20a6e*w2 + 0x30730db7) mod P == w3^2 mod P
```

State 0x43b7e025 (w4, w5):

```
7^w4  mod M == 0x7bb949ec
11^w5 mod M == 0xb3bbfc8
```

State 0x51e29f3a (w6, w7), 2x2 linear system mod Q:

```
w6*0x00cc1321 + w7*0x3ade68b1 == 0x92660155  (mod Q)
w6*0x075bcd15 + w7*0x211ecd59 == 0x7da7aac3  (mod Q)
```

State 0x3d087b16 (w8, w9):

```
w8 + w9 == 0x4770c967  (mod M)
w8 * w9 == 0x2e97d196  (mod M)
is_prime(w8 ^ 9) and is_prime(w9 ^ 0x11)
```

## 5. Solving

Linear system for (w6, w7) mod Q:

```
w6 = 0x645f6331 = "1c_d"
w7 = 0x5f676f6c = "log_"
```

Discrete logs mod M (Pohlig-Hellman via sympy `discrete_log`):

```
w4 = 0x6c335f77 = "w_3l"     (log_7 0x7bb949ec)
w5 = 0x7470316c = "l1pt"     (log_11 0xb3bbfc8)
```

Quadratic `x^2 - Sx + P = 0` for (w8, w9):

```
roots: 0x62376634 = "4f7b", 0x65396332 = "2c9e"
only w8=0x62376634, w9=0x65396332 satisfies both primality tests
```

Quadratic system for (w0, w1) via `t = w0/w1`:

```
w0 = 0x6874346d = "m4th"
w1 = 0x6e30635f = "_c0n"
```

The remaining equation for (w2, w3) links two 4-byte words:

```
f(w2) = (w2^3 + 0x20a6e*w2 + 0x30730db7) mod P == w3^2 mod P
```

Enumerating printable words from `[a-z0-9_]` (about 1.87M per side) and
matching `f(w2)` against a table of `w3^2 mod P` gives 3443 candidate pairs.
Each candidate was fed to the binary; exactly one produced `ACCESS GRANTED`:

```
w2 = "tr0l"
w3 = "_fl0"
```

## 6. Verification (real run)

```
$ printf 'hiCTF{m4th_c0ntr0l_fl0w_3ll1pt1c_dlog_4f7b2c9e}\n' | ./challenge
=== [ hiCTF Sentinel Gateway ] ===
Passkey:
[+] ACCESS GRANTED! Passkey verified.
[+] Flag: hiCTF{m4th_c0ntr0l_fl0w_3ll1pt1c_dlog_4f7b2c9e}
```

The recovered passkey is the flag itself, so the challenge name matches the
solution: `math control flow elliptic dlog`, with the final 8 hex digits
`4f7b2c9e`.

## Flag

```
hiCTF{m4th_c0ntr0l_fl0w_3ll1pt1c_dlog_4f7b2c9e}
```

## Lesson

An obfuscated dispatcher is still just a list of constraints. Classify them by
type (linear system, discrete log, quadratic), solve each with the right tool and
enumerate only printable candidates. The 3443 surviving pairs were narrowed to
one by feeding them to the binary.

---

### Credits

This writeup is part of **hiCTF** (HI Cyber Con 2026).
