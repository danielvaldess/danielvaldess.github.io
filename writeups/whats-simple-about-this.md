# What's Simple About This

> SAM and SYSTEM hives with more than one account. What is the NTLM hash associated with a null (empty string) password?
> **Flag:** `31d6cfe0d16ae931b73c59d7e0c089c0`

---

## Solution

### 1. Extract the archive

```bash
$ unzip hives.zip
$ ls hives/
sam  system
```

### 2. Derive the bootkey from SYSTEM

The SAM hashes are encrypted with a bootkey derived from the class-name keys under
`ControlSet001\Control\Class` in the SYSTEM hive:

```python
from impacket.examples.secretsdump import LocalOperations, SAMHashes

lo = LocalOperations('system')
bootKey = lo.getBootKey()          # fef8482eca8898c9ef0990dae88a4a62
SAMHashes('sam', bootKey, isRemote=False).dump()
```

### 3. Dump the accounts

```text
Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
WDAGUtilityAccount:504:...:a86d6fcd7ef0a94b9137607d85a464f8:::
matches:1000:...:13b29964cc2480b4ef454c59562e675c:::
morty:1001:...:8de1664032f84dc693102d506539c49f:::
operator01:1002:...:e337e31aa4c614b2895ad684a51156df:::
svc_historian:1006:...:9e1708935a8ec3f72a94cdd8dd3da57a:::
```

### 4. Identify the null password

The NT hash of the empty string is always
`31d6cfe0d16ae931b73c59d7e0c089c0`, paired with the LM hash
`aad3b435b51404eeaad3b435b51404ee`. It appears for Administrator, Guest and
DefaultAccount.

### 5. Flag

```text
31d6cfe0d16ae931b73c59d7e0c089c0
```

## Lesson

Knowing the constant NT hash of the empty string answers the question without
cracking anything. Recognise it before spending GPU time on a hash that has no
password.

---

### Credits

This writeup is part of the **Dragos CTF**. Offline file analysis (no live instance).
