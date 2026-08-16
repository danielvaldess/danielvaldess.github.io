# VM PLC

> Mini-VM ladder en `plc_ladder` (ELF Linux x64). Recupera la clave maestra `WHOAMI{...}`.
>
> **Consejo:** `chmod +x`. Identifica el bucle de interpretación en el desensamblado.

**Flag:** `WHOAMI{vm_plc_s3ctor14}`

---

## Resolución

### 1. Ejecutar y observar

**Herramienta:** ejecutar el binario. **Por qué:** ver qué entrada espera antes de desensamblar.

```bash
$ chmod +x plc_ladder && echo "AAAA" | ./plc_ladder
=== PLC Ladder VM | sector 14 ===
Clave maestra: [FAIL] Secuencia invalida.
```

Pide una clave: es una *mini-VM* que valida la entrada carácter a carácter. El reto pide encontrar el **bucle de interpretación** (el dispatch loop) en el desensamblado.

### 2. Encontrar main y el bucle de interpretación

**Herramienta:** `nm` + `objdump`. **Por qué:** `nm` localiza la dirección de `main`; `objdump -d` desensambla esa función.

**Parámetros:** `nm ... | grep " T main"` (buscar el símbolo de main), `objdump -d -M intel` con `sed` para recortar la función.

```bash
$ nm plc_ladder | grep " T main"
0000000000401720 T main
$ objdump -d -M intel plc_ladder | sed -n '/401720 <main>:/,/^$/p'
```

El corazón del bucle (dispatching):

```asm
lea  rax,[rip+0x7d3b4]        # 47eb40 <PROG>      ; el "programa ladder"
lea  rcx,[rip+0x7d381]        # 47eb20             ; jump table
...
movzx esi,BYTE PTR [rax+0x1]  ; operando (byte 2)
cmp  BYTE PTR [rax],0x4       ; opcode (byte 1) <= 4
...
movsxd rdx,DWORD PTR [rcx+rdx*4]
add  rdx,rcx
jmp  rdx                      ; salto calculado -> interpreta el opcode
```

Cada instrucción es de **2 bytes** (`opcode`, `operando`) y el programa `PROG` termina con el opcode 4. Con la jump table en la mano:

| Opcode | Dirección | Acción |
|---|---|---|
| 0 | `0x4017ed` | cargar siguiente char de la clave en el acumulador (`acc`) |
| 1 | `0x4017e9` | `acc = acc XOR operando` |
| 2 | `0x4017b4` | comparar `acc == operando`; si difiere → FAIL |
| 4 | `0x4017d9` | secuencia válida → OK |

### 3. Extraer el programa

El bytecode vive en `.rodata` en `PROG`:

**Herramienta:** `python3`. **Por qué:** leer el offset del programa dentro del binario y volcarlo como hex.

```bash
$ python3 -c "print(open('plc_ladder','rb').read()[0x7eb40:0x7ebcc].hex())"
00000107025000000114025c...022c0000012502580400
```

Cada carácter se valida con el patrón `[0x00,0x00]` (load) → `[0x01,key]` (xor) → `[0x02,esperado]` (compare). Entonces:

```
clave[i] = esperado[i] XOR key[i]
```

### 4. Invertir el XOR para cada carácter

**Herramienta:** `python3`. **Por qué:** recorrer el bytecode, detectar cada patrón load/xor/compare y calcular `esperado ^ key`.

```bash
$ python3 -c "
prog=bytes.fromhex('00000107025000000114025c...02580400')
i=0; flag=''
while i < len(prog)-1:
    if prog[i]==0:                    # load char
        key, expected = prog[i+3], prog[i+5]
        flag += chr(expected ^ key)
        i += 6
    elif prog[i]==4: break            # fin de programa
    else: i += 2
print(flag)"
WHOAMI{vm_plc_s3ctor14}
```

### 5. Confirmar

```bash
$ echo "WHOAMI{vm_plc_s3ctor14}" | ./plc_ladder
[OK] Secuencia valida. Token = clave ingresada.
```

## Lección

Las mini-VM en CTF se resuelven leyendo el *dispatch loop*: identifica el `jmp` por jump table, mapea cada opcode a su acción (load/xor/compare…), extrae el bytecode y reconstruye la operación inversa. Aquí, XOR con operando → la clave es `esperado ^ key`.