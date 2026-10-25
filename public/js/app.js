/**
 * Forza Telemetry Out - Main Client Controller
 * 
 * Orchestrates WebSocket stream, UI bindings, gauge animations,
 * audio triggers, and raw telemetry inspection.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Subsystems
  const units = new UnitManager('metric');
  const audio = new TelemetryAudio();
  const tachometer = new TachometerGauge('tachCanvas');
  const gMeter = new GMeterGauge('gMeterCanvas');
  const timeline = new TelemetryTimelineChart('timelineCanvas');

  // Acceleration Sprint Timer state (0-100 km/h or 0-60 mph)
  let sprintTimer = {
    measuring: false,
    startTime: 0,
    targetReached: false,
    bestTime: null
  };

  // Raw data drawer elements
  const rawDrawer = document.getElementById('rawDataDrawer');
  const rawTableBody = document.getElementById('rawTableBody');
  const rawSearchInput = document.getElementById('rawSearchInput');
  let currentRawData = null;

  // 2. DOM Elements Cache
  const el = {
    // Top Bar
    streamDot: document.getElementById('streamDot'),
    streamText: document.getElementById('streamText'),
    gameBadge: document.getElementById('gameBadge'),
    simBtn: document.getElementById('simBtn'),
    recBtn: document.getElementById('recBtn'),
    unitBtn: document.getElementById('unitBtn'),
    audioBtn: document.getElementById('audioBtn'),
    fsBtn: document.getElementById('fsBtn'),
    rawBtn: document.getElementById('rawBtn'),

    // Center HUD
    gearDisplay: document.getElementById('gearDisplay'),
    speedVal: document.getElementById('speedVal'),
    speedUnit: document.getElementById('speedUnit'),
    rpmNumeric: document.getElementById('rpmNumeric'),
    tachCard: document.getElementById('tachCard'),

    // Car Info
    carClassBadge: document.getElementById('carClassBadge'),
    carPiBadge: document.getElementById('carPiBadge'),
    carDrivetrainBadge: document.getElementById('carDrivetrainBadge'),
    carNameText: document.getElementById('carNameText'),

    // Inputs
    throttleFill: document.getElementById('throttleFill'),
    throttleVal: document.getElementById('throttleVal'),
    brakeFill: document.getElementById('brakeFill'),
    brakeVal: document.getElementById('brakeVal'),
    clutchFill: document.getElementById('clutchFill'),
    clutchVal: document.getElementById('clutchVal'),
    handbrakeFill: document.getElementById('handbrakeFill'),
    handbrakeVal: document.getElementById('handbrakeVal'),
    steeringWheel: document.getElementById('steeringWheel'),
    steeringDeg: document.getElementById('steeringDeg'),
    steeringBarFill: document.getElementById('steeringBarFill'),

    // Wheels Matrix
    wheelFL: document.getElementById('wheelFL'),
    wheelFR: document.getElementById('wheelFR'),
    wheelRL: document.getElementById('wheelRL'),
    wheelRR: document.getElementById('wheelRR'),
    tempFL: document.getElementById('tempFL'),
    tempFR: document.getElementById('tempFR'),
    tempRL: document.getElementById('tempRL'),
    tempRR: document.getElementById('tempRR'),
    suspFL: document.getElementById('suspFL'),
    suspFR: document.getElementById('suspFR'),
    suspRL: document.getElementById('suspRL'),
    suspRR: document.getElementById('suspRR'),
    slipFL: document.getElementById('slipFL'),
    slipFR: document.getElementById('slipFR'),
    slipRL: document.getElementById('slipRL'),
    slipRR: document.getElementById('slipRR'),

    // G-Force Readouts
    latGVal: document.getElementById('latGVal'),
    longGVal: document.getElementById('longGVal'),
    vertGVal: document.getElementById('vertGVal'),

    // Powertrain Dyno
    powerVal: document.getElementById('powerVal'),
    powerUnit: document.getElementById('powerUnit'),
    torqueVal: document.getElementById('torqueVal'),
    torqueUnit: document.getElementById('torqueUnit'),
    boostVal: document.getElementById('boostVal'),
    boostUnit: document.getElementById('boostUnit'),
    fuelVal: document.getElementById('fuelVal'),
    sprintTimeVal: document.getElementById('sprintTimeVal'),

    // Lap Stats
    lapNum: document.getElementById('lapNum'),
    racePos: document.getElementById('racePos'),
    currentLapTime: document.getElementById('currentLapTime'),
    lastLapTime: document.getElementById('lastLapTime'),
    bestLapTime: document.getElementById('bestLapTime'),
    distanceVal: document.getElementById('distanceVal')
  };

  // 3. Telemetry Frame Processing
  function processTelemetry(data) {
    if (!data) return;
    currentRawData = data;

    // --- Center Tachometer & Speed ---
    tachometer.update(data.engine);

    if (data.speed) {
      const spd = units.formatSpeed(data.speed);
      el.speedVal.textContent = spd.value;
      el.speedUnit.textContent = spd.unit;
      trackSprintTimer(data.speed.kmh);
    }

    if (data.inputs) {
      el.gearDisplay.textContent = data.inputs.gear || 'N';
    }

    if (data.engine) {
      el.rpmNumeric.textContent = `${data.engine.currentRpm.toLocaleString()} / ${data.engine.maxRpm.toLocaleString()} RPM`;
      
      if (data.engine.isRevLimit) {
        el.tachCard.classList.add('redline-active');
        audio.playShiftBeep();
      } else {
        el.tachCard.classList.remove('redline-active');
      }
    }

    // --- Car Meta ---
    if (data.car) {
      el.carClassBadge.textContent = data.car.classCode || 'A';
      el.carClassBadge.style.backgroundColor = data.car.classColor || '#ff2d55';
      el.carPiBadge.textContent = `PI ${data.car.pi || '---'}`;
      el.carDrivetrainBadge.textContent = data.car.drivetrain || 'AWD';
      if (data.car.name) {
        el.carNameText.textContent = data.car.name;
      }
    }

    // --- Pedals & Steering ---
    if (data.inputs) {
      el.throttleFill.style.height = `${data.inputs.throttlePercent}%`;
      el.throttleVal.textContent = `${data.inputs.throttlePercent}%`;

      el.brakeFill.style.height = `${data.inputs.brakePercent}%`;
      el.brakeVal.textContent = `${data.inputs.brakePercent}%`;

      el.clutchFill.style.height = `${data.inputs.clutchPercent}%`;
      el.clutchVal.textContent = `${data.inputs.clutchPercent}%`;

      const hb = data.inputs.handbrakeActive ? 100 : 0;
      el.handbrakeFill.style.height = `${hb}%`;
      el.handbrakeVal.textContent = data.inputs.handbrakeActive ? 'ON' : 'OFF';

      // Steering Wheel Rotation
      const steerDeg = data.inputs.steeringDeg || 0;
      el.steeringWheel.style.transform = `rotate(${steerDeg}deg)`;
      el.steeringDeg.textContent = `${steerDeg > 0 ? '+' : ''}${steerDeg}°`;

      // Steering Bar
      const steerPct = data.inputs.steeringPercent || 0; // -100 to 100
      if (steerPct >= 0) {
        el.steeringBarFill.style.left = '50%';
        el.steeringBarFill.style.width = `${(steerPct / 2)}%`;
      } else {
        el.steeringBarFill.style.left = `${50 - Math.abs(steerPct / 2)}%`;
        el.steeringBarFill.style.width = `${Math.abs(steerPct / 2)}%`;
      }
    }

    // --- G-Meter ---
    if (data.dynamics && data.dynamics.gForce) {
      gMeter.update(data.dynamics.gForce);
      el.latGVal.textContent = `${data.dynamics.gForce.lateral.toFixed(2)}G`;
      el.longGVal.textContent = `${data.dynamics.gForce.longitudinal.toFixed(2)}G`;
      el.vertGVal.textContent = `${data.dynamics.gForce.vertical.toFixed(2)}G`;
    }

    // --- 4-Wheel Matrix ---
    if (data.wheels) {
      updateWheelCorner('fl', el.wheelFL, el.tempFL, el.suspFL, el.slipFL, data.wheels);
      updateWheelCorner('fr', el.wheelFR, el.tempFR, el.suspFR, el.slipFR, data.wheels);
      updateWheelCorner('rl', el.wheelRL, el.tempRL, el.suspRL, el.slipRL, data.wheels);
      updateWheelCorner('rr', el.wheelRR, el.tempRR, el.suspRR, el.slipRR, data.wheels);
    }

    // --- Powertrain & Dyno ---
    if (data.powertrain) {
      const pwr = units.formatPower(data.powertrain);
      el.powerVal.textContent = pwr.power;
      el.powerUnit.textContent = pwr.powerUnit;
      el.torqueVal.textContent = pwr.torque;
      el.torqueUnit.textContent = pwr.torqueUnit;

      const bst = units.formatBoost(data.powertrain);
      el.boostVal.textContent = bst.value;
      el.boostUnit.textContent = bst.unit;
      el.fuelVal.textContent = `${data.powertrain.fuelPercent}%`;
    }

    // --- Lap & Race Stats ---
    if (data.race) {
      el.lapNum.textContent = `LAP ${data.race.lapNumber || 1}`;
      el.racePos.textContent = `P${data.race.racePosition || 1}`;
      el.currentLapTime.textContent = data.race.formattedTimes.current;
      el.lastLapTime.textContent = data.race.formattedTimes.last;
      el.bestLapTime.textContent = data.race.formattedTimes.best;
      el.distanceVal.textContent = `${((data.race.distanceMeters || 0) / 1000).toFixed(2)} KM`;
    }

    // --- Timeline Graph ---
    timeline.pushFrame(data);

    // If raw drawer is open, refresh values
    if (rawDrawer.classList.contains('open')) {
      renderRawTable();
    }
  }

  function updateWheelCorner(corner, cardEl, tempEl, suspEl, slipEl, wheels) {
    if (!wheels) return;

    // 1. Tire Temp
    if (wheels.temperatures) {
      const c = wheels.temperatures.celsius[corner];
      const f = wheels.temperatures.fahrenheit[corner];
      const t = units.formatTemp(c, f);
      tempEl.textContent = `${t.value} ${t.unit}`;

      // Color coding
      tempEl.className = 'temp-badge';
      if (c < 65) tempEl.classList.add('temp-cold');
      else if (c <= 105) tempEl.classList.add('temp-optimal');
      else if (c <= 125) tempEl.classList.add('temp-warm');
      else tempEl.classList.add('temp-hot');
    }

    // 2. Suspension Compression
    if (wheels.suspensionTravel) {
      const st = Math.min(100, Math.max(0, wheels.suspensionTravel[corner] * 100));
      suspEl.style.width = `${st}%`;
    }

    // 3. Slip Ratio
    if (wheels.slipRatio) {
      const sr = Math.abs(wheels.slipRatio[corner] || 0);
      slipEl.textContent = sr.toFixed(2);
      if (sr >= 0.8) {
        cardEl.classList.add('slip-warning');
      } else {
        cardEl.classList.remove('slip-warning');
      }
    }

    // 4. Rumble Strip Contact
    if (wheels.rumbleStrip && wheels.rumbleStrip[corner]) {
      cardEl.classList.add('rumble-active');
    } else {
      cardEl.classList.remove('rumble-active');
    }
  }

  // Automated 0-100 km/h (0-60 mph) acceleration sprint timer
  function trackSprintTimer(speedKmh) {
    if (speedKmh <= 2) {
      // Stopped at staging line
      sprintTimer.measuring = false;
      sprintTimer.targetReached = false;
    } else if (speedKmh > 3 && !sprintTimer.measuring && !sprintTimer.targetReached) {
      // Launched!
      sprintTimer.measuring = true;
      sprintTimer.startTime = Date.now();
    } else if (sprintTimer.measuring) {
      const elapsed = (Date.now() - sprintTimer.startTime) / 1000;
      el.sprintTimeVal.textContent = `${elapsed.toFixed(2)}s`;

      if (speedKmh >= 100) {
        // Goal reached!
        sprintTimer.measuring = false;
        sprintTimer.targetReached = true;
        if (!sprintTimer.bestTime || elapsed < sprintTimer.bestTime) {
          sprintTimer.bestTime = elapsed;
        }
        el.sprintTimeVal.textContent = `${elapsed.toFixed(2)}s (DONE)`;
      }
    }
  }

  // 4. WebSocket Client Connection
  let ws = null;
  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WebSocket] Connected to Forza Telemetry Server');
      el.streamDot.className = 'pulse-dot';
      el.streamText.textContent = 'CONNECTING...';
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'telemetry') {
          processTelemetry(msg.data);
        } else if (msg.type === 'status') {
          updateServerStatus(msg.data);
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      console.warn('[WebSocket] Disconnected. Reconnecting in 2s...');
      el.streamDot.className = 'pulse-dot offline';
      el.streamText.textContent = 'OFFLINE';
      setTimeout(connectWebSocket, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  function updateServerStatus(status) {
    if (!status) return;

    if (status.simulator && status.simulator.isActive) {
      el.streamDot.className = 'pulse-dot simulating';
      el.streamText.textContent = 'SIMULATOR ACTIVE';
      el.simBtn.classList.add('active');
      el.simBtn.innerHTML = '⏹ STOP DEMO';
      el.gameBadge.textContent = 'PORSCHE 911 GT3 RS (SIM)';
    } else if (status.udp && status.udp.hasActiveStream) {
      el.streamDot.className = 'pulse-dot';
      el.streamText.textContent = `LIVE ${status.udp.currentPps || 60} PPS`;
      el.simBtn.classList.remove('active');
      el.simBtn.innerHTML = '▶ DEMO DRIVE';
      el.gameBadge.textContent = status.udp.detectedGame || 'FORZA UDP';
    } else {
      el.streamDot.className = 'pulse-dot offline';
      el.streamText.textContent = `LISTENING (${status.udp ? status.udp.port : 5300})`;
      el.simBtn.classList.remove('active');
      el.simBtn.innerHTML = '▶ DEMO DRIVE';
      el.gameBadge.textContent = 'STANDBY';
    }

    if (status.recorder && status.recorder.isRecording) {
      el.recBtn.classList.add('active');
      el.recBtn.innerHTML = `● REC (${status.recorder.durationSec}s)`;
    } else {
      el.recBtn.classList.remove('active');
      el.recBtn.innerHTML = '● RECORD';
    }
  }

  // 5. User Controls
  el.unitBtn.addEventListener('click', () => {
    const sys = units.toggle();
    el.unitBtn.textContent = sys === 'metric' ? 'METRIC (KM/H)' : 'IMPERIAL (MPH)';
    if (currentRawData) processTelemetry(currentRawData);
  });

  el.audioBtn.addEventListener('click', () => {
    audio.init();
    const muted = audio.toggleMute();
    el.audioBtn.textContent = muted ? '🔇 MUTED' : '🔊 AUDIO ON';
    el.audioBtn.classList.toggle('active', !muted);
  });

  el.simBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/simulator/toggle', { method: 'POST' });
    } catch (e) {}
  });

  el.recBtn.addEventListener('click', async () => {
    if (el.recBtn.classList.contains('active')) {
      const res = await fetch('/api/recorder/stop', { method: 'POST' });
      const data = await res.json();
      if (confirm(`Recording stopped! Captured ${data.summary.frameCount} frames.\nDownload CSV export now?`)) {
        window.location.href = '/api/recorder/export/csv';
      }
    } else {
      await fetch('/api/recorder/start', { method: 'POST' });
    }
  });

  el.fsBtn.addEventListener('click', () => {
    if (window.electronAPI) {
      window.electronAPI.toggleFullscreen();
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  });

  // Raw Inspector Drawer Controls
  el.rawBtn.addEventListener('click', () => {
    rawDrawer.classList.toggle('open');
    if (rawDrawer.classList.contains('open')) {
      renderRawTable();
    }
  });

  document.getElementById('closeRawDrawer').addEventListener('click', () => {
    rawDrawer.classList.remove('open');
  });

  rawSearchInput.addEventListener('input', () => {
    renderRawTable();
  });

  // Render raw telemetry key/value table
  function renderRawTable() {
    if (!currentRawData) return;
    const filter = rawSearchInput.value.toLowerCase().trim();
    rawTableBody.innerHTML = '';

    const flat = flattenObject(currentRawData);
    for (const [key, val] of Object.entries(flat)) {
      if (filter && !key.toLowerCase().includes(filter) && !String(val).toLowerCase().includes(filter)) {
        continue;
      }
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="color: #00f0ff; font-weight: 700;">${key}</td>
        <td style="color: #ffffff;">${typeof val === 'number' ? Number(val.toFixed(4)) : val}</td>
        <td style="color: #72829c;">${typeof val}</td>
      `;
      rawTableBody.appendChild(row);
    }
  }

  function flattenObject(obj, prefix = '') {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(res, flattenObject(v, path));
      } else {
        res[path] = v;
      }
    }
    return res;
  }

  // Connect on launch
  connectWebSocket();
});
