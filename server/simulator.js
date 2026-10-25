/**
 * Forza Realistic Telemetry Simulator
 * 
 * Generates dynamic, realistic 60Hz physics telemetry matching
 * an S2-Class Porsche 911 GT3 RS racing on a Grand Prix circuit.
 * Includes acceleration runs, redline gear shifts, hard trail braking,
 * lateral G cornering, weight transfer suspension compression,
 * and tire heat dynamics.
 */

class ForzaSimulator {
  constructor(onTelemetryCallback) {
    this.callback = onTelemetryCallback;
    this.isRunning = false;
    this.intervalId = null;

    // Simulation state
    this.gear = 1;
    this.rpm = 2500;
    this.maxRpm = 9000;
    this.idleRpm = 900;
    this.speedKmh = 35;
    this.phase = 'accel'; // 'accel' | 'shift' | 'cruise' | 'brake' | 'corner'
    this.phaseTimer = 0;
    this.lapNumber = 1;
    this.lapStartTime = Date.now();
    this.bestLapSec = 82.451;
    this.lastLapSec = 83.109;
    this.distanceMeters = 1420;
    this.steer = 0;
    this.throttle = 100;
    this.brake = 0;
    this.clutch = 0;
    this.boostPsi = 5;

    // Tire temps (°F)
    this.tireTemps = {
      fl: 195,
      fr: 194,
      rl: 202,
      rr: 201
    };

    // Gear ratios for Porsche 7-speed PDK
    this.gearRatios = {
      1: 3.75,
      2: 2.38,
      3: 1.72,
      4: 1.34,
      5: 1.11,
      6: 0.96,
      7: 0.84
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lapStartTime = Date.now();

    const frameTimeMs = 1000 / 60; // 60 Hz physics
    this.intervalId = setInterval(() => {
      this.updatePhysics();
    }, frameTimeMs);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  updatePhysics() {
    this.phaseTimer += 1 / 60;

    let lateralG = 0;
    let longitudinalG = 0;
    let suspensionFL = 0.5;
    let suspensionFR = 0.5;
    let suspensionRL = 0.5;
    let suspensionRR = 0.5;
    let rumbleStrip = false;
    let slipRatio = 0.05;

    // State machine driving through a realistic lap
    switch (this.phase) {
      case 'accel':
        this.throttle = Math.min(100, this.throttle + 4);
        this.brake = 0;
        this.clutch = 0;
        this.steer = Math.sin(this.phaseTimer * 2) * 4; // micro steering corrections
        this.boostPsi = Math.min(21.5, this.boostPsi + 0.35);

        // RPM buildup proportional to current gear
        const accelRate = (8 - this.gear) * 35;
        this.rpm += accelRate;
        this.speedKmh += (accelRate / 120);
        longitudinalG = 0.85 - (this.gear * 0.08);

        // Weight shifts to rear
        suspensionFL = 0.38;
        suspensionFR = 0.38;
        suspensionRL = 0.65;
        suspensionRR = 0.65;

        // Shift up near redline
        if (this.rpm >= this.maxRpm - 250) {
          if (this.gear < 6) {
            this.phase = 'shift';
            this.phaseTimer = 0;
          } else {
            // Reached top speed, transition to braking
            this.phase = 'brake';
            this.phaseTimer = 0;
          }
        }
        break;

      case 'shift':
        // Fast dual-clutch shift: 0.12s
        this.throttle = 15;
        this.clutch = 100;
        this.boostPsi = Math.max(8, this.boostPsi - 2.5);
        longitudinalG = -0.1;

        if (this.phaseTimer >= 0.12) {
          this.gear += 1;
          this.rpm = Math.round(this.rpm * 0.72); // RPM drops on upshift
          this.clutch = 0;
          this.phase = 'accel';
          this.phaseTimer = 0;
        }
        break;

      case 'brake':
        // Hard threshold braking zone into corner
        this.throttle = 0;
        this.brake = Math.min(100, this.brake + 18);
        this.clutch = 0;
        this.boostPsi = Math.max(0, this.boostPsi - 1.2);

        this.speedKmh = Math.max(65, this.speedKmh - 4.5);
        this.rpm = Math.max(3800, this.rpm - 140);
        longitudinalG = -1.45; // 1.45G braking force

        // Intense nose dive (front suspension compression)
        suspensionFL = 0.82;
        suspensionFR = 0.82;
        suspensionRL = 0.25;
        suspensionRR = 0.25;

        // Downshift while braking
        if (this.phaseTimer > 0.6 && this.gear > 2) {
          this.gear -= 1;
          this.rpm = 6500; // Rev-match blip
        }

        // Tires heat under braking
        this.tireTemps.fl += 0.08;
        this.tireTemps.fr += 0.08;

        if (this.speedKmh <= 75 || this.phaseTimer >= 1.5) {
          this.phase = 'corner';
          this.phaseTimer = 0;
        }
        break;

      case 'corner':
        // Apex cornering: trail braking into sustained lateral load
        this.brake = Math.max(0, this.brake - 8);
        this.throttle = 35 + Math.sin(this.phaseTimer * 3) * 15;
        this.boostPsi = 9.5;

        // Turn-in steering angle
        const turnDirection = (this.lapNumber % 2 === 0) ? -1 : 1;
        this.steer = turnDirection * Math.sin(this.phaseTimer * 1.8) * 45;
        lateralG = turnDirection * (1.25 + Math.sin(this.phaseTimer * 2) * 0.18);
        longitudinalG = 0.15;
        slipRatio = 0.35; // Tires working near traction limit

        // Lateral body roll (outside compresses, inside unloads)
        if (turnDirection > 0) {
          // Turning right -> Left wheels compress
          suspensionFL = 0.76;
          suspensionFR = 0.42;
          suspensionRL = 0.72;
          suspensionRR = 0.38;
          this.tireTemps.fl += 0.06;
          this.tireTemps.rl += 0.07;
        } else {
          // Turning left -> Right wheels compress
          suspensionFL = 0.42;
          suspensionFR = 0.76;
          suspensionRL = 0.38;
          suspensionRR = 0.72;
          this.tireTemps.fr += 0.06;
          this.tireTemps.rr += 0.07;
        }

        // Clipping apex curb / rumble strip
        if (this.phaseTimer > 0.8 && this.phaseTimer < 1.4) {
          rumbleStrip = true;
          suspensionFR += (Math.random() - 0.5) * 0.15;
          suspensionFL += (Math.random() - 0.5) * 0.15;
        }

        this.rpm += 25;
        this.speedKmh += 0.4;

        if (this.phaseTimer >= 2.2) {
          this.phase = 'accel';
          this.phaseTimer = 0;
          this.steer = 0;
        }
        break;
    }

    // Distance and lap tracking
    const mps = (this.speedKmh / 3.6);
    this.distanceMeters += mps / 60;
    const currentLapSec = (Date.now() - this.lapStartTime) / 1000;

    if (currentLapSec >= 84.5) {
      this.lastLapSec = currentLapSec;
      if (currentLapSec < this.bestLapSec) {
        this.bestLapSec = currentLapSec;
      }
      this.lapNumber += 1;
      this.lapStartTime = Date.now();
    }

    // Calculate realistic power & torque from RPM curve
    const rpmFrac = this.rpm / this.maxRpm;
    const maxHp = 518; // Porsche GT3 RS
    const currentHp = Math.round(maxHp * Math.sin(rpmFrac * Math.PI * 0.85) * (this.throttle / 100));
    const currentKw = Math.round(currentHp * 0.7457);
    const maxNm = 465;
    const currentNm = Math.round(maxNm * (0.6 + 0.4 * Math.sin(rpmFrac * Math.PI)) * (this.throttle / 100));
    const currentFtLb = Math.round(currentNm * 0.737562);

    // Build complete telemetry payload matching parser schema
    const telemetry = {
      isSimulated: true,
      packetType: 'Simulation (Porsche 911 GT3 RS)',
      packetLength: 324,
      timestamp: Date.now(),
      isRaceOn: true,
      timestampMs: Date.now() % 100000000,

      engine: {
        maxRpm: this.maxRpm,
        idleRpm: this.idleRpm,
        currentRpm: Math.round(this.rpm),
        rpmPercent: Math.round((this.rpm / this.maxRpm) * 100),
        isRevLimit: this.rpm >= (this.maxRpm - 250)
      },

      speed: {
        mps,
        kmh: Math.round(this.speedKmh * 10) / 10,
        mph: Math.round(this.speedKmh * 0.621371 * 10) / 10
      },

      powertrain: {
        powerHp: Math.max(0, currentHp),
        powerKw: Math.max(0, currentKw),
        powerWatts: Math.max(0, currentKw * 1000),
        torqueNm: Math.max(0, currentNm),
        torqueFtLb: Math.max(0, currentFtLb),
        boostPsi: Math.round(this.boostPsi * 10) / 10,
        boostBar: Math.round((this.boostPsi * 0.0689476) * 100) / 100,
        fuelPercent: 88
      },

      dynamics: {
        gForce: {
          lateral: Math.round(lateralG * 100) / 100,
          longitudinal: Math.round(longitudinalG * 100) / 100,
          vertical: 1.0
        },
        acceleration: {
          x: lateralG * 9.80665,
          y: 0,
          z: longitudinalG * 9.80665
        },
        velocity: {
          x: 0,
          y: 0,
          z: mps
        },
        angularVelocity: {
          x: 0,
          y: this.steer * 0.02,
          z: lateralG * 0.05
        },
        orientation: {
          yawDeg: (this.steer * 0.5),
          pitchDeg: (longitudinalG * -2.5),
          rollDeg: (lateralG * 3.2)
        }
      },

      inputs: {
        throttlePercent: Math.round(this.throttle),
        brakePercent: Math.round(this.brake),
        clutchPercent: Math.round(this.clutch),
        handbrakeActive: false,
        steeringPercent: Math.round((this.steer / 45) * 100),
        steeringDeg: Math.round(this.steer * 4),
        gear: String(this.gear)
      },

      wheels: {
        suspensionTravel: {
          fl: Math.min(1, Math.max(0, suspensionFL)),
          fr: Math.min(1, Math.max(0, suspensionFR)),
          rl: Math.min(1, Math.max(0, suspensionRL)),
          rr: Math.min(1, Math.max(0, suspensionRR))
        },
        suspensionTravelMeters: {
          fl: (suspensionFL * 0.12).toFixed(3),
          fr: (suspensionFR * 0.12).toFixed(3),
          rl: (suspensionRL * 0.12).toFixed(3),
          rr: (suspensionRR * 0.12).toFixed(3)
        },
        slipRatio: {
          fl: slipRatio,
          fr: slipRatio,
          rl: slipRatio * (this.gear <= 2 ? 1.6 : 1.0),
          rr: slipRatio * (this.gear <= 2 ? 1.6 : 1.0)
        },
        rotationSpeed: {
          fl: (mps / 0.33),
          fr: (mps / 0.33),
          rl: (mps / 0.34),
          rr: (mps / 0.34)
        },
        rumbleStrip: {
          fl: rumbleStrip,
          fr: rumbleStrip,
          rl: false,
          rr: false
        },
        puddleDepth: { fl: 0, fr: 0, rl: 0, rr: 0 },
        surfaceRumble: { fl: rumbleStrip ? 0.8 : 0, fr: rumbleStrip ? 0.8 : 0, rl: 0, rr: 0 },
        slipAngle: {
          fl: Math.abs(this.steer * 0.08),
          fr: Math.abs(this.steer * 0.08),
          rl: Math.abs(lateralG * 0.06),
          rr: Math.abs(lateralG * 0.06)
        },
        combinedSlip: {
          fl: slipRatio * 1.1,
          fr: slipRatio * 1.1,
          rl: slipRatio * 1.2,
          rr: slipRatio * 1.2
        },
        temperatures: {
          fahrenheit: {
            fl: Math.round(this.tireTemps.fl),
            fr: Math.round(this.tireTemps.fr),
            rl: Math.round(this.tireTemps.rl),
            rr: Math.round(this.tireTemps.rr)
          },
          celsius: {
            fl: Math.round((this.tireTemps.fl - 32) * (5 / 9)),
            fr: Math.round((this.tireTemps.fr - 32) * (5 / 9)),
            rl: Math.round((this.tireTemps.rl - 32) * (5 / 9)),
            rr: Math.round((this.tireTemps.rr - 32) * (5 / 9))
          }
        }
      },

      car: {
        ordinal: 3418,
        name: 'Porsche 911 GT3 RS',
        classCode: 'S2',
        className: 'Class S2',
        classColor: '#5856d6',
        pi: 995,
        drivetrain: 'RWD',
        numCylinders: 6
      },

      race: {
        lapNumber: this.lapNumber,
        racePosition: 1,
        distanceMeters: Math.round(this.distanceMeters),
        bestLapSec: this.bestLapSec,
        lastLapSec: this.lastLapSec,
        currentLapSec: Math.round(currentLapSec * 1000) / 1000,
        currentRaceTimeSec: Math.round((Date.now() - this.lapStartTime) / 1000),
        formattedTimes: {
          best: this.formatTime(this.bestLapSec),
          last: this.formatTime(this.lastLapSec),
          current: this.formatTime(currentLapSec),
          total: this.formatTime(currentLapSec)
        },
        drivingLine: 0,
        aiBrakeDiff: 0
      }
    };

    if (this.callback) {
      this.callback(telemetry);
    }
  }

  formatTime(sec) {
    if (!sec || sec <= 0) return '0:00.000';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s.toFixed(3)}`;
  }
}

module.exports = ForzaSimulator;
