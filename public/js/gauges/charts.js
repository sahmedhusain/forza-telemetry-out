/**
 * Forza Telemetry Out - Real-Time Multi-Channel Timeline Chart
 * 
 * High-performance 60Hz Canvas chart rendering rolling traces for
 * Speed, Throttle, Brake, and Boost.
 */

class TelemetryTimelineChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.maxPoints = 160; // Rolling window points
    this.speedHistory = [];
    this.throttleHistory = [];
    this.brakeHistory = [];
    this.boostHistory = [];

    this.setupHiDPI();
    window.addEventListener('resize', () => this.setupHiDPI());
  }

  setupHiDPI() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  pushFrame(telemetry) {
    if (!telemetry) return;

    const speedFrac = telemetry.speed ? Math.min(1, (telemetry.speed.kmh || 0) / 350) : 0;
    const throttleFrac = telemetry.inputs ? (telemetry.inputs.throttlePercent || 0) / 100 : 0;
    const brakeFrac = telemetry.inputs ? (telemetry.inputs.brakePercent || 0) / 100 : 0;
    const boostFrac = telemetry.powertrain ? Math.min(1, Math.max(0, (telemetry.powertrain.boostPsi || 0) / 25)) : 0;

    this.speedHistory.push(speedFrac);
    this.throttleHistory.push(throttleFrac);
    this.brakeHistory.push(brakeFrac);
    this.boostHistory.push(boostFrac);

    if (this.speedHistory.length > this.maxPoints) {
      this.speedHistory.shift();
      this.throttleHistory.shift();
      this.brakeHistory.shift();
      this.boostHistory.shift();
    }

    this.render();
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;

    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    // 1. Draw Subtle Horizontal Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 1; i <= 3; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. Helper to draw trace line
    const drawTrace = (data, color, lineWidth = 2) => {
      if (data.length < 2) return;
      const stepX = w / (this.maxPoints - 1);
      const startIdx = this.maxPoints - data.length;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < data.length; i++) {
        const x = (startIdx + i) * stepX;
        const y = h - (data[i] * (h - 10)) - 5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // 3. Draw traces in order
    drawTrace(this.brakeHistory, '#ff1e42', 2);     // Red Brake
    drawTrace(this.throttleHistory, '#00ff88', 2);  // Green Throttle
    drawTrace(this.boostHistory, '#af52de', 1.5);   // Purple Boost
    drawTrace(this.speedHistory, '#00f0ff', 2.5);   // Cyan Speed
  }
}

window.TelemetryTimelineChart = TelemetryTimelineChart;
