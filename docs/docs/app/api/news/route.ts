import {
  collectRssNews,
  getNewsSourceStatus
} from "@/lib/rss-reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const news = await collectRssNews();
    const sources = getNewsSourceStatus();

    return Response.json({
      count: news.length,
      news,
      sources
    });
  } catch (error) {
    console.error("ULAK haber API hatası:", error);

    return Response.json(
      { error: "Haberler şu anda alınamıyor." },
      { status: 500 }
    );
  }
}
 
