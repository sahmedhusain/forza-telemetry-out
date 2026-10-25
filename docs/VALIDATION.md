# Validation — version 1.6.0

Checked 25 October 2026. [Current overview evidence](evidence/review-160.json), [prior channel-review evidence](evidence/review-150.json), [data/analysis guide](ANALYTICS.md).

The [documentation index](README.md) links current user guides and media. Versioned files under `evidence/` preserve earlier checks and are not a claim that every old screenshot represents the current layout.

## Completed

- 29 automated tests pass: existing decoder, recorder, history, analytics, channel review, translations, RPM limits and local UDP pipeline plus six widget-layout tests for IDs/sizes, presets, empty recovery, ordering, serialization and invalid input.
- Drive/Engineering/All layouts checked at 390×844, 844×390, 768×1024, 1440×900 and 1920×1080 with extra-large values. No horizontal document/grid/widget-shell overflow. Arabic light editing, French tablet and English dark layouts inspected. Engineering widths were balanced and rechecked at desktop size.
- GUI reorder and size controls saved Engine at 8 columns/480px and retained it on reload. Native DataTransfer drag handlers moved a widget. Empty layout/Add recovery and simulated storage-failure recovery remained usable.
- All 26 modules mounted without duplicate IDs. The engine canvas kept its identity; returning to detail screens restored both front and rear tire pairs and the engine panel. Recording, raw tables, graphs and history keep their original nodes/IDs.
- Tread transform changed with positive wheel angular velocity, stopped for stale input and stayed fixed under reduced motion. Brand/layout motion honors reduced-motion settings. Real-time physical behavior still needs a game capture.
- Populated rendering checked with a clearly labeled isolated UI fixture; it never entered the UDP receiver or saved history and was removed by reload. The animated README uses actual empty-state layout/edit/preset screenshots.
- Windows Setup/Portable and macOS arm64 bundles built. All 39 application/notice files compared with packaged source; SHA-256 sums are in dist/SHA256SUMS-1.6.0.txt. Native macOS launch checks the default Dashboard, 26 available widgets, 88 raw fields and absent audio/demo controls.
- JavaScript syntax, whitespace and frontend evidence-record checks pass.
- Final documentation pass: all 29 tests rerun successfully; local document/image links, all 88 protocol rows and source/lockfile versions checked. Current PNGs cover Drive dark/light, editing, Engineering, all four language settings and an actual 390×844 Arabic phone viewport. The README GIF has eight 1440×900 frames over 24 seconds, captured without generating telemetry.
- Local `.env`, cumulative data and build output are excluded from source publication. An older address screenshot containing LAN details was retained outside the repository and replaced with a current receiver-controls capture; unused prototype GIFs were also retained outside publication.

## Not verified

Real FH6 driving/hardware behavior, physical packet endian assumption, Windows/Linux execution, firewall prompts, full screen-reader QA and independent native-language review remain untested. No public release was published; builds are unsigned.

Layout is per-browser/device. Browser-local review/recording limits and cumulative-history scope remain documented in ANALYTICS.md. Tire motion/steering are illustrations; pressure, camber, wear and per-tire force are not fabricated.
