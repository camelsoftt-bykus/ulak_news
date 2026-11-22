
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

const sections = [
  { name: "Yerel Gündem", id: "yerel-gundem" },
  { name: "Ankara", id: "ankara" },
  { name: "Türkiye", id: "turkiye" },
  { name: "Dünya", id: "dunya" },
  { name: "Bilim ve Uzay", id: "bilim-ve-uzay" },
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

  return (
    <div>
      {sections.map((section) => {
        const items = news.filter(
          (item) => categoryInfo[item.sourceId]?.section === section.name
        );

        return (
          <section
            id={section.id}
            key={section.id}
            style={{
              marginBottom: "32px",
              scrollMarginTop: "90px",
            }}
          >
            <h2 style={{ marginBottom: "16px" }}>{section.name}</h2>

            {items.length === 0 ? (
              <p className="muted">
                Şu anda bu kategoride yayınlanacak yeni haber bulunamadı.
              </p>
            ) : (
              <div className="news-grid">
                {items.map((item, index) => (
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
            )}
          </section>
        );
      })}
    </div>
  );
}
