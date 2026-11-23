import {
  collectRssNews,
  findCommonsImage
} from "@/lib/rss-reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
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

Aşağıdaki haber kayıtlarından, yaklaşık 90 saniyelik doğal bir Türkçe haber sunumu hazırla.

DOĞRULUK KURALLARI:
- Yalnızca verilen haber kayıtlarındaki bilgileri kullan.
- Yeni olay, kişi, kurum, tarih, sayı veya açıklama uydurma.
- Kaynakta olmayan ayrıntıları tahmin etme.
- Bir iddiayı kesinleşmiş gerçek gibi sunma.
- Bilgi yetersizse bunu açıkça belirt.
- Haberleri tarafsız ve anlaşılır Türkçeyle anlat.
- Haber sayısı kadar stories kaydı oluştur.
- Haber sırasını kesinlikle değiştirme.

HER HABER İÇİN:
- narration: Ahmet'in seslendireceği metin. Başlığı da doğal biçimde anlatıma kat. Yaklaşık 2-3 kısa cümle kullan.
- summary: Haber kartında gösterilecek 2-3 kısa cümle.
- whyImportant: Bu gelişmenin neden önemli olduğunu, yalnızca verilen bilgilerden hareketle 1-2 cümleyle açıkla.
- imageQuery: Wikimedia Commons'ta görsel aramak için İngilizce 2-5 kelimelik ifade.
- imageEntities: Haber başlığında veya açıklamasında AYNEN geçen, görsel aramasında işe yarayabilecek özel isimler.
- imageEntities içine yalnızca haber kaydında gerçekten yazan kişi, kurum, şehir, ülke, yapı veya proje isimlerini koy.
- Haberde geçmeyen özel isimleri kesinlikle ekleme.
- Özel isim yoksa imageEntities boş dizi olsun.
- imageQuery haberin gerçek konusunu tarif etsin.
- Genel ve belirsiz ifadeler yerine somut kavramlar kullan.
- Görsel arama ifadesine haberde bulunmayan kişi veya yer ekleme.
- Uygun bir İngilizce ifade oluşturulamıyorsa imageQuery boş olsun.

YEREL ÖNCELİK:
Sincan, Etimesgut, Ankara, Türkiye, dünya ve bilim/uzay.
Önemli haberleri önceliklendir; önemsiz haberleri sırf sayıyı tamamlamak için büyütme.

SUNUM:
- intro: Kısa selamlama ve günün haberlerine giriş. 1-2 cümle.
- closing: Kısa, doğal kapanış. 1 cümle.
- Her haberin narration metni tek başına seslendirildiğinde doğal duyulmalı.
- Haber metinlerinde "bir sonraki haberimiz" gibi başka habere bağlı ifadeler kullanma.
- Kaynak listesi, URL veya teknik açıklama seslendirme metinlerine ekleme.
- Toplam sunum yaklaşık 90 saniye sürsün. Haber sayısı arttığında her haberin anlatımını kısalt.
- Samimi, güven veren ve akıcı bir haber sunucusu üslubu kullan.

ÇIKTI:
Yalnızca geçerli JSON üret. Markdown veya kod bloğu kullanma.
Aşağıdaki yapıyı aynen uygula:

{
  "intro": "Kısa açılış metni",
  "closing": "Kısa kapanış metni",
  "stories": [
    {
      "index": 1,
      "narration": "Bu haber için seslendirilecek metin",
      "summary": "Haberin kısa özeti",
      "whyImportant": "Neden önemli olduğu",
      "imageQuery": "English visual search phrase",
      "imageEntities": ["Haberde geçen özel isim"]
    }
  ]
}

Her haber için stories listesinde bir kayıt oluştur.
index numarası haber sırasıyla aynı olmalı.
imageEntities her zaman bir dizi olmalı.
narration her zaman dolu bir metin olmalı.

HABER KAYITLARI:
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
              temperature: 0.2,
              maxOutputTokens: 6000,
              responseMimeType: "application/json"
            }
          }),
          signal: AbortSignal.timeout(30000),
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
          geminiStatus: response.status
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
        { error: "Gemini boş yanıt döndürdü." },
        { status: 502 }
      );
    }

    let result: GeneratedResult;

    try {
      result = JSON.parse(generatedText);
    } catch {
      console.error("Gemini JSON yanıtı okunamadı:", generatedText);

      return Response.json(
        { error: "Gemini yanıtı beklenen biçimde oluşturulamadı." },
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

    // Her haberin görseli kendi haber kaydıyla eşleştirilir.
    // Bir görsel aramasının başarısız olması diğer haberleri durdurmaz.
    const enrichedNews = await Promise.all(
      stories.map(async ({ item, story, imageQuery, imageEntities }) => {
        let image:
          | Awaited<ReturnType<typeof findCommonsImage>>
          | null = null;

        if (imageQuery || imageEntities.length > 0) {
          try {
            image = await findCommonsImage(item, {
              imageQuery,
              imageEntities
            });
          } catch (error) {
            console.error(
              `[ULAK görsel] Haber görseli alınamadı: ${item.title}`,
              error
            );
          }
        } else {
          console.log(
            `[ULAK görsel] Arama ifadesi üretilemedi: ${item.title}`
          );
        }

        return {
          ...item,
          ...(image || {}),
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

    // Açılış, her haber ve kapanış ayrı ses parçası olarak döndürülür.
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

    // Ekranda gösterilecek metin seslendirme metinlerinden oluşturulur.
    // Kaynak listesi yalnızca ekranda kalır; speechSegments içine girmez.
    const spokenScript = speechSegments
      .map((segment) => segment.text)
      .join("\n\n");

    const sourceList = news.map((item, index) =>
      `${index + 1}. ${item.sourceName}: ${item.title}\n${item.link}`
    ).join("\n\n");

    const script = `${spokenScript}\n\nKaynaklar:\n${sourceList}`;

    return Response.json(
      {
        count: enrichedNews.length,
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
      { error: "Sunum hazırlanırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
