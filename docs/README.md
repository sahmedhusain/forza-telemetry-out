# Documentation — 1.6.1

Start with [Getting started](../GETTING_STARTED.md) to install the receiver, configure FH6 and connect a browser or desktop window. The [project README](../README.md) provides a feature tour, supported languages, screenshots and build commands.

## Guides

| Guide | Use it for |
|---|---|
| [Getting started](../GETTING_STARTED.md) | Requirements, configuration, ports/IPs, desktop paths, phone access and troubleshooting |
| [Telemetry and analytics](ANALYTICS.md) | All 26 widgets, data relationships, formulas, timing, storage and unavailable measurements |
| [Packet reference](PROTOCOL.md) | All 88 fields, wire types, units, byte offsets and decoding assumptions |
| [Local API](API.md) | HTTP endpoints, WebSocket events, export formats and control errors |
| [Build and release](RELEASING.md) | Platform commands, filenames, versioning, CI, draft releases and signing |
| [Validation](VALIDATION.md) | Completed tests, viewport checks, evidence and remaining hardware limits |
| [Design contract](DESIGN.md) | Visual direction, navigation, motion, accessibility and responsive expectations |
| [Reference research](RESEARCH.md) / [sources](REFERENCES.md) | Ideas considered, provenance and boundaries between in-game displays and UDP data |
| [Changelog](../CHANGELOG.md) | Feature history through 1.6.1; version entries do not imply published binaries |
| [License](../LICENSE) / [notices](../THIRD_PARTY_NOTICES.md) | MIT terms, companion artwork, brands and community car-name attribution |

## Current images

These captures show 1.6.1 with no game connected. They contain no generated telemetry. The GIF cycles through actual captures of layouts, editing, themes and language settings. PNG files provide static alternatives.

| Image | Content |
|---|---|
| [configuration.gif](assets/configuration.gif) | Fitted driving layout → widget editor → chassis/slip layout → four language settings → light dashboard |
| [dashboard.png](assets/dashboard.png) | Six-widget custom driving layout, English dark, 1440×1080 |
| [dashboard-light.png](assets/dashboard-light.png) | Same custom driving layout, English light, 1440×1080 |
| [dashboard-edit.png](assets/dashboard-edit.png) | Three-widget editor with complete tire and slip panels |
| [dashboard-engineering.png](assets/dashboard-engineering.png) | Five-widget custom chassis/slip layout |
| [settings-en-dark.png](assets/settings-en-dark.png) | 🇬🇧 English, dark |
| [settings-ar-light.png](assets/settings-ar-light.png) | 🇸🇦 العربية, light / right to left |
| [settings-es-light.png](assets/settings-es-light.png) | 🇪🇸 Español, light |
| [settings-fr-dark.png](assets/settings-fr-dark.png) | 🇫🇷 Français, dark |
| [dashboard-phone-ar.png](assets/dashboard-phone-ar.png) | Arabic light tire-widget layout, 390×844 |

Older files in `evidence/` are versioned QA records, including explicitly labeled isolated fixtures. They document checks, rather than current product screenshots. [Validation](VALIDATION.md) distinguishes UI fixtures, local transport tests and real-game verification.

## Maintaining these documents

When behavior changes, update the user instructions, formulas/protocol or API as applicable, changelog and validation evidence. Keep the source/lockfile version and visible app version consistent. Replace current screenshots and regenerate the GIF from the same application version; preserve the static alternatives and label any test data. Confirm local links and examples before pushing. See the [release checklist](RELEASING.md#release-checklist) before distributing a build.
