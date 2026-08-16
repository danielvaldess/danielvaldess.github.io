# PLC VM

> Ladder mini-VM in `plc_ladder` (ELF Linux x64). Retrieve the master key `WHOAMI{...}`.
> **Hint:** `chmod +x`. Identify the interpretation loop in the disassembly.

**Flag:** `WHOAMI{vm_plc_s3ctor14}`

---

## Solution

The binary implements a mini virtual machine that validates a master key character by character using a ladder-style bytecode program. By identifying the dispatch loop, mapping each opcode to its action, and extracting the bytecode from `.rodata`, the validation logic can be reversed to recover the key.

### 1. Run and Observe

**Tool:** run the binary. **Why:** see what input it expects before disassembling.

```bash
$ chmod +x plc_ladder && echo "AAAA" | ./plc_ladder
=== PLC Ladder VM | sector 14 ===
Clave maestra: [FAIL] Secuencia invalida.
```

It asks for a key: it's a *mini-VM* that validates input character by character. The challenge requires finding the **interpretation loop** (the dispatch loop) in the disassembly.

### 2. Find main and the Interpretation Loop

**Tool:** `nm` + `objdump`. **Why:** `nm` locates the address of `main`; `objdump -d` disassembles that function.

**Parameters:** `nm ... | grep " T main"` (find the main symbol), `objdump -d -M intel` with `sed` to extract the function.

```bash
$ nm plc_ladder | grep " T main"
0000000000401720 T main
$ objdump -d -M intel plc_ladder | sed -n '/401720 <main>:/,/^$/p'
```

The core of the loop (dispatching):

```asm
lea  rax,[rip+0x7d3b4]        # 47eb40 <PROG>      ; the "ladder program"
lea  rcx,[rip+0x7d381]        # 47eb20             ; jump table
...
movzx esi,BYTE PTR [rax+0x1]  ; operand (byte 2)
cmp  BYTE PTR [rax],0x4       ; opcode (byte 1) <= 4
...
movsxd rdx,DWORD PTR [rcx+rdx*4]
add  rdx,rcx
jmp  rdx                      ; computed jump -> interprets the opcode
```

Each instruction is **2 bytes** (`opcode`, `operand`) and the program `PROG` ends with opcode 4. With the jump table in hand:

| Opcode | Address | Action |
|---|---|---|
| 0 | `0x4017ed` | load next key char into the accumulator (`acc`) |
| 1 | `0x4017e9` | `acc = acc XOR operand` |
| 2 | `0x4017b4` | compare `acc == operand`; if different → FAIL |
| 4 | `0x4017d9` | valid sequence → OK |

### 3. Extract the Program

The bytecode lives in `.rodata` at `PROG`:

**Tool:** `python3`. **Why:** read the program offset within the binary and dump it as hex.

```python
$ python3 -c "print(open('plc_ladder','rb').read()[0x7eb40:0x7ebcc].hex())"
00000107025000000114025c...022c0000012502580400
```

Each character is validated with the pattern `[0x00,0x00]` (load) → `[0x01,key]` (xor) → `[0x02,expected]` (compare). Therefore:

```
key[i] = expected[i] XOR key[i]
```

### 4. Reverse the XOR for Each Character

**Tool:** `python3`. **Why:** iterate through the bytecode, detect each load/xor/compare pattern and compute `expected ^ key`.

```python
$ python3 -c "
prog=bytes.fromhex('00000107025000000114025c...02580400')
i=0; flag=''
while i < len(prog)-1:
    if prog[i]==0:                    # load char
        key, expected = prog[i+3], prog[i+5]
        flag += chr(expected ^ key)
        i += 6
    elif prog[i]==4: break            # end of program
    else: i += 2
print(flag)"
WHOAMI{vm_plc_s3ctor14}
```

### 5. Confirm

```bash
$ echo "WHOAMI{vm_plc_s3ctor14}" | ./plc_ladder
[OK] Secuencia valida. Token = clave ingresada.
```

## Lesson

Mini-VMs in CTFs are solved by reading the *dispatch loop*: identify the `jmp` via jump table, map each opcode to its action (load/xor/compare…), extract the bytecode and reconstruct the inverse operation. Here, XOR with operand → the key is `expected ^ key`.

---

### Credits

This writeup is part of the **Blackout LATAM** CTF hosted by [Whoami-Labs](https://whoami-labs.com/).
