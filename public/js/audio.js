/**
 * Forza Telemetry Out - Web Audio Synthesizer
 * 
 * Generates racing audio cues:
 * - Shift Rev Warning Buzzer (high-frequency beep when entering optimal shift window)
 * - Click and gear shift audio cues
 */

class TelemetryAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.lastBeepTime = 0;
  }

  init() {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playShiftBeep() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = Date.now();
    // Throttle beeps to at most once per 200ms
    if (now - this.lastBeepTime < 200) return;
    this.lastBeepTime = now;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1450, this.ctx.currentTime); // High pitch motorsport shift tone
      osc.frequency.exponentialRampToValueAtTime(1750, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {}
  }
}

window.TelemetryAudio = TelemetryAudio;
