# Telemetría XOR

> Utilitario `telemetry_decode` (ELF Linux x64). Imprime payload en hex; recupera `WHOAMI{...}`.
>
> **Consejo:** `chmod +x` y ejecuta el binario. Si Permission denied, el bit de ejecución no está activo.

**Flag:** `WHOAMI{x0r_t3l3m3tr14}`

---

## Resolución

### 1. Ejecutar el binario

**Herramienta:** ejecutar el binario. **Por qué:** el consejo del reto sugiere simplemente ejecutarlo; un utilitario suele imprimir la información necesaria por pantalla sin desensamblar.

**Parámetros:** `chmod +x` activa el bit de ejecución (por eso fallaba si no se ponía), luego se invoca.

```bash
$ chmod +x telemetry_decode && ./telemetry_decode
Red LATAM — telemetria post-blackout (cruda)
Metadatos firmware: sector=14|cipher=xor|key=LATAM!
Payload cifrado (hex):
1b091b0000683739643312557f2d672c7e553e70603c
Use la clave del operador para XOR y recuperar el token.
```

**Lo que vi:** el propio binario lo dice todo — `cipher=xor`, `key=LATAM!` — y entrega el payload cifrado en hex. No hay que desensamblar nada.

### 2. Decodificar el XOR

**Herramienta:** `python3`. **Por qué:** el XOR por byte con una clave en ciclo se resuelve con un pequeño script.

**Parámetros/lógica:** `bytes.fromhex(...)` convierte el payload hex a bytes; `payload[i] ^ key[i % len(key)]` aplica la clave `LATAM!` en ciclo sobre cada byte; `.decode()` muestra el texto.

```bash
$ python3 -c "
payload = bytes.fromhex('1b091b0000683739643312557f2d672c7e553e70603c')
key = b'LATAM!'
print(bytes(payload[i] ^ key[i % len(key)] for i in range(len(payload))).decode())
"
WHOAMI{x0r_t3l3m3tr14}
```

## Lección

Cuando un binario imprima metadatos con `cipher=xor` y `key=...`, ejecútalo antes de desensamblar: a veces la solución está en la propia salida. XOR por byte con la clave en ciclo (`. ` i % len(key)`) decodifica el payload.