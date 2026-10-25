# Reading the telemetry workspace — 1.6.0

[Setup](../GETTING_STARTED.md) · [Documentation index](README.md) · [Packet fields](PROTOCOL.md) · [Local API](API.md)

The app uses the 88 fields in the [FH6 Data Out specification](PROTOCOL.md). The Channels tab retains every original value; Analysis can graph any one of them, including integer inputs and flags. Derived measurements are labeled and do not change the raw exports.

## Tabs and navigation

- **Dashboard:** a saved widget grid combining existing instruments and data. It reuses the same DOM nodes and values as detail screens. Switching away restores every node to its original screen; no second recorder/decoder or duplicate field IDs are introduced. Layout edits do not change calculations.

- **Cockpit:** Instruments, Driver inputs, Motion and Vehicle metadata screens.
- **Chassis:** generic top-down car, Front axle and Rear axle screens; tire slip, travel/velocity, rotation, rumble and water/curb contact.
- **Analysis:** graph tabs for normalized input traces, paired raw channels, observed power curve, driven path, suspension velocity and per-tire slip planes.
- **Session:** Summary, Recording, Race timing, Laps, Suspension, Saved bests, History coverage and Field records. Record/Stop and CSV/JSON downloads live in Recording.
- **Channels:** searchable 88-field table with group filter, byte offsets and freeze.
- **Connect:** detected receiver IPv4 addresses, current ports, packet statistics, UDP port changes, .env download and installation guidance.
- **Settings:** device-local display and instrument preferences.

Main views and smaller screens use keyboard-operable tabs on wider displays and labeled native selectors on phones. Main/screen tabs support arrows and Home/End; analysis graph tabs support arrows. Only the selected screen/graph is shown. Scrollbar tracks are hidden globally; touch, wheel and keyboard scrolling remain available, including focusable data tables. Historical field records become labeled min/max/latest cards on phones so raw channel identifiers remain readable. Browser URL fragments identify main views.

## Widget inventory

Dashboard offers these 26 modules. Drive starts with 10 widgets; Engineering starts with nine; All widgets adds every module. A preset replaces the current selection/order/sizes. Use Edit widgets for individual changes; layouts save per browser/device, rather than syncing across viewers.

| Widget | What to read |
|---|---|
| Engine + speed | Reported RPM scale, speed, gear and current car |
| Vehicle visualization | Generic car with per-corner color and illustrative steering/tread motion |
| Driver inputs | All four pedals and signed steering input |
| Powertrain | Power, torque, boost, fuel and current/best lap |
| Body acceleration | Lateral/longitudinal G circle and vertical acceleration |
| Four tire states | Compact temperature, compression, slip and contact indicators; full detail in axle screens |
| Inputs + speed | Normalized rolling speed/pedal/boost relationships |
| Session peaks | Browser-observed speed, power, planar G and driving duration |
| Race timing | Lap count, position, last lap, elapsed time and distance |
| All 88 channels | Original fields, units, types and offsets; search/filter/freeze |
| Handling relationships | Body sideslip and front/rear slip/compression/temperature differences |
| Vehicle metadata | Raw identifiers plus attributed community name/year when known |
| Body / world | Position, velocity, orientation, rotation and collision-object values |
| Power curve | Eligible observed power/torque against RPM |
| Driven path | Recent X/Z movement with equal spatial scale |
| Suspension velocity | Per-corner derivative of reported physical travel |
| Tire slip plane | Per-corner normalized slip-angle/slip-ratio relationship |
| Compare channels | Two independent axes with held-window/sample inspection |
| Recording | Shared raw capture controls, status and CSV/JSON downloads |
| Connection health | Listener state, active port, packet counters and errors |
| History coverage | Cumulative observed time, distance and contact/slip durations |
| Historical field records | All-field min/max/latest for the selected saved car |
| Driving behavior | Time-weighted pedal and slip occupancy |
| Observed laps | Latest 100 directly observed lap completions and consistency |
| Suspension summary | Time-weighted RMS velocity and near-end travel occupancy |
| Saved bests | Persistent per-car peaks, vehicle selection and all-car history export |

## What the derived values mean

| Measurement | Calculation | Interpretation / limit |
|---|---|---|
| Body sideslip | `atan2(VelocityX, VelocityZ)` in degrees | Direction of local motion relative to car forward. Hidden below 5 m/s or when forward velocity is ≤1 m/s. This is not a tire slip angle or a tuning diagnosis. |
| Planar G | `hypot(AccelerationX, AccelerationZ) / 9.80665` | Combined lateral/longitudinal acceleration; no gravity compensation or tire friction coefficient inferred. |
| Damper velocity | Difference in `SuspensionTravelMeters` divided by elapsed game time | Positive means increasing reported travel. Shown in mm/s. Packet gaps, rewinds and source changes suppress the derivative. |
| Front/rear slip-angle difference | Mean absolute front normalized tire slip angle minus mean absolute rear | Positive means front values are larger. Normalized values, not degrees; does not alone prove understeer. |
| Compression balance | Mean front compression minus mean rear compression, in percentage points | Suspension position difference; not measured axle load, weight transfer or ride height. |
| Temperature spread | Hottest raw tire value minus coldest | Relative spread only. No assumed temperature unit or safe/optimal threshold. |
| Observed power curve | Maximum positive power in each 250-RPM bin, alongside torque from that sample | Requires throttle ≥242/255, brake <13/255 and clutch <13/255. Separate kW and N·m scales. Not a calibrated dynamometer or a complete engine curve. |
| Driven path | Recent world X/Z samples, equal axis scale | Colored by speed. No road image or track database. Teleports/gaps are not joined. |
| Peak speed / power / G | Maximum observed during active-race packets | Scope is this browser session since reset, vehicle/PI change or source change. |
| Pedal usage | Active time with previous sample's pedal >12/255, divided by observed active driving time | Approximately a 5% threshold. Uses elapsed game time; pauses/gaps excluded. Throttle/brake/overlap percentages are not mutually exclusive. |
| Slip time | Active time when any wheel's absolute combined slip exceeds 1 | A reported normalized-slip threshold, not grip percentage or lateral force. |
| Completed laps | An observed lap-count increment of exactly one, with nonzero LastLap | No invented sectors, predicted laps or deltas for laps missed while disconnected. Table retains the latest 100 observed laps. |

## Timing and sampling

Analytics consume incoming frames before display-frame coalescing. Game timestamps use unsigned rollover arithmetic. Continuity requires a positive interval ≤0.5 seconds, a local receipt gap ≤0.5 seconds, increasing race time and nondecreasing distance. Race/menu flags exclude inactive driving time. Vehicle ordinal, performance index and vehicle identity changes reset the analysis.

Charts retain up to 120 seconds / 1,200 samples, sampled at approximately 10 Hz. Choose 10, 20, 60 or 120 seconds in Settings or Analysis. This is useful for driving relationships, but high-frequency damper analysis should use full-rate CSV/JSON exports. Browser chart samples prior to connecting are unavailable; cumulative receiver history is stored separately below. The normalized input trace collects according to its configured history window.

## Tire colors and animation

- **Combined slip:** cyan near zero, amber around the loss-of-grip threshold, red at high slip. Exact values remain visible.
- **Compression:** color reflects 0–100% normalized compression, without implying a failure threshold.
- **Temperature:** color interpolates between user-defined raw minimum/maximum endpoints. These are visualization settings, not engineering limits.

The car is an original generic diagram. Steering rotation is illustrative because Data Out sends steering input, not actual road-wheel angle. Tire pressure, wear, camber, lateral force, vehicle mass and per-tire loads are not supplied by the documented packet. They are never fabricated. Motion follows the system reduced-motion preference, with an additional manual reduced-motion option.

## Customization and storage

Preferences are saved in localStorage per browser/profile: English/Arabic/Spanish/French, dark/light/system theme, standard/large/extra-large numbers, metric/imperial display, accent, density, digital/arc gauge, reduced motion, G-circle scale, history duration, shift-alert percentage and tire color mode/range. The application has no sound or demo feature. Restore Defaults resets display preferences only.

The shift setting is an alert threshold relative to reported maximum RPM, not an optimal shift recommendation. Torque stays N·m, boost stays psi and temperature stays raw, as labeled.

## Connection changes

A new UDP port is bound before the old receiver is stopped. Invalid or occupied ports leave the old listener working. Port changes are blocked during recording. The new value applies for the running process; download `.env` and place it in the documented configuration location to keep it after restart. This download contains no credentials.

The web bind address remains a startup configuration. Set `WEB_HOST=0.0.0.0` and restart for trusted-LAN viewing; Connect shows whether LAN viewing is currently enabled. Do not use `0.0.0.0` as the game destination IP.


## Slip, suspension and lap measurements

- **Per-tire slip plane:** each wheel plots normalized tire slip angle (X) against slip ratio (Y) over the chosen history window. Inner circle radius is 1 and outer extent is ±2; points outside the display extent are clipped. This is not a tire-force or friction-coefficient plot. Combined slip >1 changes the point color.
- **Suspension RMS velocity:** square root of the time-weighted mean squared per-frame suspension velocity, shown in mm/s. Only continuous intervals with active race flags at both endpoints contribute. Pauses and packet gaps never add velocity or elapsed time.
- **Near-extension/compression time:** percentages of eligible observed time where previous reported normalized travel is ≤0.02 or ≥0.98. These thresholds describe telemetry position and do not prove a bump stop was hit or infer wheel loads.
- **Lap consistency:** arithmetic mean and population standard deviation of the last 100 observed completed laps. Mean requires one lap; standard deviation requires at least two. Only direct lap-count increments with a positive LastLap count.
- **Peak braking G:** maximum `-AccelerationZ / 9.80665` during active packets with Brake >12/255. This is longitudinal deceleration while braking, not brake-system force or stopping distance prediction.

## Data-to-analysis coverage and limits

| Available group | Current uses | What cannot be established from it alone |
|---|---|---|
| Engine RPM, power, torque, boost | Cockpit, full-throttle output curve, peaks and channel graph | Optimal shift RPM, drivetrain losses or a calibrated dyno |
| Local acceleration/velocity | G-circle, planar G, body sideslip, braking peak, history | Per-tire forces, vehicle mass, aerodynamic downforce or actual friction coefficient |
| Angular velocity and yaw/pitch/roll | Body/world readouts and any-channel history | Calibrated steering geometry or a definitive understeer diagnosis |
| All four wheel slips, rotation, travel, temperature and contact flags | Car/tire colors, slip planes, suspension derivatives/RMS, axle comparisons, water/curb indicators | Tire pressure, camber, wear, load distribution or wheel speed in m/s without verified radius |
| World position and total distance | Equal-scale driven path, distance and per-channel traces | Road-map imagery, official track layout, sectors or track ID |
| Race/lap flags and times | Completed laps, best/last/current time, observed consistency | Reliable predicted lap time, sector delta or missed laps |
| Player inputs and guidance values | Pedals, steering, time-weighted usage, raw guidance channel graphs | Game control, automatic tuning or guaranteed driver coaching |
| Vehicle/group identifiers and collision object values | Vehicle identity/reset, raw classes, object mass/velocity loss | Verified model identity from the packet alone, car mass or collision energy |

All 88 original fields remain searchable, graphable and exportable. The final byte and unspecified temperature units remain uninterpreted. The application runs only on incoming game packets; it cannot generate data or sound.

## Persistent packet history

The receiver processes every accepted packet before WebSocket display throttling and independently of recording. It groups summaries by **CarOrdinal**, across PI changes. Active-driving packets (`IsRaceOn === 1`) update all 88 raw-field minima/maxima/latest values, planar G and braking-G peaks. Packet totals include inactive frames; active totals are listed separately.

Observed time/distance and water/curb/slip durations use only continuous intervals: same ordinal and PI, active flags at both endpoints, positive unsigned game-time difference ≤0.5 s, receipt gap ≤0.5 s, nondecreasing race time and distance. Contact/slip durations use the previous packet's flags. Wet means any nonzero WheelInPuddle; curb means any nonzero WheelOnRumbleStrip; slip means any absolute combined slip >1. These are observations, not road-condition or tire-force estimates. Distance adds nonnegative reported distance differences; disconnected and offline driving is excluded.

Lowest reported lap is the lowest positive BestLap received. Lowest observed lap requires a direct lap-count increment and positive LastLap on a continuous interval. **These minima can mix different events and routes: no track ID is supplied.** Browser lap consistency clears on a race-clock rewind or lap-count decrease; it does not compare accumulated laps across such resets.

Summaries save every five seconds and during clean shutdown, using a temporary file and atomic replacement. The latest unsaved interval may be lost on abrupt exit. Source storage is `data/history.json`; installed desktop storage is `<user-data>/data/history.json`. Optional `FORZA_DATA_DIR` selects an absolute directory. A damaged/unsupported file is preserved and further writes disabled with a visible error; export in-memory observations and resolve the file before restarting. At 2,048 cars the receiver preserves existing records and reports the limit. History does not expire automatically and is not an unlimited raw packet archive. Export history downloads all stored profiles; the selected car only controls the on-screen view. Previous-version discarded packets cannot be reconstructed.

## Vehicle metadata and model names

The original packet sends CarOrdinal, CarClass, CarPerformanceIndex, DrivetrainType, NumCylinders and CarGroup. Class/group remain raw numbers. There is no model-name string, track ID, tire pressure, wear, camber or car mass.

`public/data/cars.json` bundles 681 names from [HDR's community FH6 ordinal list](https://gist.github.com/HDR/0659d1717bc61504bf83750628963f4f), revision `2a3b2a89059a751d3f17ba4f1d27492c05db0707`, retrieved 25 October 2026. One internal/NUL entry is excluded. Name and model year are lookup metadata, not measurements transmitted by the game. The UI labels this source; unknown ordinals retain their numeric identity. Correct/update the lookup after confirming game data; keep the source/revision in `public/data/cars-source.json` and [attribution](../THIRD_PARTY_NOTICES.md).

## Paired channel review

Select any primary field and an optional secondary field in Analysis → Compare channels. Each has its own explicitly colored axis: cyan solid/left and amber dashed/right. The scales automatically cover the captured finite sample range; constant series receive visible padding. Equal pixel heights do not imply equal units or a causal relationship. Values keep protocol units even when cockpit units are imperial.

Hold window copies only the chosen browser time window, bounded by the existing 120-second/1,200-sample history. Clicking the graph snaps to the nearest actual timestamp and holds that window; the keyboard-operable sample slider selects an actual sample index. No cursor value is interpolated across a gap. The status identifies the sampled car ordinal/PI, the output gives local receipt time and seconds relative to the window's last sample, and boundary samples are marked in the note. Data points are approximately 10 Hz browser samples, not a replacement for full-rate raw recording.

Large values are rounded to three decimal places for floats (integers remain integers); Exact raw preserves the complete JavaScript numeric representation. Window min/max summaries are display-rounded; their tooltips retain exact numeric extrema. This analysis window's extrema are separate from receiver-wide persistent history.

A held snapshot survives further incoming samples and vehicle changes, with its original identity visible. It does not stop the receiver, raw recorder, cockpit or other graphs. Changing the history-duration preference affects the next live/held window, not the snapshot already captured. Resume live or Reset Analysis releases it. The snapshot is local to the page and is lost on reload.

Focus screen hides navigation and branding while retaining connection freshness, notices and Exit focus. Escape restores the header control's focus. It is independent of browser/desktop fullscreen.

## Widget layout and motion

The overview offers 26 widgets. Drive is a compact starting set; Engineering emphasizes chassis/graphs; All widgets exposes every available module. Add/hide, drag reorder or use up/down buttons, then choose width and height. The grid preserves DOM order and keyboard alternatives. Desktop widths use a 12-column grid; tablets adapt to two columns and phones stack at full width. Saved dimensions remain available when returning to a larger screen. Scroll remains functional with scrollbar tracks hidden.

Layouts are validated against known widget IDs, supported numeric sizes and collection limits. Explicit empty layouts show Add/Reset recovery; corrupt JSON or unsupported outer formats use defaults. Preferences store no telemetry. Layout resets/presets do not delete recordings, cumulative history, held analysis or game packets. Widgets reuse existing instruments; graphs, raw tables and history continue updating when displayed in Dashboard. Compact tire tiles show temperature, suspension position, slip and contact state; axle screens retain full corner detail.

Brand entrance motion is finite. Reorder uses short native layout transitions; live connection glow indicates receipt. Each tire pattern integrates its reported wheel angular velocity over bounded frame time, with no wheel-radius assumption. Motion stops when stale, inactive, hidden or reduced-motion is selected. The tread drawing and steering rotation are illustrations. The operating-system reduced-motion preference is respected. Large values keep their existing numeric formatting and are not animated through invented intermediate measurements.
