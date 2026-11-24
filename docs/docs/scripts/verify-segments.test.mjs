import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { verifySegments } from "./verify-segments.mjs";

const expected = Array.from({ length: 10 }, (_, index) =>
  `seg-${String(index).padStart(2, "0")}.wav`
);

function makeDaily(files = expected) {
  return {
    news: Array.from({ length: 8 }, (_, index) => ({ title: `Haber ${index + 1}` })),
    speechSegments: [
      { type: "intro" },
      ...Array.from({ length: 8 }, () => ({ type: "story" })),
      { type: "closing" }
    ],
    audioSegments: files
  };
}

function makeDirectory(files = expected) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ulak-audio-test-"));
  const sample = path.join(dir, "sample.wav");
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=0.15",
    "-c:a", "pcm_s16le", sample
  ]);
  for (const filename of files) {
    fs.copyFileSync(sample, path.join(dir, filename));
  }
  fs.unlinkSync(sample);
  return dir;
}

test("10 geçerli WAV kabul edilir", async () => {
  const dir = makeDirectory();
  try {
    const result = await verifySegments({ daily: makeDaily(), dataDir: dir });
    assert.deepEqual(result, { newsCount: 8, segmentCount: 10, wavCount: 10 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("9 WAV reddedilir", async () => {
  const files = expected.slice(0, 9);
  const dir = makeDirectory(files);
  try {
    await assert.rejects(
      verifySegments({ daily: makeDaily(files), dataDir: dir })
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("11 WAV reddedilir", async () => {
  const files = [...expected, "seg-10.wav"];
  const dir = makeDirectory(files);
  try {
    await assert.rejects(
      verifySegments({ daily: makeDaily(files), dataDir: dir })
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("bozuk WAV reddedilir", async () => {
  const dir = makeDirectory();
  try {
    fs.writeFileSync(path.join(dir, "seg-04.wav"), "not a wav");
    await assert.rejects(
      verifySegments({ daily: makeDaily(), dataDir: dir })
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
