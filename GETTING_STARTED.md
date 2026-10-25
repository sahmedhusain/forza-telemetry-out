# 🏁 Getting Started with Forza Telemetry Out

Welcome to **Forza Telemetry Out**! This guide walks you through setting up real-time telemetry streaming from **Forza Horizon 5**, **Forza Horizon 4**, **Forza Motorsport (2023)**, and **Forza Motorsport 7** on both **PC (Steam / Windows Store)** and **Xbox Series X|S / Xbox One** consoles.

---

## ⚡ Quick Start in 60 Seconds

### 1. Prerequisites
- **Node.js** (v18 or newer) - [Download Node.js](https://nodejs.org/)
- **Git**

### 2. Clone & Install
```bash
# Clone the repository
git clone https://github.com/sahmedhusain/forza-telemetry-out.git
cd forza-telemetry-out

# Install dependencies
npm install
```

### 3. Launch the Application

You can run **Forza Telemetry Out** in two modes:

#### Option A: Electron Native Desktop App
```bash
npm run electron
```
*Launches the dedicated hardware-accelerated desktop window with custom dark motorsport titlebar and fullscreen support (`F11`).*

#### Option B: Standalone Web Server (for PC, iPad, Tablets, & Phones)
```bash
npm run web
# Or simply:
npm start
```
*Starts the background UDP listener and HTTP/WebSocket server. Open `http://localhost:3050` on your PC, or `http://<YOUR_PC_IP>:3050` on any phone, tablet, or secondary monitor mounted to your sim racing rig!*

#### Option C: Instant Demo / Test Drive (No Game Needed)
```bash
npm run demo
```
*Boots the server with the built-in realistic **Porsche 911 GT3 RS** physics simulator so you can explore all gauges, shift buzzers, and telemetry analytics immediately.*

---

## 🎮 Configuring In-Game Telemetry ("Data Out")

Forza transmits UDP packets using a built-in feature called **Data Out**. Follow the instructions below for your specific game and platform:

### 1. Forza Horizon 5 / Forza Horizon 4

1. Launch **Forza Horizon 5** (or FH4).
2. Go to **Settings** (or Options) ➔ **HUD and Gameplay**.
3. Scroll down to the bottom section titled **DATA OUT**:
   - **Data Out**: Set to `ON`
   - **Data Out IP Address**:
     - **If playing on the same PC as this app**: Enter `127.0.0.1` (or your local IP)
     - **If playing on Xbox / Another PC**: Enter the **Local IP** of the computer running this app (e.g., `192.168.1.150`)
   - **Data Out IP Port**: `5300` (must match `FORZA_PORT` in your `.env`)
4. Save and return to the game. When you enter a car and drive, telemetry starts broadcasting at 60 Hz!

---

### 2. Forza Motorsport (2023) / Forza Motorsport 7

1. Launch **Forza Motorsport**.
2. Navigate to **Options** ➔ **Gameplay & HUD**.
3. Scroll to **Telemetry / Data Out**:
   - **Data Out**: `ON`
   - **Data Out Packet Format**: Set to `Car Dash` (provides full tire temps, inputs, power, and lap times)
   - **Data Out IP Address**: `127.0.0.1` (or your PC's LAN IP if playing on Xbox)
   - **Data Out IP Port**: `5300`
4. Save settings and head to the track.

---

## 🪟 Windows PC: UWP Loopback Exemption (Crucial for Microsoft Store & Game Pass)

> [!IMPORTANT]
> If you are playing the **Microsoft Store or PC Game Pass** version of Forza on the same PC where this app is running, Windows UWP security sandboxing blocks local loopback UDP (`127.0.0.1`) by default.
> **Steam versions do NOT have this limitation.**

### How to Enable Loopback in 10 Seconds:

1. Press `Win + X` and select **Terminal (Admin)** or **PowerShell (Administrator)**.
2. Run the exemption command for your game:

#### For Forza Horizon 5:
```powershell
CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.624F8B84B80_8wekyb3d8bbwe"
```

#### For Forza Horizon 4:
```powershell
CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.SunriseBaseGame_8wekyb3d8bbwe"
```

#### For Forza Motorsport (2023):
```powershell
CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.FalconBaseGame_8wekyb3d8bbwe"
```

#### For Forza Motorsport 7:
```powershell
CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.ApolloBaseGame_8wekyb3d8bbwe"
```

3. You should see `OK.` in PowerShell. Loopback is now permanently enabled!

---

## 📱 Mounting a Second Screen or Tablet on Your Sim Rig

You can turn any smartphone, iPad, or Android tablet into a physical racing dash display:

1. Ensure your phone/tablet is connected to the same Wi-Fi network as your PC.
2. Find your computer's local IP address:
   - **Windows**: Run `ipconfig` in Command Prompt (look for *IPv4 Address*, e.g., `192.168.1.120`).
   - **macOS / Linux**: Run `ifconfig` or `ip addr`.
3. Open Safari, Chrome, or Firefox on your phone/tablet and navigate to:
   ```
   http://192.168.1.120:3050
   ```
4. Tap the **⛶ FULLSCREEN** button on the top right for an edge-to-edge sim racing dashboard!

---

## ⚙️ Environment Configuration (`.env`)

You can customize port bindings, units, and logging in `.env`:

```ini
# UDP Port to receive Forza game packets
FORZA_PORT=5300

# UDP interface (0.0.0.0 binds to all network cards)
FORZA_HOST=0.0.0.0

# Web Dashboard HTTP & WebSocket port
WEB_PORT=3050

# Default telemetry units ('metric' for km/h, °C, Bar | 'imperial' for mph, °F, PSI)
DEFAULT_UNITS=metric

# Auto-start simulation mode when launching server
SIMULATION_MODE=false
```

---

## 🛠️ Telemetry Session Recording & Exporting

1. Click **● RECORD** on the top header bar to start logging telemetry frames.
2. Complete your hot lap or sprint test.
3. Click **● REC (XXs)** to stop.
4. The dashboard will prompt you to export the session:
   - **CSV Export**: `http://localhost:3050/api/recorder/export/csv` (Ideal for Excel, Python Pandas, and MoTeC)
   - **JSON Export**: `http://localhost:3050/api/recorder/export/json` (Raw JSON frames with full precision)

---

## ❓ Frequently Asked Questions & Troubleshooting

### Q1: The dashboard says "LISTENING (5300)" but no telemetry updates.
1. Check that **Data Out** is toggled **ON** in Forza's HUD settings.
2. Confirm that the **Data Out IP Port** matches `FORZA_PORT` (default `5300`).
3. If playing on PC Game Pass, make sure you ran the PowerShell `CheckNetIsolation` loopback command shown above.
4. Verify Windows Defender Firewall allows UDP traffic on port 5300.

### Q2: How do I switch between Metric (KM/H) and Imperial (MPH)?
Click the **METRIC / IMPERIAL** button on the top header bar. It instantly updates all gauges, tire temperatures (°C vs °F), and boost (Bar vs PSI).

### Q3: How do I mute the shift buzzer?
Click the **🔇 MUTED / 🔊 AUDIO ON** button on the top header. The audio synthesizer uses the native Web Audio API with zero external media files.

---

Enjoy your racing! If you encounter any issues, feel free to open an issue on [GitHub](https://github.com/sahmedhusain/forza-telemetry-out/issues).
