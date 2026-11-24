import {
  collectRssNews,
  findCommonsImage
} from "@/lib/rss-reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Haber toplama ve görsel eşleştirme için

type GeneratedStory = {
  index?: number;
  narration?: string;
  summary?: string;
  whyImportant?: string;
  imageQuery?: string;
  imageEntities?: string[];
};

type GeneratedResult = {
  intro?: string;
  closing?: string;
  stories?: GeneratedStory[];
};

function cleanImageQuery(value: unknown): string {
  if (typeof value !== "string") return "";

  const words = value
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);

  if (words.length < 2) return "";

  return words.join(" ");
}

function cleanImageEntities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length >= 3 && item.length <= 80)
    .slice(0, 3);
}

function cleanNarration(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

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
HABER ${index + 1}
Kaynak: ${item.sourceName}
Başlık: ${item.title}
Mevcut açıklama: ${item.summary || "Kaynakta açıklama bulunmuyor."}
Yayın tarihi: ${item.publishedAt || "Belirtilmemiş"}
`).join("\n");

    const prompt = `
Sen ULAK adlı Türkçe haber merkezinin editörüsün.

Aşağıdaki haber kayıtlarından yaklaşık 90 saniyelik doğal bir Türkçe haber sunumu hazırla.

DOĞRULUK:
- Yalnızca verilen haber bilgilerini kullan.
- Olay, kişi, kurum, tarih veya sayı uydurma.
- Haberleri tarafsız ve anlaşılır Türkçeyle anlat.
- Haber sırasını değiştirme.
- Haber sayısı kadar stories kaydı oluştur.

HER HABER İÇİN:
- narration: Ahmet'in seslendireceği 2-3 kısa cümle.
- summary: 2-3 kısa cümlelik haber özeti.
- whyImportant: Neden önemli olduğunu açıkla.
- imageQuery: Haber konusunu somut biçimde anlatan İngilizce 2-5 kelime.
- imageEntities: Yalnızca haberde gerçekten geçen özel isimler.
- Görsel arama ifadesine haberde bulunmayan kişi veya yer ekleme.
- Uygun ifade oluşturulamıyorsa imageQuery boş olsun.

SUNUM:
- intro: Kısa selamlama.
- closing: Kısa kapanış.
- Toplam süre yaklaşık 90 saniye olsun.
- Doğal, samimi ve tarafsız bir sunucu üslubu kullan.
- Kaynak listesi seslendirme metnine eklenmesin.

Yalnızca geçerli JSON üret. Markdown kullanma.

{
  "intro": "Açılış",
  "closing": "Kapanış",
  "stories": [
    {
      "index": 1,
      "narration": "Seslendirilecek haber metni",
      "summary": "Haber özeti",
      "whyImportant": "Önemi",
      "imageQuery": "English visual search phrase",
      "imageEntities": []
    }
  ]
}

HABER KAYITLARI:
${newsText}
`;

    let response: Response | undefined;
    let lastGeminiError = "";

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
              temperature: 0.2,
              maxOutputTokens: 6000,
              responseMimeType: "application/json"
            }
          }),
          signal: AbortSignal.timeout(30000),
          cache: "no-store"
        }
      );

      if (response.ok) break;

      lastGeminiError = await response.text();

      console.error(
        `[ULAK Gemini] Deneme ${attempt}, HTTP ${response.status}:`,
        lastGeminiError
      );

      if (
        ![429, 500, 502, 503, 504].includes(response.status) ||
        attempt === 2
      ) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!response) {
      throw new Error("Gemini yanıt vermedi.");
    }

    if (!response.ok) {
      return Response.json(
        {
          error: "Gemini hatası",
          geminiStatus: response.status,
          detail: lastGeminiError.slice(0, 1500)
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    const generatedText = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("\n")
      .trim();

    if (!generatedText) {
      return Response.json(
        {
          error: "Gemini boş yanıt döndürdü.",
          finishReason: data.candidates?.[0]?.finishReason || "Bilinmiyor",
          promptFeedback: data.promptFeedback || null
        },
        { status: 502 }
      );
    }

    let result: GeneratedResult;

    try {
      result = JSON.parse(generatedText);
    } catch {
      console.error("Gemini JSON yanıtı okunamadı:", generatedText);

      return Response.json(
        {
          error: "Gemini yanıtı beklenen biçimde oluşturulamadı.",
          detail: generatedText.slice(0, 1000)
        },
        { status: 502 }
      );
    }

    if (!Array.isArray(result.stories)) {
      return Response.json(
        { error: "Gemini yanıtında haber listesi eksik." },
        { status: 502 }
      );
    }

    const stories = news.map((item, index) => {
      const story = result.stories?.find(
        (entry) => entry.index === index + 1
      );

      const narration =
        cleanNarration(story?.narration) ||
        cleanNarration(story?.summary) ||
        cleanNarration(item.summary) ||
        item.title;

      return {
        item,
        story,
        narration,
        imageQuery: cleanImageQuery(story?.imageQuery),
        imageEntities: cleanImageEntities(story?.imageEntities)
      };
    });

    const enrichedNews = await Promise.all(
      stories.map(async ({ item, story, imageQuery, imageEntities }) => {
        // Önce haber kaynağının kendi fotoğrafını kullan.
        // Kaynak fotoğrafı varsa Commons araması yapma.
        let image: Awaited<
          ReturnType<typeof findCommonsImage>
        > = null;

        let imageSource = "none";

        if (item.imageUrl) {
          imageSource = "article";
        } else if (imageQuery || imageEntities.length > 0) {
          try {
            image = await findCommonsImage(item, {
              imageQuery,
              imageEntities
            });

            if (image) {
              imageSource = "commons";
            }
          } catch (error) {
            console.error(
              `[ULAK görsel] Haber görseli alınamadı: ${item.title}`,
              error
            );
          }
        }

        const finalImage = image
          ? { ...image, imageSource }
          : item.imageUrl
            ? { imageSource }
            : { imageSource };

        return {
          ...item,
          ...finalImage,
          editorialSummary:
            typeof story?.summary === "string" && story.summary.trim()
              ? story.summary.trim()
              : item.summary || "Bu haber için ayrı özet oluşturulamadı.",
          whyImportant:
            typeof story?.whyImportant === "string" && story.whyImportant.trim()
              ? story.whyImportant.trim()
              : "Kaynakta bu konunun önemi hakkında yeterli açıklama bulunmuyor."
        };
      })
    );

    const intro =
      cleanNarration(result.intro) ||
      "Merhaba, ULAK haber merkezine hoş geldiniz. Günün önemli gelişmeleriyle karşınızdayız.";

    const closing =
      cleanNarration(result.closing) ||
      "Günün gelişmeleri şimdilik bu kadar. Yeniden görüşmek üzere.";

    const speechSegments = [
      {
        type: "intro",
        index: 0,
        text: intro
      },
      ...stories.map((entry, index) => ({
        type: "story",
        index: index + 1,
        text: entry.narration
      })),
      {
        type: "closing",
        index: stories.length + 1,
        text: closing
      }
    ];

    const spokenScript = speechSegments
      .map((segment) => segment.text)
      .join("\n\n");

    const sourceList = news.map((item, index) =>
      `${index + 1}. ${item.sourceName}: ${item.title}\n${item.link}`
    ).join("\n\n");

    const script = `${spokenScript}\n\nKaynaklar:\n${sourceList}`;

    const imageCount = enrichedNews.filter(
      (item) => typeof item.imageUrl === "string" && item.imageUrl.length > 0
    ).length;

    const articleImageCount = enrichedNews.filter(
      (item) => item.imageSource === "article"
    ).length;

    const commonsImageCount = enrichedNews.filter(
      (item) => item.imageSource === "commons"
    ).length;

    return Response.json(
      {
        count: enrichedNews.length,
        imageCount,
        articleImageCount,
        commonsImageCount,
        script,
        speechSegments,
        news: enrichedNews
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
      {
        error: "Sunum hazırlanırken bir hata oluştu.",
        detail: error instanceof Error ? error.message : "Bilinmeyen hata"
      },
      { status: 500 }
    );
  }
}
