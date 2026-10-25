# Getting started

For version **1.6.1**. [Feature tour and screenshots](README.md) · [Documentation index](docs/README.md) · [Analytics and limits](docs/ANALYTICS.md)

## Requirements

- Node.js 22 or later and npm for source use.
- Windows, macOS or Linux for the receiver. The game runs on its supported platform; a Mac/Linux receiver can receive from a gaming PC or console on the same LAN.
- Forza Horizon 6 configured to send Data Out.

## Install from source

```sh
git clone https://github.com/sahmedhusain/forza-telemetry-out.git
cd forza-telemetry-out
npm ci
```

Create local configuration if needed:

```sh
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Do not overwrite an already customized `.env` without keeping your settings. `.env` stays local; commit changes to `.env.example` when documenting defaults. All settings are listed in the [configuration table](README.md#configuration).

| Connection | Default | Where to use it |
|---|---|---|
| Game → receiver | UDP `5500` | FH6 Data Out destination port; inbound private-network UDP rule |
| Browser → receiver | TCP `3050` | `http://127.0.0.1:3050` locally; inbound TCP rule only for LAN viewers |
| UDP listener | `0.0.0.0` | Binds all IPv4 interfaces; never use as the game's destination address |
| Web listener | `127.0.0.1` | Local access; change `WEB_HOST` to `0.0.0.0` only for trusted LAN viewing |

Changing the web port does not change the game's UDP port. Shell environment variables take precedence over `.env`. Restart after editing configuration files.

## Choose one launch mode

| Command | Opens / starts |
|---|---|
| `npm start` or `npm run web` | Receiver; open http://127.0.0.1:3050 yourself |
| `npm run electron` or `npm run dev` | Receiver plus desktop window |

Run only one receiver per port. Quit with Ctrl+C in a terminal or quit the desktop application. Closing the last window on macOS leaves the application running until you choose Quit. Recordings must be exported before quitting.

## Connect the game

1. Launch the receiver on the computer where you want to collect telemetry.
2. Find that computer's LAN IPv4 address (Windows: `ipconfig`; macOS: System Settings → Network → Details → TCP/IP; Linux: network settings). Prefer a DHCP reservation if the address changes often.
3. In FH6, open **Settings → HUD and Gameplay**.
4. Set **Data Out** to **On**.
5. Set **Data Out IP Address** to the receiver IP. Use `127.0.0.1` only when game and receiver run on the same PC. Never enter `0.0.0.0` as the destination.
6. Set **Data Out IP Port** to **5500** (or your configured `FORZA_PORT`). Do not choose 5200–5300.
7. Allow the receiver through the private-network firewall for inbound UDP on that port.
8. Drive. Look for **LIVE / RECEIVING** and moving instruments.

Forza sends only during driving, not in menus, pause, replay, rewind or after a finished race. This is normal. The UI holds the last sample, fades the cockpit and labels the source as waiting after two seconds. [Official configuration](https://support.forza.net/hc/en-us/articles/51744149102611-Forza-Horizon-6-Data-Out-Documentation).

## Phone / tablet / second screen

Set `WEB_HOST=0.0.0.0` in `.env`, restart and open `http://RECEIVER_IP:3050` from a device on the same trusted LAN. If needed allow inbound TCP 3050 on the private-network firewall. The game still sends UDP to the receiver, not to the phone. Every connected device can control the shared recording; this is a single-user local utility, not an authenticated public service.

## Navigate and customize

Start in **Dashboard**. Choose a preset and use Edit widgets to add/hide, reorder and resize the panels. Drag on desktop or use the up/down controls on touch/keyboard. Changes save per browser/device. Reset layout restores the default without deleting telemetry.

Choose a top-level tab: Dashboard, Cockpit, Chassis, Analysis, Session, Channels, Connect or Settings. Then choose a smaller screen. Phones use View/Screen drop-downs; wider displays use tabs. Scroll gestures and keyboard scrolling work with scrollbar tracks hidden.

In **Connect → Addresses**, select and copy a receiver IP. Match the displayed UDP port in the game. **Diagnostics** shows packet health; **Phone access** explains LAN viewing; **Receiver** changes the port. You can apply a different UDP port while recording is stopped. If binding fails, the previous port remains active. Download .env after changing the port to preserve it for future launches.

Use **Settings → Language and theme** for 🇬🇧 English, 🇸🇦 العربية, 🇪🇸 Español or 🇫🇷 Français; dark/light/system theme; and standard/large/extra-large numbers. Arabic uses right-to-left navigation. **Display**, **Instruments** and **Tires** contain units, accent, density, arc/digital display, reduced motion, G-scale, history, visual shift threshold and tire-color preferences. These save on this device. See [formulas and visual explanations](docs/ANALYTICS.md). Record/Stop, CSV/JSON downloads and Clear Session are in **Session → Recording**. **Saved bests**, **History coverage** and **Field records** contain cumulative receiver history.

**Analysis → Compare channels** pairs two raw fields on independent axes. Tap the plot or move Inspect sample to hold the current window; Resume live follows new samples again. Exact raw values remain under the large rounded readings. The held window includes the sampled car ID/PI, so it can remain identifiable after changing cars.

Use the header focus control to expand the current screen; Escape or Exit focus restores navigation. Connection freshness stays visible. Focus does not request operating-system fullscreen.

## Read the dashboard

- **Settings → Display → Units** switches speed, power (kW/hp) and distance (km/mi). Torque remains N·m and boost remains psi, as labeled.
- **Settings → Display → Fullscreen** uses browser fullscreen or the desktop window. Desktop also supports F11.
- **Contact patch** shows raw tire temperatures because the supplied documentation does not define their units. Compression bars are 0–100%. Slip magnitude greater than 1 indicates loss of grip.
- **All channels** shows every original value and byte offset. Search and filter by system; Freeze pauses this table only, while the cockpit and recording continue.
- **Record / Stop** captures frames. Download CSV or JSON, then clear before starting a fresh session. The 18,000-frame limit stops capture without discarding old frames.

## Installed desktop builds

For Windows Setup/Portable EXE files use `npm run dist:win`. Build the current platform using `npm run dist`; files appear in `dist/`. Unsigned local builds can trigger platform trust prompts. Published signed/notarized installers require the maintainer's certificates; this repository does not include them.

On macOS, `npm run dist:mac` makes Apple Silicon (`arm64`) DMG/ZIP files. Then run `npm run dist:mac:intel` for Intel (`x64`). Choose the correct architecture; open the DMG and drag the app to Applications. Linux x64 AppImages use `npm run dist:linux`. Read the [signing instructions](docs/SIGNING.md) for verified publisher certificates and signature checks.

The packaged app uses defaults unless environment variables or a `.env` file are supplied. Place `.env` in Electron's user-data directory (normally `forza-telemetry-out` beneath the platform's application-data directory):

- Windows: `%APPDATA%\forza-telemetry-out\.env`
- macOS: `~/Library/Application Support/forza-telemetry-out/.env`
- Linux: `~/.config/forza-telemetry-out/.env`

Create the directory if necessary. Copy the four settings from `.env.example`; restart after changing them. The build also includes a template in its resources directory. Launching from source uses the repository's `.env` instead.

Saved history is stored in `data/history.json` for source launches, or `data/history.json` inside the user-data directory above for installed builds. The receiver saves every five seconds and on clean exit. Optional `FORZA_DATA_DIR` sets an absolute storage directory. Export all saved cars from Session → Saved bests. Existing raw recordings still require a separate export.

## What survives a restart?

| Data | Stored where | Lifetime / backup |
|---|---|---|
| Language, theme and display preferences | Browser/profile localStorage | Survives reloads; clearing site data removes it |
| Widget selection, order and sizes | Browser/profile localStorage | Saved independently on each viewing device |
| Browser graphs and held comparison | Page memory | Reloading the page clears them; use raw exports for durable analysis |
| Raw recording | Receiver memory, shared by clients | Survives a browser reload; disappears when the receiver quits. Export CSV/JSON first. |
| Per-car bests and field bounds | Receiver `data/history.json` | Survives clean restarts; export history or back up the file |
| Receiver settings | Local `.env` or shell environment | Downloaded settings must be placed in the configuration directory before restarting |

History is a cumulative summary, not an archive of every raw frame. The last unsaved interval can be lost on an abrupt shutdown. Clear Session deletes the raw recording only; Reset Analysis clears browser analysis; Restore Defaults resets display preferences; Reset layout restores Drive widgets.

## Troubleshooting

| Symptom | Check / fix |
|---|---|
| Waiting, no telemetry | Start driving; check destination IP, UDP port and private firewall rule |
| UDP bind EADDRINUSE | Quit the other receiver, or change both the app and game to the same free UDP port |
| HTTP EADDRINUSE | Quit the other dashboard or change `WEB_PORT`, then use the new URL |
| UDP error | Confirm the bind address exists on this computer and port is valid, then restart |
| Rejected packets | This release expects 324-byte FH6 packets and finite numeric values; check game/version |
| Phone cannot connect | Use receiver LAN IP, `WEB_HOST=0.0.0.0`, TCP firewall rule and same network; guest networks may isolate devices |
| Incorrect tire temperature units | Values are intentionally raw; FH6 source does not define the unit |
| No car name / class name | Check Cockpit → Vehicle. Known ordinals use a community lookup; unknown IDs and class numbers remain raw |
| Record won't start | Export the previous session, then clear it; check whether the frame limit was reached |
| Old values after pause | Expected: the source status says waiting and instruments are faded |
| Electron fails to launch | Reinstall with `npm ci`; check that Electron's platform binary downloaded successfully |
| Tests fail with EPERM | Your execution sandbox must permit local TCP/UDP socket binding |

## Next steps

Read the [full packet reference](docs/PROTOCOL.md), [README](README.md) and [release guide](docs/RELEASING.md). Keep a real-drive sample locally when validating new game updates; synthetic tests cannot prove hardware compatibility.
