#!/usr/bin/env python3
"""One-camera, bounded H.264 copy publisher. HTTPS outbound only."""
import argparse
import datetime
import http.client
import json
import os
from pathlib import Path
import re
import signal
import ssl
import subprocess
import sys
import tempfile
import threading
import time
from urllib.parse import urlsplit
import uuid
from media import compatible, probe

SEGMENT_LIMIT = 2 * 1024 * 1024
SPOOL_LIMIT = 16 * 1024 * 1024


def ffmpeg_command(source, directory):
    return [
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
        "-rtsp_transport", "tcp", "-timeout", "10000000",
        "-i", source, "-map", "0:v:0", "-an", "-c:v", "copy",
        "-f", "hls", "-hls_time", "1", "-hls_list_size", "6",
        "-hls_delete_threshold", "1", "-hls_segment_type", "mpegts",
        "-hls_flags", "delete_segments+temp_file+program_date_time",
        "-hls_segment_filename", str(Path(directory) / "%09d.ts"),
        str(Path(directory) / "index.m3u8"),
    ]


def read_playlist(text):
    duration, started = None, None
    segments = []
    for line in text.splitlines():
        if line.startswith("#EXTINF:"):
            duration = float(line.split(":", 1)[1].split(",")[0])
        elif line.startswith("#EXT-X-PROGRAM-DATE-TIME:"):
            started = line.split(":", 1)[1]
        elif line and not line.startswith("#"):
            if not re.fullmatch(r"\d{9}\.ts", line) or duration is None or started is None:
                raise RuntimeError("Lista local inválida.")
            segments.append((int(line[:-3]), line, duration, started))
            duration, started = None, None
    return segments


def validate_config(config):
    source = urlsplit(config["rtspUrl"])
    receiver = urlsplit(config["receiverOrigin"])
    if source.scheme not in ("rtsp", "rtsps") or not source.hostname:
        raise ValueError("Se requiere la URL real del secundario.")
    if (receiver.scheme != "https" or not receiver.hostname or receiver.username
            or receiver.password or receiver.path not in ("", "/")
            or receiver.query or receiver.fragment):
        raise ValueError("El receptor requiere HTTPS válido.")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,47}", config["cameraId"]):
        raise ValueError("Identificador de cámara inválido.")
    if not re.fullmatch(r"[A-Za-z0-9_-]{32,256}", config["publisherKey"]):
        raise ValueError("Credencial del dispositivo inválida.")
    if config.get("confirmedH264IndependentSegments") is not True:
        raise ValueError("Confirmar primero H.264, IDR e independencia del secundario.")
    return receiver


def upload(config, receiver, epoch, item, data):
    sequence, _, duration, started = item
    if not 0.04 <= duration <= 2 or len(data) > SEGMENT_LIMIT:
        raise RuntimeError("Segmento fuera de límites; revisar IDR/bitrate.")
    captured = datetime.datetime.fromisoformat(started.replace("Z", "+00:00"))
    if abs(time.time() - captured.timestamp()) > 8:
        raise RuntimeError("Segmento antiguo; reiniciar en el directo.")
    context = ssl.create_default_context(cafile=config.get("caFile"))
    connection = http.client.HTTPSConnection(receiver.hostname, receiver.port or 443,
                                              timeout=4, context=context)
    try:
        connection.request(
            "PUT", f"/ingest/{config['cameraId']}/{epoch}/{sequence}", body=data,
            headers={
                "Authorization": "Bearer " + config["publisherKey"],
                "Content-Type": "video/mp2t",
                "X-Segment-Duration": str(duration),
                "X-Segment-Start": started,
            },
        )
        response = connection.getresponse()
        response.read(4096)
        if response.status != 204:
            raise RuntimeError("Subida rechazada; comprobar configuración/estado.")
    finally:
        connection.close()


def relay_epoch(config, stop, command_factory=ffmpeg_command, uploader=upload):
    receiver = validate_config(config)
    epoch = str(uuid.uuid4())
    # Never put spool in the repository or retain it between reconnections.
    with tempfile.TemporaryDirectory(prefix="stableeye-live-", dir=config.get("spoolRoot")) as folder:
        directory = Path(folder)
        child = subprocess.Popen(command_factory(config["rtspUrl"], directory),
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL)
        watchdog_stop = threading.Event()
        violation = threading.Event()

        def watchdog():
            while not watchdog_stop.wait(0.2):
                try:
                    sizes = [path.stat().st_size for path in directory.iterdir() if path.is_file()]
                    if sum(sizes) > SPOOL_LIMIT or any(size > SEGMENT_LIMIT for size in sizes):
                        violation.set()
                        child.terminate()
                        return
                except FileNotFoundError:
                    pass  # FFmpeg atomically replaces/deletes files.

        watcher = threading.Thread(target=watchdog, daemon=True)
        watcher.start()
        last_sequence = None
        last_progress = time.monotonic()
        try:
            while not stop.wait(0.1):
                if child.poll() is not None or violation.is_set():
                    raise RuntimeError("Origen interrumpido o cola fuera de límites.")
                try:
                    items = read_playlist((directory / "index.m3u8").read_text())
                except FileNotFoundError:
                    items = []
                pending = [item for item in items if last_sequence is None or item[0] > last_sequence]
                if last_sequence is None:
                    pending = pending[-3:]
                for item in pending:
                    if last_sequence is not None and item[0] != last_sequence + 1:
                        raise RuntimeError("Hueco de vídeo: volver a publicar una sesión nueva.")
                    data = (directory / item[1]).read_bytes()
                    uploader(config, receiver, epoch, item, data)
                    last_sequence = item[0]
                    last_progress = time.monotonic()
                if time.monotonic() - last_progress > 8:
                    raise RuntimeError("El secundario no produce segmentos a tiempo.")
        finally:
            watchdog_stop.set()
            watcher.join(timeout=1)
            if child.poll() is None:
                child.terminate()
                try:
                    child.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    try:
        path = Path(args.config)
        if path.stat().st_mode & 0o077:
            raise ValueError("El archivo privado debe tener permisos 600.")
        config = json.loads(path.read_text())
        validate_config(config)
        if not compatible((probe(config["rtspUrl"]).get("streams") or [{}])[0]):
            raise ValueError("Se requiere H.264 yuv420p sin B-frames; no se recodifica.")
    except Exception:
        print("Configuración/diagnóstico inválido. Revisar guía privada; no se muestran secretos.", file=sys.stderr)
        return 1
    stop = threading.Event()
    for event in (signal.SIGINT, signal.SIGTERM):
        signal.signal(event, lambda *_: stop.set())
    delay = 1
    while not stop.is_set():
        started = time.monotonic()
        try:
            relay_epoch(config, stop)
        except Exception:
            print("Publicación interrumpida; se descartará la cola y se reconectará.", flush=True)
        if time.monotonic() - started > 30:
            delay = 1
        stop.wait(delay)
        delay = min(delay * 2, 30)
    return 0


if __name__ == "__main__":
    sys.exit(main())
