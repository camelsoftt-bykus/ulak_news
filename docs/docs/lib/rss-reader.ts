
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
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Günlük haber bültenine uygun olmayan rutin duyurular
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
    item.link.startsWith("http") &&
    !item.title.toLowerCase().includes("untitled") &&
    !isRoutineAnnouncement(item.title)
  );
}

export async function collectRssNews(): Promise<CollectedNews[]> {
  const sources = newsSources.filter(
    (source) => source.enabled && source.rssUrl
  );

  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const response = await fetch(source.rssUrl!, {
        headers: {
          "User-Agent": "ULAK-News/1.0"
        },
        signal: AbortSignal.timeout(10000),
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          `${source.name}: RSS isteği başarısız (${response.status})`
        );
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
    })
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

  return Array.from(uniqueNews.values())
    .sort((a, b) => {
      if (a.sourcePriority !== b.sourcePriority) {
        return a.sourcePriority - b.sourcePriority;
      }

      const dateA = a.publishedAt
        ? new Date(a.publishedAt).getTime()
        : 0;
      const dateB = b.publishedAt
        ? new Date(b.publishedAt).getTime()
        : 0;

      return dateB - dateA;
    })
    .slice(0, 5);
}
