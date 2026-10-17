import contextlib
import copy
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pilot/pi"))
import prepare_receiver as setup


class ReceiverSetupTests(unittest.TestCase):
    def setUp(self):
        self.publisher = "synthetic-publisher-setup-test-000000000"
        self.proxy = "synthetic-app-proxy-setup-test-00000000"
        self.template = {
            "supabaseUrl": "https://example.supabase.co", "supabaseAnonKey": "synthetic-public-key",
            "adminUserIds": ["00000000-0000-4000-8000-000000000001"],
            "cameras": [{
                "id": "bacata-mock", "name": "Prueba",
                "horseId": "00000000-0000-4000-8000-000000000002",
                "ownerUserIds": ["unwanted-extra-user"],
            }],
        }

    def test_output_contains_hashes_and_only_requested_grants(self):
        result = setup.build_config(self.template, self.publisher, self.proxy)
        self.assertEqual(result["appProxyKeySha256"], hashlib.sha256(self.proxy.encode()).hexdigest())
        self.assertEqual(result["cameras"][0]["publisherKeySha256"],
                         hashlib.sha256(self.publisher.encode()).hexdigest())
        self.assertEqual(result["adminUserIds"], self.template["adminUserIds"])
        self.assertEqual(result["cameras"][0]["ownerUserIds"], [])
        self.assertEqual(result["cameras"][0]["stableOwnerUserIds"], [])
        self.assertNotIn(self.publisher, json.dumps(result))
        self.assertNotIn(self.proxy, json.dumps(result))

    def test_invalid_metadata_and_identical_keys_are_rejected(self):
        for updates in [{"adminUserIds": ["3"]}, {"supabaseUrl": "http://example.test"},
                        {"adminUserIds": []}, {"supabaseAnonKey": ""}]:
            with self.subTest(updates=updates), self.assertRaises(ValueError):
                setup.build_config({**self.template, **updates}, self.publisher, self.proxy)
        with self.assertRaises(ValueError):
            setup.build_config(self.template, self.publisher, self.publisher)
        template = copy.deepcopy(self.template)
        template["cameras"][0]["horseId"] = "not-an-id"
        with self.assertRaises(ValueError):
            setup.build_config(template, self.publisher, self.proxy)

    def test_operator_generation_is_private_no_overwrite_and_no_keys_in_stdout(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "private"
            template = Path(folder) / "template.json"
            template.write_text(json.dumps(self.template))
            stdout = io.StringIO()
            with patch.object(sys, "argv", [
                "prepare_receiver.py", "--template", str(template), "--output", str(output),
                "--generate-private-files",
            ]), patch.object(setup.secrets, "token_urlsafe", side_effect=[self.publisher, self.proxy]), \
                    contextlib.redirect_stdout(stdout):
                self.assertEqual(setup.main(), 0)
            self.assertEqual(output.stat().st_mode & 0o777, 0o700)
            for file in output.iterdir():
                self.assertEqual(file.stat().st_mode & 0o777, 0o600)
            self.assertNotIn(self.publisher, stdout.getvalue())
            self.assertNotIn(self.proxy, stdout.getvalue())
            self.assertEqual((output / "publisher.secret.txt").read_text().strip(), self.publisher)
            before = (output / "receiver.secret.json").read_bytes()
            with patch.object(setup.secrets, "token_urlsafe", side_effect=[self.publisher, self.proxy]), \
                    self.assertRaises(FileExistsError):
                setup.prepare(self.template, output)
            self.assertEqual((output / "receiver.secret.json").read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
