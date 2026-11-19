
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
      .then((data) => setNews(data.news.slice(0, 5)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="muted">Günün haberleri yükleniyor...</p>;
  }

  if (error) {
    return <p className="muted">Haberler şu anda alınamıyor. Lütfen daha sonra tekrar dene.</p>;
  }

  if (news.length === 0) {
    return <p className="muted">Şu anda yayınlanacak yeni haber bulunamadı.</p>;
  }

  return (
    <div className="news-grid">
      {news.map((item, index) => (
        <article className="news-card" key={`${item.sourceId}-${item.link}`}>
          <div className="news-card-top">
            <span className="news-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="news-category">BİLİM & UZAY</span>
          </div>

          <h3>{item.title}</h3>
          <p>{item.summary || "Kaynakta kısa açıklama bulunmuyor."}</p>

          <div className="news-coming">
            {item.sourceName}
            {item.publishedAt && (
              <> · {new Date(item.publishedAt).toLocaleDateString("tr-TR")}</>
            )}
          </div>

          <a href={item.link} target="_blank" rel="noopener noreferrer">
            Kaynağı oku →
          </a>
        </article>
      ))}
    </div>
  );
}
