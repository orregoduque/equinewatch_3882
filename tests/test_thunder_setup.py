import copy
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pilot/pi"))
from prepare_thunder import LUCERO, THUNDER, build_setup, prepare


class ThunderSetupTests(unittest.TestCase):
    def setUp(self):
        self.current = {
            "supabaseUrl": "https://fixture.supabase.co", "supabaseAnonKey": "public-fixture",
            "adminUserIds": ["00000000-0000-4000-8000-000000000001"],
            "appProxyKeySha256": "a" * 64,
            "cameras": [{
                "id": "bacata-mock", "name": "Lucero", "horseId": LUCERO,
                "publisherKeySha256": "b" * 64, "ownerUserIds": [], "stableOwnerUserIds": [],
            }],
        }
        self.key = "synthetic-thunder-publisher-000000000000"

    def test_adds_only_thunder_preserving_all_existing_config(self):
        before = copy.deepcopy(self.current)
        receiver, agent = build_setup(self.current, self.key)
        self.assertEqual(self.current, before)
        self.assertEqual(receiver["cameras"][:-1], before["cameras"])
        self.assertEqual(receiver["adminUserIds"], before["adminUserIds"])
        self.assertEqual(receiver["appProxyKeySha256"], before["appProxyKeySha256"])
        self.assertEqual(receiver["cameras"][-1]["horseId"], THUNDER)
        self.assertEqual(receiver["cameras"][-1]["publisherKeySha256"],
                         hashlib.sha256(self.key.encode()).hexdigest())
        self.assertNotIn(self.key, json.dumps(receiver))
        self.assertEqual(agent["publisherKey"], self.key)
        self.assertFalse(agent["confirmedH264IndependentSegments"])
        self.assertEqual(agent["spoolRoot"], "/run/stableeye-hls-thunder")

    def test_refuses_collisions_wrong_lucero_and_reused_credentials(self):
        for case in ["collision", "horse", "lucero", "key"]:
            current = copy.deepcopy(self.current)
            if case == "collision":
                current["cameras"].append({**current["cameras"][0], "id": "bacata-thunder"})
            elif case == "horse":
                current["cameras"].append({**current["cameras"][0], "id": "another", "horseId": THUNDER})
            elif case == "lucero":
                current["cameras"][0]["horseId"] = THUNDER
            else:
                current["appProxyKeySha256"] = hashlib.sha256(self.key.encode()).hexdigest()
            with self.subTest(case=case), self.assertRaises(ValueError):
                build_setup(current, self.key)

    def test_private_files_never_overwrite_and_have_restricted_permissions(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root) / "new"
            prepare(self.current, folder, True)
            self.assertEqual(os.stat(folder).st_mode & 0o777, 0o700)
            for path in folder.iterdir():
                self.assertEqual(os.stat(path).st_mode & 0o777, 0o600)
            original = (folder / "hls-thunder.secret.json").read_text()
            with self.assertRaises(FileExistsError):
                prepare(self.current, folder)
            self.assertEqual((folder / "hls-thunder.secret.json").read_text(), original)


if __name__ == "__main__":
    unittest.main()
