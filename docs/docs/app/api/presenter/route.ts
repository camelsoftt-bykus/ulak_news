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
HABER KAYDI ${index + 1}
Kaynak: ${item.sourceName}
Başlık: ${item.title}
Özet: ${item.summary || "Kaynakta açıklama bulunmuyor."}
Yayın tarihi: ${item.publishedAt || "Belirtilmemiş"}
Bölge önceliği: ${item.sourcePriority}
`).join("\n");

    const prompt = `
GÖREVİN:

Sen ULAK adlı Türkçe haber bülteninin profesyonel sunucususun.
Verilen haber kayıtlarından yaklaşık 90 saniyelik, doğal,
akıcı ve tarafsız bir Türkçe haber sunumu hazırla.

ÇOK ÖNEMLİ DOĞRULUK KURALLARI:

1. Yalnızca aşağıda verilen haber kayıtlarındaki bilgileri kullan.
2. Haber kayıtlarında bulunmayan hiçbir olaydan söz etme.
3. Yeni haber, kişi, kurum, açıklama, sayı, tarih veya yer uydurma.
4. Bir haberin özetinde bulunmayan ayrıntıları tahmin ederek tamamlama.
5. Bir haberin başlığı ve özeti çelişiyorsa iddiayı kesin bilgi gibi sunma.
6. Kaynağın söylediği bir iddiayı doğrulanmış gerçek gibi anlatma.
   Gerektiğinde "kaynak tarafından bildirildi" şeklinde ifade et.
7. Aynı olayı farklı cümlelerle tekrar etme.
8. Haber sayısı azsa süreyi doldurmak için yeni bilgi üretme.
9. Yalnızca önemli ve anlamlı gelişmeleri seç.
10. Kaynakta olmayan neden-sonuç ilişkileri kurma.

YEREL ÖNCELİK:

1. Sincan
2. Etimesgut
3. Ankara
4. Türkiye
5. Dünya ve siyaset
6. Bilim, teknoloji ve uzay

Birden fazla önemli haber varsa bu öncelik sırasını dikkate al.
Ancak öncelik uğruna önemsiz bir haberi önemliymiş gibi sunma.

SUNUM DİLİ:

- Yalnızca doğal ve düzgün Türkçe kullan.
- Türkçe karakterleri doğru yaz: ç, ğ, ı, İ, ö, ş, ü.
- Bozuk, yabancı dilli veya anlamsız kelime kullanma.
- Samimi, güven veren, ölçülü bir erkek haber sunucusu dili kullan.
- Abartılı, sansasyonel veya taraflı ifadeler kullanma.
- Haberleri kısa ve anlaşılır cümlelerle anlat.
- Her haberin önemini yalnızca verilen bilgilerden hareketle açıkla.
- Yaklaşık 90 saniyelik bir metin hazırla.
- Selamlama ve kısa kapanış ekle.

ÇIKTI KURALLARI:

- Yalnızca sunucunun okuyacağı haber metnini üret.
- Markdown başlıkları veya kalın yazı işaretleri kullanma.
- Kaynak bağlantısı, kaynak listesi veya URL üretme.
- Haberlerin dışına çıkan yorum ekleme.
- Haber kayıtlarında olmayan bir gelişmeyi kesinlikle ekleme.

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
          geminiStatus: response.status
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    let script = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("\n")
      .trim();

    if (!script) {
      return Response.json(
        { error: "Gemini boş bir sunum metni döndürdü." },
        { status: 502 }
      );
    }

    // Kaynak listesini Gemini'den değil, gerçek haber kayıtlarından oluştur.
    const sourceList = news.map((item, index) =>
      `${index + 1}. ${item.sourceName}: ${item.title}\n${item.link}`
    ).join("\n\n");

    script = `${script}\n\nKaynaklar:\n${sourceList}`;

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
