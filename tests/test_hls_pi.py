import contextlib
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pilot/pi"))
import agent
import media


class PiPilotTests(unittest.TestCase):
    def config(self):
        return {
            "rtspUrl": "rtsp://camera.invalid/secondary", "receiverOrigin": "https://receiver.invalid",
            "cameraId": "box-one", "publisherKey": "synthetic-test-key-000000000000000000",
            "confirmedH264IndependentSegments": True,
        }

    def test_diagnostics_use_actual_resolution_and_measured_bitrate(self):
        report = media.summarize({
            "streams": [{"codec_name": "h264", "pix_fmt": "yuv420p",
                         "has_b_frames": 0, "width": 640, "height": 480}],
            "packets": [
                {"dts_time": str(i), "size": "125000", "flags": "K_"} for i in range(4)
            ],
        })
        self.assertEqual(report["stream"]["width"], 640)
        self.assertTrue(report["h264_copy_candidate"])
        self.assertEqual(report["keyframe_interval_seconds"]["max"], 1)
        self.assertFalse(report["idr_verified"])
        self.assertGreater(report["continuous_30_day_gib_video_only"], 0)

    def test_h265_and_b_frames_never_silently_transcode(self):
        for codec, bframes in [("hevc", 0), ("h264", 1)]:
            self.assertFalse(media.compatible({
                "codec_name": codec, "has_b_frames": bframes,
                "width": 640, "height": 480, "pix_fmt": "yuv420p",
            }))
        command = agent.ffmpeg_command("rtsp://fixture/secondary", "/tmp/test")
        self.assertEqual(command[command.index("-c:v") + 1], "copy")
        self.assertNotIn("-vf", command)
        self.assertNotIn("-r", command)
        self.assertNotIn("independent_segments", " ".join(command))

    def test_all_rtsp_inputs_use_demuxer_socket_timeout_before_input(self):
        commands = [agent.ffmpeg_command("rtsp://fixture/secondary", "/tmp/test")]
        with patch.object(media.subprocess, "run", return_value=SimpleNamespace(
                returncode=0, stdout=b'{"streams":[]}', stderr=b"")) as run:
            media.probe("rtsp://fixture/secondary")
            commands.append(run.call_args.args[0])
            media.probe("rtsp://fixture/secondary", seconds=10)
            commands.append(run.call_args.args[0])
            media.inspect_idr("rtsp://fixture/secondary", "1/90000")
            commands.append(run.call_args.args[0])
        for command in commands:
            with self.subTest(binary=command[0], arguments=command):
                self.assertNotIn("-rw_timeout", command)
                index = command.index("-timeout")
                self.assertEqual(command[index + 1], "10000000")
                self.assertLess(index, command.index("-i"))
                self.assertEqual(command[command.index("-rtsp_transport") + 1], "tcp")

    def test_actual_idr_intervals_deduplicate_multiple_slices_and_check_headers(self):
        text = ""
        for pts in (0, 90000, 180000):
            text += f"Packet: 1000 bytes, key frame, pts {pts}, dts {pts}, duration 3600.\n"
            for nal in (7, 8, 5, 5):
                text += f"3 nal_unit_type 00101 = {nal}\n"
        result = media.trace_summary(text, "1/90000")
        self.assertEqual(result["idr_frames_observed"], 3)
        self.assertEqual(result["idr_interval_seconds"]["max"], 1)
        self.assertTrue(result["every_key_packet_contains_idr_sps_pps"])
        incomplete = media.trace_summary(text.replace("00101 = 7", "00101 = 1"), "1/90000")
        self.assertFalse(incomplete["every_key_packet_contains_idr_sps_pps"])

    def test_https_and_manual_real_stream_confirmation_are_required(self):
        config = self.config()
        self.assertEqual(agent.validate_config(config).scheme, "https")
        with self.assertRaises(ValueError):
            agent.validate_config({**config, "receiverOrigin": "http://receiver.invalid"})
        with self.assertRaises(ValueError):
            agent.validate_config({**config, "confirmedH264IndependentSegments": False})

    def test_complete_playlist_entries_only_and_no_path_traversal(self):
        playlist = (
            "#EXTM3U\n#EXTINF:1.000,\n#EXT-X-PROGRAM-DATE-TIME:2026-10-17T12:00:00Z\n"
            "000000001.ts\n#EXTINF:1.0,\n"
        )
        entries = agent.read_playlist(playlist)
        self.assertEqual(entries, [(1, "000000001.ts", 1.0, "2026-10-17T12:00:00Z")])
        with self.assertRaises(RuntimeError):
            agent.read_playlist(playlist.replace("000000001.ts", "../outside.ts"))

    def test_spool_watchdog_kills_producer_and_cleans_files(self):
        with tempfile.TemporaryDirectory() as folder:
            config = {**self.config(), "spoolRoot": folder}
            def producer(_source, directory):
                return [sys.executable, "-c",
                        "import pathlib,time;pathlib.Path(" + repr(str(directory / "oversize.tmp"))
                        + ").write_bytes(b'x'*" + str(agent.SPOOL_LIMIT + 1) + ");time.sleep(10)"]
            with self.assertRaises(RuntimeError):
                agent.relay_epoch(config, threading.Event(), command_factory=producer)
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_network_failure_retries_without_a_persistent_backlog(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "agent.json"
            path.write_text(json.dumps(self.config()))
            path.chmod(0o600)
            attempts = []
            def relay(_config, stop):
                attempts.append(1)
                if len(attempts) == 1:
                    raise RuntimeError("Synthetic outage")
                stop.set()
            stream = {"codec_name": "h264", "pix_fmt": "yuv420p",
                      "has_b_frames": 0, "width": 640, "height": 480}
            with patch.object(sys, "argv", ["agent.py", "--config", str(path)]), \
                 patch.object(agent, "probe", return_value={"streams": [stream]}), \
                 patch.object(agent, "relay_epoch", side_effect=relay), \
                 patch.object(agent.signal, "signal"), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(agent.main(), 0)
            self.assertEqual(len(attempts), 2)


if __name__ == "__main__":
    unittest.main()
