
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHUNK_LENGTH = 2500;
const MAX_RETRIES = 3;

function splitText(text: string): string[] {
  const remaining = text.trim();
  const chunks: string[] = [];
  let rest = remaining;

  while (rest.length > MAX_CHUNK_LENGTH) {
    const window = rest.slice(0, MAX_CHUNK_LENGTH + 1);

    // Önce cümle sonundan bölmeye çalış.
    const sentenceBreaks = [
      window.lastIndexOf(". "),
      window.lastIndexOf("? "),
      window.lastIndexOf("! "),
      window.lastIndexOf("\n"),
    ];

    let cutAt = Math.max(...sentenceBreaks);

    // Uygun cümle sonu yoksa kelime aralığından böl.
    if (cutAt < MAX_CHUNK_LENGTH * 0.5) {
      cutAt = window.lastIndexOf(" ");
    }

    if (cutAt <= 0) {
      cutAt = MAX_CHUNK_LENGTH;
    }

    chunks.push(rest.slice(0, cutAt).trim());
    rest = rest.slice(cutAt).trim();
  }

  if (rest) {
    chunks.push(rest);
  }

  return chunks.filter(Boolean);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesizeChunk(text: string): Promise<Buffer> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tts = new MsEdgeTTS({
        connectionTimeoutMs: 15000,
        synthesisTimeoutMs: 90000,
      });

      await tts.setMetadata(
        "tr-TR-AhmetNeural",
        OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3
      );

      const { audioStream } = tts.toStream(text);
      const chunks: Buffer[] = [];

      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }

      const audio = Buffer.concat(chunks);

      if (audio.length === 0) {
        throw new Error("Ses hizmeti boş ses dosyası döndürdü.");
      }

      return audio;
    } catch (error) {
      lastError = error;

      console.error(
        `ULAK TTS denemesi ${attempt}/${MAX_RETRIES} başarısız:`,
        error
      );

      if (attempt < MAX_RETRIES) {
        await wait(attempt * 1500);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Ses üretimi tamamlanamadı.");
}

async function createSpeech(text: string): Promise<Buffer> {
  const chunks = splitText(text);
  const audioParts: Buffer[] = [];

  console.log(`ULAK TTS: ${chunks.length} ses parçası üretilecek.`);

  for (let i = 0; i < chunks.length; i++) {
    console.log(
      `ULAK TTS: ${i + 1}/${chunks.length} parça seslendiriliyor.`
    );

    const audio = await synthesizeChunk(chunks[i]);
    audioParts.push(audio);
  }

  return Buffer.concat(audioParts);
}

function audioResponse(audio: Buffer) {
  return new Response(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'inline; filename="ulak-ahmet.mp3"',
      "Cache-Control": "no-store",
    },
  });
}

// Servis testi
export async function GET() {
  try {
    const audio = await createSpeech(
      "Merhaba. Ben ULAK. Bugünün haberlerini sizler için hazırladım."
    );

    return audioResponse(audio);
  } catch (error) {
    console.error("ULAK TTS error:", error);

    return Response.json(
      { error: "Ahmet sesi şu anda üretilemedi." },
      { status: 500 }
    );
  }
}

// Günlük haber metnini sese dönüştür
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return Response.json(
        { error: "Seslendirilecek metin gönderilmedi." },
        { status: 400 }
      );
    }

    if (text.length > 15000) {
      return Response.json(
        { error: "Metin çok uzun. Lütfen daha kısa bir sunum gönderin." },
        { status: 413 }
      );
    }

    const audio = await createSpeech(text);

    return audioResponse(audio);
  } catch (error) {
    console.error("ULAK TTS error:", error);

    return Response.json(
      { error: "Ahmet sesi şu anda üretilemedi." },
      { status: 500 }
    );
  }
}
