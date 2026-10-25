# Build and release

[Documentation index](README.md) · [Changelog](../CHANGELOG.md) · [Validation](VALIDATION.md)

Version 1.6.1 is source code, not evidence of a published release. Use semantic versioning: patch for compatible fixes, minor for added capability, major for breaking configuration/API changes.

## Local build

```sh
npm ci
npm test
npm run package
npm run dist
```

`package` makes an unpacked application for the host. `dist` creates macOS DMG/ZIP, Windows NSIS/portable, or Linux AppImage on the corresponding OS. Artifacts go to ignored `dist/`. Use native platform runners; no cross-compilation success is assumed. App icons are original companion artwork.

Explicit local commands:

| Command | Outputs |
|---|---|
| `npm run dist:win` | Unsigned Windows x64 Setup and Portable EXEs |
| `npm run dist:win:signed` | Same targets with signing required; configure your provider first |
| `npm run dist:mac` | Unsigned Apple Silicon arm64 DMG and ZIP; run on macOS |
| `npm run dist:mac:intel` | Unsigned Intel x64 DMG and ZIP; run on macOS after the arm64 build |
| `npm run dist:linux` | Linux x64 AppImage; run on Linux |

The [signing guide](SIGNING.md) covers Windows Authenticode, Apple Developer ID/notarization and Linux GPG verification. Actual signing requires your publisher credentials; the normal workflow remains unsigned.

macOS architectures are built sequentially because overlapping DMG operations failed locally. The workflow includes both architectures in the macOS checksum manifest; its filename describes the build runner, while each entry identifies the artifact's architecture.

## GitHub workflow

The `CI` workflow tests Node 22 on Linux, Windows and macOS. `Release` runs on a pushed `v*` tag, builds on all three platforms, and uploads artifacts into a **draft** GitHub release. It does not publish the draft automatically. Workflows require the repository to be pushed to GitHub; local file creation alone does not run them.

1. Update `package.json`, lockfile, changelog and visible version labels together.
2. Run tests; validate live FH6 packets and desktop/browser behavior on the target OS. Refresh README GIF/PNGs and documentation when the UI or behavior changes.
3. Commit the reviewed changes.
4. Create and push a matching tag, for example `v1.6.1`, when ready.
5. Inspect the draft artifacts, install and launch them on each target OS, and add release notes.
6. Publish the draft only after verification.

A normal branch push runs CI, not the tag-triggered release workflow. Do not create a version tag merely to push documentation. Keep `.env`, telemetry data, recordings, certificates and build output out of source commits; `.env.example` documents supported defaults.

The workflow disables automatic certificate discovery, and `build.mac.identity` is explicitly null. Binaries are unsigned by default (`build.win.signExecutable=false`, `build.mac.identity=null`). For signed distribution, use the documented command overrides, configure credentials as CI secrets/Keychain/provider-managed keys and update the workflow's build and verification steps. No signing credentials, automatic notarization, store submission, automatic updates or crash reporting are configured in the normal workflow.

## Release checklist

- [ ] Version and lockfile agree; tag matches version.
- [ ] Parser, recorder and local network tests pass.
- [ ] Real FH6 capture validates all offsets and endian assumption.
- [ ] Desktop and browser controls work; stale stream is obvious.
- [ ] Full CSV/JSON downloads checked; shutdown warning documented.
- [ ] Windows/macOS/Linux install and launch tested.
- [ ] Branding notices and original icon included.
- [ ] README GIF/PNGs match the source version; all language, setup and API links resolve.
- [ ] Local configuration, private telemetry and generated installers excluded from source commits.
- [ ] Sign/notarize if distributing trusted public installers.

Windows x64 Setup and Portable targets can be requested using `npm run dist:win`. Their filenames differ, so neither overwrites the other. The NSIS installer permits choosing an installation directory and creates a desktop shortcut. Cross-building produces artifacts; running them on Windows is still a separate verification step.

## Artifact names and integrity

For 1.6.1 the Windows x64 outputs are:

```text
dist/Forza-Telemetry-Out-1.6.1-Windows-x64-Setup.exe
dist/Forza-Telemetry-Out-1.6.1-Windows-x64-Portable.exe
```

macOS and Linux filenames use `Forza-Telemetry-Out-<version>-<os>-<arch>.<ext>`. Choose the artifact for your platform and CPU. `npm run package` produces an unpacked host application for local smoke checks; it does not produce every platform's installer.

The release workflow writes a separate `SHA256SUMS-<platform>-<arch>.txt` file on each runner and uploads it with the matching installers. It fails if no current-version installer exists or an artifact is empty. For local builds, compute a checksum with `shasum -a 256 PATH_TO_ARTIFACT` on macOS/Linux or `Get-FileHash PATH_TO_ARTIFACT -Algorithm SHA256` in Windows PowerShell. Compare the complete hash against the trusted release's checksum. A hash detects changed bytes; it is not code signing or proof of real-game validation.

For a preview, keep the draft until packaging completes and the files/notes have been checked. Mark it as a prerelease when publishing, state unsigned/untested limits, and distinguish local unit tests from real-game and native installer checks. A preview is not a production compatibility guarantee.
