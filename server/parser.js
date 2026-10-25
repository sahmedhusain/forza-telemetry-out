/**
 * Forza UDP Telemetry Packet Parser
 * 
 * Supports:
 * - V1: 311 bytes (Forza Motorsport 7)
 * - V2: 324 bytes (Forza Horizon 4, Forza Horizon 5)
 * - V3: 331/332 bytes (Forza Motorsport 2023)
 * - Sled: 232 bytes (Basic physics/motion packet)
 * 
 * All data is streamed in Little-Endian format at up to 60Hz.
 */

// Car classes mapped from official Forza PI system
const CAR_CLASSES = {
  0: { code: 'D', name: 'Class D', color: '#00d2ff', minPI: 100, maxPI: 500 },
  1: { code: 'C', name: 'Class C', color: '#ffea00', minPI: 501, maxPI: 600 },
  2: { code: 'B', name: 'Class B', color: '#ff8800', minPI: 601, maxPI: 700 },
  3: { code: 'A', name: 'Class A', color: '#ff2d55', minPI: 701, maxPI: 800 },
  4: { code: 'S1', name: 'Class S1', color: '#af52de', minPI: 801, maxPI: 900 },
  5: { code: 'S2', name: 'Class S2', color: '#5856d6', minPI: 901, maxPI: 998 },
  6: { code: 'X', name: 'Class X', color: '#00ff88', minPI: 999, maxPI: 999 }
};

const DRIVETRAIN_TYPES = {
  0: 'FWD',
  1: 'RWD',
  2: 'AWD'
};

const PACKET_TYPES = {
  232: 'Sled (Physics Only)',
  311: 'FM7 (Motorsport 7)',
  323: 'FH4/FH5 (Horizon Dash Patched)',
  324: 'FH4/FH5 (Horizon Dash Standard)',
  331: 'FM2023 (Motorsport 2023)',
  332: 'FM2023 (Motorsport 2023 Extended)'
};

/**
 * Detects packet type based on byte length
 * @param {number} length 
 * @returns {string}
 */
function identifyPacketType(length) {
  return PACKET_TYPES[length] || `Unknown (${length} bytes)`;
}

/**
 * Parses a raw UDP Buffer received from Forza
 * @param {Buffer} buffer 
 * @returns {Object|null} Structured telemetry object
 */
function parseTelemetryPacket(buffer) {
  if (!buffer || buffer.length < 232) {
    return null;
  }

  const length = buffer.length;
  const isV2 = length === 324 || length === 323; // Forza Horizon 4/5 12-byte gap
  const isDash = length >= 311;

  try {
    // 1. Core State & Timing
    const isRaceOn = buffer.readInt32LE(0) === 1;
    const timestampMs = buffer.readUInt32LE(4);

    // 2. Engine
    const engineMaxRpm = buffer.readFloatLE(8);
    const engineIdleRpm = buffer.readFloatLE(12);
    const currentEngineRpm = buffer.readFloatLE(16);

    // 3. Local Vehicle Dynamics
    const acceleration = {
      x: buffer.readFloatLE(20), // Lateral acceleration (m/s^2)
      y: buffer.readFloatLE(24), // Vertical acceleration (m/s^2)
      z: buffer.readFloatLE(28)  // Longitudinal acceleration (m/s^2)
    };

    const velocity = {
      x: buffer.readFloatLE(32), // Lateral velocity (m/s)
      y: buffer.readFloatLE(36), // Vertical velocity (m/s)
      z: buffer.readFloatLE(40)  // Longitudinal velocity (m/s)
    };

    const angularVelocity = {
      x: buffer.readFloatLE(44), // Pitch rate (rad/s)
      y: buffer.readFloatLE(48), // Yaw rate (rad/s)
      z: buffer.readFloatLE(52)  // Roll rate (rad/s)
    };

    const yaw = buffer.readFloatLE(56);   // Global orientation Yaw (rad)
    const pitch = buffer.readFloatLE(60); // Global orientation Pitch (rad)
    const roll = buffer.readFloatLE(64);  // Global orientation Roll (rad)

    // 4. Wheels & Suspension Dynamics (FL, FR, RL, RR)
    const normalizedSuspensionTravel = {
      fl: buffer.readFloatLE(68),
      fr: buffer.readFloatLE(72),
      rl: buffer.readFloatLE(76),
      rr: buffer.readFloatLE(80)
    };

    const tireSlipRatio = {
      fl: buffer.readFloatLE(84),
      fr: buffer.readFloatLE(88),
      rl: buffer.readFloatLE(92),
      rr: buffer.readFloatLE(96)
    };

    const wheelRotationSpeed = {
      fl: buffer.readFloatLE(100),
      fr: buffer.readFloatLE(104),
      rl: buffer.readFloatLE(108),
      rr: buffer.readFloatLE(112)
    };

    const wheelOnRumbleStrip = {
      fl: buffer.readInt32LE(116) > 0,
      fr: buffer.readInt32LE(120) > 0,
      rl: buffer.readInt32LE(124) > 0,
      rr: buffer.readInt32LE(128) > 0
    };

    const wheelInPuddleDepth = {
      fl: buffer.readFloatLE(132),
      fr: buffer.readFloatLE(136),
      rl: buffer.readFloatLE(140),
      rr: buffer.readFloatLE(144)
    };

    const surfaceRumble = {
      fl: buffer.readFloatLE(148),
      fr: buffer.readFloatLE(152),
      rl: buffer.readFloatLE(156),
      rr: buffer.readFloatLE(160)
    };

    const tireSlipAngle = {
      fl: buffer.readFloatLE(164),
      fr: buffer.readFloatLE(168),
      rl: buffer.readFloatLE(172),
      rr: buffer.readFloatLE(176)
    };

    const tireCombinedSlip = {
      fl: buffer.readFloatLE(180),
      fr: buffer.readFloatLE(184),
      rl: buffer.readFloatLE(188),
      rr: buffer.readFloatLE(192)
    };

    const suspensionTravelMeters = {
      fl: buffer.readFloatLE(196),
      fr: buffer.readFloatLE(200),
      rl: buffer.readFloatLE(204),
      rr: buffer.readFloatLE(208)
    };

    // 5. Vehicle Identifiers
    const carOrdinal = buffer.readInt32LE(212);
    const carClassRaw = buffer.readInt32LE(216);
    const carPerformanceIndex = buffer.readInt32LE(220);
    const drivetrainTypeRaw = buffer.readInt32LE(224);
    const numCylinders = buffer.readInt32LE(228);

    // Dynamic G-Force calculations (1G = 9.80665 m/s^2)
    const gForce = {
      lateral: acceleration.x / 9.80665,
      vertical: acceleration.y / 9.80665,
      longitudinal: acceleration.z / 9.80665
    };

    // Base telemetry container
    const telemetry = {
      packetType: identifyPacketType(length),
      packetLength: length,
      timestamp: Date.now(),
      isRaceOn,
      timestampMs,

      engine: {
        maxRpm: Math.round(engineMaxRpm),
        idleRpm: Math.round(engineIdleRpm),
        currentRpm: Math.round(currentEngineRpm),
        rpmPercent: engineMaxRpm > 0 ? Math.min(100, Math.max(0, (currentEngineRpm / engineMaxRpm) * 100)) : 0,
        isRevLimit: engineMaxRpm > 0 && currentEngineRpm >= (engineMaxRpm * 0.96)
      },

      dynamics: {
        acceleration,
        velocity,
        angularVelocity,
        gForce,
        orientation: {
          yawDeg: (yaw * 180 / Math.PI),
          pitchDeg: (pitch * 180 / Math.PI),
          rollDeg: (roll * 180 / Math.PI)
        }
      },

      wheels: {
        suspensionTravel: normalizedSuspensionTravel,
        suspensionTravelMeters,
        slipRatio: tireSlipRatio,
        rotationSpeed: wheelRotationSpeed,
        rumbleStrip: wheelOnRumbleStrip,
        puddleDepth: wheelInPuddleDepth,
        surfaceRumble,
        slipAngle: tireSlipAngle,
        combinedSlip: tireCombinedSlip
      },

      car: {
        ordinal: carOrdinal,
        classCode: CAR_CLASSES[carClassRaw]?.code || 'A',
        className: CAR_CLASSES[carClassRaw]?.name || 'Class A',
        classColor: CAR_CLASSES[carClassRaw]?.color || '#ff2d55',
        pi: carPerformanceIndex,
        drivetrain: DRIVETRAIN_TYPES[drivetrainTypeRaw] || 'AWD',
        numCylinders
      }
    };

    // If packet has DASH extension (speed, power, inputs, temps, laps)
    if (isDash) {
      // Horizon has a 12-byte gap between offset 231 and 244
      const dashOffset = isV2 ? 244 : 232;

      // Global coordinates
      telemetry.position = {
        x: buffer.readFloatLE(dashOffset),
        y: buffer.readFloatLE(dashOffset + 4),
        z: buffer.readFloatLE(dashOffset + 8)
      };

      // Speed (m/s)
      const speedMps = buffer.readFloatLE(dashOffset + 12);
      const speedKmh = speedMps * 3.6;
      const speedMph = speedMps * 2.23694;

      // Power & Torque
      const powerWatts = buffer.readFloatLE(dashOffset + 16);
      const torqueNm = buffer.readFloatLE(dashOffset + 20);

      const powerHp = powerWatts / 745.7;
      const powerKw = powerWatts / 1000;
      const torqueFtLb = torqueNm * 0.737562;

      // Tire Temperatures (Fahrenheit from game)
      const tireTempF = {
        fl: buffer.readFloatLE(dashOffset + 24),
        fr: buffer.readFloatLE(dashOffset + 28),
        rl: buffer.readFloatLE(dashOffset + 32),
        rr: buffer.readFloatLE(dashOffset + 36)
      };

      const tireTempC = {
        fl: (tireTempF.fl - 32) * (5 / 9),
        fr: (tireTempF.fr - 32) * (5 / 9),
        rl: (tireTempF.rl - 32) * (5 / 9),
        rr: (tireTempF.rr - 32) * (5 / 9)
      };

      // Boost, Fuel & Distance
      const boostPsi = buffer.readFloatLE(dashOffset + 40);
      const boostBar = boostPsi * 0.0689476;
      const fuelFraction = buffer.readFloatLE(dashOffset + 44);
      const distanceTraveledMeters = buffer.readFloatLE(dashOffset + 48);

      // Lap times (seconds)
      const bestLap = buffer.readFloatLE(dashOffset + 52);
      const lastLap = buffer.readFloatLE(dashOffset + 56);
      const currentLap = buffer.readFloatLE(dashOffset + 60);
      const currentRaceTime = buffer.readFloatLE(dashOffset + 64);

      // Dash indicators & inputs
      const lapNumber = buffer.readUInt16LE(dashOffset + 68);
      const racePosition = buffer.readUInt8(dashOffset + 70);
      const accel = buffer.readUInt8(dashOffset + 71); // 0..255
      const brake = buffer.readUInt8(dashOffset + 72); // 0..255
      const clutch = buffer.readUInt8(dashOffset + 73); // 0..255
      const handbrake = buffer.readUInt8(dashOffset + 74); // 0..255
      const gear = buffer.readUInt8(dashOffset + 75); // 0=R, 1..10=gears
      const steer = buffer.readInt8(dashOffset + 76); // -128..127

      const normalizedDrivingLine = buffer.readInt8(dashOffset + 77);
      const normalizedAIBrakeDifference = buffer.readInt8(dashOffset + 78);

      telemetry.speed = {
        mps: speedMps,
        kmh: Math.round(speedKmh * 10) / 10,
        mph: Math.round(speedMph * 10) / 10
      };

      telemetry.powertrain = {
        powerWatts,
        powerHp: Math.round(powerHp),
        powerKw: Math.round(powerKw),
        torqueNm: Math.round(torqueNm),
        torqueFtLb: Math.round(torqueFtLb),
        boostPsi: Math.round(boostPsi * 10) / 10,
        boostBar: Math.round(boostBar * 100) / 100,
        fuelPercent: Math.round(fuelFraction * 100)
      };

      telemetry.wheels.temperatures = {
        fahrenheit: tireTempF,
        celsius: {
          fl: Math.round(tireTempC.fl),
          fr: Math.round(tireTempC.fr),
          rl: Math.round(tireTempC.rl),
          rr: Math.round(tireTempC.rr)
        }
      };

      telemetry.inputs = {
        throttlePercent: Math.round((accel / 255) * 100),
        brakePercent: Math.round((brake / 255) * 100),
        clutchPercent: Math.round((clutch / 255) * 100),
        handbrakeActive: handbrake > 0,
        steeringPercent: Math.round((steer / 127) * 100),
        steeringDeg: Math.round((steer / 127) * 450), // typical 900-degree lock-to-lock rotation
        gear: formatGear(gear)
      };

      telemetry.race = {
        lapNumber,
        racePosition,
        distanceMeters: Math.round(distanceTraveledMeters),
        bestLapSec: bestLap,
        lastLapSec: lastLap,
        currentLapSec: currentLap,
        currentRaceTimeSec: currentRaceTime,
        formattedTimes: {
          best: formatLapTime(bestLap),
          last: formatLapTime(lastLap),
          current: formatLapTime(currentLap),
          total: formatLapTime(currentRaceTime)
        },
        drivingLine: normalizedDrivingLine,
        aiBrakeDiff: normalizedAIBrakeDifference
      };
    }

    return telemetry;
  } catch (err) {
    console.error('[ForzaParser] Error decoding packet:', err);
    return null;
  }
}

/**
 * Format gear integer to readable string ('R', 'N', '1'..'10')
 * @param {number} g 
 * @returns {string}
 */
function formatGear(g) {
  if (g === 0) return 'R';
  if (g === 11) return 'N';
  return String(g);
}

/**
 * Converts seconds into mm:ss.ms
 * @param {number} sec 
 * @returns {string}
 */
function formatLapTime(sec) {
  if (!sec || sec <= 0 || isNaN(sec)) return '--:--.---';
  const minutes = Math.floor(sec / 60);
  const remainingSeconds = sec % 60;
  const sStr = remainingSeconds < 10 ? '0' + remainingSeconds.toFixed(3) : remainingSeconds.toFixed(3);
  return `${minutes}:${sStr}`;
}

module.exports = {
  parseTelemetryPacket,
  identifyPacketType,
  CAR_CLASSES,
  DRIVETRAIN_TYPES
};
