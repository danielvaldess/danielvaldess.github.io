# Validador de turno

> Validador `turno_guard` (ELF Linux x64). Solo acepta un token exacto `WHOAMI{...}`.
>
> **Consejo:** `chmod +x`. Prueba en Ghidra, Cutter o `objdump -d`.

**Flag:** `WHOAMI{k3yg3n_bl4ck0ut}`

---

## Resolución

### 1. Ejecutar

**Herramienta:** ejecutar el binario. **Por qué:** ver el comportamiento con una entrada de prueba para confirmar que es un *flag checker*.

```bash
$ chmod +x turno_guard && echo "AAAA" | ./turno_guard
=== Validador turno BLACKOUT-2026 ===
Token operador: [FAIL] Token rechazado.
```

Es un flag checker. Se desensambla `main`:

**Herramienta:** `objdump`. **Por qué:** es el desensamblador por CLI; muestra el código ensamblador de la función.

**Parámetros:** `-d` (desensamblar), `-M intel` (sintaxis Intel), `sed -n '/<main>:/,/^$/p'` (recortar solo la función `main`).

```bash
$ objdump -d -M intel turno_guard | sed -n '/<main>:/,/^$/p'
```

### 2. Entender la validación

```asm
cmp rax, 0x17          ; el token debe tener 23 caracteres
lea rcx, [rip+...]     ; 47eb10 <MASKED>  (cadena esperada, ofuscada)
mov edx, 0x7           ; clave inicial
loop:
  movzx esi, BYTE PTR [rax]   ; char del input
  xor   esi, edx              ; char ^ clave
  cmp   sil, BYTE PTR [rcx]   ; compara con MASKED[i]
  je    next
  ...
next:
  add edx, 0xd         ; clave += 13 por cada char
  add rax, 0x1
  add rcx, 0x1
  cmp dl, 0x32         ; 7 + 13*23 = 306 ≡ 50 (0x32) al final
  je   [OK]
```

La lógica: cada carácter del token se compara con `MASKED[i]` **después de XORearlo con una clave progresiva** que empieza en 7 y suma 13 por posición:

```
input[i] ^ (7 + 13*i) == MASKED[i]      →   input[i] = MASKED[i] ^ (7 + 13*i)
```

### 3. Extraer MASKED y deshacer el XOR

`MASKED` está en `.rodata` en `0x47eb10`:

**Herramienta:** `objdump -s`. **Por qué:** vuelca el contenido bruto de una sección como hex, para leer la constante.

**Parámetros:** `-s -j .rodata` (mostrar la sección `.rodata` como datos hex).

```bash
$ objdump -s -j .rodata turno_guard
 47eb10  505c6e6f 76012e09 5c05eea5 cdefdfa6  P\nov...\.......
 47eb20  e3879ace 7e6c5800 ...
```

**Herramienta:** `python3`. **Por qué:** aplicar la operación inversa `MASKED[i] ^ (7 + 13*i)` byte a byte.

```python
masked = bytes.fromhex('505c6e6f76012e095c05eea5cdefdfa6e3879ace7e6c58')
flag = ''.join(chr(m ^ ((7 + 0xd*i) & 0xff)) for i, m in enumerate(masked))
print(flag)   # WHOAMI{k3yg3n_bl4ck0ut}
```

### 4. Confirmar

```bash
$ echo "WHOAMI{k3yg3n_bl4ck0ut}" | ./turno_guard
[OK] Turno autorizado. Envia el token al arena.
```

## Lección

Un comparador con "clave progresiva" (XOR con contador) se revierte fácil: reconstruye la secuencia de claves (`7, 20, 33, 46, …`) y aplica `masked[i] ^ key[i]`. El valor final del contador (`0x32`) también delata la longitud exacta del token.