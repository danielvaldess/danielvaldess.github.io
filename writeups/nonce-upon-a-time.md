# Nonce Upon a Time

> LicenseForge signs license tokens with ECDSA, but the nonce is generated with only 248 bits of entropy. The Hidden Number Problem recovers the private key.
> **Flag:** `flag{481e1c6c3b7b7098}`

---

## Solution

### 1. Read the signing code

`server.py` exposes `GET /api/info`, `POST /api/sign` and `POST /api/activate`.
The signature is ECDSA over P-256:

```python
k = random.getrandbits(256) >> 8
```

The right shift zeroes the top 8 bits, so every nonce is only 248 bits. That
small bias makes the private key recoverable from enough signatures.

### 2. Collect signatures

`/api/sign` refuses `type=admin`, but happily signs normal licenses. 105 valid
signatures over known messages are enough.

### 3. Hidden Number Problem

Each signature gives `s·k = z + r·d (mod n)`, and the top 8 bits of `k` are zero.
That is a classic lattice problem; with `fpylll` on WSL, LLL recovers `d`:

```python
from fpylll import IntegerMatrix, LLL
# build the lattice from the 105 (r, s, z) triples ...
```

Recovered private key:

```text
0x5714b9ed4675d88dfda9bc5a0edbc4339bedd16264716f6101156f0b31cba820
```

### 4. Forge the admin license

Sign `{"user":"admin","type":"admin"}` with the recovered key and submit it:

```http
POST /api/activate
Content-Type: application/json

{
  "token": "{\"user\":\"admin\",\"type\":\"admin\"}",
  "r": "0x9dcc5ac260b5915dc72fd4118e11a4a80b90a2e1bb938030af016ab4e5856834",
  "s": "0x9528339c2e5b14172c38162788baf160f00d2eb815af1e9f6749d2c0af5b33f"
}
```

Response:

```json
{"flag": "flag{481e1c6c3b7b7098}", "license": "admin", "status": "activated"}
```

### 5. Flag

```text
flag{481e1c6c3b7b7098}
```

### New instance (current run)

Against `https://e8a2b7633fab3ad5.chal.ctf.ae`, the same lattice attack and
forged token returned:

```text
{"flag":"flag{7a3e205d859be167}","license":"admin","message":"Administrative license activated successfully","status":"activated"}
```

## Lesson

ECDSA needs a uniformly random nonce. Losing even a few bits per signature leaks
the long-term private key once enough signatures are collected, and no amount of
"admin tokens cannot be signed" logic helps after that.

---

### Credits

Part of the **FLUIDATTACKS CTF** (ctf.ae).
