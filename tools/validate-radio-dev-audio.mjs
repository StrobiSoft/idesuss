import assert from "node:assert/strict";
import { buildDevelopmentToneWav, createDevelopmentExternalStation } from "../radio/radio-stations.js";

const buffer = buildDevelopmentToneWav({
  durationSeconds: 1,
  sampleRate: 8000,
  frequencyHz: 440,
  amplitude: 0.1
});

assert.ok(buffer instanceof ArrayBuffer, "Expected ArrayBuffer");
assert.equal(buffer.byteLength, 44 + 8000 * 2, "Unexpected WAV size");

const view = new DataView(buffer);
const ascii = (offset, length) =>
  Array.from({ length }, (_unused, index) => String.fromCharCode(view.getUint8(offset + index))).join("");

assert.equal(ascii(0, 4), "RIFF");
assert.equal(ascii(8, 4), "WAVE");
assert.equal(ascii(12, 4), "fmt ");
assert.equal(ascii(36, 4), "data");
assert.equal(view.getUint16(20, true), 1, "Expected PCM");
assert.equal(view.getUint16(22, true), 1, "Expected mono");
assert.equal(view.getUint32(24, true), 8000, "Unexpected sample rate");
assert.equal(view.getUint16(34, true), 16, "Expected 16-bit PCM");
assert.equal(view.getUint32(40, true), 8000 * 2, "Unexpected PCM data size");

let hasNonZeroSample = false;
for (let offset = 44; offset < buffer.byteLength; offset += 2) {
  if (view.getInt16(offset, true) !== 0) {
    hasNonZeroSample = true;
    break;
  }
}
assert.ok(hasNonZeroSample, "Generated WAV contains no audible samples");

console.log("Radio development WAV validation OK");


const external = createDevelopmentExternalStation("https://example.com/live.mp3", "mp3");
assert.ok(external, "Expected HTTPS development stream to be accepted");
assert.equal(external.streamUrl, "https://example.com/live.mp3");
assert.equal(external.streamType, "mp3");
assert.equal(external.catalogManaged, false);

assert.equal(createDevelopmentExternalStation("http://example.com/live.mp3", "mp3"), null);
assert.equal(createDevelopmentExternalStation("javascript:alert(1)", "auto"), null);
assert.equal(createDevelopmentExternalStation("", "auto"), null);

const fallbackType = createDevelopmentExternalStation("https://example.com/live", "unknown");
assert.equal(fallbackType.streamType, "auto");

console.log("Radio development external-stream validation OK");
