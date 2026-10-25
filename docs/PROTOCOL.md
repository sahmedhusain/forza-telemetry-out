# FH6 packet reference

Applies to **1.6.1**. [Setup](../GETTING_STARTED.md) · [Calculations](ANALYTICS.md) · [Local API](API.md) · [Documentation index](README.md)

Source: [Forza Support — FH6 Data Out](https://support.forza.net/hc/en-us/articles/51744149102611-Forza-Horizon-6-Data-Out-Documentation), checked 25 October 2026.

The decoder accepts exactly 324 bytes. The 88 named fields occupy bytes 0–322; byte 323 is unspecified and preserved as `reservedByte`. Decoding uses little-endian reads, a protocol assumption to verify against hardware. Non-finite floats and other lengths are rejected. There is no automatic game identification: older games can share packet sizes.

The canonical machine-readable schema is [`public/packet-schema.json`](../public/packet-schema.json). `raw` retains original numeric values, including flags, signed inputs, full precision and unknown enum values. Derived views round for display only. CSV contains all 88 raw values plus recording time, source and the final byte; JSON contains raw and derived values.

## Interpretation

- Local axes: X right, Y up, Z forward. Angular velocity X pitch, Y yaw, Z roll. World position is separate from local velocity.
- G = acceleration / 9.80665. No gravity correction or calibrated vehicle dynamics is applied.
- Suspension fraction runs from full extension (0) to full compression (1). Physical suspension travel is separately available in meters.
- Slip ratio, slip angle and combined slip are normalized values, not degrees. Absolute values over 1 indicate grip loss. Rumble-strip and puddle fields are signed 32-bit flags; surface rumble is unitless.
- Power is watts, torque N·m, boost psi above atmosphere. Fuel is a fraction. Inputs 0–255 become percentages. Steering −127…127 becomes a signed percentage; the wheel graphic is illustrative.
- The source does not specify tire temperature units, a complete car-class mapping, gear special values, or a car ID/name database. We show raw temperature, class number, gear number and vehicle ID. No invented model names or optimal-temperature bands.
- LapNumber counts completed laps. Zero lap times are unavailable; zero race position displays an em dash. TimestampMS can wrap; stream freshness uses local arrival time.
- FH6 does not send tire wear or track ID. It does send CarGroup and the two smashable collision fields. Road maps, tire pressure, damage, weather and fuel consumption are not claimed as game channels.

## Every field

| Byte offset | Field | Wire type | Unit / meaning | Dashboard group |
|---:|---|---|---|---|
| 0 | `IsRaceOn` | S32 | flag | Session |
| 4 | `TimestampMS` | U32 | ms | Session |
| 8 | `EngineMaxRpm` | F32 | rpm | Engine |
| 12 | `EngineIdleRpm` | F32 | rpm | Engine |
| 16 | `CurrentEngineRpm` | F32 | rpm | Engine |
| 20 | `AccelerationX` | F32 | m/s² | Dynamics |
| 24 | `AccelerationY` | F32 | m/s² | Dynamics |
| 28 | `AccelerationZ` | F32 | m/s² | Dynamics |
| 32 | `VelocityX` | F32 | m/s | Dynamics |
| 36 | `VelocityY` | F32 | m/s | Dynamics |
| 40 | `VelocityZ` | F32 | m/s | Dynamics |
| 44 | `AngularVelocityX` | F32 | rad/s | Dynamics |
| 48 | `AngularVelocityY` | F32 | rad/s | Dynamics |
| 52 | `AngularVelocityZ` | F32 | rad/s | Dynamics |
| 56 | `Yaw` | F32 | rad | Dynamics |
| 60 | `Pitch` | F32 | rad | Dynamics |
| 64 | `Roll` | F32 | rad | Dynamics |
| 68 | `NormalizedSuspensionTravelFrontLeft` | F32 | ratio | Wheels |
| 72 | `NormalizedSuspensionTravelFrontRight` | F32 | ratio | Wheels |
| 76 | `NormalizedSuspensionTravelRearLeft` | F32 | ratio | Wheels |
| 80 | `NormalizedSuspensionTravelRearRight` | F32 | ratio | Wheels |
| 84 | `TireSlipRatioFrontLeft` | F32 | ratio | Wheels |
| 88 | `TireSlipRatioFrontRight` | F32 | ratio | Wheels |
| 92 | `TireSlipRatioRearLeft` | F32 | ratio | Wheels |
| 96 | `TireSlipRatioRearRight` | F32 | ratio | Wheels |
| 100 | `WheelRotationSpeedFrontLeft` | F32 | rad/s | Wheels |
| 104 | `WheelRotationSpeedFrontRight` | F32 | rad/s | Wheels |
| 108 | `WheelRotationSpeedRearLeft` | F32 | rad/s | Wheels |
| 112 | `WheelRotationSpeedRearRight` | F32 | rad/s | Wheels |
| 116 | `WheelOnRumbleStripFrontLeft` | S32 | flag | Wheels |
| 120 | `WheelOnRumbleStripFrontRight` | S32 | flag | Wheels |
| 124 | `WheelOnRumbleStripRearLeft` | S32 | flag | Wheels |
| 128 | `WheelOnRumbleStripRearRight` | S32 | flag | Wheels |
| 132 | `WheelInPuddleFrontLeft` | S32 | flag | Wheels |
| 136 | `WheelInPuddleFrontRight` | S32 | flag | Wheels |
| 140 | `WheelInPuddleRearLeft` | S32 | flag | Wheels |
| 144 | `WheelInPuddleRearRight` | S32 | flag | Wheels |
| 148 | `SurfaceRumbleFrontLeft` | F32 | unitless | Wheels |
| 152 | `SurfaceRumbleFrontRight` | F32 | unitless | Wheels |
| 156 | `SurfaceRumbleRearLeft` | F32 | unitless | Wheels |
| 160 | `SurfaceRumbleRearRight` | F32 | unitless | Wheels |
| 164 | `TireSlipAngleFrontLeft` | F32 | ratio | Wheels |
| 168 | `TireSlipAngleFrontRight` | F32 | ratio | Wheels |
| 172 | `TireSlipAngleRearLeft` | F32 | ratio | Wheels |
| 176 | `TireSlipAngleRearRight` | F32 | ratio | Wheels |
| 180 | `TireCombinedSlipFrontLeft` | F32 | ratio | Wheels |
| 184 | `TireCombinedSlipFrontRight` | F32 | ratio | Wheels |
| 188 | `TireCombinedSlipRearLeft` | F32 | ratio | Wheels |
| 192 | `TireCombinedSlipRearRight` | F32 | ratio | Wheels |
| 196 | `SuspensionTravelMetersFrontLeft` | F32 | m | Wheels |
| 200 | `SuspensionTravelMetersFrontRight` | F32 | m | Wheels |
| 204 | `SuspensionTravelMetersRearLeft` | F32 | m | Wheels |
| 208 | `SuspensionTravelMetersRearRight` | F32 | m | Wheels |
| 212 | `CarOrdinal` | S32 | integer | Vehicle |
| 216 | `CarClass` | S32 | integer | Vehicle |
| 220 | `CarPerformanceIndex` | S32 | integer | Vehicle |
| 224 | `DrivetrainType` | S32 | integer | Vehicle |
| 228 | `NumCylinders` | S32 | integer | Vehicle |
| 232 | `CarGroup` | U32 | identifier | Vehicle |
| 236 | `SmashableVelDiff` | F32 | m/s | Collision |
| 240 | `SmashableMass` | F32 | kg | Collision |
| 244 | `PositionX` | F32 | m | Dynamics |
| 248 | `PositionY` | F32 | m | Dynamics |
| 252 | `PositionZ` | F32 | m | Dynamics |
| 256 | `Speed` | F32 | m/s | Engine |
| 260 | `Power` | F32 | W | Engine |
| 264 | `Torque` | F32 | N·m | Engine |
| 268 | `TireTempFrontLeft` | F32 | raw (unit unspecified) | Wheels |
| 272 | `TireTempFrontRight` | F32 | raw (unit unspecified) | Wheels |
| 276 | `TireTempRearLeft` | F32 | raw (unit unspecified) | Wheels |
| 280 | `TireTempRearRight` | F32 | raw (unit unspecified) | Wheels |
| 284 | `Boost` | F32 | psi | Engine |
| 288 | `Fuel` | F32 | fraction | Engine |
| 292 | `DistanceTraveled` | F32 | m | Session |
| 296 | `BestLap` | F32 | s | Session |
| 300 | `LastLap` | F32 | s | Session |
| 304 | `CurrentLap` | F32 | s | Session |
| 308 | `CurrentRaceTime` | F32 | s | Session |
| 312 | `LapNumber` | U16 | laps completed | Session |
| 314 | `RacePosition` | U8 | position | Session |
| 315 | `Accel` | U8 | raw | Inputs |
| 316 | `Brake` | U8 | raw | Inputs |
| 317 | `Clutch` | U8 | raw | Inputs |
| 318 | `HandBrake` | U8 | raw | Inputs |
| 319 | `Gear` | U8 | raw | Inputs |
| 320 | `Steer` | S8 | raw | Inputs |
| 321 | `NormalizedDrivingLine` | S8 | raw | Inputs |
| 322 | `NormalizedAIBrakeDifference` | S8 | raw | Inputs |

| 323 | `reservedByte` | U8 | Unspecified by source | Inspector footer / exports |
