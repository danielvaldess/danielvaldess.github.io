# Deadbolt

> The vault backup is encrypted twice: a password-protected ZIP and an AES-256-GCM blob whose key is derived from hardcoded Android values.
> **Flag:** `flag{Fl00d_G4t3s_0p3n!}`

---

## Solution

### 1. Crack the ZIP

```bash
$ zip2john public.zip > zip_hash.txt
$ john zip_hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
infected
$ 7z x public.zip -odeadbolt/ -pinfected
```

The archive holds the decompiled Android sources.

### 2. Read the key derivation

`CryptoManager.java` hardcodes everything needed to rebuild the AES key:

```java
SEED  = "fluidvault_master_seed_2026"
SALT  = a915c3e00dbb5a55ba13d7cdaf3a126e
passphrase = SEED + deviceId
```

`deviceId` is `Integer.toHexString("DEFAULT_DEVICE_ID".hashCode())`, the fallback
used when `Build.SERIAL` is `unknown`:

```text
c8e21b06
```

So the passphrase is `fluidvault_master_seed_2026c8e21b06`.

### 3. Derive the key

`PBKDF2WithHmacSHA256`, 10,000 iterations, 256-bit output:

```python
import hashlib
key = hashlib.pbkdf2_hmac(
    'sha256',
    b'fluidvault_master_seed_2026c8e21b06',
    bytes.fromhex('a915c3e00dbb5a55ba13d7cdaf3a126e'),
    10000, 32)
print(key.hex())
# c70cf882eaf48e1da954f0105594fef19704aeae00e86756501957a033faa91a
```

### 4. Decrypt the vault

```bash
$ python3 vault_decrypt.py c70cf882eaf48e1da954f0105594fef19704aeae00e86756501957a033faa91a
```

The decrypted JSON contains the Admin Portal credentials, and the portal password
is the flag.

### 5. Flag

```text
flag{Fl00d_G4t3s_0p3n!}
```

## Lesson

A "secure" KDF is worthless when the seed, the salt and the device identifier are
all constants inside the APK. Anything hardcoded in a client is public.

---

### Credits

Part of the **FLUIDATTACKS CTF** (ctf.ae).
