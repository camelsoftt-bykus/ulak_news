
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
};

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
      "User-Agent": "ULAK-News/1.0"
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

function balanceSources(items: CollectedNews[]): CollectedNews[] {
  const groups = new Map<string, CollectedNews[]>();

  for (const item of items) {
    const group = groups.get(item.sourceId) || [];
    group.push(item);
    groups.set(item.sourceId, group);
  }

  const orderedGroups = Array.from(groups.values()).map((group) =>
    group.sort((a, b) => {
      const dateA = a.publishedAt
        ? new Date(a.publishedAt).getTime()
        : 0;
      const dateB = b.publishedAt
        ? new Date(b.publishedAt).getTime()
        : 0;

      return dateB - dateA;
    })
  );

  orderedGroups.sort(
    (a, b) => a[0].sourcePriority - b[0].sourcePriority
  );

  const balanced: CollectedNews[] = [];
  let index = 0;

  while (balanced.length < 5) {
    let added = false;

    for (const group of orderedGroups) {
      if (group[index]) {
        balanced.push(group[index]);
        added = true;

        if (balanced.length === 5) break;
      }
    }

    if (!added) break;
    index++;
  }

  return balanced;
}

export async function collectRssNews(): Promise<CollectedNews[]> {
  const sources = newsSources.filter((source) => source.enabled);

  const results = await Promise.allSettled(
    sources.map((source) =>
      source.rssUrl
        ? collectRssSource(source)
        : collectPageNews(source)
    )
  );

  const collected = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  const uniqueNews = new Map<string, CollectedNews>();

  for (const item of collected) {
    if (!isValidNews(item)) continue;

    const key = item.link.replace(/\/$/, "").toLowerCase();

    if (!uniqueNews.has(key)) {
      uniqueNews.set(key, item);
    }
  }

  return balanceSources(Array.from(uniqueNews.values()));
}
