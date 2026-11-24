// Daily presenter API; this comment also refreshes the scheduled publishing pipeline.
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

function normalizeArticleLink(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

function normalizeStoryTitle(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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
  return value
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\bwww\.\S+/gi, "")
    .replace(/\b(?:kaynak|link|url)\s*:?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function storySimilarity(a: string, b: string): boolean {
  const ignored = new Set(["icin", "olan", "olarak", "ile", "bir", "bu", "de", "da", "sonra", "yeni", "haber", "gundem", "sincan", "etimesgut"]);
  const words = (value: string) => new Set(
    normalizeStoryTitle(value).split(/\s+/).filter((word) => word.length > 2 && !ignored.has(word))
  );
  const left = words(a);
  const right = words(b);
  if (left.size < 2 || right.size < 2) return false;
  const common = [...left].filter((word) => right.has(word)).length;
  return common >= 2 && common / Math.min(left.size, right.size) >= 0.65;
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

    const now = new Date();
    const istanbulDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now);
    const istanbulHour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Istanbul",
        hour: "2-digit",
        hourCycle: "h23"
      }).format(now)
    );
    const edition = istanbulHour >= 5 && istanbulHour < 14 ? "morning" : "evening";

    const collectedNews = await collectRssNews();

    // Yalnızca aynı takvim günündeki önceki bültenin haberlerini tekrar etme.
    // Böylece akşam sabahı dışlar; ertesi sabah önceki akşamın haberlerine takılmaz.
    let previousLinks = new Set<string>();
    let previousTitles = new Set<string>();
    try {
      const previousResponse = await fetch(
        "https://ulaknews-docs.vercel.app/data/daily.json",
        { cache: "no-store", signal: AbortSignal.timeout(8000) }
      );
      if (previousResponse.ok) {
        const previousDaily = await previousResponse.json();
        const previousGeneratedAt = new Date(previousDaily.generatedAt || "");
        const previousIstanbulDate = Number.isNaN(previousGeneratedAt.getTime())
          ? ""
          : new Intl.DateTimeFormat("en-CA", {
              timeZone: "Europe/Istanbul",
              year: "numeric",
              month: "2-digit",
              day: "2-digit"
            }).format(previousGeneratedAt);
        if (
          previousIstanbulDate === istanbulDate &&
          Array.isArray(previousDaily.news)
        ) {
          previousLinks = new Set(
            previousDaily.news
              .map((item: { link?: string }) => normalizeArticleLink(item.link || ""))
              .filter(Boolean)
          );
          previousTitles = new Set(
            previousDaily.news
              .map((item: { title?: string }) => normalizeStoryTitle(item.title || ""))
              .filter(Boolean)
          );
        }
      }
    } catch (error) {
      console.warn("[ULAK tekrar kontrolü] Önceki bülten okunamadı:", error);
    }

    const filteredNews = collectedNews.filter(
      (item) =>
        !previousLinks.has(normalizeArticleLink(item.link)) &&
        !previousTitles.has(normalizeStoryTitle(item.title))
    );
    // Aynı olay farklı başlıklarla ve farklı kaynaklarda yayımlanmışsa tek haber olarak tut.
    const news = filteredNews.filter((item, index) =>
      !filteredNews.slice(0, index).some((prior) => storySimilarity(item.title, prior.title))
    );

    if (news.length !== 8) {
      return Response.json(
        {
          error: "Tam 8 farklı haber bulunamadığı için bülten üretimi durduruldu.",
          code: "INSUFFICIENT_NEWS",
          requiredNews: 8,
          availableNews: news.length
        },
        { status: 503 }
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
Sen ULAK adlı haber sunucusu ve baş haber editörüsün. Gazetenin adı ULAK’TAN HABERLER.

Aşağıdaki haber kayıtlarından yaklaşık 90 saniyelik doğal bir Türkçe haber sunumu hazırla.

DOĞRULUK:
- Yalnızca verilen haber bilgilerini kullan.
- Olay, kişi, kurum, tarih veya sayı uydurma.
- Haberleri tarafsız, anlaşılır ve insanın konuştuğu doğal Türkçeyle anlat.
- ULAK bir muhabir gibi izleyiciye doğrudan seslensin; robotik, madde okur gibi veya aşırı resmî konuşmasın.
- Haberler arasında gerektiğinde “Şimdi ...”, “Bir başka önemli gelişme ...” gibi kısa ve doğal geçişler kullansın; geçişlerde olmayan bir olay yeri bağlantısı veya canlı yayın izlenimi uydurmasın.
- Başlığı aynen tekrar etme; dinleyiciye olayı kısa bir bağlamla anlat.
- Haber sırasını değiştirme.
- Kaynak adlarını, internet adreslerini, URL'leri, dosya uzantılarını veya teknik bağlantı metinlerini ASLA seslendirme.
- Haber sayısı kadar stories kaydı oluştur.

HER HABER İÇİN:
- narration: ULAK'ın seslendireceği 2-3 kısa, akıcı cümle. Bir televizyon haber sunucusu gibi doğal konuş.
- summary: 2-3 kısa cümlelik haber özeti.
- whyImportant: Neden önemli olduğunu açıkla.
- imageQuery: Haber konusunu somut biçimde anlatan İngilizce 2-5 kelime.
- imageEntities: Yalnızca haberde gerçekten geçen özel isimler.
- Görsel arama ifadesine haberde bulunmayan kişi veya yer ekleme.
- Uygun ifade oluşturulamıyorsa imageQuery boş olsun.

SUNUM:
- intro: Bülten saatine uygun selamlama kullan. Sabah yayınında mutlaka “Günaydın!”, akşam yayınında mutlaka “İyi akşamlar!” diye başla. İzleyiciye doğrudan seslenen, muhabir sıcaklığında kısa bir stüdyo açılışı yaz.
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

      // Kota/rate-limit yanıtında tekrar deneme yapma; her istek kotayı tüketebilir.
      if (
        response.status === 429 ||
        ![500, 502, 503, 504].includes(response.status) ||
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
      const quotaExceeded = response.status === 429;
      return Response.json(
        {
          error: quotaExceeded ? "Gemini kullanım kotası aşıldı." : "Gemini hatası",
          code: quotaExceeded ? "QUOTA_EXCEEDED" : "GEMINI_UPSTREAM_ERROR",
          geminiStatus: response.status,
          detail: lastGeminiError.slice(0, 1500)
        },
        { status: quotaExceeded ? 429 : 502 }
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

    if (
      !Array.isArray(result.stories) ||
      result.stories.length !== 8 ||
      new Set(result.stories.map((story) => story.index)).size !== 8 ||
      !Array.from({ length: 8 }, (_, index) =>
        result.stories?.some((story) => story.index === index + 1)
      ).every(Boolean)
    ) {
      return Response.json(
        {
          error: "Gemini yanıtı tam 8 farklı haber içermiyor; eksik bülten yayınlanmadı.",
          code: "INVALID_STORY_COUNT",
          requiredNews: 8,
          receivedStories: Array.isArray(result.stories) ? result.stories.length : 0
        },
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
        // Kaynak görseli birincil; her haber için ayrıca yedek, lisansı kontrol edilmiş
        // Wikimedia görseli ara. Kaynak görseli tarayıcıda açılamazsa bu yedek kullanılır.
        let commonsImage: Awaited<
          ReturnType<typeof findCommonsImage>
        > = null;

        try {
          commonsImage = await findCommonsImage(item, {
            imageQuery: imageQuery || item.title,
            imageEntities
          });
        } catch (error) {
          console.error(
            `[ULAK görsel] Yedek görsel aranamadı: ${item.title}`,
            error
          );
        }

        const primaryIsArticle = Boolean(item.imageUrl);
        const primaryImage = primaryIsArticle
          ? { imageUrl: item.imageUrl, imageSource: "article" }
          : commonsImage
            ? { ...commonsImage, imageSource: "commons" }
            : { imageSource: "none" };

        return {
          ...item,
          ...primaryImage,
          fallbackImageUrl: primaryIsArticle ? commonsImage?.imageUrl || "" : "",
          fallbackImagePageUrl: primaryIsArticle ? commonsImage?.imagePageUrl || "" : "",
          fallbackImageTitle: primaryIsArticle ? commonsImage?.imageTitle || "" : "",
          fallbackImageLicense: primaryIsArticle ? commonsImage?.imageLicense || "" : "",
          fallbackImageLicenseUrl: primaryIsArticle ? commonsImage?.imageLicenseUrl || "" : "",
          fallbackImageArtist: primaryIsArticle ? commonsImage?.imageArtist || "" : "",
          fallbackImageCredit: primaryIsArticle ? commonsImage?.imageCredit || "" : "",
          // Full-screen broadcast imagery uses only Commons assets whose license was verified.
          broadcastImageUrl: commonsImage?.imageUrl || "",
          broadcastImagePageUrl: commonsImage?.imagePageUrl || "",
          broadcastImageTitle: commonsImage?.imageTitle || "",
          broadcastImageLicense: commonsImage?.imageLicense || "",
          broadcastImageLicenseUrl: commonsImage?.imageLicenseUrl || "",
          broadcastImageArtist: commonsImage?.imageArtist || "",
          broadcastImageCredit: commonsImage?.imageCredit || "",
          editorialSummary:
            typeof story?.summary === "string" && story.summary.trim()
              ? story.summary.trim()
              : item.summary || "Bu haber için özet bulunamadı.",
          whyImportant:
            typeof story?.whyImportant === "string" && story.whyImportant.trim()
              ? story.whyImportant.trim()
              : "Kaynakta bu konunun önemi hakkında yeterli açıklama bulunmuyor."
        };
      })
    );

    // Açılış, bültenin başında hesaplanan Türkiye saati sürümünü kullanır.
    const intro = edition === "morning"
      ? "Günaydın! ULAK’TAN HABERLER başlıyor. Türkiye’den ve dünyadan, güne başlarken bilmeniz gereken gelişmeleri aktarıyoruz."
      : "İyi akşamlar! ULAK’TAN HABERLER başlıyor. Günün öne çıkan gelişmelerini, önemli ayrıntılarıyla birlikte aktarıyoruz.";

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

    // Seslendirme metninde yalnızca sunucunun okuyacağı doğal konuşma bulunur.
    // Kaynaklar haber kartlarında ayrı bağlantılar olarak gösterilir.
    const script = spokenScript;
    const sources = news.map((item) => ({
      sourceName: item.sourceName,
      title: item.title,
      link: item.link
    }));

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
        edition,
        editionDate: istanbulDate,
        imageCount,
        articleImageCount,
        commonsImageCount,
        script,
        sources,
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

// Trigger refreshed daily video rendering after the recording reliability fix.

// Trigger the daily render after exposing the audio element to Playwright.

// Trigger daily render after fixing the audio duration lookup.

// Trigger publishing with the bounded video-recording fallback.

// Trigger publishing with direct browser video-blob capture.

// Trigger publishing after disabling the automatic news refresh during video capture.

// Trigger the final daily run after fixing the recording start and page initialization order.
