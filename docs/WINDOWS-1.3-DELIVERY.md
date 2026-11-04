# Windows 1.3 delivery preparation

Preparation only. No release creation, upload, secret, workflow dispatch, commit, push, or deployment is authorized by this document. Root must first accept the smaller candidate from private run **41837447669**, source **aa557a3049bc6b75abea7d9359e01d4e0b0dcd45**. Do not publish the larger candidate from run 41789979078.

## Accepted identities and remaining publication steps

Root and an independent reviewer accepted the final smaller candidate from run 41837447669. `scripts/windows-release-approval.json` now records the exact reviewed file and archive metadata, proof SHA-256 and newly authorized public release ID 434025917. Release `v1.3.0` was created published/non-prerelease with no assets; its sanitized creation receipt is in `workspace-artifacts/reports/DEVUNRA-1.3.0-public-release-created.json`. Transfer, commit, push and deployment still wait for root review. The approval record was validated offline for each file. Review requirements are:

- A new public release `Intra-Sepriansa/devunra`, tag `v1.3.0`, with its exact release ID recorded. Do not change `v1.2.0`.
- Independent final NSIS and portable ZIP acceptance with zero failures, startup measurements, real phpMyAdmin login, seven native services, and Memcached explicitly absent rather than native, simulated, or passed. Preserve all skip reasons and the VM/runtime limitations actually observed.
- The accepted private artifact ID, exact outer ZIP byte count/digest from authenticated GitHub metadata, and exact inner filename/byte count/digest from the `files` array in the accepted `final-acceptance.json`.
- Separate approval entries for `DEVUNRA-Setup-1.3.0.exe` and `DEVUNRA-1.3.0-win-x64.zip`; no filename, size, digest, or result may be inferred from the larger earlier candidate.

Set top-level `proofSha256` to the SHA-256 of the exact reviewed `final-acceptance.json`; the local bridge requires this full-file identity. Each entry under `assets` uses keys `accepted` (true only after acceptance), `artifactId`, `assetBytes`, `assetSha256`, `archiveBytes`, and `archiveSha256`. The reviewed approval file and fixed source identity pin the workflow inputs. Never commit a URL or credential.

The frozen `scripts/release-immutable-v1.2.0.json` records all eight existing v1.2 release assets, including the five binaries. The helper compares their IDs, names, sizes, digests and upload states before and after transfer. It also refuses replacement and checks every pre-existing v1.3 asset remains unchanged.

## Transfer after root acceptance

Prepared local execution helper: `/Users/intrasepriansa/DEVUNRA/workspace-artifacts/scripts/transfer-accepted-windows-1.3.py`. Default mode validates the local proof/approval only; it does not authenticate, set a secret or dispatch. `--execute` requires the root-approved exact `--workflow-commit`, verifies the private run/artifact and public committed files, rejects active transfers/existing transfer secrets, then transfers one selected file. It returns after archive download verification and secret deletion; the transfer run must still be followed to completion and its public asset verified separately. Never retry an ambiguous dispatch before checking public workflow runs. Offline safety fixtures are in the adjacent `test-transfer-accepted-windows-1.3.py`.

Use the credential-safe bridge documented in `workspace-artifacts/reports/qa/accepted-windows-transfer-recipe.md`, with the newly reviewed workflow commit, v1.3 filenames and their exact approved metadata. The public workflow uses its scoped `GITHUB_TOKEN`. Capture the private artifact's one-minute Azure redirect only in memory, pass it to `gh secret set RELEASE_TRANSFER_URL` on stdin, dispatch immediately, then remove and verify absence of the ephemeral secret when the first download step finishes or the run fails. Never print the signed URL or authentication token.

Do not transfer either file before its own final acceptance. Independently re-read public metadata after transfer and compare both v1.3 files to approved bytes/digests and all frozen v1.2 assets to their snapshot.

## Website/report changes after accepted binaries exist

The three Mac downloads are now pinned explicitly to version 1.2.0, literal original filenames, dates, hashes and existing acceptance statements. Keep those identities unchanged when the global `VERSION` becomes 1.3.0. The download picker report and release label follow the selected file version; the hero follows the detected OS. This prevents the site's default version from silently repointing or relabeling old Mac binaries. `ReleaseFile.updateNote` carries the user-facing manual-download instruction. The exact accepted Windows 1.3 download records are now inserted: EXE 453227888 bytes (432.23 MiB), ZIP 639851568 bytes (610.21 MiB), both dated 4 Nov 2026. Neither file is presented as an automatic update. The proof-backed 89 passed / 0 failed / 5 not-applicable counts are recorded separately on each entry.

Windows entries use the exact accepted 1.3 filenames, release date, MiB sizes, SHA-256 values, seven bundled services and observed acceptance counts. Describe the startup worker/progress and phpMyAdmin correction only as supported by final evidence. State that Memcached is absent from Windows 1.3. Set each Windows 1.3 file's `needs` to `Windows 11 x64 / Server 2022 x64` so the existing `file.needs` display overrides historical Windows 1.2 requirements. Document the Microsoft Visual C++ 2015–2022 x64 runtime and WoW64 support required by official Nginx Win32. Preserve the original Mac 1.2 Memcached inventory and evidence. The user-facing `updateNote` should simply say that Windows 1.3 is downloaded manually from this page; keep feed/schema implementation details out of the download flow. Active marketing now shows seven engines: Memcached is removed from the live panel, engine diagram, aria description and highlight chips. The seventh diagram node remains Redis centered on the existing bottom row; all other layout positions and current 1-prefixed ports are unchanged. The removed “01 Engine” heading remains removed. Keep Mac 1.2's exact historical bundled-engine list, including Memcached, in its download metadata and immutable reports.

Add a separate `DEVUNRA-1.3.0-laporan.html`, acceptance JSON, and checksum list for the two new Windows binaries. Keep the v1.2 documents unchanged and link them from the new report for Mac evidence. Do not add test counts from overlapping groups. The Windows report should identify the private source commit and accepted run without exposing source files or credentials.

## Updater compatibility decision

The existing app parser has one top-level feed version and requires GitHub URLs to use that exact version in the tag and filename. It has no per-platform version field. Therefore a top-level 1.3.0 feed containing Mac 1.2 URLs is invalid; relabeling/serving the old Mac binary through a same-origin URL as 1.3 would offer a repeated false update.

Root chose to **keep `public/releases/latest.json` byte-for-byte at 1.2.0** to preserve existing Mac updater behavior. Windows 1.3 discovery and installer download will be available through the website and new report. Installed Windows 1.2 clients will not discover 1.3 through the updater. State this clearly in both Windows download entries and the 1.3 report; do not claim 1.3 has been published to the automatic update feed. No new Mac build is requested.

The new Windows 1.3 app can read the existing feed and report no newer release; that does not mean the site lacks a newer Windows installer for old clients. A future per-platform feed needs separate compatibility work. Do not add old Mac binaries under a 1.3 identity or alter the existing feed as part of this delivery.

## Final verification and deployment

After actual release values are inserted, complete final desktop and mobile responsive QA for the hero/live panel, seven-node engine scene, Windows/Mac download selection, requirements and report links. Run `python3 scripts/test-release-transfer.py` and `npm run build`; confirm no old Mac asset or v1.2 report changed. Verify every download URL and new public hash/size, and verify the feed remains identical to its 1.2.0 contents. The existing `npm run deploy` stages a fresh site release and atomically switches the Arsinode current link, with rollback if the origin check fails. Do not run it until root accepts the complete new binary proof and final website/report changes.

After deployment, read the live page, new report, checksums and feed, verify Windows and Mac target behavior against the actual app parser, and retain only sanitized publication evidence.
