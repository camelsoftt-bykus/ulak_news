
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

      return feed.items.slice(0, 10).map((item) => ({
        sourceId: source.id,
        sourceName: source.name,
        title: item.title?.trim() || "Başlıksız haber",
        link: item.link || source.url,
        summary: item.contentSnippet || item.content || "",
        publishedAt: item.isoDate || item.pubDate || null
      }));
    })
  );

  return results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
}
