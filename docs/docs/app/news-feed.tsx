"use client";

import { useEffect, useState } from "react";

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
  const [speaking, setSpeaking] = useState(false);

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

  function spokenText() {
    return (bulletin?.script || "").split(/\n\s*Kaynaklar:\s*\n/i)[0]
      .replace(/https?:\/\/\S+/gi, "").replace(/\bwww\.\S+/gi, "").trim();
  }

  function toggleSpeaking() {
    if (!("speechSynthesis" in window)) {
      alert("Tarayıcın sesli okumayı desteklemiyor.");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = spokenText();
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 0.94;
    utterance.pitch = 1;
    const voice = window.speechSynthesis.getVoices()
      .find((item) => item.lang.toLowerCase().startsWith("tr"));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
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
        <button type="button" className="primary-button" onClick={toggleSpeaking}>
          {speaking ? "■ Dinlemeyi durdur" : "▶ Haberleri dinle"}
        </button>
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
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.imageTitle || item.title} loading="lazy" style={{ width: "100%", height: 190, objectFit: "cover", display: "block", background: "#eee7dc" }} /> : <div style={{ height: 8, background: "#e7ded1" }} />}
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
                      <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ marginTop: 10, color: "#985d32", fontWeight: 700, fontSize: 13 }}>Haberin devamı →</a>
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
