
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

function isValidNews(item: CollectedNews): boolean {
  return (
    item.title.length > 10 &&
    item.link.startsWith("http") &&
    !item.title.toLowerCase().includes("untitled")
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

      return feed.items.slice(0, 15).map((item) => ({
        sourceId: source.id,
        sourceName: source.name,
        title: cleanText(item.title || ""),
        link: item.link || source.url,
        summary: cleanText(
          item.contentSnippet || item.content || item.summary || ""
        ),
        publishedAt: item.isoDate || item.pubDate || null
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

  return Array.from(uniqueNews.values()).sort((a, b) => {
    const dateA = a.publishedAt
      ? new Date(a.publishedAt).getTime()
      : 0;
    const dateB = b.publishedAt
      ? new Date(b.publishedAt).getTime()
      : 0;

    return dateB - dateA;
  });
}
 
