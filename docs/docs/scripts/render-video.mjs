import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "public", "data");

const DAILY_JSON = path.join(DATA_DIR, "daily.json");
const DAILY_WAV = path.join(DATA_DIR, "daily.wav");
const DAILY_MP4 = path.join(DATA_DIR, "daily.mp4");
const RAW_VIDEO = path.join(DATA_DIR, "daily-raw.webm");
const DAILY_POSTER = path.join(DATA_DIR, "daily-poster.jpg");

const ANIMATION_URL =
  "https://ulaknews-docs.vercel.app/animasyon.html";

const TIMEOUT = 12 * 60 * 1000;

async function main() {
  console.log("ULAK video üretimi başlıyor...");

  if (!fs.existsSync(DAILY_JSON)) {
    throw new Error("daily.json dosyası bulunamadı.");
  }

  if (!fs.existsSync(DAILY_MP3)) {
    throw new Error("daily.mp3 dosyası bulunamadı.");
  }

  const daily = JSON.parse(fs.readFileSync(DAILY_JSON, "utf8"));

  if (!daily.script || !Array.isArray(daily.news)) {
    throw new Error("Günlük haber verisi eksik veya hatalı.");
  }

  const newsForAnimation = daily.news.map((item) => ({
    title: item.title || "",
    summary: item.summary || "",
    whyImportant: item.whyImportant || "",
    link: item.link || "",
    sourceName: item.sourceName || "",
    imageUrl: item.imageUrl || "",
    imagePageUrl: item.imagePageUrl || "",
    imageTitle: item.imageTitle || "",
    imageLicense: item.imageLicense || "",
    imageLicenseUrl: item.imageLicenseUrl || "",
    imageArtist: item.imageArtist || "",
    imageCredit: item.imageCredit || ""
  }));

  console.log(`Haber sayısı: ${newsForAnimation.length}`);
  console.log("Animasyon sayfası açılıyor...");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--autoplay-policy=no-user-gesture-required"
    ]
  });

  try {
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: {
        width: 1280,
        height: 720
      }
    });

    const page = await context.newPage();

    page.setDefaultTimeout(60000);

    page.on("console", (message) => {
      if (message.type() === "error") {
        console.log("Tarayıcı hatası:", message.text());
      }
    });

    page.on("pageerror", (error) => {
      console.log("Sayfa hatası:", error.message);
    });

    await page.goto(ANIMATION_URL, {
      waitUntil: "networkidle",
      timeout: 120000
    });

    await page.waitForSelector("#newsScript");
    await page.waitForSelector("#recBtn");

    console.log("Sayfanın otomatik haber yüklemesi bekleniyor...");
    await page.waitForFunction(() => {
      const status = document.querySelector("#status")?.textContent || "";
      return window.ULAK_IMAGES_READY === true || status.startsWith("Haber servisine ulaşılamadı:");
    }, null, { timeout: 120000 });

    console.log("Haber metni animasyona aktarılıyor...");

    await page.locator("#newsScript").evaluate((element, script) => {
      element.textContent = script;
    }, daily.script);

    await page.waitForFunction(
      () => typeof window.setULAKNews === "function",
      null,
      { timeout: 60000 }
    );

    await page.evaluate((news) => {
      window.setULAKNews(news);
    }, newsForAnimation);

    console.log("Stüdyo görseli ve cam maskesi hazırlanıyor...");
    await page.waitForFunction(
      () => window.ULAK_STUDIO_READY === true,
      null,
      { timeout: 45000 }
    );

    console.log("Haber görselleri yükleniyor...");
    await page.waitForFunction(
      () => window.ULAK_IMAGES_READY === true,
      null,
      { timeout: 60000 }
    );

    const imageStats = await page.evaluate(() => ({
      loaded: window.ULAK_IMAGE_COUNT || 0
    }));
    console.log(`Yüklenen haber görseli: ${imageStats.loaded}`);
    if (imageStats.loaded === 0) {
      throw new Error("Hiçbir haber görseli yüklenmedi; görselsiz video yayınlanmayacak.");
    }

    console.log("Günün haber sunumu ses dosyası yükleniyor...");

    await page.locator("#audInput").setInputFiles(DAILY_WAV);

    await page.waitForFunction(() => {
      const audio = window.ULAK_AUDIO;
      return document.body.innerText.includes("Ses yüklendi:") && audio && audio.readyState >= 2 && Number.isFinite(audio.duration) && audio.duration > 0;
    }, null, { timeout: 90000 });

    const audioDuration = await page.evaluate(() => window.ULAK_AUDIO.duration);
    console.log(`Ahmet ses süresi: ${Math.round(audioDuration)} saniye`);

    const recordButton = page.locator("#recBtn");

    await recordButton.waitFor({
      state: "visible"
    });

    console.log("Robot sunumu kaydediliyor...");

    await recordButton.click();

    await page.waitForFunction(() => {
      const status = document.querySelector("#status")?.textContent || "";
      return status.includes("Kaydediliyor") || status.includes("Kayıt tamamlandı");
    }, null, { timeout: 30000 });

    await page.waitForFunction(
      () => window.ULAK_AUDIO && window.ULAK_AUDIO.currentTime > 1,
      null,
      { timeout: 20000 }
    );

    try {
      await page.waitForFunction(
        () => window.ULAK_AUDIO?.ended === true,
        null,
        { timeout: Math.min(TIMEOUT, Math.max(60000, audioDuration * 1000 + 30000)) }
      );
    } catch (error) {
      const recording = await page.evaluate(() => ({
        status: document.querySelector("#status")?.textContent || "",
        ended: window.ULAK_AUDIO?.ended,
        currentTime: window.ULAK_AUDIO?.currentTime,
        duration: window.ULAK_AUDIO?.duration
      }));
      throw new Error(`Ses tam olarak bitmeden kayıt durdu; eksik video yayınlanmayacak. ${JSON.stringify(recording)}; ${error.message}`);
    }

    await page.waitForFunction(
      () => window.ULAK_VIDEO_BLOB && window.ULAK_VIDEO_BLOB.size > 0,
      null,
      { timeout: 30000 }
    );

    const videoData = await page.evaluate(async () => {
      const blob = window.ULAK_VIDEO_BLOB;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return { type: blob.type, base64: btoa(binary) };
    });
    fs.writeFileSync(RAW_VIDEO, Buffer.from(videoData.base64, "base64"));
    console.log(`Ham video doğrudan alındı: ${videoData.type}`);

    if (!fs.existsSync(RAW_VIDEO) || fs.statSync(RAW_VIDEO).size === 0) {
      throw new Error("Ham video dosyası oluşturulamadı.");
    }

    console.log("Video MP4 formatına dönüştürülüyor...");

    await execFileAsync("ffmpeg", [
      "-y",
      "-i", RAW_VIDEO,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      DAILY_MP4
    ]);

    if (!fs.existsSync(DAILY_MP4) || fs.statSync(DAILY_MP4).size === 0) {
      throw new Error("MP4 video oluşturulamadı.");
    }

    fs.unlinkSync(RAW_VIDEO);

    console.log("ULAK videosu başarıyla oluşturuldu.");

    await execFileAsync("ffmpeg", [
      "-y",
      "-ss", "1",
      "-i", DAILY_MP4,
      "-frames:v", "1",
      "-q:v", "2",
      DAILY_POSTER
    ]);
    if (!fs.existsSync(DAILY_POSTER) || fs.statSync(DAILY_POSTER).size === 0) {
      throw new Error("Günlük video kapak görseli oluşturulamadı.");
    }
    console.log("Günlük video kapak görseli oluşturuldu.");
    console.log(
      `Video boyutu: ${(
        fs.statSync(DAILY_MP4).size / 1024 / 1024
      ).toFixed(2)} MB`
    );

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("ULAK video üretim hatası:", error);
  process.exit(1);
});
