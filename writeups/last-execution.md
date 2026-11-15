# Last Execution

> Cold image of a fictional EXE-9 processor. The manual is correct except for a few twisted constants, and the telemetry log lies about the last halt.
> **Flag:** `hiCTF{3x3c_9_r3m3mb3rs_4ll_but_th3_l4st_h4lt_l13s}`

---

## Summary

`last_execution.img` is a cold image of a fictional EXE-9 virtual processor.
The image embeds a full manual (the `PRIMER` segment), 24 segments including
CODE, TABLE, SEAL and TRC records, and a few deliberate traps. The manual is
mostly correct but several critical constants are "twisted". After correcting
them, a custom emulator runs the chain, the SELFTEST commitment verifies the
implementation, two test seals verify the SEAL-256 implementation, and the
final state decrypts the flag from `WILL_SEAL`.


## 1. Container

Header (big-endian, first 0x100 bytes):

```
magic "EXE9CORE", version 0x0901, N = 24 segments
EXEC_SEED  = 0x9E3779B9F00DCAFE
TABLE_SEED = 0xBADC0FFEE0DDF00D
ENTRY      = 1 (EXEC_MAIN)
```

Segment table at 0x100, 0x40-byte entries:

```
SEG_ID, TYPE, OFFSET, SIZE, FLAGS, AUX, CRC32, NAME[16]
```

Relevant segments:

```
1  EXEC_MAIN      CODE
2  EXEC_FOLD_A    CODE
3  EXEC_FOLD_B    CODE
5  EXEC_LIMIT     CODE
4  EXEC_FINAL     CODE (WRITABLE)
6  EXEC_SELFTEST  CODE
11 DLOOK          TBL  (0x40000)
12 DSEED          TBL  (0x1000)
20 WILL_SEAL      SEAL (0x50)
21-24 TEST_SEAL_1..4 SEAL (0x30)
30 TELEMETRY      TRC
```

The `PRIMER` segment documents the ISA, page/table rotations, HALT chaining and
the SEAL-256 cipher.

## 2. Twisted constants

The manual's numeric examples and formulas disagree. Three independent
encode-time records plus the SELFTEST commitment pin the real values:

| Item | Primer | Real |
|---|---|---|
| initial page rotation | `ROL64(..., 19)` | `ROL64(..., 17)` |
| dispatch index | `op + ((pc >> 4) + AUX)` | `op + ((pc >> 3) + AUX)` |
| table row chain | `rr[i-1]*17 + B + i*11` | `rr[i-1]*17 + B + i*13` |

Evidence:

- MAIN page rotations `ROT[0..2] = 0, 0x39, 0x37` match with rotate 17.
- SELFTEST record: op byte 0x93 at pc=0x40, AUX=0x47 -> idx 0xE2 (LDRR).
  With SELFTEST ROT[0]=0x37, `0x93 + ((0x40>>3) + 0x47) = 0xE2`.
- DSEED trace `rr = 0x31, 0x2D, 0x30, 0x16` matches the i*13 chain with
  `B` = first byte of the stored previous row.
- LUI really shifts by 32 (validated by SELFTEST constants), and Z is set only
  by CMP (a variant where ALU ops set Z breaks MAIN's link).

Notably, `Z` persists across HALT links; FOLD_A depends on the stale Z left by
MAIN, so resetting Z on links breaks the chain.

## 3. Emulator

Implemented from the primer:

- fetch: big-endian u64 read from current memory at `SEG_OFFSET+pc`, then
  `word = ROL64(raw, ROT[pc>>8])`; page rotations are always computed from the
  bytes as shipped,
- decode: `idx = (op_byte + ((pc>>3) + AUX)) & 0xff`, with the fallback table
  `[NOP,XOR,ADD,MOV,ROL,SHR,AND,SUB]` and register fields mod 16,
- all instructions of section 3.4, including stores only in writable segments,
  and LDRR using the rotated logical table rows,
- HALT link: `next = (imm32 ^ low32(R1)) & 0xffffffff`.

Validation: running EXEC_SELFTEST standalone gives R1..R4

```
B32AFF5565D79AFC 2028AD4561D488D8 53FA2553DE2CE460 B11E216ECEC9B9E4
```

and

```
SHA256(be64(R1)||be64(R2)||be64(R3)||be64(R4))
 = 0b6d8d4770eac443de6b9b73340a4a262117d9da42e6ced9411ebda286bbbcf2
```

which equals the commitment printed in the primer. The emulator is correct.

## 4. Test seals validate SEAL-256

The S-box is derived from DLOOK logical rows 0..3 (row rotation chain above),
then a 256-byte Fisher-Yates using `D[i] mod (i+1)`.

Using the documented key derivation

```
key = SHA256("LASTEXEC" || be64(R1) || be64(R2) || be64(R3) || be64(R4) || "LASTEXEC")
```

and SEAL-256 decryption:

- SELFTEST state decrypts `TEST_SEAL_1` to `hiCTF{f4k3_fl4g}` + PKCS#7 padding,
- FOLD_B state decrypts `TEST_SEAL_3` to the same fake flag.

This validates the key derivation, S-box, key schedule, permutation and
column-shift handling. (With L=2 test seals the column rotation direction is
ambiguous since +1 = -1 mod 2; WILL_SEAL has L=4 and uses the forward direction.)

## 5. Execution chain

The chain is:

```
EXEC_MAIN -> EXEC_FOLD_A -> EXEC_FOLD_B -> EXEC_LIMIT -> EXEC_FINAL
          -> EXEC_LIMIT -> EXEC_FINAL (terminates, R15 = "STAL")
```

FOLD_B's HALT link resolves to segment 5 (`EXEC_LIMIT`), not to FINAL; the
operator console's "FOLD_B -> FINAL" is an abbreviated/decoy record.

EXEC_LIMIT is a huge delay loop: it sets

```
R9 = 0x0F0EE2C89ABC + ((LDRR(0x8318) & 0xFFFFFF) << 20) = 0x123456789ABC
```

iterations. The loop state (R6 low 18 bits, R5 mod 0x8000, R12 mod 3) has period
`3 * 2^18 = 786432`, so the loop is fast-forwarded exactly:

- R6 is an LCG modulo 2^18 (full period 2^18), high bits constant;
- R5 increments by 1 mod 0x8000;
- R12 increments when bit 15 of `R5+0x4001` is set, and resets to 0 at 3;
- R8 accumulates `ROL64(R6,27) ^ R6` and `(R12<<15)|R5`.

After `q = N // 786432` periods and the remainder, the epilogue is

```
R3 = ROL64(R8, 7) ^ R6
R1 = (R1 & 0xffffffff00000000) | 0x1337C0DA
next = 0x1337C0DE ^ 0x1337C0DA = 4  (EXEC_FINAL)
```

The fast-forward was validated against direct execution with patched small
loop counts.

## 6. Final state and the lying console

Two FINAL passes are needed (the segment is writable and rewrites its own tail
at 0x2020..0x2048 on each pass). The terminating HALT (`next = 0xFFFFFFFF`,
`R15 = "STAL"`) leaves:

```
R1 = 0x30677DF2A112FFFB
R2 = 0xFF975FD2B1F15576
R3 = 0xABEC2195F731C083
R4 = 0x9C3FB793EED6DA86
```

The TELEMETRY appendix lists the same state except

```
telemetry R2 = 0xFF975FD2B1F14576   (differs from the real value by 0x1000)
```

and its fold values differ from the real ones by exactly 0x1000:

```
real      fold0 = 0xF823B4260904B088   fold1 = 0x782AB6EF390CF07A
telemetry fold0 = 0xF823B4260904A088   fold1 = 0x782AB6EF390CE07A
```

Hence the flag text: the console "VERIFIED" record is the last halt lying.

## 7. Opening WILL_SEAL

```
key = SHA256("LASTEXEC" || be64(R1..R4) || "LASTEXEC")
    = ac35ec6ed245d7238d9784ae097766613649315beb12b8ba9836dda56ccd54a3
```

WILL_SEAL is 0x50 bytes = 16 shift bytes + 4 ciphertext blocks (L=4). Undo the
column rotation (`ct[r][c] = stored[(r + shift[c]) mod 4][c]`), SEAL-256-decrypt
each row, and strip PKCS#7. The plaintext is 50 bytes with 14 bytes of 0x0e
padding:

```
hiCTF{3x3c_9_r3m3mb3rs_4ll_but_th3_l4st_h4lt_l13s}
```

## Verification

- SELFTEST SHA-256 commitment matches the image value.
- SEAL-256/key derivation validated by TEST_SEAL_1 and TEST_SEAL_3 decrypting
  to the known fake flag.
- Final state matches the TELEMETRY record in R1, R3, R4 and differs only in
  the tampered nibble of R2.
- WILL_SEAL plaintext has valid PKCS#7 padding and the expected `hiCTF{...}`
  format.

## Flag

```
hiCTF{3x3c_9_r3m3mb3rs_4ll_but_th3_l4st_h4lt_l13s}
```

## Lesson

A specification is not ground truth: the manual had three "twisted" constants and
the telemetry log a tampered nibble. Validate an emulator against self-test
commitments and known test vectors before trusting its output, and treat every
log as potentially adversarial.

---

### Credits

This writeup is part of **hiCTF** (HI Cyber Con 2026).
