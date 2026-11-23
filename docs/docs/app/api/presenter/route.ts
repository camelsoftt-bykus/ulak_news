
import {
  collectRssNews,
  findCommonsImage
} from "@/lib/rss-reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeneratedStory = {
  index?: number;
  summary?: string;
  whyImportant?: string;
  imageQuery?: string;
  imageEntities?: string[];
};

function cleanImageQuery(value: unknown): string {
  if (typeof value !== "string") return "";

  const words = value
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);

  // En az iki İngilizce arama kelimesi olmalı.
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

Aşağıdaki haber kayıtlarını kullanarak haber kartları için
ayrı ayrı açıklamalar, görsel arama bilgileri ve yaklaşık
90 saniyelik bir sunucu metni hazırla.

DOĞRULUK KURALLARI:
- Yalnızca verilen haber kayıtlarındaki bilgileri kullan.
- Yeni olay, kişi, kurum, tarih, sayı veya açıklama uydurma.
- Kaynakta olmayan ayrıntıları tahmin etme.
- Bir iddiayı kesinleşmiş gerçek gibi sunma.
- Bilgi yetersizse bunu açıkça belirt.
- Haberleri tarafsız ve anlaşılır Türkçeyle anlat.

HER HABER İÇİN:
- summary: Haberin ne olduğunu anlatan 2-3 kısa cümle.
- whyImportant: Bu gelişmenin neden önemli olduğunu, yalnızca verilen bilgilerden hareketle 1-2 cümleyle açıkla.
- imageQuery: Wikimedia Commons'ta görsel aramak için İngilizce 2-5 kelimelik ifade.
- imageEntities: Haber başlığında veya açıklamasında AYNEN geçen,
  görsel aramasında işe yarayabilecek özel isimler.
- imageEntities içine yalnızca haber kaydında gerçekten yazan
  kişi, kurum, şehir, ülke, yapı veya proje isimlerini koy.
- Haberde geçmeyen özel isimleri kesinlikle ekleme.
- Özel isim yoksa imageEntities boş dizi olsun.
- imageQuery haberin gerçek konusunu tarif etsin.
- Genel ve belirsiz ifadeler yerine somut kavramlar kullan.
- Görsel arama ifadesine haberde bulunmayan kişi veya yer ekleme.
- Uygun bir İngilizce ifade oluşturulamıyorsa imageQuery boş olsun.

YEREL ÖNCELİK:
Sincan, Etimesgut, Ankara, Türkiye, dünya ve bilim/uzay.
Önemli haberleri önceliklendir; önemsiz haberleri sırf sayıyı tamamlamak için büyütme.

SUNUCU METNİ:
- Doğal, akıcı ve düzgün Türkçe kullan.
- Samimi ve güven veren bir haber sunucusu üslubu kullan.
- Yaklaşık 90 saniyelik bir metin hazırla.
- Selamlama ve kısa kapanış ekle.
- Kaynak listesi veya URL yazma.

ÇIKTI:
Yalnızca geçerli JSON üret. Markdown veya kod bloğu kullanma.
Aşağıdaki yapıyı aynen uygula:

{
  "script": "Sunucunun okuyacağı haber metni",
  "stories": [
    {
      "index": 1,
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
              maxOutputTokens: 4000,
              responseMimeType: "application/json"
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

    let result: {
      script?: string;
      stories?: GeneratedStory[];
    };

    try {
      result = JSON.parse(generatedText);
    } catch {
      console.error("Gemini JSON yanıtı okunamadı:", generatedText);

      return Response.json(
        { error: "Gemini yanıtı beklenen biçimde oluşturulamadı." },
        { status: 502 }
      );
    }

    if (
      typeof result.script !== "string" ||
      !Array.isArray(result.stories)
    ) {
      return Response.json(
        { error: "Gemini yanıtında sunum veya haber özetleri eksik." },
        { status: 502 }
      );
    }

    const stories = news.map((item, index) => {
      const story = result.stories?.find(
        (entry) => entry.index === index + 1
      );

      return {
        item,
        story,
        imageQuery: cleanImageQuery(story?.imageQuery),
        imageEntities: cleanImageEntities(story?.imageEntities)
      };
    });

    // Görseller Gemini'nin imageQuery üretmesinden sonra aranır.
    // Her haberin araması ayrı ayrı hata yakalar; bir görsel hatası
    // bütün haber sunumunu durdurmaz.
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

    const sourceList = news.map((item, index) =>
      `${index + 1}. ${item.sourceName}: ${item.title}\n${item.link}`
    ).join("\n\n");

    const script = `${result.script.trim()}\n\nKaynaklar:\n${sourceList}`;

    return Response.json(
      {
        count: enrichedNews.length,
        script,
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
