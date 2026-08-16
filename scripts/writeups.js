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
  }
];
