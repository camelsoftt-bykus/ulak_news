"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type NewsItem = {
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  summary: string;
  editorialSummary?: string;
  whyImportant?: string;
  publishedAt: string | null;
  imageUrl?: string;
  imageTitle?: string;
  fallbackImageUrl?: string;
  fallbackImageTitle?: string;
};

type DailyBulletin = {
  count: number;
  script: string;
  news: NewsItem[];
  generatedAt?: string;
};

const categoryInfo: Record<string, { label: string; section: string }> = {
  sincan: { label: "SİNCAN", section: "Yerel Gündem" },
  etimesgut: { label: "ETİMESGUT", section: "Yerel Gündem" },
  "google-sincan": { label: "SİNCAN & ETİMESGUT", section: "Yerel Gündem" },
  ankara: { label: "ANKARA", section: "Ankara" },
  "google-ankara": { label: "ANKARA", section: "Ankara" },
  "trt-turkiye": { label: "TÜRKİYE", section: "Türkiye" },
  "aa-guncel": { label: "TÜRKİYE", section: "Türkiye" },
  "bbc-turkce": { label: "TÜRKİYE", section: "Türkiye" },
  "trt-dunya": { label: "DÜNYA", section: "Dünya" },
  "aa-dunya": { label: "DÜNYA", section: "Dünya" },
  "bbc-dunya": { label: "DÜNYA", section: "Dünya" },
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

function makeStorySlug(item: NewsItem): string {
  const title = item.title.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `${title}-${item.sourceId}`;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("tr-TR");
}

function formatGeneratedAt(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul", dateStyle: "long", timeStyle: "short",
  });
}

function uniqueStories(items: NewsItem[]): NewsItem[] {
  const ignored = new Set(["icin", "olan", "olarak", "ile", "bir", "bu", "de", "da", "sonra", "yeni", "haber", "gundem", "sincan", "etimesgut"]);
  const kept: NewsItem[] = [];
  for (const item of items) {
    const words = new Set(item.title.toLocaleLowerCase("tr-TR")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i")
      .split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !ignored.has(word)));
    const duplicate = kept.some((prior) => {
      const priorWords = new Set(prior.title.toLocaleLowerCase("tr-TR")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i")
        .split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !ignored.has(word)));
      const common = [...words].filter((word) => priorWords.has(word)).length;
      return common >= 2 && common / Math.max(1, Math.min(words.size, priorWords.size)) >= 0.65;
    });
    if (!duplicate) kept.push(item);
  }
  return kept;
}

export default function NewsFeed() {
  const [bulletin, setBulletin] = useState<DailyBulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadBulletin() {
      try {
        const response = await fetch("/data/daily.json?t=" + Date.now(), { cache: "no-store" });
        if (!response.ok) throw new Error("Günlük haberler alınamadı.");
        const data = await response.json();
        if (!Array.isArray(data.news)) throw new Error("Haber listesi geçersiz.");
        if (active) setBulletin(data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadBulletin();
    return () => { active = false; };
  }, []);

  if (loading) return <p className="muted">ULAK’TAN HABERLER hazırlanıyor...</p>;
  if (error || !bulletin) return <p className="muted">Haberler şu anda yüklenemiyor. Lütfen biraz sonra yeniden dene.</p>;

  const stories = uniqueStories(bulletin.news);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderBottom: "1px solid #cfc5b7", paddingBottom: 12, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#986033", fontWeight: 800 }}>SON GELİŞMELER</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 22, marginTop: 4 }}>Bugünün manşetleri</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{formatGeneratedAt(bulletin.generatedAt)} · {stories.length} haber</div>
        </div>
      </div>

      {sections.map((section) => {
        const items = stories.filter((item) => categoryInfo[item.sourceId]?.section === section.name);
        return (
          <section key={section.id} style={{ marginBottom: 34 }}>
            <h2 id={section.id} style={{ fontFamily: "Georgia, serif", fontSize: 27, borderBottom: "2px solid #3b352e", paddingBottom: 9, marginBottom: 16, scrollMarginTop: 90 }}>{section.name}</h2>
            {items.length === 0 ? <p className="muted">Bu bölümde bugün yeni bir haber bulunmuyor.</p> : (
              <div className="news-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                {items.map((item, index) => (
                  <article key={item.sourceId + "-" + item.link} className="news-card" style={{ padding: 0, overflow: "hidden", borderRadius: 8, borderColor: "#d9d0c4", background: "#fffdf8" }}>
                    {item.imageUrl ? <img src={"/api/news-image?url=" + encodeURIComponent(item.imageUrl)} alt={item.imageTitle || item.title} loading="lazy" referrerPolicy="no-referrer" onError={(event) => {
                      const image = event.currentTarget;
                      if (item.fallbackImageUrl && image.dataset.fallback !== "used") {
                        image.dataset.fallback = "used";
                        image.src = "/api/news-image?url=" + encodeURIComponent(item.fallbackImageUrl);
                        image.alt = item.fallbackImageTitle || item.title;
                      } else {
                        image.style.display = "none";
                        const fallback = image.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }
                    }} style={{ width: "100%", height: 190, objectFit: "cover", display: "block", background: "#eee7dc" }} /> : null}
                    <div style={{ height: 190, display: item.imageUrl ? "none" : "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", color: "#756d63", background: "linear-gradient(135deg,#eee7dc,#d9cbb8)", fontFamily: "Georgia,serif", fontSize: 18 }}>{item.title}</div>
                    <div style={{ padding: 18, display: "flex", flexDirection: "column", flex: 1 }}>
                      <div className="news-card-top">
                        <span className="news-number">{String(index + 1).padStart(2, "0")}</span>
                        <span className="news-category">{categoryInfo[item.sourceId]?.label || "GÜNDEM"}</span>
                      </div>
                      <h3 style={{ fontFamily: "Georgia, serif", fontSize: 21, lineHeight: 1.3, margin: "14px 0 5px" }}>{item.title}</h3>
                      <div style={{ marginTop: 12 }}>
                        <strong style={{ fontSize: 11, color: "#986033", textTransform: "uppercase", letterSpacing: 1 }}>Haberin özeti</strong>
                        <p style={{ marginTop: 6 }}>{item.editorialSummary || item.summary || "Bu haber için özet bulunmuyor."}</p>
                      </div>
                      {item.whyImportant && <div style={{ marginTop: 10, padding: 12, background: "#f5efe5", borderLeft: "3px solid #bd8958" }}>
                        <strong style={{ fontSize: 12 }}>Neden önemli?</strong>
                        <p style={{ margin: "5px 0 0" }}>{item.whyImportant}</p>
                      </div>}
                      <div className="news-coming" style={{ marginTop: "auto", paddingTop: 16 }}>
                        {item.sourceName}{formatDate(item.publishedAt) ? " · " + formatDate(item.publishedAt) : ""}
                      </div>
                      <Link href={`/haber/${encodeURIComponent(makeStorySlug(item))}`} style={{ marginTop: 10, color: "#985d32", fontWeight: 700, fontSize: 13 }}>ULAK’ta haberi oku →</Link>
                    </div>
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
