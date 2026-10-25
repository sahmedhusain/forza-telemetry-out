const fs = require('node:fs');
const path = require('node:path');
const fields = require('../public/packet-schema.json');
const corners = ['FrontLeft','FrontRight','RearLeft','RearRight'];

class TelemetryHistory {
  constructor(file) {
    this.file = file; this.profiles = new Map(); this.previous = null;
    this.error = null; this.dirty = false; this.canSave = true;
    if (!file || !fs.existsSync(file)) return;
    try {
      if (fs.statSync(file).size > 32 * 1024 * 1024) throw Error('History file exceeds 32 MiB');
      const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (saved.version !== 1 || !Array.isArray(saved.profiles) || saved.profiles.length > 2048) throw Error('Unsupported history file');
      for (const p of saved.profiles) {
        if (!Number.isInteger(p.ordinal) || !Number.isSafeInteger(p.packets) || p.packets < 0 || !p.bounds || !p.metadata || typeof p.metadata !== 'object' || Array.isArray(p.metadata)) throw Error('Invalid vehicle history');
        for (const key of ['activePackets','activeSeconds','distanceMeters','peakG','peakBrakingG','wetSeconds','curbSeconds','slipSeconds','lastSeen']) if (!Number.isFinite(p[key]) || p[key] < 0) throw Error('Invalid history totals');
        for (const key of ['bestLap','observedBestLap']) if (p[key] !== null && (!Number.isFinite(p[key]) || p[key] <= 0)) throw Error('Invalid lap history');
        for (const [key,b] of Object.entries(p.bounds)) if (!fields.some(f=>f.name===key) || ![b.min,b.max,b.last].every(Number.isFinite) || b.min > b.max) throw Error('Invalid field extrema');
        if (this.profiles.has(p.ordinal)) throw Error('Duplicate vehicle history');
        this.profiles.set(p.ordinal,p);
      }
    } catch (error) {
      this.profiles.clear(); this.canSave = false;
      this.error = `Saved history could not be loaded; the file was preserved. ${error.message}`;
    }
  }
  record(frame) {
    const r = frame.raw; if (!r) return;
    let p = this.profiles.get(r.CarOrdinal);
    if (!p) {
      if (this.profiles.size >= 2048) { this.error = 'History has reached 2048 vehicles; existing history is preserved.'; return; }
      p = { ordinal:r.CarOrdinal, metadata:{}, packets:0, activePackets:0, activeSeconds:0, distanceMeters:0, bounds:{}, peakG:0, peakBrakingG:0, bestLap:null, observedBestLap:null, wetSeconds:0, curbSeconds:0, slipSeconds:0, lastSeen:0 };
      this.profiles.set(r.CarOrdinal,p);
    }
    p.packets++; p.lastSeen=frame.timestamp;
    p.metadata={name:frame.car?.name??null,pi:r.CarPerformanceIndex,classNumber:r.CarClass,drivetrain:frame.car?.drivetrain??null,cylinders:r.NumCylinders,group:r.CarGroup};
    const prev=this.previous, dt=prev?((r.TimestampMS-prev.raw.TimestampMS)>>>0)/1000:0;
    const continuous=prev && prev.raw.CarOrdinal===r.CarOrdinal && prev.raw.CarPerformanceIndex===r.CarPerformanceIndex && prev.raw.IsRaceOn===1 && r.IsRaceOn===1 && dt>0 && dt<=.5 && frame.timestamp>=prev.timestamp && frame.timestamp-prev.timestamp<=500 && r.CurrentRaceTime>=prev.raw.CurrentRaceTime && r.DistanceTraveled>=prev.raw.DistanceTraveled;
    if (r.IsRaceOn === 1) {
      p.activePackets++;
      for (const f of fields) {
        const value=r[f.name]; if (!Number.isFinite(value)) continue;
        const b=p.bounds[f.name];
        if (b) { b.min=Math.min(b.min,value); b.max=Math.max(b.max,value); b.last=value; }
        else p.bounds[f.name]={min:value,max:value,last:value};
      }
      p.peakG=Math.max(p.peakG,Math.hypot(r.AccelerationX,r.AccelerationZ)/9.80665);
      if (r.Brake>12) p.peakBrakingG=Math.max(p.peakBrakingG,-r.AccelerationZ/9.80665);
      if (r.BestLap>0) p.bestLap=p.bestLap===null?r.BestLap:Math.min(p.bestLap,r.BestLap);
      if (continuous) {
        p.activeSeconds+=dt;
        p.distanceMeters+=r.DistanceTraveled-prev.raw.DistanceTraveled;
        p.wetSeconds+=corners.some(c=>prev.raw['WheelInPuddle'+c]!==0)?dt:0;
        p.curbSeconds+=corners.some(c=>prev.raw['WheelOnRumbleStrip'+c]!==0)?dt:0;
        p.slipSeconds+=corners.some(c=>Math.abs(prev.raw['TireCombinedSlip'+c])>1)?dt:0;
        if (r.LapNumber===prev.raw.LapNumber+1 && r.LastLap>0) p.observedBestLap=p.observedBestLap===null?r.LastLap:Math.min(p.observedBestLap,r.LastLap);
      }
    }
    this.previous=frame; this.dirty=true;
  }
  snapshot(ordinal) {
    const active=ordinal??this.previous?.raw.CarOrdinal;
    return {version:1, vehicles:[...this.profiles.values()].map(p=>({ordinal:p.ordinal,name:p.metadata.name,packets:p.packets,lastSeen:p.lastSeen})), profile:this.profiles.get(active)??null,error:this.error,persistent:this.canSave&&Boolean(this.file)};
  }
  save() {
    if (!this.file || !this.dirty || !this.canSave) return;
    try {
      fs.mkdirSync(path.dirname(this.file),{recursive:true});
      fs.writeFileSync(this.file+'.tmp',JSON.stringify({version:1,profiles:[...this.profiles.values()]}),{mode:0o600});
      fs.renameSync(this.file+'.tmp',this.file); this.dirty=false; this.error=null;
    } catch (error) { this.error=`History could not be saved; in-memory totals are still available. ${error.message}`; }
  }
}
module.exports=TelemetryHistory;
