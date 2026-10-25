# Changelog

## 1.6.0 — 2026-10-25

- Add a default Dashboard with 26 shared live-data widgets and Drive/Engineering/All presets. Add/hide, drag or keyboard/touch reorder, width/height controls and validated per-device persistence.
- Preserve original detail-screen nodes, listeners and data when entering/leaving the overview; keep all 88 channels and history/recording tools available as widgets.
- Refresh the original companion slash mark, numbered subsystem panels, grid texture and finite entrance/reorder animation. Add angular-velocity-driven tire tread motion with stale/reduced-motion safeguards.
- Add layout validation, persistence, preset and ordering tests; document widget controls and motion limits.
- Refresh the README GIF and PNG gallery from 1.6.0; document all four interface languages with flags, RTL behavior, themes, widget inventory, configuration/storage scope and the local HTTP/WebSocket API.


## 1.5.0 — 2026-10-25

- Review the supplied Wisp, Racing View, earlier Forza Telemetry, community discussion and historical video references; document findings and FH6 data boundaries.
- Add paired raw-channel graphs with distinct independent axes, held-window inspection, exact sampled cursor and readable raw-value detail.
- Stop substituting a 9,000-RPM scale when the game reports no usable maximum.
- Add reversible screen focus with Escape/button exit and persistent source freshness.
- Refine phone and landscape analysis layouts; extend all four interface languages and add review-model tests.


## 1.4.0 — 2026-10-25

- Remove the global workspace title and record/units/fullscreen toolbar. Move recording to Session and display tools to Settings.
- Hide scrollbar tracks globally while preserving gestures and keyboard scrolling. Split cockpit, chassis, session, connection and settings into smaller screens; use native View/Screen selectors on phones.
- Persist per-car extrema for every raw field, speed/power/torque/RPM/G peaks, packet coverage and observed time/distance/contact durations. Add all-car history JSON export.
- Add attributed community model names for 681 ordinals; expose raw vehicle metadata and identify lookup-derived names. Unknown IDs remain usable.
- Distinguish cross-event lap minima from track-specific records; reset browser lap comparisons after race/lap rewinds. Retain stopped-recording duration.


## 1.3.0 — 2026-10-25

- Remove the demo generator, audio engine, launch scripts and simulator endpoint.
- Add English, Arabic RTL, Spanish and French interface settings.
- Add dark/light/system themes and standard/large/extra-large numbers.
- Add per-tire slip planes, lap consistency, braking peak and time-weighted suspension summaries.
- Exclude inactive endpoints from suspension derivatives and keep unavailable results blank.
- Preserve original field names, numeric raw values and CSV structure across language changes.

## 1.2.0 — 2026-10-25

- Replace page navigation with seven accessible tabs and five analysis graph tabs.
- Add persistent display/instrument preferences and reduced-motion behavior.
- Add a detailed generic car diagram with telemetry-driven tire colors and per-corner values.
- Derive body sideslip, damper velocity, axle differences, power curves, driven paths and time-weighted session statistics.
- Show actual local IPs and ports; safely apply UDP port changes with occupied-port rollback and downloadable configuration.
- Add distinct Windows Setup and Portable packaging targets.
- Fix audio starting unmuted and avoid joining chart traces across packet gaps.

## 1.1.0 — 2026-10-25

- Focus the receiver on the documented Forza Horizon 6 324-byte format.
- Preserve all 88 fields and the unspecified final byte; decode integer puddle flags and the three FH6 insertions correctly.
- Add a responsive festival-style cockpit, motion readouts and complete searchable field reference.
- Add labeled synthetic demo through the live binary decoder; live UDP takes priority.
- Export all raw fields to CSV/JSON. Stop at recording capacity without losing earlier frames.
- Default UDP to 5500 and web access to loopback; reject foreign browser origins.
- Add parser and UDP integration tests, original animated README artwork, setup/protocol docs and platform packaging workflows.
- Remove unsupported temperature-unit, class-name and other-game compatibility claims.

## 1.0.0 — existing prototype

Initial repository contained an Electron shell, UDP bridge, synthetic demo and canvas gauges. This entry describes repository history, not a verified published binary release.
