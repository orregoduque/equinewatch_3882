#!/usr/bin/env python3
"""Diagnostic only. No camera configuration writes and no video recording."""
import argparse
import getpass
import json
import sys
from media import probe, summarize, inspect_idr


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seconds", type=int, default=60, choices=range(10, 301))
    parser.add_argument("--idr-seconds", type=int, default=10, choices=range(5, 61))
    args = parser.parse_args()
    source = getpass.getpass("URL RTSP real del secundario (oculta): ")
    try:
        result = summarize(probe(source, args.seconds))
        if result["h264_copy_candidate"]:
            result.update(inspect_idr(source, result["stream"]["time_base"], args.idr_seconds))
    except Exception:
        print("Diagnóstico fallido. Revisar acceso y herramientas; no se muestran credenciales.", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
