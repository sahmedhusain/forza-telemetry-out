# Validation — version 1.6.1

Checked 25 October 2026. [Current polish evidence](evidence/review-161.json) · [1.6 widget evidence](evidence/review-160.json) · [1.5 channel-review evidence](evidence/review-150.json) · [Documentation index](README.md)

## Completed locally

- All 29 automated tests pass: packet decoding, recorder, history, analytics, channel review, translations, RPM limits, local UDP/WebSocket pipeline and six widget-layout tests.
- All 26 widget bodies checked at 390×844, 844×390, 768×1024, 1440×900 and 1920×1080, in/out of edit mode with extra-large numbers. Tire/slip widgets were saved at 3 columns/200px: their content-safe display floors retained all corners and plot labels. No widget body escaped its frame, duplicate IDs or document overflow were found. Scrollbar tracks stayed hidden.
- Inspected English dark and Arabic light layouts. Both official logo variants loaded. Header home/focus controls and detail navigation retain their existing behavior. Editor controls add space above instruments.
- Current GIF and nine PNGs captured from 1.6.1 with no generated telemetry. The GIF has eight 1440×1080 frames over 24 seconds; fitted custom layouts end at complete widget rows. The Arabic phone tire layout fits 390×844. These layouts demonstrate customization and are not the default Drive/Engineering presets.
- Packaged macOS arm64 app launched: Dashboard active, 26 available widgets, 88 raw rows, four languages, loaded logos, hidden scrollbar tracks and no audio/demo controls. All 41 bundled application/notice files matched source byte-for-byte.
- Apple Silicon and Intel DMG/ZIP packages built locally. Both DMGs passed `hdiutil verify`, were mounted read-only, and contained the 1.6.1 app with the expected CPU architecture and Applications link. Both ZIPs passed full CRC checks. The first concurrent Intel DMG build failed; its standalone retry passed, and local commands/release steps now build macOS architectures separately. Workflow branches and signing/unsigned flags were checked without using credentials.
- Local documentation/image links, anchors, all 88 protocol rows, source/lockfile versions and evidence records checked. Local `.env`, telemetry data and build output stay out of source commits. An older address screenshot with LAN details is retained outside publication.
- GitHub About description, documentation website and topics updated and verified. The prior source commit's Linux/Windows/macOS CI passed. Current platform packaging/checksum results are recorded separately in GitHub Actions and the preview release notes.

## Limits

Real FH6 driving/hardware behavior, physical packet endian assumption, Windows/Linux application execution, OS firewall prompts, full screen-reader QA and independent native-language review remain untested. Builds are unsigned. Publishing a preview does not complete these checks.

Layouts are per browser/device. Bounded recordings, browser review windows and cumulative history have separate scopes; see [analytics and storage](ANALYTICS.md). Tire motion/steering remain illustrations; pressure, camber, wear and per-tire force are unavailable.
