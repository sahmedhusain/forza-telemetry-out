# Local HTTP and WebSocket API — 1.6.1

The browser and Electron renderer use the same Node.js receiver. The default base URL is `http://127.0.0.1:3050`; use your configured `WEB_PORT`. This API is for a trusted local client. There is no authentication or per-client recording state. Enabling LAN access exposes telemetry, network details, shared recording controls and exports to devices that can reach the receiver.

Use `localhost` or the receiver's literal IP address as the HTTP host. Browser requests must have the same origin as the receiver; a foreign `Origin` receives 403. Clients without an Origin are accepted. This origin check does not provide user authentication. There are no game-control commands, audio or simulator endpoints.

## Status, connection and history

| Method | Path | Response / behavior |
|---|---|---|
| GET | `/api/status` | JSON with `udp`, `recorder`, `clientsCount`, `serverTime` and `webPort` |
| GET | `/api/network` | Detected IPv4 interfaces, active UDP/web host and port, `lanEnabled`, `localUrl`, latest sender IP or null |
| GET | `/api/config/download` | Plain-text `.env` attachment with the four active network settings; excludes display preferences and `FORZA_DATA_DIR` |
| POST | `/api/connection` | Apply JSON body `{"port":5510}`; returns `{"port":5510}` on success |
| GET | `/api/history` | Selected/latest profile plus saved-vehicle list, persistence state and errors |
| GET | `/api/history?car=2755` | Snapshot for a numeric ordinal; invalid noninteger ID returns 400 |
| GET | `/api/history?all=1&download=1` | `forza-history.json` attachment: `{"version":1,"profiles":[...]}` for all saved cars |

The connection endpoint accepts an integer port from 1024–65535, excluding 5200–5300. Stop recording first. A concurrent port change or active recording returns **409**. Invalid JSON/port, an oversized body or a bind failure returns **400** with a plain-text explanation. The request body limit is 1,024 characters. A new listener binds before the old listener is closed; failure preserves the old port. The change lasts until restart unless you save the downloaded `.env` in the configuration location.

`udp` status includes listener/error state, bind address/port, accepted/invalid packet counts, bytes, current packets per second, last length/time and `hasActiveStream`. Freshness is based on a two-second local receipt window. `detectedGame` describes packet-format recognition, not verified game-process identification.

`recorder` status includes `isRecording`, `limitReached`, `sessionName`, `frameCount` and `durationSec`. Consumers should accept `durationSec` as a formatted string or numeric zero.

Read status without changing anything:

```sh
curl http://127.0.0.1:3050/api/status
```

## Shared recording controls

| Method | Path | Response / behavior |
|---|---|---|
| POST | `/api/recorder/start` | Start capture; returns `success` and `isRecording`. Already recording is a no-op. Returns 409 when a stopped, nonempty capture must first be exported/cleared. |
| POST | `/api/recorder/stop` | Stop and retain frames; returns `success` and a summary with name, count and duration |
| POST | `/api/recorder/clear` | Delete the in-memory capture; returns `{}`. Returns 409 while recording. The UI asks for confirmation before calling this endpoint. |
| GET | `/api/recorder/export/csv` | CSV attachment; empty body when no frames exist |
| GET | `/api/recorder/export/json` | JSON attachment, including an empty `frames` array when no frames exist |

All connected clients share one capture. There is no append/resume, disk run library or import endpoint. The 18,000-frame capacity stops capture without dropping earlier frames. Export before clearing or shutting down the receiver. UI layout/preference resets do not clear this buffer or saved history.

## Export formats

- **CSV:** 91 columns in fixed order: `TimeOffsetMs`, `Source`, all 88 names in [packet-schema.json](../public/packet-schema.json), then `ReservedByte`. Source is `live`. Original numeric values and protocol units are retained.
- **JSON recording:** `sessionName`, `recordedAt` (ISO time or null), `frameCount` and `frames`. Each frame includes `timeOffsetMs`, receipt `timestamp`, sender IP/port, `raw`, `reservedByte` and derived display groups. Review sender information before sharing a recording.
- **History JSON:** cumulative per-car summaries, not every raw packet. Field bounds, peaks and observed totals follow the eligibility rules in [persistent history](ANALYTICS.md#persistent-packet-history).

Language, theme and display units do not alter raw CSV values or protocol field names.

## WebSocket

Connect to `ws://127.0.0.1:3050/` using the same host/port as HTTP. Events are JSON envelopes:

```json
{"type":"status","data":{"udp":{},"recorder":{},"clientsCount":1,"serverTime":"…","webPort":3050}}
```

The abbreviated example omits nested status fields; use `/api/status` for the current complete shape.

- **`status`:** sent immediately on connection, approximately every second, and after relevant control changes.
- **`telemetry`:** `{"type":"telemetry","data":{...}}` for each accepted frame. `data.raw` contains all 88 fields. A reconnect also receives the latest frame if its local receipt age is under two seconds.

The decoder accepts only complete 324-byte packets with finite floats. Invalid UDP packets increase the invalid counter and produce no telemetry event. Recording/history receive accepted packets independently of browser rendering.

There is no replay backlog on reconnect. A client with at least 1 MiB of buffered outgoing data can miss telemetry broadcasts until it catches up; receipt is not guaranteed. Client messages are not application commands; use the HTTP controls. Incoming WebSocket payloads are limited to 1,024 bytes.

## Related guides

[Setup and storage paths](../GETTING_STARTED.md) · [88-field protocol](PROTOCOL.md) · [Calculations and limits](ANALYTICS.md) · [Validation](VALIDATION.md)
