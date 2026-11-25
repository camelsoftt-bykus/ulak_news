import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { chromium } from "playwright";
import { verifySegments } from "./verify-segments.mjs";

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

  const daily = JSON.parse(fs.readFileSync(DAILY_JSON, "utf8"));

  if (!daily.script || !Array.isArray(daily.news)) {
    throw new Error("Günlük haber verisi eksik veya hatalı.");
  }

  const hasSegments =
    Array.isArray(daily.speechSegments) && daily.speechSegments.length > 0;

  if (hasSegments) {
    await verifySegments({ daily, dataDir: DATA_DIR });
    console.log("Ses WAV doğrulaması başarılı.");
  }

  if (hasSegments) {
    if (daily.news.length > 10 || daily.speechSegments.length !== daily.news.length + 2) {
      throw new Error(
        `Bülten yapısı geçersiz: ${daily.news.length} haber / ${daily.speechSegments.length} ses bölümü. 0-10 haber ve haber sayısı + 2 bölüm gerekli.`
      );
    }

    const expectedSegments = Array.from(
      { length: daily.speechSegments.length },
      (_, index) => `seg-${String(index).padStart(2, "0")}.wav`
    );

    if (
      !Array.isArray(daily.audioSegments) ||
      daily.audioSegments.length !== daily.speechSegments.length ||
      expectedSegments.some((filename, index) => daily.audioSegments[index] !== filename)
    ) {
      throw new Error(
        `Segment sayısı uyuşmuyor: ${daily.speechSegments.length} metin / ${daily.audioSegments?.length ?? 0} ses dosyası.`
      );
    }

    daily.audioSegments.forEach((filename, index) => {
      if (typeof filename !== "string" || !/^seg-\d{2,}\.wav$/.test(filename)) {
        throw new Error(`Geçersiz segment dosya adı: ${filename}`);
      }
      const audioPath = path.join(DATA_DIR, filename);
      if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size === 0) {
        throw new Error(`Segment WAV dosyası eksik veya boş: ${filename} (sıra ${index})`);
      }
    });

    console.log(`Segment doğrulaması: ${daily.speechSegments.length} metin / ${daily.audioSegments.length} WAV`);
  } else if (!fs.existsSync(DAILY_WAV)) {
    throw new Error("Segment verisi yok ve daily.wav yedeği de bulunamadı.");
  }

  const newsForAnimation = daily.news.map((item) => ({
    title: item.title || "",
    summary: item.summary || "",
    whyImportant: item.whyImportant || "",
    link: item.link || "",
    sourceName: item.sourceName || "",
    imageUrl: item.imageUrl || "",
    fallbackImageUrl: item.fallbackImageUrl || "",
    imagePageUrl: item.imagePageUrl || "",
    imageTitle: item.imageTitle || "",
    imageLicense: item.imageLicense || "",
    imageLicenseUrl: item.imageLicenseUrl || "",
    imageArtist: item.imageArtist || "",
    imageCredit: item.imageCredit || "",
    broadcastImageUrl: item.broadcastImageUrl || "",
    broadcastImagePageUrl: item.broadcastImagePageUrl || "",
    broadcastImageTitle: item.broadcastImageTitle || "",
    broadcastImageLicense: item.broadcastImageLicense || "",
    broadcastImageLicenseUrl: item.broadcastImageLicenseUrl || "",
    broadcastImageArtist: item.broadcastImageArtist || "",
    broadcastImageCredit: item.broadcastImageCredit || ""
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

    if (hasSegments) {
      const segmentFiles = new Map(
        daily.audioSegments.map((filename) => [
          filename,
          path.join(DATA_DIR, filename)
        ])
      );

      await page.route("**/__ulak_segments__/*", async (route) => {
        const requestUrl = new URL(route.request().url());
        const filename = path.basename(decodeURIComponent(requestUrl.pathname));
        const localPath = segmentFiles.get(filename);

        if (!localPath) {
          await route.fulfill({
            status: 404,
            contentType: "text/plain",
            body: "Unknown ULAK audio segment"
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "audio/wav",
          body: fs.readFileSync(localPath),
          headers: { "Cache-Control": "no-store" }
        });
      });
    }

    await page.addInitScript(() => {
      window.ULAK_DISABLE_AUTO_NEWS = true;
    });

    await page.goto(ANIMATION_URL, {
      waitUntil: "networkidle",
      timeout: 120000
    });

    await page.waitForSelector("#newsScript");
    await page.waitForSelector("#recBtn");

    console.log("Otomatik haber yüklemesi kapalı; günlük veri doğrudan aktarılıyor...");
    await page.waitForFunction(
      (requireSegments) =>
        typeof window.setULAKNews === "function" &&
        window.ULAK_DISABLE_AUTO_NEWS === true &&
        (!requireSegments || typeof window.ULAK_LOAD_SEGMENTS === "function"),
      hasSegments,
      { timeout: 60000 }
    );

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
    await page.waitForFunction(
      () => window.ULAK_BROADCAST_IMAGES_READY === true,
      null,
      { timeout: 60000 }
    );

    const imageStats = await page.evaluate(() => ({
      loaded: window.ULAK_IMAGE_COUNT || 0,
      broadcast: window.ULAK_BROADCAST_IMAGE_COUNT || 0
    }));
    console.log(
      `Yüklenen haber görseli: ${imageStats.loaded}; tam ekran yayın görseli: ${imageStats.broadcast}`
    );
    if (daily.news.length > 0 && imageStats.broadcast < daily.news.length) {
      throw new Error(
        `Tam ekran yayın görseli eksik: ${imageStats.broadcast}/${daily.news.length}. Görselleri eksik bülten yayımlanmayacak.`
      );
    }

    let audioDuration = 0;

    if (hasSegments) {
      console.log("Hazır WAV segmentleri sayfaya tek tek aktarılıyor...");

      const segmentResult = await page.evaluate(
        ({ speechSegments, audioUrls }) =>
          window.ULAK_LOAD_SEGMENTS({ speechSegments, audioUrls }),
        {
          speechSegments: daily.speechSegments,
          audioUrls: daily.audioSegments.map(
            (filename) => `/__ulak_segments__/${encodeURIComponent(filename)}`
          )
        }
      );

      if (
        segmentResult.audioSourceType !== "segments" ||
        segmentResult.count !== daily.speechSegments.length
      ) {
        throw new Error("Tarayıcı segmentleri eksiksiz yükleyemedi.");
      }

      const browserState = await page.evaluate(() => ({
        source: window.ULAK_AUDIO_SOURCE_TYPE,
        count: window.ULAK_SEGMENT_COUNT
      }));

      if (
        browserState.source !== "segments" ||
        browserState.count !== daily.speechSegments.length
      ) {
        throw new Error(
          `Tarayıcı segment durumu hatalı: ${JSON.stringify(browserState)}`
        );
      }

      console.log(
        `audioSourceType='${browserState.source}', segmentAudioUrls=${browserState.count}`
      );

      for (const filename of daily.audioSegments) {
        const audioPath = path.join(DATA_DIR, filename);
        const { stdout } = await execFileAsync("ffprobe", [
          "-v", "error",
          "-show_entries", "stream=codec_type,codec_name",
          "-show_entries", "format=duration",
          "-of", "json",
          audioPath
        ]);
        let probe;
        try {
          probe = JSON.parse(stdout);
        } catch {
          throw new Error(`WAV ffprobe çıktısı okunamadı: ${filename}`);
        }
        const audioStream = probe.streams?.find(
          (stream) => stream.codec_type === "audio" && stream.codec_name
        );
        const duration = Number(probe.format?.duration);
        if (!audioStream || !Number.isFinite(duration) || duration <= 0) {
          throw new Error(`WAV codec/süre doğrulaması başarısız: ${filename}`);
        }
        audioDuration += duration;
      }

      console.log(
        `Toplam segment ses süresi: ${audioDuration.toFixed(1)} saniye`
      );
    } else {
      console.log("Segment bulunmadı; yedek daily.wav yükleniyor...");
      await page.locator("#audInput").setInputFiles(DAILY_WAV);

      await page.waitForFunction(() => {
        const audio = window.ULAK_AUDIO;
        return document.body.innerText.includes("Ses yüklendi:") &&
          audio && audio.readyState >= 2 &&
          Number.isFinite(audio.duration) && audio.duration > 0;
      }, null, { timeout: 90000 });

      audioDuration = await page.evaluate(() => window.ULAK_AUDIO.duration);
      console.log(`Yedek WAV süresi: ${Math.round(audioDuration)} saniye`);
    }

    const recordButton = page.locator("#recBtn");

    await recordButton.waitFor({
      state: "visible"
    });

    console.log("Robot sunumu kaydediliyor...");

    await recordButton.click();

    await page.waitForFunction(
      () =>
        window.ULAK_AUDIO &&
        !window.ULAK_AUDIO.paused &&
        window.ULAK_AUDIO.currentTime > 0.2,
      null,
      { timeout: 30000 }
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
