#!/usr/bin/env python3
"""Operator-run setup on the Pi. Never run this to collect keys into a chat."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sys
from urllib.parse import urlsplit
from uuid import UUID


def build_config(template, publisher_key, proxy_key):
    for key in (publisher_key, proxy_key):
        if not re.fullmatch(r"[A-Za-z0-9_-]{32,256}", key):
            raise ValueError("Credencial inválida.")
    if publisher_key == proxy_key:
        raise ValueError("Se requieren dos credenciales distintas.")
    origin = urlsplit(template["supabaseUrl"])
    if origin.scheme != "https" or not origin.hostname or origin.username or origin.password \
            or origin.path not in ("", "/") or origin.query or origin.fragment:
        raise ValueError("Origen Supabase inválido.")
    if not isinstance(template["supabaseAnonKey"], str) or not template["supabaseAnonKey"]:
        raise ValueError("Falta clave pública anon.")
    admins = template["adminUserIds"]
    if not isinstance(admins, list) or len(admins) != 1:
        raise ValueError("Este asistente autoriza solo un administrador del piloto.")
    UUID(admins[0])
    cameras = template["cameras"]
    if not isinstance(cameras, list) or len(cameras) != 1:
        raise ValueError("Este asistente configura una cámara.")
    camera = cameras[0]
    UUID(camera["horseId"])
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,47}", camera["id"]):
        raise ValueError("ID de cámara inválido.")
    if not isinstance(camera["name"], str) or not 1 <= len(camera["name"]) <= 120:
        raise ValueError("Nombre de cámara inválido.")
    # Reconstruct from an allowlist: no extra users, raw credentials, host or TLS settings.
    return {
        "supabaseUrl": template["supabaseUrl"],
        "supabaseAnonKey": template["supabaseAnonKey"],
        "appProxyKeySha256": hashlib.sha256(proxy_key.encode()).hexdigest(),
        "adminUserIds": admins,
        "cameras": [{
            "id": camera["id"], "name": camera["name"], "horseId": camera["horseId"],
            "ownerUserIds": [], "stableOwnerUserIds": [],
            "publisherKeySha256": hashlib.sha256(publisher_key.encode()).hexdigest(),
        }],
    }


def prepare(template, directory):
    publisher_key, proxy_key = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    config = build_config(template, publisher_key, proxy_key)
    directory.mkdir(mode=0o700)  # Refuse to overwrite any prior setup or symlink.
    contents = {
        "receiver.secret.json": json.dumps(config, indent=2) + "\n",
        "app-proxy.secret.txt": proxy_key + "\n",
        "publisher.secret.txt": publisher_key + "\n",
    }
    for name, content in contents.items():
        descriptor = os.open(directory / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w") as file:
            file.write(content)


def main():
    parser = argparse.ArgumentParser(description="Generar configuración privada local sin imprimir claves.")
    parser.add_argument("--template", required=True)
    parser.add_argument("--output", required=True, help="Carpeta nueva, privada y fuera de Git.")
    parser.add_argument("--generate-private-files", required=True, action="store_true")
    args = parser.parse_args()
    try:
        template = json.loads(Path(args.template).read_text())
        prepare(template, Path(args.output).expanduser())
    except Exception:
        print("No se pudo preparar: revisar plantilla y usar una carpeta nueva fuera de Git. "
              "No se muestran datos privados.", file=sys.stderr)
        return 1
    print("Preparación local terminada; no se cambiaron servicios ni archivos de configuración existentes.")
    print("receiver.secret.json → HLS_RECEIVER_CONFIG en Secrets del proyecto receptor.")
    print("app-proxy.secret.txt → HLS_PROXY_KEY en Secrets del proyecto Stable Eye.")
    print("publisher.secret.txt → publisherKey del agente, mediante el configurador privado de la Pi.")
    print("No pegar estos archivos en chats, commits ni capturas. Ignorar el salto final al copiar claves.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
