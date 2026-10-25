# Telemetry reference review — 25 October 2026

Our brief: a local FH6 pit-wall for desktop, phone and unusual monitors. Real UDP data, readable instruments, accessible controls, four languages, no sound/demo. Useful relationships and honest measurement limits take priority over adding widgets. This is a source-based design review, not a hands-on performance ranking or a claim that this app beats every alternative.

## What each reference contributes

| Reference | Evidence and scope | Lesson for this app |
|---|---|---|
| [Wisp](https://github.com/Views2k/Wisp) | Its current README describes FH6 HUD customization, recorded-run review, shared cursors, comparisons, tune snapshots and lap tools. These are documented capabilities, not locally executed benchmarks. | Group related signals, inspect one moment across channels, keep raw data separate from visual smoothing. A full overlay/run library is a larger workflow than this update. |
| [Racing View](https://www.racingview.app/) | Product site describes lap comparisons, dyno views and race strategy. Its FAQ currently excludes Horizon and lists other supported games. Feature claims do not prove equivalent FH6 data availability. | Pair measurements with a clear question: where speed changes, when pedals overlap, how output varies with RPM. Do not transplant track/sector or tire-wear predictions into FH6. |
| [austinbaccus/forza-telemetry](https://github.com/austinbaccus/forza-telemetry) | README describes CSV recording, position trails, laps and fuel estimates for earlier games. Its FAQ acknowledges a guessed tank capacity for MPG and layout sensitivity outside 1920×1080. | Preserve complete exports and bounded traces; avoid guessed tank sizes and screen-size assumptions. Its port 5300 example must not replace current FH6 guidance. |
| [Community discussion](https://www.reddit.com/r/forza/comments/1l26mrp/im_building_an_external_telemetry_view_for_forza/) | Users request panel focus/resizing, odd monitor shapes, logging, comparisons and phone screen-awake behavior. This is qualitative feedback, not representative market research. | Keep the driving view compact, provide reversible focus, support touch inspection, make missing data obvious. |
| [Historical video](https://www.youtube.com/watch?v=74IcqCQFzjI) | “Forza Telemetry Guide — How to Read and Use Telemetry to Tune,” 8:54. Reviewed auto-generated English captions; historical teaching material, not an FH6 protocol specification. | Organize by engine, inputs, contact, suspension and body motion; compare repeated observations rather than prescribing a tune from a single value. |

Wisp’s [architecture notes](https://github.com/Views2k/Wisp/blob/main/docs/HOW-WISP-WAS-BUILT.md) separately describe conservative wheel-radius learning and guarded Windows process reads for native HUD state. This corroborates that some of its capabilities use additional calibration or build-specific access, rather than UDP fields alone. That architecture is not implemented here.

The existing [reference review](REFERENCES.md) includes co-driver and the historical Forza manual. Project documentation and product pages are self-reports; none of these applications was installed or benchmarked against real FH6 hardware during this review. No code or graphics were copied.

## Video-to-packet translation

| Video section | Display idea | FH6 Data Out boundary |
|---|---|---|
| 1:32–3:59, general | Read power/torque against RPM, then relate pedals to speed | Available. UDP Steer is controller input; the video's discussion of an in-game steering display does not establish actual road-wheel angle over UDP. |
| 4:09–5:21, friction | Four clearly located tire plots and a body G trail | Normalized slip is available. Per-tire force, load and an available-grip force circle are not. Our slip plane must remain labeled normalized values. |
| 5:22–6:16, suspension | Relative compression and travel history | Normalized/meter travel and a derived velocity are available. A 98% reading is near reported compression, not proof of a mechanical bump-stop event. |
| 6:17–6:40, body acceleration | See how lateral/longitudinal motion develops together | Body acceleration is available; G conversion does not establish tire friction coefficient. |
| 6:41–7:42, tires/heat | Per-corner color, temperature and wheel rotation | Only one unspecified-unit temperature per tire is exported. Pressure, camber, wear and inner/middle/outer temperatures are absent. No universal “optimal” temperature is inferred. |
| 7:44–7:57, damage | Separate damage from transient events | Component damage is absent; smashable-object mass/velocity loss is not car mass or a full damage model. |

The [official FH6 specification](https://support.forza.net/hc/en-us/articles/51744149102611-Forza-Horizon-6-Data-Out-Documentation) takes precedence: 324 bytes, output-only UDP, no TrackOrdinal/TireWear and no stream during menus/replays/rewinds. Its reserved 5200–5300 range overrides old setup examples.

## Decisions and next useful work

**Implemented in 1.5:** paired raw-channel comparison with explicit independent scales, an exact sampled cursor and a held review window; reversible screen focus that retains source freshness and an exit control. The tachometer now clears its RPM scale when a valid maximum is unavailable instead of substituting 9,000 RPM; valid car-specific scales remain dynamic. These use the existing bounded browser history, not generated packets. Held analysis does not pause reception, recording or other instruments.

**Existing strengths retained:** 88-field inspection/export; per-car persistent extrema and coverage; genuine gap boundaries; slip planes, observed dyno, suspension RMS, time-weighted inputs; mobile/RTL/themes/number sizes; explicit connection IP/ports and downloadable desktop builds.

**Implemented in 1.6:** a default Dashboard with 26 selectable modules, Drive/Engineering/All presets, per-widget dimensions, drag and keyboard/touch ordering, and per-device layout persistence. Instruments reuse the existing detail views' nodes/data. Original companion branding and finite layout transitions accompany wheel-angular-velocity-driven tread motion; stale data and reduced-motion preferences stop decorative motion. This addresses panel organization without claiming calibrated tire forces or a game overlay.

**Next candidates, not implemented:** named on-disk raw run library and import validation; manually labeled routes with compatible-run comparisons; a user-triggered screen-awake control with visible support/release states; optional acceleration/braking test capture with eligibility rules. Each needs acceptance checks and real-drive validation before being presented as reliable analysis.

**Needs evidence rather than guessed math:** track-specific deltas and sectors, automatic setup prescriptions, friction percentage, tire-life predictions, MPG/liters without verified tank capacity, pressure/camber/inner-outer temperatures. A memory-reading or game-control architecture would be a different product scope; this app remains a one-way UDP companion.
