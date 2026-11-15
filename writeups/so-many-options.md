# So Many Options

> SAM and SYSTEM hives from the water treatment facility. What is the cleartext password of `operator01`?
> **Flag:** `operator`

---

## Solution

### 1. Extract the hives

```bash
$ unzip hives.zip
$ ls -l hives/
sam     65,536 bytes
system  17,952,768 bytes
```

### 2. Dump the SAM hashes

The SAM hashes are encrypted with the bootkey derived from the SYSTEM hive:

```python
from impacket.examples.secretsdump import LocalOperations, SAMHashes

lo = LocalOperations('system')
bootKey = lo.getBootKey()          # fef8482eca8898c9ef0990dae88a4a62
SAMHashes('sam', bootKey, isRemote=False).dump()
```

Relevant line:

```text
operator01:1002:aad3b435b51404eeaad3b435b51404ee:e337e31aa4c614b2895ad684a51156df:::
```

### 3. Crack the NT hash

`hashcat` needs OpenCL on this host, so `john` on the CPU with AVX-512:

```bash
$ echo 'e337e31aa4c614b2895ad684a51156df' > nt.hash
$ john --format=NT --wordlist=/usr/share/wordlists/rockyou.txt nt.hash
operator         (nt.hash)
```

### 4. Verify

The NT hash is MD4 of the UTF-16LE password:

```python
import hashlib
hashlib.new('md4', 'operator'.encode('utf-16-le')).hexdigest()
# e337e31aa4c614b2895ad684a51156df
```

### 5. Flag

```text
operator
```

## Lesson

Blank-password hashes are a decoy: responders must look at every account, not
only the obvious ones. Local recovery with `john` avoids the OpenCL dependency of
`hashcat` when the GPU is not available.

---

### Source

Offline file analysis (no live instance).
