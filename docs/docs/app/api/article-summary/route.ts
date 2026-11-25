import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_HTML_BYTES = 1_500_000;
const MAX_SOURCE_CHARS = 28_000;
const MAX_REDIRECTS = 5;
const SUMMARY_MODEL = "gemini-3.5-flash-lite";

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, "");
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19));
  }
  if (isIP(normalized) === 6) {
    return normalized === "::1" || normalized === "::" ||
      normalized.startsWith("fc") || normalized.startsWith("fd") ||
      normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
      normalized.startsWith("fea") || normalized.startsWith("feb");
  }
  return true;
}

async function validatePublicUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Kaynak bağlantısı güvenli değil.");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Yerel ağ adreslerine erişilemiyor.");
  }
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Özel ağ adreslerine erişilemiyor.");
  } else {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
      throw new Error("Kaynak sunucu adresi doğrulanamadı.");
    }
  }
  url.hash = "";
  return url;
}

async function fetchPublicArticle(startUrl: string): Promise<{ html: string; finalUrl: string }> {
  let current = await validatePublicUrl(startUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ULAKNewsBot/1.0; +https://ulaknews-docs.vercel.app)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.6"
      },
      signal: AbortSignal.timeout(18000),
      cache: "no-store"
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || hop === MAX_REDIRECTS) throw new Error("Kaynak yönlendirmesi tamamlanamadı.");
      current = await validatePublicUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Kaynak sayfa HTTP ${response.status} yanıtı verdi.`);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) {
      throw new Error("Kaynak sayfa okunabilir HTML biçiminde değil.");
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_HTML_BYTES) throw new Error("Kaynak sayfa çok büyük.");
    const html = await response.text();
    if (html.length > MAX_HTML_BYTES) throw new Error("Kaynak sayfa çok büyük.");
    return { html, finalUrl: current.toString() };
  }
  throw new Error("Kaynak sayfaya ulaşılamadı.");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)));
}

function stripMarkup(value: string): string {
  return decodeEntities(value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form|button|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/article|\/section)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[\t\u00a0 ]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function extractArticleText(html: string): string {
  const jsonLdBodies: string[] = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      const visit = (node: unknown) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) return node.forEach(visit);
        const record = node as Record<string, unknown>;
        const type = record["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((item) => typeof item === "string" && /Article|Report|News/i.test(item))) {
          if (typeof record.articleBody === "string") jsonLdBodies.push(record.articleBody);
        }
        visit(record["@graph"]);
        visit(record.mainEntity);
      };
      visit(parsed);
    } catch { /* Bozuk JSON-LD atlanır. */ }
  }
  const jsonLdText = jsonLdBodies.map(stripMarkup).filter((text) => text.length > 500).sort((a,b) => b.length-a.length)[0];
  if (jsonLdText) return jsonLdText.slice(0, MAX_SOURCE_CHARS);

  const candidates = [
    ...Array.from(html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi), (match) => stripMarkup(match[1])),
    ...Array.from(html.matchAll(/<(main|div)[^>]+(?:itemprop=["']articleBody["']|class=["'][^"']*(?:article-body|article__body|news-detail|post-content|entry-content|story-body)[^"']*["'])[^>]*>([\s\S]*?)<\/\1>/gi), (match) => stripMarkup(match[2]))
  ].filter((text) => text.length > 500).sort((a,b) => b.length-a.length);
  if (candidates[0]) return candidates[0].slice(0, MAX_SOURCE_CHARS);

  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";
  const fallback = stripMarkup(main || html);
  if (fallback.length < 500) throw new Error("Kaynak sayfada yeterli haber metni bulunamadı.");
  return fallback.slice(0, MAX_SOURCE_CHARS);
}

function cleanSummary(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 9000);
}

export async function GET(request: Request) {
  try {
    const source = new URL(request.url).searchParams.get("url") || "";
    if (!source || source.length > 2048) {
      return Response.json({ error: "Geçerli bir kaynak bağlantısı gerekli." }, { status: 400 });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Response.json({ error: "Özet servisi şu anda kullanılamıyor." }, { status: 503 });

    const { html, finalUrl } = await fetchPublicArticle(source);
    const articleText = extractArticleText(html);
    const titleMatch = html.match(/<meta[^>]+(?:property|name)=["'](?:og:title|twitter:title)["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const sourceTitle = titleMatch?.[1] ? stripMarkup(titleMatch[1]) : "";

    const prompt = `Sen ULAK’TAN HABERLER'in deneyimli haber editörüsün. Aşağıdaki kaynak haber metnini dikkatle oku ve Türkçe, özgün, ayrıntılı bir haber özeti yaz.

KURALLAR:
- Kaynağın cümlelerini kopyalama; bilgileri kendi cümlelerinle yeniden anlat. Doğrudan alıntı üretme.
- Yalnızca kaynakta açıkça bulunan bilgileri kullan. Eksik kişi, kurum, tarih, yer, sayı, neden veya sonuç uydurma.
- Haberin ne olduğunu, nasıl geliştiğini, kimleri/nereleri ilgilendirdiğini, önemli sayı ve açıklamaları, olayın arka planını ve mevcutsa sonraki adımları aktar.
- Kaynakta bulunmayan yorum veya “neden önemli” çıkarımı ekleme.
- Ayrıntılı ama tekrarsız yaz: içerik elveriyorsa 5-7 kısa paragraf, yaklaşık 300-450 kelime. Kaynak kısa ise özeti de kısa tut; sırf uzun olsun diye uzatma.
- Haberin kesinleşmemiş iddialarını iddia olarak belirt; kaynakta atıf varsa kime ait olduğunu koru.
- Reklam, menü, abonelik çağrısı ve sayfa arayüzü metinlerini dikkate alma.
- Yalnızca özet metnini döndür; başlık veya kaynakça ekleme.

HABER BAŞLIĞI: ${sourceTitle || "Belirtilmemiş"}

KAYNAK METNİ:
${articleText}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${SUMMARY_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1800 }
        }),
        signal: AbortSignal.timeout(35000),
        cache: "no-store"
      }
    );
    if (!response.ok) {
      console.error("[ULAK article summary] Gemini HTTP", response.status, (await response.text()).slice(0, 800));
      return Response.json({ error: "Ayrıntılı özet şu anda üretilemedi." }, { status: 502 });
    }
    const data = await response.json();
    const summary = cleanSummary(data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\n"));
    if (summary.length < 180) throw new Error("Üretilen özet yeterli uzunlukta değil.");

    return Response.json(
      { summary, sourceTitle, sourceUrl: finalUrl, extractedCharacters: articleText.length },
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } }
    );
  } catch (error) {
    console.error("[ULAK article summary]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Kaynak haber okunamadı." },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }
}
