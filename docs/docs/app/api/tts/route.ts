
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tts = new MsEdgeTTS({
      connectionTimeoutMs: 10000,
      synthesisTimeoutMs: 60000,
    });

    await tts.setMetadata(
      "tr-TR-AhmetNeural",
      OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3
    );

    const { audioStream } = tts.toStream(
      "Merhaba. Ben ULAK. Bugünün haberlerini sizler için hazırladım."
    );

    const chunks: Buffer[] = [];

    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }

    const audio = Buffer.concat(chunks);

    return new Response(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'inline; filename="ulak-ahmet-test.mp3"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ULAK TTS error:", error);

    return Response.json(
      { error: "Ahmet sesi şu anda üretilemedi." },
      { status: 500 }
    );
  }
}
