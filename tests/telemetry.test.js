const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseTelemetryPacket, FIELD_SCHEMA } = require('../server/parser');
const Recorder = require('../server/recorder');
const writers = { F32: 'writeFloatLE', S32: 'writeInt32LE', U32: 'writeUInt32LE', U16: 'writeUInt16LE', U8: 'writeUInt8', S8: 'writeInt8' };

test('all 88 documented fields decode without omissions; FH6 insertions do not shift Dash', () => {
  const buffer = Buffer.alloc(324); const expected = {};
  FIELD_SCHEMA.forEach((f, i) => { const value = f.type === 'F32' ? i + .25 : f.type === 'S8' ? -100 : i; expected[f.name] = value; buffer[writers[f.type]](value, f.offset); });
  buffer[323] = 217;
  const parsed = parseTelemetryPacket(buffer);
  assert.equal(FIELD_SCHEMA.length, 88);
  assert.deepEqual(parsed.raw, expected);
  assert.equal(parsed.reservedByte, 217);
  assert.equal(parsed.car.group, expected.CarGroup);
  assert.equal(parsed.collision.mass, expected.SmashableMass);
  assert.equal(parsed.position.x, expected.PositionX);
  assert.equal(parsed.wheels.inPuddle.fl, expected.WheelInPuddleFrontLeft);
  assert.equal(parsed.inputs.handbrakePercent, expected.HandBrake / 255 * 100);
  assert.equal(parsed.race.aiBrakeDiff, -100);
  assert.equal(FIELD_SCHEMA.at(-1).offset, 322);
});
test('rejects unsupported lengths, non-buffers and non-finite floats', () => {
  for (const size of [0, 232, 311, 323, 325, 331, 332, 500]) assert.equal(parseTelemetryPacket(Buffer.alloc(size)), null);
  assert.equal(parseTelemetryPacket(null), null);
  assert.equal(parseTelemetryPacket({ length: 324 }), null);
  for (const value of [NaN, Infinity, -Infinity]) { const b = Buffer.alloc(324); b.writeFloatLE(value, 16); assert.equal(parseTelemetryPacket(b), null); }
});
test('unsigned timestamp rollover and signed steering are preserved', () => {
  const b = Buffer.alloc(324); b.writeUInt32LE(0xffffffff, 4); b.writeInt8(-127, 320);
  assert.equal(parseTelemetryPacket(b).timestampMs, 0xffffffff);
  assert.equal(parseTelemetryPacket(b).inputs.steeringPercent, -100);
  b.writeUInt32LE(0, 4); assert.equal(parseTelemetryPacket(b).timestampMs, 0);
});
test('recording stops at capacity without deleting frames and exports all channels', () => {
  const recorder = new Recorder({ maxFrames: 2 }); recorder.start();
  const frame = parseTelemetryPacket(Buffer.alloc(324));
  recorder.recordFrame(frame); recorder.recordFrame(frame); recorder.recordFrame(frame);
  assert.equal(recorder.frames.length, 2); assert.equal(recorder.isRecording, false); assert.equal(recorder.getStatus().limitReached, true);
  const csv = recorder.exportCsv().split('\n');
  assert.equal(csv.length, 3); assert.equal(csv[0].split(',').length, 91);
  assert.ok(csv[0].includes('SmashableMass')); assert.ok(csv[0].includes('NormalizedAIBrakeDifference'));
  assert.equal(JSON.parse(recorder.exportJson()).frameCount, 2);
});
