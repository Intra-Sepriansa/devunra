#!/usr/bin/env python3
"""Verify one accepted Windows asset and upload it without replacing assets."""

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import zipfile

REPOSITORY = "Intra-Sepriansa/devunra"
TAG = "v1.3.0"
ASSET_NAMES = {"DEVUNRA-Setup-1.3.0.exe", "DEVUNRA-1.3.0-win-x64.zip"}
APPROVAL_PATH = Path(__file__).with_name("windows-release-approval.json")
IMMUTABLE_PATH = Path(__file__).with_name("release-immutable-v1.2.0.json")
SOURCE_RUN_ID = 41837447669
SOURCE_COMMIT = "aa557a3049bc6b75abea7d9359e01d4e0b0dcd45"
MAX_ARCHIVE_BYTES = 4 * 1024**3
MAX_ASSET_BYTES = 2 * 1024**3 - 1


class TransferError(Exception):
    pass


def digest(file):
    result = hashlib.sha256()
    with open(file, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def check_metadata(name, asset_bytes, asset_sha, archive_bytes, archive_sha):
    if name not in ASSET_NAMES:
        raise TransferError("Only the two designated Windows 1.3.0 assets are allowed.")
    if not 0 < asset_bytes <= MAX_ASSET_BYTES or not 0 < archive_bytes <= MAX_ARCHIVE_BYTES:
        raise TransferError("Asset or archive size is outside the permitted range.")
    if not all(re.fullmatch(r"[0-9a-f]{64}", value) for value in (asset_sha, archive_sha)):
        raise TransferError("Expected SHA-256 values must contain 64 lowercase hexadecimal characters.")


def approved_release():
    approval = json.loads(APPROVAL_PATH.read_text())
    if (approval.get("schemaVersion") != 1 or approval.get("repository") != REPOSITORY
            or approval.get("tag") != TAG or approval.get("sourceRunId") != SOURCE_RUN_ID
            or approval.get("sourceCommit") != SOURCE_COMMIT
            or not re.fullmatch(r"[0-9a-f]{64}", approval.get("proofSha256") or "")
            or type(approval.get("releaseId")) is not int or approval["releaseId"] < 1):
        raise TransferError("Final acceptance and the exact public release identity have not been approved.")
    return approval


def check_approval(name, asset_bytes, asset_sha, archive_bytes, archive_sha):
    approval = approved_release()
    asset = approval.get("assets", {}).get(name)
    expected = {"assetBytes": asset_bytes, "assetSha256": asset_sha,
                "archiveBytes": archive_bytes, "archiveSha256": archive_sha}
    if (not isinstance(asset, dict) or asset.get("accepted") is not True
            or type(asset.get("artifactId")) is not int or asset["artifactId"] < 1
            or any(asset.get(key) != value for key, value in expected.items())):
        raise TransferError("Transfer metadata does not match the committed final acceptance approval.")


def extract_verified(archive, destination, name, asset_bytes, asset_sha, archive_bytes, archive_sha):
    check_metadata(name, asset_bytes, asset_sha, archive_bytes, archive_sha)
    check_approval(name, asset_bytes, asset_sha, archive_bytes, archive_sha)
    archive = Path(archive)
    if archive.stat().st_size != archive_bytes or digest(archive) != archive_sha:
        raise TransferError("Outer Actions archive does not match its approved size and SHA-256.")
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / name
    if target.exists() or target.is_symlink():
        raise TransferError("The local asset destination already exists.")
    with zipfile.ZipFile(archive) as bundle:
        entries = [entry for entry in bundle.infolist() if PurePosixPath(entry.filename).name == name]
        if len(entries) != 1:
            raise TransferError("The archive must contain exactly one matching asset.")
        entry = entries[0]
        parts = PurePosixPath(entry.filename)
        mode = entry.external_attr >> 16
        if (parts.is_absolute() or ".." in parts.parts or "\\" in entry.filename
                or "\x00" in entry.filename or entry.is_dir() or stat.S_ISLNK(mode)
                or entry.flag_bits & 1 or entry.file_size != asset_bytes):
            raise TransferError("The selected archive entry is unsafe or has an unexpected size.")
        actual = hashlib.sha256()
        copied = 0
        try:
            # Never extract the archive's paths or run any of its content.
            with bundle.open(entry) as source, open(target, "xb") as output:
                for block in iter(lambda: source.read(1024 * 1024), b""):
                    copied += len(block)
                    if copied > asset_bytes:
                        raise TransferError("The selected asset exceeds its approved size.")
                    actual.update(block)
                    output.write(block)
            if copied != asset_bytes or actual.hexdigest() != asset_sha:
                raise TransferError("Selected Windows asset does not match its approved size and SHA-256.")
        except Exception:
            target.unlink(missing_ok=True)
            raise
    return target


def gh_json(endpoint):
    result = subprocess.run(["gh", "api", "--hostname", "github.com", endpoint], capture_output=True)
    if result.returncode:
        # Captured diagnostics can contain credential-bearing request details.
        raise TransferError("GitHub release metadata could not be read.")
    try:
        return json.loads(result.stdout)
    except (ValueError, TypeError):
        raise TransferError("GitHub returned invalid release metadata.") from None


def release_assets(release_id=None, tag=TAG):
    if release_id is None:
        release_id = approved_release()["releaseId"]
    release = gh_json(f"repos/{REPOSITORY}/releases/{release_id}")
    if (release.get("id") != release_id or release.get("tag_name") != tag
            or release.get("draft") or release.get("prerelease")):
        raise TransferError("The fixed public release does not match the approved target.")
    assets = []
    page = 1
    while True:
        batch = gh_json(f"repos/{REPOSITORY}/releases/{release_id}/assets?per_page=100&page={page}")
        if not isinstance(batch, list):
            raise TransferError("GitHub returned invalid release assets.")
        assets.extend(batch)
        if len(batch) < 100:
            return assets
        page += 1


def asset_matches(asset, expected_bytes, expected_sha):
    return (asset.get("size") == expected_bytes and asset.get("digest") == f"sha256:{expected_sha}"
            and asset.get("state") == "uploaded")


def check_immutable_release():
    frozen = json.loads(IMMUTABLE_PATH.read_text())
    actual = release_assets(frozen["releaseId"], frozen["tag"])
    fields = ("id", "name", "size", "digest", "state")
    snapshot = lambda assets: sorted([tuple(asset.get(field) for field in fields) for asset in assets])
    if snapshot(actual) != snapshot(frozen["assets"]):
        raise TransferError("The immutable v1.2.0 release changed; publication is stopped.")


def publish(file, expected_bytes, expected_sha):
    name = file.name
    if name not in ASSET_NAMES or file.stat().st_size != expected_bytes or digest(file) != expected_sha:
        raise TransferError("The verified local Windows asset changed before upload.")
    approved = approved_release().get("assets", {}).get(name, {})
    check_approval(name, expected_bytes, expected_sha, approved.get("archiveBytes"), approved.get("archiveSha256"))
    check_immutable_release()
    before = release_assets()
    matches = [asset for asset in before if asset.get("name") == name]
    if matches:
        if len(matches) == 1 and asset_matches(matches[0], expected_bytes, expected_sha):
            return {"name": name, "size": expected_bytes, "sha256": expected_sha, "status": "already_matches"}
        raise TransferError("A conflicting release asset already exists; replacement is forbidden.")
    before_others = {asset["name"]: (asset["id"], asset.get("size"), asset.get("digest")) for asset in before}
    # gh upload refuses duplicate names unless --clobber is explicitly supplied.
    # https://cli.github.com/manual/gh_release_upload
    upload = subprocess.run(["gh", "release", "upload", TAG, str(file), "--repo", REPOSITORY], capture_output=True)
    if upload.returncode:
        raise TransferError("Release upload failed; no existing asset was replaced.")
    after = release_assets()
    after_others = {asset["name"]: (asset["id"], asset.get("size"), asset.get("digest"))
                    for asset in after if asset.get("name") != name}
    matches = [asset for asset in after if asset.get("name") == name]
    if len(matches) != 1 or not asset_matches(matches[0], expected_bytes, expected_sha):
        raise TransferError("Uploaded asset metadata does not match its approved size and SHA-256.")
    if before_others != after_others:
        raise TransferError("Existing release asset metadata changed during the transfer; inspect the release.")
    check_immutable_release()
    return {"name": name, "size": expected_bytes, "sha256": expected_sha,
            "status": "uploaded", "url": matches[0]["browser_download_url"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", required=True)
    parser.add_argument("--destination", required=True)
    parser.add_argument("--asset-name", required=True)
    parser.add_argument("--asset-bytes", required=True, type=int)
    parser.add_argument("--asset-sha256", required=True)
    parser.add_argument("--archive-bytes", required=True, type=int)
    parser.add_argument("--archive-sha256", required=True)
    parser.add_argument("--publish", action="store_true")
    args = parser.parse_args()
    file = extract_verified(args.archive, args.destination, args.asset_name, args.asset_bytes,
                            args.asset_sha256, args.archive_bytes, args.archive_sha256)
    result = {"name": args.asset_name, "size": args.asset_bytes, "sha256": args.asset_sha256, "status": "verified"}
    if args.publish:
        result = publish(file, args.asset_bytes, args.asset_sha256)
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except TransferError as error:
        print(f"Transfer stopped: {error}", file=sys.stderr)
        sys.exit(1)
    except Exception:
        print("Transfer stopped: unexpected verification or transfer error; private request details omitted.", file=sys.stderr)
        sys.exit(1)
