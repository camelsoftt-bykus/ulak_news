
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

          <a href="#video" className="nav-button">
            Güne başla <span>→</span>
          </a>
        </div>
      </header>

      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> KİŞİSEL SABAH BÜLTENİN
          </div>

          <h1>
            Günaydın!
            <br />
            Güne <span>hazır ol.</span>
          </h1>

          <p>
            Şehrinden dünyaya, günün önemli gelişmeleri.
            Lafı uzatmadan, güvenilir kaynaklarla.
          </p>

          <a href="#video" className="primary-button">
            Günün bültenini izle <span>→</span>
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
            <strong>Ben ULAK!</strong>
            <span>Günün gündemini birlikte keşfedelim.</span>
          </div>

          <span className="floating-star star-one">✳</span>
          <span className="floating-star star-two">✦</span>
        </div>
      </section>

      <section className="container video-section" id="video">
        <div className="section-heading">
          <div>
            <div className="eyebrow">GÜNLÜK OTOMATİK SUNUM</div>
            <h2 className="section-title">Günün ULAK bülteni</h2>
          </div>

          <span className="duration-pill">AHMET SESİ · VİDEO</span>
        </div>

        <div className="video-panel">
          <div className="video-info">
            <span className="content-tag">ULAK YAYINDA</span>

            <h3>Günün haberleri hazır!</h3>

            <p>
              ULAK, günün önemli gelişmelerini Ahmet sesiyle
              senin için sunuyor. Videoyu başlat ve gündemi takip et.
            </p>

            <a
              href="/data/daily.mp4"
              target="_blank"
              rel="noreferrer"
              className="primary-button"
            >
              Videoyu ayrı aç →
            </a>
          </div>
        </div>

        <div
          style={{
            marginTop: "18px",
            borderRadius: "16px",
            overflow: "hidden",
            background: "#1d1a17",
            border: "1px solid #4a423b",
          }}
        >
          <video
            key="ulak-daily-video"
            src="/data/daily.mp4"
            controls
            playsInline
            preload="metadata"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              aspectRatio: "1 / 1",
              background: "#1d1a17",
            }}
          >
            Tarayıcınız video oynatmayı desteklemiyor.
          </video>
        </div>

        <p className="muted" style={{ marginTop: "12px", fontSize: "13px" }}>
          Günlük sunum otomatik hazırlanır. En yeni bülteni buradan izleyebilirsin.
        </p>
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
