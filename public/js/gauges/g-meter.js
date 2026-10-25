/**
 * Forza Telemetry Out - G-Force Friction Circle Gauge
 * 
 * Visualizes lateral (cornering) and longitudinal (accel/brake) G-forces
 * with fading inertia trails and peak hold markers.
 */

class GMeterGauge {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.latG = 0;
    this.longG = 0;
    this.vertG = 1;
    this.peakLat = 0;
    this.peakLong = 0;

    // Fading trace points
    this.trail = [];
    this.maxTrail = 18;

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

  update(gForce) {
    if (!gForce) return;
    const targetLat = gForce.lateral || 0;
    const targetLong = gForce.longitudinal || 0;
    this.vertG = gForce.vertical || 1;

    // Smooth movement
    this.latG += (targetLat - this.latG) * 0.4;
    this.longG += (targetLong - this.longG) * 0.4;

    // Track peak G
    if (Math.abs(this.latG) > this.peakLat) this.peakLat = Math.abs(this.latG);
    if (Math.abs(this.longG) > this.peakLong) this.peakLong = Math.abs(this.longG);

    // Add to history trail
    this.trail.push({ x: this.latG, y: this.longG, time: Date.now() });
    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }

    this.render();
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;

    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(centerX, centerY) - 18;
    const maxG = 1.8; // Scale max radius to 1.8G

    // 1. Draw Concentric G Rings (0.5G, 1.0G, 1.5G)
    const rings = [0.5, 1.0, 1.5];
    ctx.lineWidth = 1;

    rings.forEach((g) => {
      const r = (g / maxG) * maxRadius;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = g === 1.0 ? 'rgba(0, 240, 255, 0.35)' : 'rgba(56, 68, 92, 0.4)';
      ctx.setLineDash(g === 1.0 ? [4, 4] : []);
      ctx.stroke();

      // Ring label
      ctx.fillStyle = '#65748c';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${g}G`, centerX + r + 3, centerY - 2);
    });

    ctx.setLineDash([]);

    // 2. Draw Crosshairs & Axis Labels
    ctx.beginPath();
    ctx.moveTo(centerX - maxRadius, centerY);
    ctx.lineTo(centerX + maxRadius, centerY);
    ctx.moveTo(centerX, centerY - maxRadius);
    ctx.lineTo(centerX, centerY + maxRadius);
    ctx.strokeStyle = 'rgba(56, 68, 92, 0.5)';
    ctx.stroke();

    ctx.fillStyle = '#5c6c82';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BRAKE', centerX, centerY - maxRadius + 12);
    ctx.fillText('ACCEL', centerX, centerY + maxRadius - 6);
    ctx.fillText('L', centerX - maxRadius + 10, centerY - 4);
    ctx.fillText('R', centerX + maxRadius - 10, centerY - 4);

    // 3. Draw Fading Motion Trail
    for (let i = 0; i < this.trail.length; i++) {
      const pt = this.trail[i];
      const frac = (i + 1) / this.trail.length;
      const px = centerX + (pt.x / maxG) * maxRadius;
      // In racing telemetry, longitudinal braking forces are forward (Y up) and accel is back (Y down)
      const py = centerY - (pt.y / maxG) * maxRadius;

      ctx.beginPath();
      ctx.arc(px, py, 2.5 * frac, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 0, 85, ${0.15 * frac})`;
      ctx.fill();
    }

    // 4. Draw Current G-Force Ball
    const ballX = centerX + (this.latG / maxG) * maxRadius;
    const ballY = centerY - (this.longG / maxG) * maxRadius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ballX, ballY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }
}

window.GMeterGauge = GMeterGauge;
