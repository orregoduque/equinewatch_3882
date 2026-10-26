#!/usr/bin/env python3
"""Prepare additive private files locally. Never installs, starts or overwrites."""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sys

LUCERO = "a95f853c-e90b-4b6d-a4ea-f25cfa317119"
THUNDER = "d826a274-58ea-4a55-8fd2-1d4c78222ab1"


def build_setup(current, publisher_key, confirmed=False):
    if not re.fullmatch(r"[A-Za-z0-9_-]{32,256}", publisher_key):
        raise ValueError("Invalid publisher key")
    cameras = current.get("cameras", [])
    if not 1 <= len(cameras) < 4:
        raise ValueError("Receiver camera capacity")
    lucero = [c for c in cameras if c["id"] == "bacata-mock"]
    if len(lucero) != 1 or lucero[0]["horseId"] != LUCERO:
        raise ValueError("Verify existing Lucero assignment first")
    if any(c["id"] == "bacata-thunder" or c["horseId"] == THUNDER for c in cameras):
        raise ValueError("Thunder assignment already exists; do not overwrite")
    key_hash = hashlib.sha256(publisher_key.encode()).hexdigest()
    if key_hash == current.get("appProxyKeySha256") or any(
            c.get("publisherKeySha256") == key_hash for c in cameras):
        raise ValueError("Each publisher needs a distinct key")
    result = copy.deepcopy(current)
    result["cameras"].append({
        "id": "bacata-thunder", "name": "Thunder", "horseId": THUNDER,
        "ownerUserIds": [], "stableOwnerUserIds": [],
        "publisherKeySha256": key_hash,
    })
    agent = {
        "rtspUrl": "rtsp://192.168.1.109:554/avstream/channel=1/stream=1.sdp",
        "receiverOrigin": "https://hls-receiverzip.replit.app",
        "cameraId": "bacata-thunder", "publisherKey": publisher_key,
        "confirmedH264IndependentSegments": confirmed,
        "spoolRoot": "/run/stableeye-hls-thunder",
    }
    return result, agent


def prepare(current, directory, confirmed=False):
    receiver, agent = build_setup(current, secrets.token_urlsafe(32), confirmed)
    directory.mkdir(mode=0o700)  # Must be new; never overwrite a live configuration.
    for filename, value in [("receiver-next.secret.json", receiver),
                            ("hls-thunder.secret.json", agent)]:
        fd = os.open(directory / filename, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as handle:
            json.dump(value, handle, indent=2)
            handle.write("\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--receiver-config", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--prepare-private-files", required=True, action="store_true")
    parser.add_argument("--confirm-h264-keyframes", action="store_true")
    args = parser.parse_args()
    try:
        current = json.loads(Path(args.receiver_config).read_text())
        prepare(current, Path(args.output), args.confirm_h264_keyframes)
    except Exception:
        print("No se preparó Thunder. Verifica la asignación actual de Lucero, "
              "que Thunder no exista y que la carpeta de salida sea nueva. "
              "No se muestran claves ni se modifican servicios.", file=sys.stderr)
        return 1
    print("Archivos privados preparados. Ningún servicio o Secret remoto fue modificado.")
    print("receiver-next.secret.json: aplicar mediante Secrets en el receptor, nunca por chat.")
    print("hls-thunder.secret.json: instalar localmente; no compartir ni guardar en Git.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
