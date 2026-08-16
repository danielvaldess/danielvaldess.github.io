// Challenge metadata — content loaded from writeups/*.md on demand
const WRITEUPS = [
  {
    "id": "api-de-sectores",
    "title": "API de sectores",
    "category": "Web",
    "points": 250,
    "slug": "api-de-sectores",
    "files": [
      "startlab.sh",
      "blackout-web03.tar"
    ],
    "desc": "Tablero de telemetría de campo. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker."
  },
  {
    "id": "archivo-de-turnos",
    "title": "Archivo de turnos",
    "category": "Pentesting",
    "points": 300,
    "slug": "archivo-de-turnos",
    "files": [
      "startlab.sh",
      "blackout-pt02.tar"
    ],
    "desc": "Nodo de archivo de turnos del sector 14. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker."
  },
  {
    "id": "bitacora-del-blackout",
    "title": "Bitácora del blackout",
    "category": "Misc",
    "points": 300,
    "slug": "bitacora-del-blackout",
    "files": [
      "turno.log",
      "alerta.wav",
      "spectrogram.png"
    ],
    "desc": "Export parcial del turno SCADA + alarma de audio. Reconstruye la secuencia y envía ."
  },
  {
    "id": "boveda-keepass",
    "title": "Bóveda KeePass",
    "category": "Cripto",
    "points": 500,
    "slug": "boveda-keepass",
    "files": [
      "ingeniero.kdbx",
      "politica_acceso.txt"
    ],
    "desc": "Bóveda KeePass (ingeniero.kdbx) con las claves de recuperación del sector 14. Abre la entrada y envía ."
  },
  {
    "id": "carga-de-evidencias",
    "title": "Carga de evidencias",
    "category": "Web",
    "points": 425,
    "slug": "carga-de-evidencias",
    "files": [
      "startlab.sh",
      "blackout-web05.tar"
    ],
    "desc": "Bandeja de evidencias de campo. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker."
  },
  {
    "id": "cartel-en-la-subestacion",
    "title": "Cartel en la subestación",
    "category": "Misc",
    "points": 100,
    "slug": "cartel-en-la-subestacion",
    "files": [
      "subestacion.jpg"
    ],
    "desc": "Durante el apagón LATAM, un operador documentó la subestación Norte. Analiza la foto y encuentra ."
  },
  {
    "id": "coordenadas-del-apagon",
    "title": "Coordenadas del apagón",
    "category": "Misc",
    "points": 500,
    "slug": "coordenadas-del-apagon",
    "files": [
      "qr_a.png",
      "qr_b.png",
      "qr_c.png",
      "comunicado.html",
      "cargas.csv"
    ],
    "desc": "Paquete incompleto del mapa de verificación (sector 14). Recompone el mapa y envía ."
  },
  {
    "id": "diagnostico-de-enlace",
    "title": "Diagnóstico de enlace",
    "category": "Web",
    "points": 350,
    "slug": "diagnostico-de-enlace",
    "files": [
      "startlab.sh",
      "blackout-web04.tar"
    ],
    "desc": "Visor de diagnóstico de enlace de la subestación Norte. Descarga el zip del lab y ejecútalo en Kali/Linux con Docker."
  },
  {
    "id": "evidencia-en-http",
    "title": "Evidencia en HTTP",
    "category": "Forense",
    "points": 500,
    "slug": "evidencia-en-http",
    "files": [
      "sala_control.pcap"
    ],
    "desc": "Descarga PNG desde el portal forense capturada en sala de control. Extrae el archivo del PCAP y envía ."
  },
  {
    "id": "exfiltracion-dns",
    "title": "Exfiltración DNS",
    "category": "Forense",
    "points": 300,
    "slug": "exfiltracion-dns",
    "files": [
      "exfil_dns.pcap"
    ],
    "desc": "Consultas DNS anómalas hacia . Reconstruye la secuencia y envía ."
  },
  {
    "id": "gateway-scada",
    "title": "Gateway SCADA",
    "category": "Web",
    "points": 500,
    "slug": "gateway-scada",
    "files": [
      "startlab.sh",
      "blackout-web06.tar"
    ],
    "desc": "Gateway de consulta de telemetría. Descarga el zip del lab y ejecútalo en Kali/Linux con Docker."
  },
  {
    "id": "informe-sector-14",
    "title": "Informe sector 14",
    "category": "Web",
    "points": 125,
    "slug": "informe-sector-14",
    "files": [
      "startlab.sh",
      "blackout-web01.tar"
    ],
    "desc": "LATAM Energía Red dejó un portal de consulta de informes tras el apagón del sector 14. Descarga el zip del lab y ejecútalo en Kali/Linux..."
  },
  {
    "id": "intranet-del-patio",
    "title": "Intranet del patio",
    "category": "Pentesting",
    "points": 500,
    "slug": "intranet-del-patio",
    "files": [
      "startlab.sh",
      "blackout-pt04.tar"
    ],
    "desc": "Intranet del patio Norte (caja, turnos e inventario). Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker."
  },
  {
    "id": "login-del-operador",
    "title": "Login del operador",
    "category": "Web",
    "points": 175,
    "slug": "login-del-operador",
    "files": [
      "startlab.sh",
      "blackout-web02.tar"
    ],
    "desc": "Portal de guardia de la subestación Norte. Descarga el zip del lab y ejecútalo en Kali/Linux con Docker."
  },
  {
    "id": "mascara-latam",
    "title": "Máscara LATAM",
    "category": "Cripto",
    "points": 400,
    "slug": "mascara-latam",
    "files": [
      "boveda.zip",
      "hash_maestra.sha256",
      "pista_ingeniero.txt"
    ],
    "desc": "Clave maestra del temporizador SCADA documentada solo como SHA256. La misma clave protege . Recupera ."
  },
  {
    "id": "nodo-del-patio-norte",
    "title": "Nodo del patio Norte",
    "category": "Pentesting",
    "points": 125,
    "slug": "nodo-del-patio-norte",
    "files": [
      "startlab.sh",
      "blackout-pt01.tar"
    ],
    "desc": "LATAM Energía Red dejó el nodo del patio Norte en modo recuperación. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con..."
  },
  {
    "id": "pin-operador",
    "title": "PIN del operador",
    "category": "Cripto",
    "points": 125,
    "slug": "pin-operador",
    "files": [
      "pin_operador.hash",
      "leeme.txt",
      "nota_recuperacion.zip"
    ],
    "desc": "Hash MD5 del PIN del panel local de la subestación Norte y un ZIP cifrado con esa misma clave. Recupera ."
  },
  {
    "id": "radio-de-campo",
    "title": "Radio de campo",
    "category": "Pentesting",
    "points": 400,
    "slug": "radio-de-campo",
    "files": [
      "startlab.sh",
      "blackout-pt03.tar"
    ],
    "desc": "Nodo de radio de campo del sector 14. Descarga el zip del lab (Google Drive) y ejecútalo en Kali/Linux con Docker."
  },
  {
    "id": "rele-scada",
    "title": "Relé SCADA",
    "category": "Binarios",
    "points": 125,
    "slug": "rele-scada",
    "files": [
      "scada_relay"
    ],
    "desc": "Firmware del relé SCADA SN-441 (ELF Linux x64). Recupera el token ."
  },
  {
    "id": "shadow-del-turno",
    "title": "Shadow del turno",
    "category": "Cripto",
    "points": 300,
    "slug": "shadow-del-turno",
    "files": [
      "shadow_turno.txt",
      "export_consola.txt",
      "consola.zip"
    ],
    "desc": "Backup parcial de /etc/shadow del servidor de consola. El password de operador.turno también abre el ZIP. Recupera ."
  },
  {
    "id": "telemetria-xor",
    "title": "Telemetría XOR",
    "category": "Binarios",
    "points": 300,
    "slug": "telemetria-xor",
    "files": [
      "telemetry_decode"
    ],
    "desc": "Utilitario (ELF Linux x64). Imprime payload en hex; recupera ."
  },
  {
    "id": "trafico-de-control",
    "title": "Tráfico de control",
    "category": "Forense",
    "points": 125,
    "slug": "trafico-de-control",
    "files": [
      "blackout_control.pcap"
    ],
    "desc": "PCAP parcial del portal SCADA durante el apagón. El operador autenticó en claro; recupera ."
  },
  {
    "id": "validador-de-turno",
    "title": "Validador de turno",
    "category": "Binarios",
    "points": 400,
    "slug": "validador-de-turno",
    "files": [
      "turno_guard"
    ],
    "desc": "Validador (ELF Linux x64). Solo acepta un token exacto ."
  },
  {
    "id": "vm-plc",
    "title": "VM PLC",
    "category": "Binarios",
    "points": 500,
    "slug": "vm-plc",
    "files": [
      "plc_ladder"
    ],
    "desc": "Mini-VM ladder en (ELF Linux x64). Recupera la clave maestra ."
  }
];
