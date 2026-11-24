export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = "gemini-3.8-flash-tts";
const VOICE = "Charon";
const MAX_TEXT_LENGTH = 15000;

async function synthesize(text: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API anahtarı bulunamadı.");

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{
        type: "user_input",
        content: [{
          type: "text",
          text,
          annotations: [{
            type: "speech_metadata",
            style: "Professional Turkish television news presenter. Speak fluent, natural standard Turkish with a warm, confident and composed broadcast voice. Clear diction, measured pace, subtle pauses between stories. Sound human and engaging, never robotic or exaggerated. Read the text exactly as written.",
          }],
        }],
      }],
      response_format: { type: "audio" },
      generation_config: {
        speech_config: [{ voice: VOICE }],
      },
    }),
    signal: AbortSignal.timeout(105000),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[ULAK Gemini TTS]", response.status, detail.slice(0, 2000));
    throw new Error(`Gemini ses servisi HTTP ${response.status}`);
  }

  const result = await response.json();
  const audioData =
    result.output_audio?.data ||
    result.steps?.flatMap((step: { content?: Array<{ type?: string; data?: string }> }) => step.content || [])
      .filter((part: { type?: string; data?: string }) => part.type === "audio" && part.data)
      .at(-1)?.data;

  if (!audioData) {
    console.error("[ULAK Gemini TTS] Ses verisi bulunamadı:", JSON.stringify(result).slice(0, 1500));
    throw new Error("Gemini ses verisi döndürmedi.");
  }

  const audio = Buffer.from(audioData, "base64");
  if (audio.length < 1000 || audio.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("Gemini geçerli WAV ses dosyası döndürmedi.");
  }
  return audio;
}

function audioResponse(audio: Buffer) {
  return new Response(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Disposition": 'inline; filename="ulak-gunun-bulteni.wav"',
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  try {
    return audioResponse(await synthesize(
      "Merhaba. Günün öne çıkan gelişmeleriyle karşınızdayız. ULAK haber bülteni başlıyor."
    ));
  } catch (error) {
    console.error("ULAK TTS test hatası:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Ses üretilemedi." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return Response.json({ error: "Seslendirilecek metin gönderilmedi." }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return Response.json({ error: "Seslendirilecek metin çok uzun." }, { status: 413 });
    }

    return audioResponse(await synthesize(text));
  } catch (error) {
    console.error("ULAK TTS üretim hatası:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Ses üretimi tamamlanamadı." },
      { status: 500 }
    );
  }
}
