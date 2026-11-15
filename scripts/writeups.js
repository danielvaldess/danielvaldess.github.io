// Challenge metadata — content loaded from writeups/*.md on demand
const WRITEUPS = [
  {
    "id": "sector-api",
    "title": "Sector API",
    "category": "Web",
    "points": 250,
    "slug": "sector-api",
    "files": [
      "startlab.sh",
      "blackout-web03.tar"
    ],
    "desc": "Field telemetry dashboard. Download the lab zip (Google Drive) and run it on Kali/Linux with Docker."
  },
  {
    "id": "shift-archive",
    "title": "Shift Archive",
    "category": "Pentesting",
    "points": 300,
    "slug": "shift-archive",
    "files": [
      "startlab.sh",
      "blackout-pt02.tar"
    ],
    "desc": "Sector 14 shift archive node. Download the lab zip (Google Drive) and run it on Kali/Linux with Docker."
  },
  {
    "id": "blackout-log",
    "title": "Blackout Log",
    "category": "Misc",
    "points": 300,
    "slug": "blackout-log",
    "files": [
      "turno.log",
      "alerta.wav",
      "spectrogram.png"
    ],
    "desc": "Partial SCADA shift export + audio alarm. Reconstruct the sequence and submit."
  },
  {
    "id": "keepass-vault",
    "title": "KeePass Vault",
    "category": "Crypto",
    "points": 500,
    "slug": "keepass-vault",
    "files": [
      "ingeniero.kdbx",
      "politica_acceso.txt"
    ],
    "desc": "KeePass vault (ingeniero.kdbx) with sector 14 recovery keys. Open the entry and submit."
  },
  {
    "id": "evidence-upload",
    "title": "Evidence Upload",
    "category": "Web",
    "points": 425,
    "slug": "evidence-upload",
    "files": [
      "startlab.sh",
      "blackout-web05.tar"
    ],
    "desc": "Field evidence tray. Download the lab zip (Google Drive) and run it on Kali/Linux with Docker."
  },
  {
    "id": "substation-sign",
    "title": "Substation Sign",
    "category": "Misc",
    "points": 100,
    "slug": "substation-sign",
    "files": [
      "subestacion.jpg"
    ],
    "desc": "During the LATAM blackout, an operator documented the North substation. Analyze the photo and find."
  },
  {
    "id": "blackout-coordinates",
    "title": "Blackout Coordinates",
    "category": "Misc",
    "points": 500,
    "slug": "blackout-coordinates",
    "files": [
      "qr_a.png",
      "qr_b.png",
      "qr_c.png",
      "comunicado.html",
      "cargas.csv"
    ],
    "desc": "Incomplete verification map package (sector 14). Reassemble the map and submit."
  },
  {
    "id": "link-diagnostics",
    "title": "Link Diagnostics",
    "category": "Web",
    "points": 350,
    "slug": "link-diagnostics",
    "files": [
      "startlab.sh",
      "blackout-web04.tar"
    ],
    "desc": "North substation link diagnostics viewer. Download the lab zip and run it on Kali/Linux with Docker."
  },
  {
    "id": "http-evidence",
    "title": "HTTP Evidence",
    "category": "Forensics",
    "points": 500,
    "slug": "http-evidence",
    "files": [
      "sala_control.pcap"
    ],
    "desc": "PNG download from the forensics portal captured in the control room. Extract the file from the PCAP and submit."
  },
  {
    "id": "dns-exfiltration",
    "title": "DNS Exfiltration",
    "category": "Forensics",
    "points": 300,
    "slug": "dns-exfiltration",
    "files": [
      "exfil_dns.pcap"
    ],
    "desc": "Anomalous DNS queries to exfil.blackout.redlatam. Reconstruct the sequence and submit."
  },
  {
    "id": "scada-gateway",
    "title": "SCADA Gateway",
    "category": "Web",
    "points": 500,
    "slug": "scada-gateway",
    "files": [
      "startlab.sh",
      "blackout-web06.tar"
    ],
    "desc": "Telemetry query gateway. Download the lab zip and run it on Kali/Linux with Docker."
  },
  {
    "id": "sector-14-report",
    "title": "Sector 14 Report",
    "category": "Web",
    "points": 125,
    "slug": "sector-14-report",
    "files": [
      "startlab.sh",
      "blackout-web01.tar"
    ],
    "desc": "LATAM Energia Red left a report query portal after the sector 14 blackout. Download the lab zip and run it on Kali/Linux."
  },
  {
    "id": "yard-intranet",
    "title": "Yard Intranet",
    "category": "Pentesting",
    "points": 500,
    "slug": "yard-intranet",
    "files": [
      "startlab.sh",
      "blackout-pt04.tar"
    ],
    "desc": "North yard intranet (cashier, shifts, and inventory). Download the lab zip (Google Drive) and run it on Kali/Linux with Docker."
  },
  {
    "id": "operator-login",
    "title": "Operator Login",
    "category": "Web",
    "points": 175,
    "slug": "operator-login",
    "files": [
      "startlab.sh",
      "blackout-web02.tar"
    ],
    "desc": "North substation guard portal. Download the lab zip and run it on Kali/Linux with Docker."
  },
  {
    "id": "latam-mask",
    "title": "LATAM Mask",
    "category": "Crypto",
    "points": 400,
    "slug": "latam-mask",
    "files": [
      "boveda.zip",
      "hash_maestra.sha256",
      "pista_ingeniero.txt"
    ],
    "desc": "SCADA timer master key documented only as SHA256. The same key protects boveda.zip. Recover."
  },
  {
    "id": "north-yard-node",
    "title": "North Yard Node",
    "category": "Pentesting",
    "points": 125,
    "slug": "north-yard-node",
    "files": [
      "startlab.sh",
      "blackout-pt01.tar"
    ],
    "desc": "LATAM Energia Red left the north yard node in recovery mode. Download the lab zip (Google Drive) and run it on Kali/Linux."
  },
  {
    "id": "operator-pin",
    "title": "Operator PIN",
    "category": "Crypto",
    "points": 125,
    "slug": "operator-pin",
    "files": [
      "pin_operador.hash",
      "leeme.txt",
      "nota_recuperacion.zip"
    ],
    "desc": "MD5 hash of the North substation local panel PIN and a ZIP encrypted with the same key. Recover."
  },
  {
    "id": "field-radio",
    "title": "Field Radio",
    "category": "Pentesting",
    "points": 400,
    "slug": "field-radio",
    "files": [
      "startlab.sh",
      "blackout-pt03.tar"
    ],
    "desc": "Sector 14 field radio node. Download the lab zip (Google Drive) and run it on Kali/Linux with Docker."
  },
  {
    "id": "scada-relay",
    "title": "SCADA Relay",
    "category": "Binary",
    "points": 125,
    "slug": "scada-relay",
    "files": [
      "scada_relay"
    ],
    "desc": "SCADA relay SN-441 firmware (ELF Linux x64). Recover the token."
  },
  {
    "id": "shift-shadow",
    "title": "Shift Shadow",
    "category": "Crypto",
    "points": 300,
    "slug": "shift-shadow",
    "files": [
      "shadow_turno.txt",
      "export_consola.txt",
      "consola.zip"
    ],
    "desc": "Partial /etc/shadow backup from the console server. The operador.turno password also opens the ZIP. Recover."
  },
  {
    "id": "telemetry-xor",
    "title": "Telemetry XOR",
    "category": "Binary",
    "points": 300,
    "slug": "telemetry-xor",
    "files": [
      "telemetry_decode"
    ],
    "desc": "Telemetry decoder utility (ELF Linux x64). Prints hex payload; recover."
  },
  {
    "id": "control-traffic",
    "title": "Control Traffic",
    "category": "Forensics",
    "points": 125,
    "slug": "control-traffic",
    "files": [
      "blackout_control.pcap"
    ],
    "desc": "Partial SCADA portal PCAP during the blackout. The operator authenticated in plaintext; recover."
  },
  {
    "id": "shift-validator",
    "title": "Shift Validator",
    "category": "Binary",
    "points": 400,
    "slug": "shift-validator",
    "files": [
      "turno_guard"
    ],
    "desc": "Shift guard validator (ELF Linux x64). Only accepts an exact token."
  },
  {
    "id": "plc-vm",
    "title": "PLC VM",
    "category": "Binary",
    "points": 500,
    "slug": "plc-vm",
    "files": [
      "plc_ladder"
    ],
    "desc": "PLC ladder mini-VM (ELF Linux x64). Recover the master key."
  },
  {
    "id": "canary-wharf",
    "title": "Canary Wharf",
    "category": "Pwn",
    "points": 0,
    "slug": "canary-wharf",
    "files": [
      "bank",
      "bank.c",
      "libc.so.6",
      "public.zip"
    ],
    "desc": "Banking terminal with full mitigations. Format string leaks canary, PIE and libc; ret2libc finishes the job."
  },
  {
    "id": "deadbolt",
    "title": "Deadbolt",
    "category": "Crypto",
    "points": 0,
    "slug": "deadbolt",
    "files": [
      "public.zip"
    ],
    "desc": "Password-protected ZIP plus an AES-256-GCM vault whose PBKDF2 seed and salt are hardcoded in the Android client."
  },
  {
    "id": "glass-houses",
    "title": "Glass Houses",
    "category": "Mobile",
    "points": 0,
    "slug": "glass-houses",
    "files": [
      "public.zip"
    ],
    "desc": "Android real-estate app with an exposed WebView bridge. The simulator returns an admin JWT."
  },
  {
    "id": "ni8mare-lite",
    "title": "Ni8mare Lite",
    "category": "Web",
    "points": 380,
    "slug": "ni8mare-lite",
    "files": [],
    "desc": "LFI, XOR-derived session secret, forged admin JWT and a Python sandbox escape."
  },
  {
    "id": "nonce-upon-a-time",
    "title": "Nonce Upon a Time",
    "category": "Crypto",
    "points": 0,
    "slug": "nonce-upon-a-time",
    "files": [
      "server.py"
    ],
    "desc": "ECDSA with a biased nonce. The Hidden Number Problem and LLL recover the private key."
  },
  {
    "id": "phantom-decrypt",
    "title": "Phantom Decrypt",
    "category": "Mobile",
    "points": 0,
    "slug": "phantom-decrypt",
    "files": [
      "public.zip",
      "vault_backup.enc",
      "vault_decrypt.py"
    ],
    "desc": "Android vault with a hardcoded KDF seed. Decrypt the backup and replay the master password."
  },
  {
    "id": "select-isnt-a-choice",
    "title": "SELECT Isn't a Choice",
    "category": "Web",
    "points": 0,
    "slug": "select-isnt-a-choice",
    "files": [
      "views.py",
      "models.py",
      "urls.py"
    ],
    "desc": "Django ORM filter injection through the _connector parameter, turned into a boolean oracle."
  },
  {
    "id": "sheets",
    "title": "Sheets",
    "category": "Web",
    "points": 0,
    "slug": "sheets",
    "files": [],
    "desc": "XSS in a spreadsheet app, a cached admin API key and a pycel formula that reaches system()."
  },
  {
    "id": "the-alignment-trap",
    "title": "The Alignment Trap",
    "category": "Pwn",
    "points": 0,
    "slug": "the-alignment-trap",
    "files": [
      "cloudstorage"
    ],
    "desc": "32-bit integer overflow in a custom allocator, tcache poisoning and House of Apple 2 on glibc 2.39."
  },
  {
    "id": "the-password-is-swordfish",
    "title": "The Password is Swordfish",
    "category": "Pwn",
    "points": 150,
    "slug": "the-password-is-swordfish",
    "files": [],
    "desc": "Signed length check bypass on a static login binary. Straight ret2win."
  },
  {
    "id": "whispers-in-the-wire",
    "title": "Whispers in the Wire",
    "category": "Mobile",
    "points": 100,
    "slug": "whispers-in-the-wire",
    "files": [
      "public.zip"
    ],
    "desc": "Hardcoded API key accepted by the admin message endpoint. Replay it and read the private threads."
  },
  {
    "id": "epsilon-drift",
    "title": "epsilon-drift",
    "category": "Reversing",
    "points": 0,
    "slug": "epsilon-drift",
    "files": [
      "epsilon-drift.zip"
    ],
    "desc": "Bit-level validation of four IEEE-754 doubles where only a negative zero unlocks the flag."
  },
  {
    "id": "last-execution",
    "title": "Last Execution",
    "category": "Reversing",
    "points": 0,
    "slug": "last-execution",
    "files": [
      "last_execution.img"
    ],
    "desc": "Cold image of a fictional EXE-9 processor: twisted constants, a custom emulator and a lying telemetry log."
  },
  {
    "id": "night-batch",
    "title": "Night Batch",
    "category": "Reversing",
    "points": 0,
    "slug": "night-batch",
    "files": [
      "night-batch.zip"
    ],
    "desc": "GnuCOBOL validator with 23 modular checks recovered dynamically and solved with Z3."
  },
  {
    "id": "obfuscated-flow",
    "title": "Obfuscated Flow",
    "category": "Reversing",
    "points": 0,
    "slug": "obfuscated-flow",
    "files": [
      "rev-obs-flow.zip"
    ],
    "desc": "Obfuscated state machine with modular constraints, discrete logs and a 2x2 linear system."
  },
  {
    "id": "call-the-movers",
    "title": "Call the Movers",
    "category": "Forensics",
    "points": 0,
    "slug": "call-the-movers",
    "files": [
      "Callthemovers.pcap"
    ],
    "desc": "Post-compromise PCAP: find the non-default SMB share used for lateral movement."
  },
  {
    "id": "gotta-start-somewhere",
    "title": "Gotta Start Somewhere",
    "category": "Forensics",
    "points": 0,
    "slug": "gotta-start-somewhere",
    "files": [
      "HanddrawnNetworkDiagram.jpg",
      "NetworkDrawing_CVE_Details.docx"
    ],
    "desc": "Reconstruct an OT attack chain from a network diagram and a CVE list. Which port starts it?"
  },
  {
    "id": "please-schedule-an-appointment",
    "title": "Please Schedule an Appointment",
    "category": "Forensics",
    "points": 0,
    "slug": "please-schedule-an-appointment",
    "files": [
      "ScheduledTasks.zip"
    ],
    "desc": "Scheduled tasks and AppData from an OT workstation. Decode the PowerShell and find the exfiltration IP."
  },
  {
    "id": "so-many-options",
    "title": "So Many Options",
    "category": "Forensics",
    "points": 0,
    "slug": "so-many-options",
    "files": [
      "hives.zip"
    ],
    "desc": "SAM and SYSTEM hives. Crack operator01's cleartext password."
  },
  {
    "id": "target-acquired",
    "title": "Target Acquired",
    "category": "Forensics",
    "points": 0,
    "slug": "target-acquired",
    "files": [
      "TryAgain-TargetAcquired.pcap"
    ],
    "desc": "HTTP brute-force against an internal workstation. Identify the compromised host."
  },
  {
    "id": "try-and-try-again",
    "title": "Try and Try Again",
    "category": "Forensics",
    "points": 0,
    "slug": "try-and-try-again",
    "files": [
      "TryAgain-TargetAcquired.pcap"
    ],
    "desc": "Same capture, different question: which challenge-response mechanism protects the host?"
  },
  {
    "id": "whats-simple-about-this",
    "title": "What's Simple About This",
    "category": "Forensics",
    "points": 0,
    "slug": "whats-simple-about-this",
    "files": [
      "hives.zip"
    ],
    "desc": "Find the NTLM hash that corresponds to an empty password across the SAM accounts."
  },
  {
    "id": "whats-your-address",
    "title": "What's Your Address",
    "category": "Forensics",
    "points": 0,
    "slug": "whats-your-address",
    "files": [
      "HanddrawnNetworkDiagram.jpg",
      "NetworkDrawing_CVE_Details.docx"
    ],
    "desc": "Second hop of the OT chain: match the diagram, the firewall rule and the CVE versions."
  },
  {
    "id": "working-from-home",
    "title": "Working from Home",
    "category": "Forensics",
    "points": 0,
    "slug": "working-from-home",
    "files": [
      "Workfromhome.pcap"
    ],
    "desc": "Remote access, SCADA polling and corporate browsing in one capture. Who authenticates to the HMI?"
  },
  {
    "id": "whos-cutting-onions",
    "title": "Who's Cutting Onions",
    "category": "Forensics",
    "points": 0,
    "slug": "whos-cutting-onions",
    "files": [
      "ScheduledTasks.zip"
    ],
    "desc": "Follow-up to the scheduled task: apply the XOR key to the staged AppData file."
  }
];
