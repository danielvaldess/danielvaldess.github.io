# KeePass Vault

> KeePass vault (ingeniero.kdbx) containing the recovery keys for sector 14. Open the entry and submit `WHOAMI{...}`.
> **Tip:** KeePassXC + politica_acceso.txt, or keepass2john / hashcat -m 13400.

**Flag:** `WHOAMI{k33p4ss_b0v3d4_14}`

---

## Solution

The pack contains a KeePass vault (`ingeniero.kdbx`) and a `politica_acceso.txt` file that provides the key to derive the vault's master password. If the vault is opened, the "Recuperación sector 14" entry stores the flag.

### 1. Extract and inspect the files

```bash
$ unzip boveda_keepass.zip
```

- `ingeniero.kdbx` — KeePass database (Keepass password database 2.x KDBX)
- `politica_acceso.txt` — the password policy

### 2. Read the access policy

```bash
$ cat politica_acceso.txt
Política de acceso — Red LATAM Energía (2026)
Las bóvedas personales deben usar: RolDominio.Año
Ejemplo de forma: Ingeniero.Norte2026
No reutilizar PIN de panel local.
```

**What I found:** the policy provides the exact master password format: `RolDominio.Año`. The vault belongs to the *Ingeniero* (Engineer), and the example is `Ingeniero.Norte2026` → candidate password: **`Ingeniero.Norte2026`**.

### 3. Open the vault with KeePassXC

**Tool:** `keepassxc-cli`. **Why:** KeePassXC is a password manager compatible with KDBX; its CLI allows listing and displaying entries without a GUI.

First we list to confirm the password opens the vault and see its structure:

```bash
$ echo "Ingeniero.Norte2026" | keepassxc-cli ls -R -f ingeniero.kdbx
Blackout LATAM/
Blackout LATAM/Recuperación sector 14
```

**What I found:** the vault opened and contains a single entry, "Recuperación sector 14".

### 4. Display the protected entry

The flag is usually stored in fields marked as *protected*, so we display everything in plain text.

**Parameters:** `-q` (silences the prompt), `-s --show-protected` (displays protected attributes in plain text), `--all` (all fields).

```bash
$ echo "Ingeniero.Norte2026" | keepassxc-cli show -q -s --all "ingeniero.kdbx" "Blackout LATAM/Recuperación sector 14"
Title: Recuperación sector 14
UserName: ingeniero.campo@redlatam.energia
Password: WHOAMI{k33p4ss_b0v3d4_14}
URL:
Notes: Solo usar si el SCADA central no responde.
```

The flag was in the `Password` field of the entry.

## Lesson

A KeePass vault is only as secure as its master password: if the password format follows a predictable corporate policy (`RolDominio.Año`) and the policy file is leaked alongside the vault, the "protection" becomes meaningless. Furthermore, flags in protected fields can be read with `--show-protected`.
