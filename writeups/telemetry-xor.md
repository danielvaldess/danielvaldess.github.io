# Telemetry XOR

> `telemetry_decode` utility (ELF Linux x64). Prints hex payload; retrieve `WHOAMI{...}`.
> **Hint:** `chmod +x` and run the binary. If Permission denied, the execution bit is not set.

**Flag:** `WHOAMI{x0r_t3l3m3tr14}`

---

## Solution

The binary prints its own metadata revealing the cipher (XOR), the key, and the encrypted payload in hex. Running the binary and then decoding the XOR-encrypted payload with the provided key recovers the flag.

### 1. Run the Binary

**Tool:** run the binary. **Why:** the challenge hint suggests simply running it; a utility usually prints the necessary information to the screen without disassembly.

**Parameters:** `chmod +x` enables the execution bit (that's why it fails without it), then run it.

```bash
$ chmod +x telemetry_decode && ./telemetry_decode
Red LATAM — telemetria post-blackout (cruda)
Metadatos firmware: sector=14|cipher=xor|key=LATAM!
Payload cifrado (hex):
1b091b0000683739643312557f2d672c7e553e70603c
Use la clave del operador para XOR y recuperar el token.
```

**What I saw:** the binary itself says it all — `cipher=xor`, `key=LATAM!` — and delivers the encrypted payload in hex. No disassembly needed.

### 2. Decode the XOR

**Tool:** `python3`. **Why:** byte-wise XOR with a cycling key can be solved with a small script.

**Parameters/logic:** `bytes.fromhex(...)` converts the hex payload to bytes; `payload[i] ^ key[i % len(key)]` applies the key `LATAM!` cyclically to each byte; `.decode()` displays the text.

```bash
$ python3 -c "
payload = bytes.fromhex('1b091b0000683739643312557f2d672c7e553e70603c')
key = b'LATAM!'
print(bytes(payload[i] ^ key[i % len(key)] for i in range(len(payload))).decode())
"
WHOAMI{x0r_t3l3m3tr14}
```

## Lesson

When a binary prints metadata with `cipher=xor` and `key=...`, run it before disassembling: sometimes the solution is in the output itself. Byte-wise XOR with a cycling key (`i % len(key)`) decodes the payload.
