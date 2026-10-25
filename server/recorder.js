/**
 * Forza Telemetry Session Recorder & Exporter
 * 
 * Captures live telemetry frames into a session buffer and exports
 * data to CSV or JSON format for telemetry analysis and graphing.
 */

const fields = require('../public/packet-schema.json');

class TelemetryRecorder {
  constructor(options = {}) {
    this.maxFrames = options.maxFrames || 18000; // ~5 minutes at 60Hz
    this.frames = [];
    this.isRecording = false;
    this.startTime = null;
    this.sessionName = '';
  }

  start(name = '') {
    if (this.isRecording) return;
    this.frames = [];
    this.isRecording = true;
    this.startTime = Date.now();
    this.sessionName = name || `forza_session_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    console.log(`[Recorder] Started recording telemetry: ${this.sessionName}`);
  }

  recordFrame(telemetry) {
    if (!this.isRecording || !telemetry) return;
    if (this.frames.length >= this.maxFrames) {
      this.isRecording = false;
      return;
    }
    this.frames.push({
      timeOffsetMs: Date.now() - this.startTime,
      ...telemetry
    });
  }

  stop() {
    this.isRecording = false;
    console.log(`[Recorder] Stopped recording. Captured ${this.frames.length} frames.`);
    return {
      sessionName: this.sessionName,
      frameCount: this.frames.length,
      durationSec: this.frames.length > 0 ? (this.frames[this.frames.length - 1].timeOffsetMs / 1000) : 0
    };
  }

  getStatus() {
    return {
      isRecording: this.isRecording,
      limitReached: this.frames.length >= this.maxFrames,
      sessionName: this.sessionName,
      frameCount: this.frames.length,
      durationSec: this.startTime ? ((this.isRecording ? Date.now()-this.startTime : this.frames.at(-1)?.timeOffsetMs??0)/1000).toFixed(1) : 0
    };
  }

  exportJson() {
    return JSON.stringify({
      sessionName: this.sessionName,
      recordedAt: this.startTime ? new Date(this.startTime).toISOString() : null,
      frameCount: this.frames.length,
      frames: this.frames
    }, null, 2);
  }

  exportCsv() {
    if (this.frames.length === 0) return '';

    const headers = ['TimeOffsetMs', 'Source', ...fields.map(f => f.name), 'ReservedByte'];
    const rows = [headers.join(',')];
    for (const f of this.frames) {
      rows.push([f.timeOffsetMs, 'live', ...fields.map(field => f.raw?.[field.name] ?? ''), f.reservedByte ?? ''].join(','));
    }

    return rows.join('\n');
  }
}

module.exports = TelemetryRecorder;
