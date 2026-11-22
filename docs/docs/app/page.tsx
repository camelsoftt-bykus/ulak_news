
"use client";

import { useState } from "react";
import NewsFeed from "./news-feed";

const newsCategories = [
  { name: "Sincan & Etimesgut", id: "yerel-gundem" },
  { name: "Ankara", id: "ankara" },
  { name: "Türkiye", id: "turkiye" },
  { name: "Dünya", id: "dunya" },
  { name: "Bilim & Uzay", id: "bilim-ve-uzay" },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("yerel-gundem");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");

  async function prepareAndSpeak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("Bu tarayıcı sesli okumayı desteklemiyor.");
      return;
    }

    window.speechSynthesis.cancel();
    setSpeaking(false);
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/presenter", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.script) {
        throw new Error(data.error || "Sunum metni alınamadı.");
      }

      setScript(data.script);

      const utterance = new SpeechSynthesisUtterance(data.script);
      utterance.lang = "tr-TR";
      utterance.rate = 0.95;
      utterance.pitch = 1;

      const voices = window.speechSynthesis.getVoices();
      const turkishVoice = voices.find(
        (voice) => voice.lang.toLowerCase().startsWith("tr")
      );

      if (turkishVoice) {
        utterance.voice = turkishVoice;
      }

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => {
        setSpeaking(false);
        setError("Seslendirme sırasında bir sorun oluştu.");
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sunum hazırlanırken bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }

  return (
    <main>
      <header className="topbar">
        <div className="container nav-inner">
          <a href="/" className="brand">
            <span className="brand-mark">U</span>
            <span>ULAK</span>
          </a>
          <nav className="nav-links">
            <a href="#video">Günün videosu</a>
            <a href="#gundem">Gündem</a>
            <a href="#arsiv">Arşiv</a>
          </nav>
          <a href="#gundem" className="nav-button">
            Güne başla <span>→</span>
          </a>
        </div>
      </header>

      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> KİŞİSEL SABAH BÜLTENİN
          </div>
          <h1>Günaydın!<br />Güne <span>hazır ol.</span></h1>
          <p>
            Şehrinden dünyaya, günün önemli gelişmeleri.
            Lafı uzatmadan, güvenilir kaynaklarla.
          </p>
          <a href="#video" className="primary-button">
            Günün bültenini keşfet <span>→</span>
          </a>
          <div className="hero-note">
            Her sabah 08.00 · Yaklaşık 90 saniye
          </div>
        </div>

        <div className="mascot-stage">
          <div className="sun-shape" />
          <img
            className="ulak-character"
            src="/ulak-character.png"
            alt="ULAK'ın maskotu"
          />
          <div className="mascot-caption">
            <strong>Ben Ulak!</strong>
            <span>Günün gündemini birlikte keşfedelim.</span>
          </div>
          <span className="floating-star star-one">✳</span>
          <span className="floating-star star-two">✦</span>
        </div>
      </section>

      <section className="container video-section" id="video">
        <div className="section-heading">
          <div>
            <div className="eyebrow">GÜNÜN ÖZETİ</div>
            <h2 className="section-title">Sabah bültenin</h2>
          </div>
          <span className="duration-pill">ULAK · VİDEO</span>
        </div>

        <div className="video-panel">
          <div className="video-art studio-art">
            <video
              controls
              playsInline
              preload="metadata"
              poster="/ulak-studio.png"
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                background: "#171717",
                borderRadius: "16px",
              }}
            >
              <source
                src="/freelipsync-19841f7c-b07c-4086-ab74-451f857e3e2c-original.mp4"
                type="video/mp4"
              />
              Tarayıcınız video oynatmayı desteklemiyor.
            </video>
          </div>

          <div className="video-info">
            <span className="content-tag">ULAK YAYINDA</span>
            <h3>Günün önemli gelişmeleri tek videoda.</h3>
            <p>
              Ulak'ın sıcak anlatımıyla yerelden dünyaya
              günün gündemini takip et.
            </p>
            <span className="muted">
              İlk ULAK sunum videosu burada.
            </span>
          </div>
        </div>

        <div className="archive-card" style={{ marginTop: "24px" }}>
          <div className="archive-icon">🔊</div>
          <div style={{ flex: 1 }}>
            <h2>ULAK'ın bugünkü haberlerini dinle</h2>
            <p>
              Güncel haberlerden yeni bir sunum metni hazırlanır
              ve cihazının Türkçe sesiyle okunur.
            </p>

            {script && (
              <div style={{ marginTop: "16px", whiteSpace: "pre-wrap" }}>
                {script}
              </div>
            )}

            {error && (
              <p role="alert" style={{ color: "#b42318", marginTop: "12px" }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
              <button
                type="button"
                className="primary-button"
                onClick={prepareAndSpeak}
                disabled={loading}
              >
                {loading ? "Haberler hazırlanıyor..." : "▶ Haberi hazırla ve dinle"}
              </button>

              {speaking && (
                <button
                  type="button"
                  className="nav-button"
                  onClick={stopSpeaking}
                >
                  ■ Durdur
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container news-section" id="gundem">
        <div className="section-heading">
          <div>
            <div className="eyebrow">ÖNCE YAKININDAN BAŞLAYALIM</div>
            <h2 className="section-title">Günün gündemi</h2>
          </div>
          <span className="muted news-limit">
            En fazla 5 önemli haber
          </span>
        </div>

        <div className="category-list">
          {newsCategories.map((category) => (
            <a
              href={`#${category.id}`}
              key={category.id}
              className="category-chip"
              onClick={() => setActiveCategory(category.id)}
              aria-current={
                activeCategory === category.id ? "location" : undefined
              }
              style={
                activeCategory === category.id
                  ? {
                      background: "#292929",
                      color: "#ffffff",
                      borderColor: "#292929",
                    }
                  : undefined
              }
            >
              {category.name}
            </a>
          ))}
        </div>

        <NewsFeed />
      </section>

      <section className="container archive-section" id="arsiv">
        <div className="archive-card">
          <div className="archive-icon">▤</div>
          <div>
            <h2>Günün gündemi geçip gitmesin.</h2>
            <p>
              Geçmiş sabah bültenlerin ve haber arşivin burada saklanacak.
            </p>
          </div>
          <span className="archive-coming">Arşiv yakında</span>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <a href="/" className="brand">
            <span className="brand-mark">U</span>
            <span>ULAK</span>
          </a>
          <span>Şehrinden dünyaya, güne hazır ol.</span>
          <span>© ULAK</span>
        </div>
      </footer>
    </main>
  );
}
