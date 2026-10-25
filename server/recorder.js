/**
 * Forza Telemetry Session Recorder & Exporter
 * 
 * Captures live telemetry frames into a session buffer and exports
 * data to CSV or JSON format for telemetry analysis and graphing.
 */

const fs = require('fs');
const path = require('path');

class TelemetryRecorder {
  constructor(options = {}) {
    this.maxFrames = options.maxFrames || 18000; // ~5 minutes at 60Hz
    this.frames = [];
    this.isRecording = false;
    this.startTime = null;
    this.sessionName = '';
  }

  start(name = '') {
    this.frames = [];
    this.isRecording = true;
    this.startTime = Date.now();
    this.sessionName = name || `forza_session_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    console.log(`[Recorder] Started recording telemetry: ${this.sessionName}`);
  }

  recordFrame(telemetry) {
    if (!this.isRecording || !telemetry) return;
    if (this.frames.length >= this.maxFrames) {
      // Rotate / drop earliest frame if buffer fills
      this.frames.shift();
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
      sessionName: this.sessionName,
      frameCount: this.frames.length,
      durationSec: this.isRecording && this.startTime ? ((Date.now() - this.startTime) / 1000).toFixed(1) : 0
    };
  }

  exportJson() {
    return JSON.stringify({
      sessionName: this.sessionName,
      recordedAt: new Date(this.startTime).toISOString(),
      frameCount: this.frames.length,
      frames: this.frames
    }, null, 2);
  }

  exportCsv() {
    if (this.frames.length === 0) return '';

    const headers = [
      'TimeMs', 'SpeedKmh', 'SpeedMph', 'RPM', 'Gear',
      'ThrottlePct', 'BrakePct', 'ClutchPct', 'SteerDeg',
      'PowerHp', 'TorqueNm', 'BoostPsi',
      'LatG', 'LongG', 'VertG',
      'TireTempFL_C', 'TireTempFR_C', 'TireTempRL_C', 'TireTempRR_C',
      'SuspTravelFL', 'SuspTravelFR', 'SuspTravelRL', 'SuspTravelRR',
      'SlipRatioFL', 'SlipRatioFR', 'SlipRatioRL', 'SlipRatioRR',
      'CurrentLapSec', 'LapNumber'
    ];

    const rows = [headers.join(',')];

    for (const f of this.frames) {
      const row = [
        f.timeOffsetMs || 0,
        f.speed ? f.speed.kmh : 0,
        f.speed ? f.speed.mph : 0,
        f.engine ? f.engine.currentRpm : 0,
        f.inputs ? f.inputs.gear : 0,
        f.inputs ? f.inputs.throttlePercent : 0,
        f.inputs ? f.inputs.brakePercent : 0,
        f.inputs ? f.inputs.clutchPercent : 0,
        f.inputs ? f.inputs.steeringDeg : 0,
        f.powertrain ? f.powertrain.powerHp : 0,
        f.powertrain ? f.powertrain.torqueNm : 0,
        f.powertrain ? f.powertrain.boostPsi : 0,
        f.dynamics && f.dynamics.gForce ? f.dynamics.gForce.lateral.toFixed(2) : 0,
        f.dynamics && f.dynamics.gForce ? f.dynamics.gForce.longitudinal.toFixed(2) : 0,
        f.dynamics && f.dynamics.gForce ? f.dynamics.gForce.vertical.toFixed(2) : 0,
        f.wheels && f.wheels.temperatures ? f.wheels.temperatures.celsius.fl : 0,
        f.wheels && f.wheels.temperatures ? f.wheels.temperatures.celsius.fr : 0,
        f.wheels && f.wheels.temperatures ? f.wheels.temperatures.celsius.rl : 0,
        f.wheels && f.wheels.temperatures ? f.wheels.temperatures.celsius.rr : 0,
        f.wheels && f.wheels.suspensionTravel ? f.wheels.suspensionTravel.fl.toFixed(3) : 0,
        f.wheels && f.wheels.suspensionTravel ? f.wheels.suspensionTravel.fr.toFixed(3) : 0,
        f.wheels && f.wheels.suspensionTravel ? f.wheels.suspensionTravel.rl.toFixed(3) : 0,
        f.wheels && f.wheels.suspensionTravel ? f.wheels.suspensionTravel.rr.toFixed(3) : 0,
        f.wheels && f.wheels.slipRatio ? f.wheels.slipRatio.fl.toFixed(3) : 0,
        f.wheels && f.wheels.slipRatio ? f.wheels.slipRatio.fr.toFixed(3) : 0,
        f.wheels && f.wheels.slipRatio ? f.wheels.slipRatio.rl.toFixed(3) : 0,
        f.wheels && f.wheels.slipRatio ? f.wheels.slipRatio.rr.toFixed(3) : 0,
        f.race ? f.race.currentLapSec.toFixed(3) : 0,
        f.race ? f.race.lapNumber : 1
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }
}

module.exports = TelemetryRecorder;
