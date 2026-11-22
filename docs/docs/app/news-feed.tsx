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

        if (active) {
          setBulletin(data);
        }
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
