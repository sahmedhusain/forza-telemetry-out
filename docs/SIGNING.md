# Signing desktop releases

These instructions match this repository's **electron-builder 26** configuration. Normal builds are unsigned: `mac.identity=null`, `win.signExecutable=false`, and the release workflow disables automatic macOS identity discovery. Creating a DMG/EXE or publishing a SHA-256 checksum does not sign it.

Use your own publisher identity. Keep certificates, private keys and passwords in a provider's HSM/token, macOS Keychain or CI secrets, outside this repository and the app's `.env`. Do not paste private signing material into issues or chat. Generate checksums **after** signing/notarizing; changing signed bytes invalidates verification.

## Windows: Authenticode

1. Choose [Microsoft Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart) if your legal publisher identity is eligible, or obtain a publicly trusted code-signing certificate from a CA with a hardware token/cloud-HSM signing service. Check current country and identity requirements before subscribing.
2. Complete the provider's identity verification and configure its signing client on a Windows build runner. Modern public certificates commonly require hardware-protected private keys; do not assume a provider can export a `.pfx` for GitHub Secrets.
3. Enable this repository's opt-in command:

   ```sh
   npm run dist:win:signed
   ```

   It sets `win.signExecutable=true` and `forceCodeSigning=true`. Missing valid signing credentials must fail the build. It does not provision a certificate or configure a cloud provider.
4. Configure the credential method your provider actually supports. electron-builder 26 accepts `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` for an available certificate file; Windows-store/token identities can use `win.signtoolOptions.certificateSubjectName`. Microsoft cloud signing uses `win.azureSignOptions` plus Azure authentication. These integrations differ; use the provider's configuration rather than mixing methods. [Builder 26 reference](https://www.electron.build/v26/docs/win/).
5. Verify both the installed application executable and distributed Setup/Portable EXEs on Windows:

   ```powershell
   Get-AuthenticodeSignature .\dist\Forza-Telemetry-Out-1.6.1-Windows-x64-Setup.exe |
     Format-List Status, StatusMessage, SignerCertificate, TimeStamperCertificate
   ```

   Require `Status: Valid`, the expected publisher and a valid timestamp. Repeat for Portable and the app EXE.

Signing establishes publisher identity and integrity. It does **not** guarantee immediate SmartScreen reputation; EV certificates no longer provide an automatic bypass. [Microsoft's current guidance](https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation) takes precedence over older signing tutorials.

## macOS: Developer ID, notarization and stapling

For direct DMG/ZIP distribution, enroll in the [Apple Developer Program](https://developer.apple.com/developer-id/) and create a **Developer ID Application** certificate. Install it with its private key in your Mac's Keychain, or import it securely using `CSC_LINK` / `CSC_KEY_PASSWORD` on a macOS CI runner. A `.pkg` installer additionally needs a **Developer ID Installer** certificate; this project currently builds DMG/ZIP.

Store Apple notarization credentials in Keychain using the installed Xcode command-line tools. This command prompts for the app-specific password; do not use your normal Apple ID password:

```sh
xcrun notarytool store-credentials forza-telemetry-notary \
  --apple-id YOUR_APPLE_ID --team-id YOUR_TEAM_ID
```

Then build on macOS with the exact Developer ID identity and stored profile:

```sh
export CSC_NAME='Developer ID Application: YOUR_LEGAL_NAME (YOUR_TEAM_ID)'
export APPLE_KEYCHAIN_PROFILE='forza-telemetry-notary'
: "${CSC_NAME:?Set your Developer ID Application identity}"
: "${APPLE_KEYCHAIN_PROFILE:?Store notarization credentials first}"
npm run dist:mac -- \
  --config.mac.identity="$CSC_NAME" \
  --config.mac.hardenedRuntime=true \
  --config.mac.notarize=true \
  --config.forceCodeSigning=true
```

The flags override the unsigned defaults for this invocation. The command produces Apple Silicon `arm64` DMG/ZIP files. Repeat it with `npm run dist:mac:intel --` and the same flags for Intel `x64`. Build the architectures sequentially to avoid overlapping disk-image operations. The builder signs the app and submits/staples it using the profile. [Apple's process](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution) and [builder 26 notarization options](https://www.electron.build/v26/docs/notarization/) describe the requirements.

Check the built app and its ticket before distribution:

```sh
codesign --verify --deep --strict --verbose=2 'dist/mac-arm64/Forza Telemetry Out.app'
spctl --assess --verbose --type exec 'dist/mac-arm64/Forza Telemetry Out.app'
xcrun stapler validate 'dist/mac-arm64/Forza Telemetry Out.app'
```

Repeat for the Intel app under `dist/mac/` and test installation from both DMGs on their target architecture. Require the expected Developer ID and a successful notarized Gatekeeper assessment. In builder 26, `notarize=true` alone can still skip notarization if authentication is absent; the profile precheck and post-build assessment are essential. ZIP files carry the stapled app; a ZIP itself cannot receive a stapled ticket.

CI can instead use `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`, or `APPLE_API_KEY` / `APPLE_API_KEY_ID` / `APPLE_API_ISSUER`. Store secrets securely and materialize API-key files only on the runner. The existing unsigned release workflow must be deliberately changed to use the chosen credentials and verification steps before calling a release signed.

## Linux: AppImage signatures

Linux AppImages do not use Windows Authenticode or Apple's Developer ID trust system. [AppImage supports embedded GPG signatures](https://docs.appimage.org/packaging-guide/optional/signatures.html) when built using signing-enabled tooling. A simpler separate verification path is to sign the release checksum manifest with your GPG signing key:

Create a signing identity on your own machine with `gpg --full-generate-key` if you do not already have one, then identify its full fingerprint with `gpg --fingerprint`. Keep the private key and passphrase outside the project; only the public key is distributed.

```sh
# After producing the final AppImage and checksum manifest on Linux:
gpg --local-user YOUR_SIGNING_FINGERPRINT --armor --detach-sign \
  --output dist/SHA256SUMS-linux-x64.txt.asc dist/SHA256SUMS-linux-x64.txt
gpg --armor --export YOUR_SIGNING_FINGERPRINT > dist/release-signing-public-key.asc
```

Distribute the AppImage, checksum manifest, detached signature and public key. Publish the full key fingerprint through a trusted channel so users can establish whose signature they are checking. Users with the verified public key installed can run:

```sh
gpg --verify SHA256SUMS-linux-x64.txt.asc SHA256SUMS-linux-x64.txt
sha256sum --check SHA256SUMS-linux-x64.txt
```

The detached signature authenticates the manifest; the hashes bind it to the AppImage bytes. It does not make a desktop environment enforce trust automatically. A bare SHA-256 file provides integrity comparison, not publisher authentication. This project's current workflow generates unsigned manifests; GPG signing needs your key and is not enabled yet.

For CI credentials, use the repository's **Settings → Secrets and variables → Actions**. Add only the secrets required by your chosen provider, then explicitly wire them into the signing job. Adding a secret alone does not change the existing unsigned build commands. Hardware tokens, remote HSMs and Keychain-backed credentials need their own runner/provider setup.

[Build/release guide](RELEASING.md) · [Getting started](../GETTING_STARTED.md) · [Validation limits](VALIDATION.md)
