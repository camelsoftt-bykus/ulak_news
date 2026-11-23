
import Parser from "rss-parser";
import { newsSources } from "./news-sources";

const parser = new Parser();

export type CollectedNews = {
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
  sourcePriority: number;

  imageUrl?: string;
  imagePageUrl?: string;
  imageTitle?: string;
  imageLicense?: string;
  imageLicenseUrl?: string;
  imageArtist?: string;
  imageCredit?: string;
};

export type SourceStatus = {
  sourceId: string;
  sourceName: string;
  count: number;
  error?: string;
};

type CommonsImage = {
  imageUrl: string;
  imagePageUrl: string;
  imageTitle: string;
  imageLicense: string;
  imageLicenseUrl: string;
  imageArtist: string;
  imageCredit: string;
};

let lastSourceStatus: SourceStatus[] = [];

export function getNewsSourceStatus(): SourceStatus[] {
  return lastSourceStatus;
}

function cleanText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isRoutineAnnouncement(title: string): boolean {
  const patterns = [
    /başvuru(ları|ların| süresi| tarihi)?/i,
    /çağrısı yayınlandı/i,
    /destek programı/i,
    /etkinlik takvimi/i,
    /bilim söyleşileri/i,
    /son başvuru tarihi/i,
    /başvuru süresi uzatıldı/i,
    /bilimfest/i,
    /proje başvuruları/i
  ];

  return patterns.some((pattern) => pattern.test(title));
}

function isValidNews(item: CollectedNews): boolean {
  return (
    item.title.length > 10 &&
    item.link.startsWith("https://") &&
    !item.title.toLowerCase().includes("untitled") &&
    !isRoutineAnnouncement(item.title)
  );
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ULAK-News/1.0)",
      Accept: "text/html,application/xhtml+xml"
    },
    signal: AbortSignal.timeout(12000),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Sayfa isteği başarısız: ${response.status}`);
  }

  return response.text();
}

function getMetaContent(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["']`,
      "i"
    )
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }

  return "";
}

function getArticlePathPattern(sourceId: string): RegExp | null {
  const patterns: Record<string, RegExp> = {
    sincan: /^\/haberler\/[^/]+\/?$/,
    etimesgut: /^\/haber\/[^/]+\/?$/,
    ankara: /^\/haberler\/[^/]+\/?$/
  };

  return patterns[sourceId] ?? null;
}

async function collectPageNews(
  source: (typeof newsSources)[number]
): Promise<CollectedNews[]> {
  if (!source.pageUrl) return [];

  const html = await fetchPage(source.pageUrl);
  const baseUrl = new URL(source.pageUrl);
  const allowedPath = getArticlePathPattern(source.id);

  if (!allowedPath) return [];

  const links = Array.from(
    html.matchAll(
      /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
    )
  );

  const candidates = new Map<string, string>();

  for (const match of links) {
    const rawLink = match[1];
    const linkTitle = cleanText(match[2]);

    try {
      const articleUrl = new URL(rawLink, baseUrl);

      if (articleUrl.hostname !== baseUrl.hostname) continue;
      if (!allowedPath.test(articleUrl.pathname)) continue;
      if (linkTitle.length < 10 || linkTitle.length > 200) continue;

      candidates.set(articleUrl.toString(), linkTitle);
    } catch {
      continue;
    }
  }

  const selected = Array.from(candidates.entries()).slice(0, 12);

  const articles = await Promise.allSettled(
    selected.map(async ([link, linkTitle]) => {
      const articleHtml = await fetchPage(link);

      const title =
        getMetaContent(articleHtml, "og:title") ||
        getMetaContent(articleHtml, "twitter:title") ||
        linkTitle;

      const summary =
        getMetaContent(articleHtml, "og:description") ||
        getMetaContent(articleHtml, "description") ||
        getMetaContent(articleHtml, "twitter:description");

      const publishedAt =
        getMetaContent(articleHtml, "article:published_time") ||
        null;

      return {
        sourceId: source.id,
        sourceName: source.name,
        title,
        link,
        summary,
        publishedAt,
        sourcePriority: source.priority
      } satisfies CollectedNews;
    })
  );

  return articles.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
}

async function collectRssSource(
  source: (typeof newsSources)[number]
): Promise<CollectedNews[]> {
  if (!source.rssUrl) return [];

  const response = await fetch(source.rssUrl, {
    headers: {
      "User-Agent": "ULAK-News/1.0",
      Accept: "application/rss+xml, application/xml, text/xml"
    },
    signal: AbortSignal.timeout(12000),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`${source.name}: RSS hatası (${response.status})`);
  }

  const xml = await response.text();
  const feed = await parser.parseString(xml);

  return feed.items.slice(0, 20).map((item) => ({
    sourceId: source.id,
    sourceName: source.name,
    title: cleanText(item.title || ""),
    link: item.link || source.url,
    summary: cleanText(
      item.contentSnippet || item.content || item.summary || ""
    ),
    publishedAt: item.isoDate || item.pubDate || null,
    sourcePriority: source.priority
  }));
}

// WIKIMEDIA COMMONS GÖRSEL ARAMA

function normalizeWords(value: string): string[] {
  const stopWords = new Set([
    "ve", "ile", "icin", "olan", "olarak", "bir", "bu",
    "da", "de", "son", "yeni", "daha", "hakkinda",
    "aciklama", "haber", "haberleri", "gundem"
  ]);

  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !stopWords.has(word));
}

function getMetadata(
  metadata: Record<string, { value?: string }> | undefined,
  key: string
): string {
  return cleanText(metadata?.[key]?.value || "");
}

function isAllowedLicense(name: string, copyrighted: string): boolean {
  const license = name.toLowerCase();

  if (copyrighted.toLowerCase() === "false") return true;

  return (
    /cc0|public domain|public domain mark/.test(license) ||
    /cc by 4\.0/.test(license) ||
    /cc by 3\.0/.test(license) ||
    /cc by 2\.0/.test(license) ||
    /cc by 1\.0/.test(license)
  );
}

async function findCommonsImage(
  news: CollectedNews
): Promise<CommonsImage | null> {
  try {
    const keywords = normalizeWords(
      `${news.title} ${news.summary}`
    ).slice(0, 7);

    if (keywords.length < 2) return null;

    const searchText = keywords.join(" ");

    const searchUrl = new URL(
      "https://commons.wikimedia.org/w/api.php"
    );

    searchUrl.search = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: searchText,
      gsrnamespace: "6",
      gsrlimit: "8",
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata",
      iiurlwidth: "1400",
      iiextmetadatalanguage: "en"
    }).toString();

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "ULAK-News/1.0 (news image attribution)"
      },
      signal: AbortSignal.timeout(12000),
      cache: "no-store"
    });

    if (!response.ok) return null;

    const data = await response.json();

    const pages = Object.values(
      data.query?.pages || {}
    ) as {
      title: string;
      imageinfo?: {
        thumburl?: string;
        url?: string;
        mime?: string;
        extmetadata?: Record<string, { value?: string }>;
      }[];
    }[];

    let bestImage: CommonsImage | null = null;
    let bestScore = 0;

    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info) continue;

      const imageUrl = info.thumburl || info.url || "";

      if (!imageUrl.startsWith("https://upload.wikimedia.org/")) {
        continue;
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(info.mime || "")) {
        continue;
      }

      const metadata = info.extmetadata;

      const license = getMetadata(metadata, "LicenseShortName");
      const copyrighted = getMetadata(metadata, "Copyrighted");

      if (!isAllowedLicense(license, copyrighted)) continue;

      const description =
        getMetadata(metadata, "ImageDescription");

      const searchableText = normalizeWords(
        `${page.title} ${description}`
      );

      const matchedWords = keywords.filter((word) =>
        searchableText.includes(word)
      );

      const score = matchedWords.length;

      // En az iki anlamlı kelime eşleşmesi gerekli.
      if (score < 2 || score <= bestScore) continue;

      const fileName = page.title.replace(/^File:/, "");

      const attribution =
        getMetadata(metadata, "Attribution");

      const artist =
        attribution ||
        getMetadata(metadata, "Artist") ||
        getMetadata(metadata, "Credit") ||
        "Belirtilmemiş";

      const credit = getMetadata(metadata, "Credit");

      bestScore = score;

      bestImage = {
        imageUrl,
        imagePageUrl:
          "https://commons.wikimedia.org/wiki/" +
          encodeURIComponent(page.title.replace(/ /g, "_")),
        imageTitle: fileName,
        imageLicense: license || "Public domain",
        imageLicenseUrl: getMetadata(metadata, "LicenseUrl"),
        imageArtist: artist,
        imageCredit: credit
      };
    }

    return bestImage;
  } catch (error) {
    console.error(
      "ULAK Commons görsel arama hatası:",
      error
    );

    return null;
  }
}

function balanceSources(items: CollectedNews[]): CollectedNews[] {
  const regions = ["local", "ankara", "turkey", "world", "science"] as const;

  const selected: CollectedNews[] = [];
  const usedLinks = new Set<string>();

  for (const region of regions) {
    const sourceIds = newsSources
      .filter((source) => source.enabled && source.region === region)
      .map((source) => source.id);

    const candidate = items
      .filter((item) => sourceIds.includes(item.sourceId))
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      })[0];

    if (candidate && !usedLinks.has(candidate.link)) {
      selected.push(candidate);
      usedLinks.add(candidate.link);
    }

    if (selected.length === 5) return selected;
  }

  const remaining = items
    .filter((item) => !usedLinks.has(item.link))
    .sort((a, b) => {
      if (a.sourcePriority !== b.sourcePriority) {
        return a.sourcePriority - b.sourcePriority;
      }

      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

  for (const item of remaining) {
    if (selected.length >= 5) break;
    selected.push(item);
    usedLinks.add(item.link);
  }

  return selected;
}

export async function collectRssNews(): Promise<CollectedNews[]> {
  const sources = newsSources.filter((source) => source.enabled);

  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        const items = source.rssUrl
          ? await collectRssSource(source)
          : await collectPageNews(source);

        return {
          items,
          status: {
            sourceId: source.id,
            sourceName: source.name,
            count: items.length
          } satisfies SourceStatus
        };
      } catch (error) {
        return {
          items: [],
          status: {
            sourceId: source.id,
            sourceName: source.name,
            count: 0,
            error: error instanceof Error ? error.message : "Bilinmeyen hata"
          } satisfies SourceStatus
        };
      }
    })
  );

  lastSourceStatus = results.map((result) => result.status);

  const collected = results.flatMap((result) => result.items);
  const uniqueNews = new Map<string, CollectedNews>();

  for (const item of collected) {
    if (!isValidNews(item)) continue;

    const key = item.link.replace(/\/$/, "").toLowerCase();

    if (!uniqueNews.has(key)) {
      uniqueNews.set(key, item);
    }
  }

  const selected = balanceSources(
    Array.from(uniqueNews.values())
  );

  // Görseller yalnızca seçilmiş haberler için aranır.
  const enriched = await Promise.all(
    selected.map(async (item) => {
      const image = await findCommonsImage(item);

      return image
        ? { ...item, ...image }
        : item;
    })
  );

  return enriched;
}
