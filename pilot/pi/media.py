"""Read-only RTSP diagnostics. Never print the source URL or FFmpeg stderr."""
import json
import re
import statistics
import subprocess
from fractions import Fraction

STREAM_FIELDS = (
    "codec_name,profile,level,width,height,pix_fmt,r_frame_rate,"
    "avg_frame_rate,has_b_frames,bit_rate,time_base"
)


def probe(source, seconds=0):
    command = [
        "ffprobe", "-v", "error", "-rtsp_transport", "tcp",
        "-timeout", "10000000", "-analyzeduration", "5000000",
        "-probesize", "5000000", "-i", source, "-select_streams", "v:0",
        "-show_streams", "-show_entries", "stream=" + STREAM_FIELDS,
    ]
    if seconds:
        command += [
            "-read_intervals", f"%+{seconds}", "-show_packets",
            "-show_entries", "stream=" + STREAM_FIELDS
            + ":packet=pts_time,dts_time,size,flags",
        ]
    result = subprocess.run(command + ["-of", "json"], capture_output=True,
                            timeout=seconds + 25, check=False)
    if result.returncode:
        raise RuntimeError("No se pudo leer el secundario; revisar URL y acceso local.")
    return json.loads(result.stdout)


def compatible(stream):
    return (stream.get("codec_name") == "h264"
            and stream.get("pix_fmt") == "yuv420p"
            and stream.get("has_b_frames") == 0
            and int(stream.get("width", 0)) > 0
            and int(stream.get("height", 0)) > 0)


def trace_summary(text, time_base):
    packets = []
    current = None
    for line in text.splitlines():
        match = re.search(r"Packet:.*?pts (-?\d+),", line)
        if match:
            current = {"pts": int(match[1]), "key": "key frame" in line, "nals": set()}
            packets.append(current)
        nal = re.search(r"nal_unit_type\s+[01]+\s+=\s+(\d+)", line)
        if nal and current is not None:
            current["nals"].add(int(nal[1]))
    idrs = [packet["pts"] for packet in packets if 5 in packet["nals"]]
    scale = float(Fraction(time_base))
    gaps = [(b - a) * scale for a, b in zip(idrs, idrs[1:]) if b > a]
    keys = [packet for packet in packets if packet["key"]]
    return {
        "idr_verified": bool(gaps),
        "idr_frames_observed": len(idrs),
        "idr_interval_seconds": {
            "min": min(gaps), "median": statistics.median(gaps), "max": max(gaps),
        } if gaps else None,
        "every_key_packet_contains_idr_sps_pps": bool(keys)
        and all({5, 7, 8}.issubset(packet["nals"]) for packet in keys),
    }


def inspect_idr(source, time_base, seconds=10):
    result = subprocess.run([
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "info",
        "-rtsp_transport", "tcp", "-timeout", "10000000", "-i", source,
        "-map", "0:v:0", "-an", "-c:v", "copy", "-t", str(seconds),
        "-bsf:v", "trace_headers", "-f", "null", "-",
    ], capture_output=True, timeout=seconds + 25, check=False)
    if result.returncode:
        raise RuntimeError("No se pudo inspeccionar IDR; no se confirma independencia.")
    return trace_summary(result.stderr.decode(errors="replace"), time_base)


def summarize(data):
    stream = (data.get("streams") or [{}])[0]
    samples = []
    for packet in data.get("packets", []):
        timestamp = packet.get("dts_time")
        if timestamp in (None, "N/A"):
            timestamp = packet.get("pts_time")
        try:
            samples.append((float(timestamp), int(packet["size"]),
                            "K" in packet.get("flags", "")))
        except (TypeError, ValueError, KeyError):
            continue
    samples.sort()
    elapsed = samples[-1][0] - samples[0][0] if len(samples) >= 2 else 0
    keys = [time for time, _, key in samples if key]
    intervals = [b - a for a, b in zip(keys, keys[1:]) if b > a]
    bitrate = sum(size for _, size, _ in samples) * 8 / elapsed if elapsed > 0 else None
    gib = bitrate * 2592000 / 8 / 1024 ** 3 if bitrate else None
    return {
        "stream": {key: stream[key] for key in STREAM_FIELDS.split(",") if key in stream},
        "h264_copy_candidate": compatible(stream),
        "sample_seconds": elapsed,
        "video_bitrate_mbps": bitrate / 1_000_000 if bitrate else None,
        "keyframe_interval_seconds": {
            "min": min(intervals), "median": statistics.median(intervals),
            "max": max(intervals), "intervals": len(intervals),
        } if intervals else None,
        "idr_verified": False,
        "continuous_30_day_gib_video_only": gib,
        "continuous_30_day_gib_budget_10_20_percent": [gib * 1.1, gib * 1.2] if gib else None,
    }
