import { collectRssNews } from "@/lib/rss-reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const news = await collectRssNews();

    return Response.json({
      count: news.length,
      news
    });
  } catch (error) {
    console.error("ULAK haber API hatası:", error);

    return Response.json(
      { error: "Haberler şu anda alınamıyor." },
      { status: 500 }
    );
  }
}
