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

type ArtworkKind = "snow" | "animal" | "fire" | "space" | "health" | "city" | "science";

function getArtworkKind(item: NewsItem): ArtworkKind {
  const text = (item.title + " " + (item.editorialSummary || item.summary)).toLocaleLowerCase("tr-TR");
  if (/kar|karlı|soğuk|buz|yağış/.test(text)) return "snow";
  if (/aslan|hayvan|yaban|kuş|köpek|kedi/.test(text)) return "animal";
  if (/yangın|alev|duman|patlama|boru hattı/.test(text)) return "fire";
  if (/uzay|nasa|bulutsu|gezegen|yıldız|astronomi/.test(text)) return "space";
  if (/diyabet|sağlık|hastane|doktor|tedavi/.test(text)) return "health";
  if (/belediye|sincan|etimesgut|ankara|ilçe|şehir/.test(text)) return "city";
  return "science";
}

function NewsArtwork({ item }: { item: NewsItem }) {
  const kind = getArtworkKind(item);
  const palettes: Record<ArtworkKind, { bg: string; accent: string; label: string }> = {
    snow: { bg: "#dce9ed", accent: "#477f9a", label: "KIŞ GÜNDEMİ" },
    animal: { bg: "#eee1c9", accent: "#9b6b35", label: "DOĞA" },
    fire: { bg: "#f1d9c8", accent: "#bd572c", label: "SON DAKİKA" },
    space: { bg: "#dce0ed", accent: "#525d91", label: "UZAY" },
    health: { bg: "#dce9dc", accent: "#4e8061", label: "SAĞLIK" },
    city: { bg: "#e8dfd1", accent: "#8a6b48", label: "ŞEHİR" },
    science: { bg: "#e0e5df", accent: "#617c6a", label: "BİLİM" },
  };
  const palette = palettes[kind];
  return (
    <div className={"news-card-art art-" + kind} role="img" aria-label={palette.label + ": " + item.title}>
      <svg viewBox="0 0 320 132" aria-hidden="true">
        <rect width="320" height="132" fill={palette.bg} />
        <circle cx="260" cy="25" r="42" fill={palette.accent} opacity=".10" />
        {kind === "snow" && <g stroke={palette.accent} strokeWidth="4" strokeLinecap="round" fill="none"><path d="M160 25v82M124 46l72 42M196 46l-72 42M145 34l15 12 15-12M145 98l15-12 15 12" /></g>}
        {kind === "animal" && <g><circle cx="160" cy="68" r="48" fill={palette.accent} opacity=".22" /><circle cx="160" cy="68" r="31" fill={palette.accent} /><circle cx="149" cy="62" r="3" fill="#fffaf1" /><circle cx="171" cy="62" r="3" fill="#fffaf1" /><path d="M153 79q7 7 14 0" stroke="#fffaf1" strokeWidth="3" fill="none" strokeLinecap="round"/><path d="M139 45l-10-13 22 6M181 45l10-13-22 6" fill={palette.accent}/></g>}
        {kind === "fire" && <g><path d="M160 108c-38 0-48-27-29-53 2 17 12 18 15 2 3-18 19-29 17-45 27 23 45 55 26 79-7 10-17 17-29 17Z" fill={palette.accent}/><path d="M160 101c-18 0-24-13-14-27 2 9 8 8 10-2 9 11 19 21 4 29Z" fill="#fff1d9"/></g>}
        {kind === "space" && <g fill={palette.accent}><circle cx="160" cy="66" r="30" opacity=".18"/><path d="M160 26l8 28 28 12-28 8-8 30-8-30-28-8 28-12Z"/><circle cx="90" cy="32" r="3"/><circle cx="226" cy="92" r="4"/></g>}
        {kind === "health" && <g><path d="M160 103S91 66 119 37c14-14 31-4 41 10 10-14 27-24 41-10 28 29-41 66-41 66Z" fill={palette.accent}/><path d="M126 68h20l9-15 12 30 9-15h18" fill="none" stroke="#fffaf1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></g>}
        {kind === "city" && <g fill={palette.accent}><path d="M75 105V65h38v40M120 105V39h45v66M173 105V57h32v48M213 105V75h32v30" opacity=".85"/><path d="M139 52h7m-7 14h7m-7 14h7m-7 14h7M88 78h8m-8 12h8m-8 12h8M184 70h8m-8 12h8" stroke="#fffaf1" strokeWidth="3"/></g>}
        {kind === "science" && <g fill="none" stroke={palette.accent} strokeWidth="4"><circle cx="160" cy="66" r="15"/><ellipse cx="160" cy="66" rx="65" ry="24"/><ellipse cx="160" cy="66" rx="65" ry="24" transform="rotate(60 160 66)"/><circle cx="218" cy="43" r="6" fill={palette.accent}/></g>}
      </svg>
      <span>{palette.label}</span>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR");
}

function formatGeneratedAt(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "long",
    timeStyle: "short",
  });
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
        const response = await fetch(
          `/data/daily.json?t=${Date.now()}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Günlük bülten alınamadı.");
        }

        const data = await response.json();

        if (!data.script || !Array.isArray(data.news)) {
          throw new Error("Günlük bülten dosyası geçersiz.");
        }

        if (active) setBulletin(data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBulletin();

    return () => {
      active = false;
    };
  }, []);

  function getSpokenScript() {
    return (bulletin?.script || "")
      .split(/\n\s*Kaynaklar:\s*\n/i)[0]
      .trim();
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

    const text = getSpokenScript();
    if (!text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    const voice = window.speechSynthesis
      .getVoices()
      .find((item) => item.lang.toLowerCase().startsWith("tr"));

    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (loading) {
    return <p className="muted">ULAK'ın günlük bülteni yükleniyor...</p>;
  }

  if (error || !bulletin) {
    return (
      <p className="muted">
        Günlük bülten şu anda yüklenemiyor. Lütfen daha sonra tekrar dene.
      </p>
    );
  }

  const spokenScript = getSpokenScript();

  return (
    <div>
      <section
        style={{
          marginBottom: "36px",
          padding: "24px",
          borderRadius: "18px",
          background: "#fff8ed",
          border: "1px solid #f1dfc5",
        }}
      >
        <div className="eyebrow">ULAK'IN GÜNLÜK SUNUMU</div>

        <h2 style={{ marginTop: "10px", marginBottom: "8px" }}>
          Günün haberlerini Ulak anlatıyor
        </h2>

        <p className="muted">
          {formatGeneratedAt(bulletin.generatedAt)}
          {bulletin.count > 0 && ` · ${bulletin.count} haber`}
        </p>

        <div
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.8,
            marginTop: "20px",
          }}
        >
          {spokenScript}
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={toggleSpeaking}
          style={{ marginTop: "20px" }}
        >
          {speaking ? "■ Dinlemeyi durdur" : "▶ ULAK'ı dinle"}
        </button>
      </section>

      {sections.map((section) => {
        const items = bulletin.news
          .slice(0, 5)
          .filter(
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
                Şu anda bu kategoride yayınlanacak haber bulunamadı.
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

                    <NewsArtwork item={item} />

                    <h3>{item.title}</h3>

                    <div style={{ marginTop: "14px" }}>
                      <strong>Kısa özet</strong>
                      <p style={{ marginTop: "6px" }}>
                        {item.editorialSummary ||
                          item.summary ||
                          "Bu haber için özet bulunmuyor."}
                      </p>
                    </div>

                    {item.whyImportant && (
                      <div
                        style={{
                          marginTop: "16px",
                          padding: "14px",
                          borderRadius: "12px",
                          background: "#fff8ed",
                          border: "1px solid #f1dfc5",
                        }}
                      >
                        <strong>Neden önemli?</strong>
                        <p style={{ marginTop: "6px", marginBottom: 0 }}>
                          {item.whyImportant}
                        </p>
                      </div>
                    )}

                    <div className="news-coming" style={{ marginTop: "16px" }}>
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
