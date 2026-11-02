#!/usr/bin/env python3
"""Offline fixtures for the release transfer's integrity and nonreplacement rules."""

import hashlib
import importlib.util
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("release_transfer", Path(__file__).with_name("release-transfer.py"))
transfer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transfer)
NAME = "DEVUNRA-Setup-1.2.0.exe"
CONTENT = b"Harmless Windows asset fixture; never executed."
SHA = hashlib.sha256(CONTENT).hexdigest()


class TransferFixtures(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="devunra-transfer-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.archive = self.root / "archive.zip"
        self.output = self.root / "output"

    def archive_with(self, entries):
        with zipfile.ZipFile(self.archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
            for name, value in entries:
                bundle.writestr(name, value)

    def extract(self, **overrides):
        args = dict(archive=self.archive, destination=self.output, name=NAME,
                    asset_bytes=len(CONTENT), asset_sha=SHA,
                    archive_bytes=self.archive.stat().st_size, archive_sha=transfer.digest(self.archive))
        args.update(overrides)
        return transfer.extract_verified(**args)

    def test_exact_file_only_and_no_archive_paths_are_extracted(self):
        self.archive_with([(f"release/{NAME}", CONTENT), ("../unselected.txt", b"untrusted"),
                           ("private/unrelated.txt", b"untrusted")])
        file = self.extract()
        self.assertEqual(file.read_bytes(), CONTENT)
        self.assertEqual(list(self.output.iterdir()), [self.output / NAME])
        self.assertFalse((self.root / "unselected.txt").exists())

    def test_bad_outer_digest_prevents_extraction(self):
        self.archive_with([(NAME, CONTENT)])
        with self.assertRaisesRegex(transfer.TransferError, "Outer Actions archive"):
            self.extract(archive_sha="0" * 64)
        self.assertFalse(self.output.exists())

    def test_bad_inner_digest_removes_the_partial_asset(self):
        self.archive_with([(NAME, CONTENT)])
        with self.assertRaisesRegex(transfer.TransferError, "Selected Windows asset"):
            self.extract(asset_sha="0" * 64)
        self.assertFalse((self.output / NAME).exists())

    def test_missing_or_duplicate_asset_is_rejected(self):
        for entries in [[("other.exe", CONTENT)], [(f"a/{NAME}", CONTENT), (f"b/{NAME}", CONTENT)]]:
            with self.subTest(entries=entries):
                self.archive_with(entries)
                with self.assertRaisesRegex(transfer.TransferError, "exactly one"):
                    self.extract()

    def test_unsafe_selected_paths_are_rejected(self):
        for name in [f"../{NAME}", f"/{NAME}", f"parent\\/{NAME}"]:
            with self.subTest(name=name):
                self.archive_with([(name, CONTENT)])
                with self.assertRaisesRegex(transfer.TransferError, "unsafe"):
                    self.extract()

    def test_symlink_asset_is_rejected(self):
        entry = zipfile.ZipInfo(NAME)
        entry.create_system = 3
        entry.external_attr = (stat.S_IFLNK | 0o777) << 16
        self.archive_with([(entry, CONTENT)])
        with self.assertRaisesRegex(transfer.TransferError, "unsafe"):
            self.extract()

    def test_existing_local_file_is_not_overwritten(self):
        self.archive_with([(NAME, CONTENT)])
        self.output.mkdir()
        file = self.output / NAME
        file.write_bytes(b"existing")
        with self.assertRaisesRegex(transfer.TransferError, "already exists"):
            self.extract()
        self.assertEqual(file.read_bytes(), b"existing")

    def test_mac_and_other_versions_are_not_permitted(self):
        for name in ["DEVUNRA-1.2.0-arm64.dmg", "DEVUNRA-Setup-1.1.0.exe", "../" + NAME]:
            with self.subTest(name=name), self.assertRaises(transfer.TransferError):
                transfer.check_metadata(name, 1, SHA, 1, SHA)

    def asset_file(self):
        file = self.root / NAME
        file.write_bytes(CONTENT)
        return file

    def remote_asset(self, **overrides):
        asset = dict(name=NAME, id=123, size=len(CONTENT), digest=f"sha256:{SHA}", state="uploaded",
                     browser_download_url=f"https://github.com/{transfer.REPOSITORY}/releases/download/{transfer.TAG}/{NAME}")
        asset.update(overrides)
        return asset

    def test_identical_remote_asset_is_skipped_without_an_upload(self):
        with patch.object(transfer, "release_assets", return_value=[self.remote_asset()]), \
                patch.object(transfer.subprocess, "run") as run:
            result = transfer.publish(self.asset_file(), len(CONTENT), SHA)
        self.assertEqual(result["status"], "already_matches")
        run.assert_not_called()

    def test_conflicting_remote_asset_is_not_replaced(self):
        with patch.object(transfer, "release_assets", return_value=[self.remote_asset(digest="sha256:" + "0" * 64)]), \
                patch.object(transfer.subprocess, "run") as run:
            with self.assertRaisesRegex(transfer.TransferError, "replacement is forbidden"):
                transfer.publish(self.asset_file(), len(CONTENT), SHA)
        run.assert_not_called()

    def test_upload_checks_server_digest_and_retains_mac_assets(self):
        mac = dict(name="DEVUNRA-1.2.0-arm64.dmg", id=1, size=1027400250, digest="sha256:unchanged")
        file = self.asset_file()
        with patch.object(transfer, "release_assets", side_effect=[[mac], [mac, self.remote_asset()]]), \
                patch.object(transfer.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)) as run:
            result = transfer.publish(file, len(CONTENT), SHA)
        self.assertEqual(result["status"], "uploaded")
        command = run.call_args.args[0]
        self.assertEqual(command, ["gh", "release", "upload", transfer.TAG, str(file), "--repo", transfer.REPOSITORY])
        self.assertNotIn("--clobber", command)

    def test_uploaded_digest_mismatch_is_reported(self):
        with patch.object(transfer, "release_assets", side_effect=[[], [self.remote_asset(digest=None)]]), \
                patch.object(transfer.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)):
            with self.assertRaisesRegex(transfer.TransferError, "does not match"):
                transfer.publish(self.asset_file(), len(CONTENT), SHA)


if __name__ == "__main__":
    unittest.main()
