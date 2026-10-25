/**
 * Forza Telemetry Out - Canvas Tachometer & Shift Lights HUD
 */

class TachometerGauge {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.currentRpm = 0;
    this.targetRpm = 0;
    this.maxRpm = 9000;
    this.idleRpm = 900;
    this.isRevLimit = false;

    this.setupHiDPI();
    window.addEventListener('resize', () => this.setupHiDPI());
  }

  setupHiDPI() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  update(engineData) {
    if (!engineData) return;
    this.targetRpm = engineData.currentRpm || 0;
    this.maxRpm = engineData.maxRpm;
    this.idleRpm = engineData.idleRpm ?? 0;
    this.isRevLimit = engineData.isRevLimit || false;

    if (!Number.isFinite(this.maxRpm) || this.maxRpm <= 0) {
      this.currentRpm = 0;
      this.ctx.clearRect(0, 0, this.width || 0, this.height || 0);
      this.updateShiftLights();
      return;
    }

    // Smooth lerp interpolation for needle/arc
    this.currentRpm += (this.targetRpm - this.currentRpm) * ((document.body.dataset.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches) ? 1 : .35);

    this.render();
    this.updateShiftLights();
  }

  updateShiftLights() {
    const leds = document.querySelectorAll('.shift-led');
    if (!leds.length) return;

    const rpmFrac = this.maxRpm > 0 ? (this.currentRpm / this.maxRpm) : 0;
    const count = leds.length;
    const activeCount = Math.floor(rpmFrac * count * 1.05);

    leds.forEach((led, i) => {
      if (i < activeCount) {
        led.classList.add('on');
      } else {
        led.classList.remove('on');
      }
    });
  }

  render() {
    const ctx = this.ctx;
    if (!ctx || !this.width || !this.height || !this.canvas.getClientRects().length) return;

    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2 + 10;
    const radius = Math.min(centerX - 22, centerY - 16);

    const startAngle = Math.PI * 0.75; // 135 deg
    const endAngle = Math.PI * 2.25;   // 405 deg (270 deg sweep)
    const sweep = endAngle - startAngle;

    // 1. Draw Background Track Arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = '#d4d3cc';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. Draw Redline Section on Track
    const redlineStartAngle = startAngle + (sweep * 0.85);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, redlineStartAngle, endAngle);
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.25)';
    ctx.lineWidth = 14;
    ctx.stroke();

    // 3. Draw RPM Ticks & Numbers
    const totalTicks = 9; // 0k to 9k
    for (let i = 0; i <= totalTicks; i++) {
      const frac = i / totalTicks;
      const angle = startAngle + (frac * sweep);
      const isMajor = true;

      const innerR = radius - (isMajor ? 18 : 12);
      const outerR = radius - 6;

      const x1 = centerX + Math.cos(angle) * innerR;
      const y1 = centerY + Math.sin(angle) * innerR;
      const x2 = centerX + Math.cos(angle) * outerR;
      const y2 = centerY + Math.sin(angle) * outerR;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = frac >= 0.85 ? '#ff0055' : '#334159';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tick numbers
      const textR = radius - 28;
      const tx = centerX + Math.cos(angle) * textR;
      const ty = centerY + Math.sin(angle) * textR;
      ctx.fillStyle = frac >= 0.85 ? '#ff0055' : '#52565c';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((this.maxRpm * frac / 1000).toFixed(1), tx, ty);
    }

    // 4. Draw Active RPM Sweeping Arc
    const currentFrac = Math.min(1, Math.max(0, this.currentRpm / this.maxRpm));
    if (currentFrac > 0.02) {
      const activeEndAngle = startAngle + (currentFrac * sweep);

      // Create colorful racing gradient
      const gradient = ctx.createConicGradient(startAngle, centerX, centerY);
      gradient.addColorStop(0, '#657b23');       // Cyan idle/low
      gradient.addColorStop(0.55, '#7b922d');    // Neon Lime mid
      gradient.addColorStop(0.80, '#ff9500');    // Apex Amber high
      gradient.addColorStop(0.95, '#ff0055');    // Hot Pink redline

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, activeEndAngle);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';

      if (this.isRevLimit) {
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 24;
      } else {
        ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
        ctx.shadowBlur = 10;
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

window.TachometerGauge = TachometerGauge;
