import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { registerMediabunnyServer } from "@mediabunny/server";
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
} from "mediabunny";
import { beforeAll, describe, expect, it } from "vitest";

// Proof of concept for the trim-before-upload editor planned in #85:
// MediaBunny trims a media file entirely in-process, with no server-side
// media infrastructure. The fixture is a 3-second AAC file, and the tests
// exercise both the fast copy path and the transcode path (the latter is
// what an arbitrary trim range uses today).

// Vitest runs with apps/web as the working directory.
const FIXTURE_PATH = resolve(process.cwd(), "tests/fixtures/trim-sample.m4a");

const loadFixtureBlob = (): Blob =>
  new Blob([readFileSync(FIXTURE_PATH)], { type: "audio/mp4" });

const convertTrimmed = async (
  blob: Blob,
  trim: { end: number; start: number }
): Promise<number> => {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(blob),
  });
  const output = new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget(),
  });
  const conversion = await Conversion.init({
    input,
    output,
    trim,
  });
  expect(conversion.isValid).toBe(true);
  await conversion.execute();
  const { buffer } = output.target;
  expect(buffer).toBeTruthy();

  if (!buffer) {
    throw new Error("Conversion produced no output buffer");
  }

  const trimmedInput = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(new Blob([buffer])),
  });
  return await trimmedInput.computeDuration();
};

describe("mediabunny trim proof of concept (#85)", () => {
  let fixture: Blob;

  beforeAll(() => {
    // Brings full software decoding/encoding to the Node environment
    // (in the browser, WebCodecs plays this role instead).
    registerMediabunnyServer();
    fixture = loadFixtureBlob();
  });

  it("reads the fixture metadata", async () => {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(fixture),
    });
    expect(await input.computeDuration()).toBeGreaterThan(2.9);
    expect(await input.getPrimaryAudioTrack()).toBeTruthy();
  });

  it("trims the tail with the fast copy path (no re-encode)", async () => {
    const duration = await convertTrimmed(fixture, {
      end: 1.5,
      start: 0,
    });
    expect(duration).toBeGreaterThan(1.3);
    expect(duration).toBeLessThan(1.7);
  });

  it("trims an arbitrary range through the transcode path", async () => {
    const duration = await convertTrimmed(fixture, {
      end: 2,
      start: 1,
    });
    expect(duration).toBeGreaterThan(0.9);
    expect(duration).toBeLessThan(1.1);
  });
});
