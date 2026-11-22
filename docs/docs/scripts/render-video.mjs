import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const dataDir = path.join(root, "public", "data");

const jsonPath = path.join(dataDir, "daily.json");
const audioPath = path.join(dataDir, "daily.mp3");
const outputPath = path.join(dataDir, "daily.mp4");

if (!fs.existsSync(jsonPath) || !fs.existsSync(audioPath)) {
  throw new Error("Günlük haber veya MP3 dosyası bulunamadı.");
}

const daily = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

if (!daily.script) {
  throw new Error("Günlük sunum metni bulunamadı.");
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1080 },
    acceptDownloads: true
  });

  page.on("pageerror", error => {
    console.error("Animasyon sayfası hatası:", error.message);
  });

  await page.goto(
    "https://ulaknews-docs.vercel.app/animasyon.html",
    { waitUntil: "domcontentloaded", timeout: 120000 }
  );

  await page.waitForFunction(
    () => document.querySelector("#cv")?.width > 0,
    null,
    { timeout: 120000 }
  );

  await page.locator("#newsScript").evaluate(
    (element, script) => {
      element.textContent = script;
    },
    daily.script
  );

  await page.locator("#audInput").setInputFiles(audioPath);

  await page.waitForFunction(
    () => {
      const audio = document.querySelector("audio");
      return audio && audio.readyState >= 2;
    },
    null,
    { timeout: 120000 }
  );

  const downloadPromise = page.waitForEvent("download", {
    timeout: 300000
  });

  await page.locator("#recBtn").click();

  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  const extension = filename.endsWith(".mp4") ? "mp4" : "webm";
  const rawPath = path.join(dataDir, `daily-raw.${extension}`);

  await download.saveAs(rawPath);

  execFileSync("ffmpeg", [
    "-y",
    "-i", rawPath,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath
  ], { stdio: "inherit" });

  fs.unlinkSync(rawPath);

  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
    throw new Error("MP4 video üretilemedi.");
  }

  console.log("ULAK günlük videosu hazır:", outputPath);

} finally {
  await browser.close();
}
