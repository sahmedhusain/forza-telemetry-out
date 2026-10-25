# Cockpit design contract

Current implementation: **1.6.0**. Earlier version notes below preserve the design decisions that led to it. [Widget and analytics guide](ANALYTICS.md) · [Current screenshots](README.md#current-images) · [Validation](VALIDATION.md)

Purpose: inspect Forza Horizon 6 telemetry while driving or reviewing a recording.
Audience: players, tuners and developers. Primary action: connect real Data Out.

Direction: festival pit-wall. Reference: the Forza Horizon identity's italic wordmark, high-contrast racing typography and pink festival accent; Horizon 6's Japan setting informs the restrained numbered navigation. Original companion typography/marks, not official game assets. Cream instrument cluster, charcoal instrumentation, pink interaction, lime input and cyan suspension signals. No hero stock photo obscures the instruments.

Hierarchy: compact brand/source header → fixed main navigation → smaller selected screen. The global title and record/units/fullscreen toolbar are removed. Record belongs to Session → Recording; units/fullscreen belong to Settings → Display. Phones replace overflowing strips with View/Screen selectors. Content scrolls internally with all scrollbar tracks hidden.

Viewports: 1440x900 desktop; 390x844 and 844x390 phones; 768x1024 and 1024x768 tablets; 1080x1920 portrait monitor; 1920x1080 landscape monitor. Cockpit, each axle, connection functions and settings are split into smaller screens. Portrait uses stacked groups; landscape uses the available columns. Only the field table scrolls horizontally. All controls have labels and keyboard focus. Respect reduced-motion CSS; telemetry continues updating because it is functional data.

States:
- Loading: stable empty instruments, CONNECTING status; allow reload.
- Empty: em dashes and setup instructions.
- Error: specific UDP/API/disconnection message and recovery instruction.
- Partial: absent fields use em dashes; malformed/unsupported live packets rejected atomically; raw unknown byte remains visible.
- Success: explicit LIVE state, recording count and downloadable exports.
- Permission: firewall instructions; browser fullscreen rejection surfaced in notice. No permission escalation inside the app.

Animation reflects measured input: RPM arc, shift lights, suspension bars, steering and G trail. No flashing redline strobe. The steering wheel rotation is illustrative, not a calibrated hardware wheel angle.

Version 1.3.0 added dark/light/system palettes, English/Arabic/Spanish/French, RTL support and three numeric sizes. Raw protocol field names remain stable. The interface has no demo or audio controls. Chart colors must remain visible in both palettes; physical diagram corners must not mirror with RTL.

Version 1.4.0 adds screen pagination, all-viewport hidden scrollbars, persistent per-car field records and community-sourced vehicle names. Cumulative history and browser charts have distinct scopes. Lap minima explicitly disclose the missing track identifier.

Version 1.5 review contract: [reference research](RESEARCH.md) supplies the design observations. Channel comparison answers how two raw signals change at the same sampled instant. Two explicit axes, solid/dashed lines and exact-value readouts distinguish units; a held snapshot stays separate from live reception. Focus hides navigation/branding while preserving freshness, the notice and an always-available exit (Escape or button). No audio, demo, physics prescriptions or guessed unavailable fields.

New target checks: empty/one-sample/missing-secondary/held/live/gap states, cursor bounds and keyboard range navigation; focus exit and source visibility; English dark and Arabic light at 390×844, 844×390, 768×1024, 1440×900 and 1920×1080. Existing remaining viewport evidence remains valid for unchanged screens. Controls must not introduce document overflow or visible scrollbar tracks.

Version 1.6 overview contract: the default Dashboard combines configurable live instruments while the existing detail views remain available. A native CSS grid supports reorder, width/height, show/hide, saved device-local layouts and drive/engineering/all presets. Existing instrument nodes move into active widgets and return to their detail screens on navigation; IDs, raw fields, recordings and history stay intact. All 88 channels remain available in the channel widget. Empty layouts provide Add/Reset recovery; invalid stored layouts fall back safely; storage failure applies changes for the session with a visible notice.

Brand/motion direction: racing pit-wall, original slash mark, numbered modules, pink/cyan/lime accents, flat instrumentation and restrained carbon/grid texture. Entrance and layout motion are finite, with native CSS/Web Animations and reduced-motion support. Tire tread motion follows reported angular velocity; stale or unavailable telemetry stops it. No sounds, demo, guessed tire pressure or simulated values. Validate default/edit/empty/reordered/resized/restored layouts, pointer and keyboard/touch alternatives, detail restoration, live/stale/reduced motion, RTL/light themes and 390×844, 844×390, 768×1024, 1440×900, 1920×1080 layouts.
