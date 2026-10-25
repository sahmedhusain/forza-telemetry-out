/* Derived metrics use game time; gaps, vehicle changes and rewinds break continuity. */
class DriveAnalytics {
  constructor() { this.reset(); }
  reset() {
    this.previous = null; this.sampleAge = 0; this.samples = []; this.laps = []; this.dyno = new Map();
    this.elapsed = 0; this.throttleTime = 0; this.brakeTime = 0; this.overlapTime = 0; this.coastTime = 0; this.slipTime = 0;
    this.peakSpeed = 0; this.peakPower = 0; this.peakG = 0; this.peakBrakingG = 0; this.current = {};
    this.damperEnergy = [0,0,0,0]; this.extensionTime = [0,0,0,0]; this.compressionTime = [0,0,0,0];
  }
  push(frame) {
    const r = frame.raw; if (!r) return;
    const key = `${r.CarOrdinal}:${r.CarPerformanceIndex}`;
    if (this.key !== key) { this.reset(); this.key = key; }
    const prev = this.previous;
    if(prev && (r.CurrentRaceTime < prev.raw.CurrentRaceTime || r.LapNumber < prev.raw.LapNumber)) this.laps = [];
    const dt = prev ? ((r.TimestampMS - prev.raw.TimestampMS) >>> 0) / 1000 : 0;
    const continuous = prev && dt > 0 && dt <= .5 && frame.timestamp - prev.timestamp <= 500 && frame.timestamp >= prev.timestamp && r.CurrentRaceTime >= prev.raw.CurrentRaceTime && r.DistanceTraveled >= prev.raw.DistanceTraveled;
    const active = r.IsRaceOn === 1;
    const validInterval = continuous && active && prev.raw.IsRaceOn === 1;
    const corners = ['FrontLeft','FrontRight','RearLeft','RearRight'];
    const slip = Math.max(...corners.map(c => Math.abs(r['TireCombinedSlip' + c])));
    const g = Math.hypot(r.AccelerationX, r.AccelerationZ) / 9.80665;
    const drift = r.Speed >= 5 && r.VelocityZ > 1 ? Math.atan2(r.VelocityX, r.VelocityZ) * 180 / Math.PI : null;
    const damper = corners.map(c => validInterval ? (r['SuspensionTravelMeters' + c] - prev.raw['SuspensionTravelMeters' + c]) / dt : null);
    this.current = { drift, g, damper, slip, frontRearSlip: (Math.abs(r.TireSlipAngleFrontLeft) + Math.abs(r.TireSlipAngleFrontRight) - Math.abs(r.TireSlipAngleRearLeft) - Math.abs(r.TireSlipAngleRearRight)) / 2,
      tempSpread: Math.max(...corners.map(c => r['TireTemp'+c])) - Math.min(...corners.map(c => r['TireTemp'+c])),
      compressionBalance: (r.NormalizedSuspensionTravelFrontLeft + r.NormalizedSuspensionTravelFrontRight - r.NormalizedSuspensionTravelRearLeft - r.NormalizedSuspensionTravelRearRight) * 50 };
    if (active) {
      this.peakSpeed = Math.max(this.peakSpeed, r.Speed * 3.6); this.peakPower = Math.max(this.peakPower, r.Power / 1000); this.peakG = Math.max(this.peakG, g);
      if(r.Brake > 12) this.peakBrakingG = Math.max(this.peakBrakingG, -r.AccelerationZ / 9.80665);
      if (validInterval) {
        corners.forEach((corner,i)=>{
          this.damperEnergy[i] += damper[i] * damper[i] * dt;
          const compression=prev.raw['NormalizedSuspensionTravel'+corner];
          this.extensionTime[i] += compression <= .02 ? dt : 0;
          this.compressionTime[i] += compression >= .98 ? dt : 0;
        });
        this.elapsed += dt; const throttle = prev.raw.Accel > 12, brake = prev.raw.Brake > 12;
        this.throttleTime += throttle ? dt : 0; this.brakeTime += brake ? dt : 0;
        this.overlapTime += throttle && brake ? dt : 0; this.coastTime += !throttle && !brake ? dt : 0;
        this.slipTime += corners.some(c => Math.abs(prev.raw['TireCombinedSlip'+c]) > 1) ? dt : 0;
        if (r.LapNumber === prev.raw.LapNumber + 1 && r.LastLap > 0) {
          this.laps.push({ lap: r.LapNumber, time: r.LastLap }); if (this.laps.length > 100) this.laps.shift();
        }
      }
      if (r.Accel >= 242 && r.Brake < 13 && r.Clutch < 13 && r.Power > 0 && r.CurrentEngineRpm > 0) {
        const bin = Math.round(r.CurrentEngineRpm / 250) * 250;
        const old = this.dyno.get(bin);
        if (!old || old.power < r.Power / 1000) this.dyno.set(bin, { rpm: bin, power: r.Power / 1000, torque: r.Torque });
        if (this.dyno.size > 200) this.dyno.delete(this.dyno.keys().next().value);
      }
    }
    // shortcut: charts sample at 10 Hz, use full exported packets for high-frequency suspension analysis.
    if (!this.samples.length || !continuous || dt + (this.sampleAge || 0) >= .1) {
      this.samples.push({ t: frame.timestamp, raw: r, ...this.current, break: !validInterval });
      this.sampleAge = 0;
      while (this.samples.length > 1200 || this.samples[0].t < frame.timestamp - 120000) this.samples.shift();
    } else this.sampleAge = (this.sampleAge || 0) + dt;
    this.previous = frame;
  }
  lapStatistics() {
    const times=this.laps.map(l=>l.time),count=times.length;
    if(!count)return {count,mean:null,stddev:null};
    const mean=times.reduce((a,b)=>a+b,0)/count;
    return {count,mean,stddev:count>1?Math.sqrt(times.reduce((sum,t)=>sum+(t-mean)**2,0)/count):null};
  }
  suspensionSummary() {
    return this.damperEnergy.map((energy,i)=>({ rms:this.elapsed>0?Math.sqrt(energy/this.elapsed)*1000:null,
      extension:this.percent(this.extensionTime[i]),compression:this.percent(this.compressionTime[i]) }));
  }
  percent(value) { return this.elapsed > 0 ? value / this.elapsed * 100 : null; }
}
if (typeof module !== 'undefined') module.exports = { DriveAnalytics };

class ChannelReview {
  constructor(){this.held=null;this.cursor=null;}
  samples(source,seconds){const end=source.at(-1)?.t??0;return this.held??source.filter(s=>s.t>=end-seconds*1000);}
  hold(source,seconds){if(this.held)return true;const rows=this.samples(source,seconds);if(!rows.length)return false;this.held=structuredClone(rows);this.cursor=null;return true;}
  resume(){this.held=null;this.cursor=null;}
  select(rows,index){if(!rows.length||!Number.isFinite(index))return;this.cursor=Math.max(0,Math.min(rows.length-1,Math.round(index)));}
  selected(rows){return rows[this.cursor===null?rows.length-1:Math.min(this.cursor,rows.length-1)]??null;}
}
function channelStatistics(samples,channel){const values=samples.map(s=>s.raw[channel]).filter(Number.isFinite);return {count:values.length,min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null};}
if(typeof module!=='undefined')Object.assign(module.exports,{ChannelReview,channelStatistics});
