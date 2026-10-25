const CAR_NAMES = require('../public/data/cars.json');
const FIELD_SCHEMA = require('../public/packet-schema.json');
/**
 * Forza UDP Telemetry Packet Parser
 * 
 * FH6 324-byte packets. Little-endian decoding; raw values preserved.
 * The listed fields occupy 323 bytes; the final byte is retained separately.
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

const PACKET_TYPES = { 324: 'Forza Horizon 6 · 324 bytes' };

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
  if (!Buffer.isBuffer(buffer) || buffer.length !== 324) {
    return null;
  }

  const length = buffer.length;
  const isV2 = true; // FH6 inserts three 4-byte fields before PositionX.
  const isDash = length >= 311;

  try {
    const readers = { S32: 'readInt32LE', U32: 'readUInt32LE', F32: 'readFloatLE', U16: 'readUInt16LE', U8: 'readUInt8', S8: 'readInt8' };
    const raw = Object.fromEntries(FIELD_SCHEMA.map(f => [f.name, buffer[readers[f.type]](f.offset)]));
    if (Object.values(raw).some(value => !Number.isFinite(value))) return null;
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
      fl: buffer.readInt32LE(132),
      fr: buffer.readInt32LE(136),
      rl: buffer.readInt32LE(140),
      rr: buffer.readInt32LE(144)
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
      collision: { velocityLoss: raw.SmashableVelDiff, mass: raw.SmashableMass },
      raw,
      reservedByte: buffer[323],
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
        inPuddle: wheelInPuddleDepth,
        surfaceRumble,
        slipAngle: tireSlipAngle,
        combinedSlip: tireCombinedSlip
      },

      car: {
        ordinal: carOrdinal,
        name: CAR_NAMES[String(carOrdinal)] ?? null,
        nameSource: CAR_NAMES[String(carOrdinal)] ? 'community-lookup' : null,
        classCode: `CLASS ${carClassRaw}`,
        className: `Class ${carClassRaw}`,
        classColor: CAR_CLASSES[carClassRaw]?.color || '#ff2d55',
        pi: carPerformanceIndex,
        drivetrain: DRIVETRAIN_TYPES[drivetrainTypeRaw] || `Unknown (${drivetrainTypeRaw})`,
        numCylinders,
        group: raw.CarGroup
      }
    };

    // If packet has DASH extension (speed, power, inputs, temps, laps)
    if (isDash) {
      // FH6 CarGroup, SmashableVelDiff and SmashableMass occupy bytes 232–243.
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

      telemetry.wheels.temperatures = { raw: {
        fl: raw.TireTempFrontLeft, fr: raw.TireTempFrontRight,
        rl: raw.TireTempRearLeft, rr: raw.TireTempRearRight
      }};

      telemetry.inputs = {
        throttlePercent: Math.round((accel / 255) * 100),
        brakePercent: Math.round((brake / 255) * 100),
        clutchPercent: Math.round((clutch / 255) * 100),
        handbrakeActive: handbrake > 0,
        handbrakePercent: handbrake / 255 * 100,
        steeringPercent: Math.round((steer / 127) * 100),
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
  FIELD_SCHEMA,
  parseTelemetryPacket,
  identifyPacketType,
  CAR_CLASSES,
  DRIVETRAIN_TYPES
};
