
import { collectRssNews } from "@/lib/rss-reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Gemini API anahtarı bulunamadı." },
        { status: 500 }
      );
    }

    const news = await collectRssNews();

    if (news.length === 0) {
      return Response.json(
        { error: "Sunum için haber bulunamadı." },
        { status: 404 }
      );
    }

    const newsText = news.map((item, index) => `
Haber ${index + 1}
Kaynak: ${item.sourceName}
Başlık: ${item.title}
Özet: ${item.summary}
Tarih: ${item.publishedAt || "Belirtilmemiş"}
Bağlantı: ${item.link}
`).join("\n");

    const prompt = `
Sen ULAK adlı Türkçe haber programının sunucususun.

Aşağıdaki haberleri kullanarak yaklaşık 90 saniyelik
doğal, akıcı ve tarafsız bir Türkçe haber sunumu yaz.

Öncelik sırası:
1. Sincan ve Etimesgut
2. Ankara
3. Türkiye
4. Dünya ve siyaset
5. Bilim, teknoloji ve uzay

Kurallar:
- Yalnızca verilen haberlerdeki doğrulanabilir bilgileri kullan.
- Olmayan bilgi veya tarih uydurma.
- Aynı haberi tekrarlama.
- Önemli olmayan ayrıntılarla süreyi doldurma.
- Her haberin neden önemli olduğunu kısaca açıkla.
- Samimi, güven veren ve ölçülü bir erkek sunucu dili kullan.
- Kaynak bağlantılarını metnin sonunda ayrıca listele.
- Haber yoksa haber varmış gibi davranma.

HABERLER:
${newsText}
`;

    
    let response: Response | undefined;

    for (let attempt = 1; attempt <= 2; attempt++) {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 1800
            }
          }),
          signal: AbortSignal.timeout(25000),
          cache: "no-store"
        }
      );

      if (response.ok || response.status !== 503 || attempt === 2) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!response) {
      throw new Error("Gemini yanıt vermedi.");
    }


    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API hatası:", errorText);

      return Response.json(
        {
          error: "Gemini hatası",
          geminiStatus: response.status,
          details: errorText
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    const script = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("\n")
      .trim();

    if (!script) {
      return Response.json(
        { error: "Gemini boş bir sunum metni döndürdü." },
        { status: 502 }
      );
    }

    return Response.json(
      {
        count: news.length,
        script,
        news
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error("ULAK sunucu hatası:", error);

    return Response.json(
      { error: "Sunum hazırlanırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
