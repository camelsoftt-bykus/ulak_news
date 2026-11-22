"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
};

const categoryInfo: Record<string, { label: string; section: string }> = {
  sincan: { label: "SİNCAN", section: "Yerel Gündem" },
  etimesgut: { label: "ETİMESGUT", section: "Yerel Gündem" },
  ankara: { label: "ANKARA", section: "Ankara" },
  "trt-turkiye": { label: "TÜRKİYE", section: "Türkiye" },
  "bbc-turkce": { label: "TÜRKİYE", section: "Türkiye" },
  "trt-dunya": { label: "DÜNYA", section: "Dünya" },
  tubitak: { label: "BİLİM & TEKNOLOJİ", section: "Bilim ve Uzay" },
  "tubitak-uzay": { label: "BİLİM & UZAY", section: "Bilim ve Uzay" },
  "trt-uzay": { label: "BİLİM & UZAY", section: "Bilim ve Uzay" },
  nasa: { label: "BİLİM & UZAY", section: "Bilim ve Uzay" },
};

const sectionOrder = [
  "Yerel Gündem",
  "Ankara",
  "Türkiye",
  "Dünya",
  "Bilim ve Uzay",
];

function formatDate(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("tr-TR");
}

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/news")
      .then((response) => {
        if (!response.ok) throw new Error("Haberler alınamadı");
        return response.json();
      })
      .then((data) => {
        setNews(Array.isArray(data.news) ? data.news.slice(0, 5) : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="muted">Günün haberleri yükleniyor...</p>;
  }

  if (error) {
    return (
      <p className="muted">
        Haberler şu anda alınamıyor. Lütfen daha sonra tekrar dene.
      </p>
    );
  }

  if (news.length === 0) {
    return (
      <p className="muted">
        Şu anda yayınlanacak yeni haber bulunamadı.
      </p>
    );
  }

  const groupedNews = sectionOrder
    .map((section) => ({
      section,
      items: news.filter(
        (item) => categoryInfo[item.sourceId]?.section === section
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div>
      {groupedNews.map((group) => (
        <section key={group.section} style={{ marginBottom: "32px" }}>
          <h2 style={{ marginBottom: "16px" }}>{group.section}</h2>

          <div className="news-grid">
            {group.items.map((item, index) => (
              <article
                className="news-card"
                key={`${item.sourceId}-${item.link}`}
              >
                <div className="news-card-top">
                  <span className="news-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="news-category">
                    {categoryInfo[item.sourceId]?.label || "GÜNDEM"}
                  </span>
                </div>

                <h3>{item.title}</h3>

                <p>
                  {item.summary || "Kaynakta kısa açıklama bulunmuyor."}
                </p>

                <div className="news-coming">
                  {item.sourceName}
                  {formatDate(item.publishedAt) && (
                    <> · {formatDate(item.publishedAt)}</>
                  )}
                </div>

                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Kaynağı oku →
                </a>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
