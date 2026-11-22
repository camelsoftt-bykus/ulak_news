
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function createSpeech(text: string) {
  const tts = new MsEdgeTTS({
    connectionTimeoutMs: 10000,
    synthesisTimeoutMs: 60000,
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

  return Buffer.concat(chunks);
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

// Servis testi: sabit örnek cümle
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
