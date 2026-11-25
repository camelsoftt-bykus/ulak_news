import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

export async function verifySegments({ daily, dataDir, ffprobePath = "ffprobe" }) {
  if (!Array.isArray(daily?.news) || daily.news.length > 10) {
    throw new Error("0-10 haber gerekli.");
  }
  if (!Array.isArray(daily?.speechSegments) || daily.speechSegments.length !== daily.news.length + 2) {
    throw new Error("Haber sayısı + açılış/kapanış kadar speechSegments gerekli.");
  }

  const types = daily.speechSegments.map((segment) => segment?.type);
  if (
    types[0] !== "intro" ||
    types.slice(1, -1).some((type) => type !== "story") ||
    types[types.length - 1] !== "closing"
  ) {
    throw new Error("Ses bölümleri intro + 8 story + closing sıralamasında değil.");
  }

  const expected = Array.from(
    { length: daily.speechSegments.length },
    (_, index) => `seg-${String(index).padStart(2, "0")}.wav`
  );

  if (
    !Array.isArray(daily.audioSegments) ||
    daily.audioSegments.length !== expected.length ||
    expected.some((filename, index) => daily.audioSegments[index] !== filename)
  ) {
    throw new Error("audioSegments tam olarak seg-00.wav ile seg-09.wav olmalı.");
  }

  const actual = fs.readdirSync(dataDir)
    .filter((filename) => /^seg-\d+\.wav$/.test(filename))
    .sort();
  if (actual.length !== expected.length || expected.some((filename, index) => actual[index] !== filename)) {
    throw new Error(`Diskte ${expected.length} WAV gerekli; bulunan: ${actual.length}.`);
  }

  for (const filename of expected) {
    const audioPath = path.join(dataDir, filename);
    if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size === 0) {
      throw new Error(`WAV dosyası eksik veya boş: ${filename}`);
    }

    const { stdout } = await execFileAsync(ffprobePath, [
      "-v", "error",
      "-show_entries", "stream=codec_type,codec_name",
      "-show_entries", "format=duration",
      "-of", "json",
      audioPath
    ]);
    const probe = JSON.parse(stdout);
    const audioStream = probe.streams?.find(
      (stream) => stream.codec_type === "audio" && stream.codec_name
    );
    const duration = Number(probe.format?.duration);
    if (!audioStream || !Number.isFinite(duration) || duration <= 0) {
      throw new Error(`WAV codec/süre doğrulaması başarısız: ${filename}`);
    }
  }

  return { newsCount: daily.news.length, segmentCount: expected.length, wavCount: expected.length };
}
