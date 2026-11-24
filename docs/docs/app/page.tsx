"use client";

import NewsFeed from "./news-feed";

const newsCategories = [
  { name: "Sincan", id: "yerel-gundem" },
  { name: "Etimesgut", id: "yerel-gundem" },
  { name: "Ankara", id: "ankara" },
  { name: "Türkiye", id: "turkiye" },
  { name: "Dünya", id: "dunya" },
  { name: "Bilim ve Uzay", id: "bilim-ve-uzay" },
];

function todayLabel() {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date());
}

function BrandMark() {
  return (
    <svg className="brand-globe" viewBox="0 0 64 64" role="img" aria-label="ULAK dünya küresi logosu">
      <circle cx="31" cy="32" r="23" fill="#142844" />
      <path d="M10 29c12-8 30-10 43-3M12 40c13 5 27 4 40-3M31 9c-8 13-8 33 1 46M39 11c-5 13-5 29 1 42" fill="none" stroke="#f7f0e4" strokeWidth="1.6" opacity=".9" />
      <path d="M5 39C18 9 45 5 60 23" fill="none" stroke="#e47c32" strokeWidth="4" strokeLinecap="round" />
      <path d="M55 17l7 6-9 2" fill="none" stroke="#e47c32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="newspaper-page">
      <div className="edition-strip">
        <span>DOĞRU HABER, GÜVENİLİR KAYNAK</span>
        <span>{todayLabel()}</span>
        <span>ŞEHRİNDEN DÜNYAYA</span>
      </div>

      <header className="masthead container">
        <a href="/" className="masthead-brand" aria-label="ULAK ana sayfa">
          <BrandMark />
          <span className="masthead-word">ULAK</span>
          <span className="masthead-subtitle">GÜNLÜK HABER GAZETESİ</span>
        </a>
        <p className="masthead-motto">Haberin en doğru hali.</p>
      </header>

      <div className="masthead-rule container"><span /></div>

      <nav className="newspaper-nav">
        <div className="container newspaper-nav-inner">
          <a className="nav-home" href="/" aria-label="Ana sayfa">⌂</a>
          {newsCategories.map((category, index) => (
            <a href={`#${category.id}`} key={`${category.name}-${index}`}>
              {category.name}
            </a>
          ))}
          <a href="#video" className="nav-video-link">Günün videosu</a>
        </div>
      </nav>

      <section className="container front-page">
        <div className="front-page-intro">
          <span className="print-kicker">GÜNÜN MANŞETİ</span>
          <h1>Şehrinden dünyaya, gündem bir tık uzağında.</h1>
          <p>Önce Sincan ve Etimesgut. Ardından Ankara, Türkiye ve dünyadan önemli gelişmeler.</p>
        </div>
        <div className="front-page-mascot">
          <img src="/ulak-character.png" alt="ULAK haber sunucusu" />
          <div className="mascot-stamp">GÜVENİLİR<br />HABER</div>
        </div>
      </section>

      <section className="container video-section print-video-section" id="video">
        <div className="section-heading print-section-heading">
          <div>
            <div className="eyebrow">ULAK GÜNLÜK YAYINI</div>
            <h2 className="section-title">Günün haber bülteni</h2>
          </div>
          <span className="duration-pill">AHMET SESİ · VİDEO</span>
        </div>

        <div className="video-panel print-video-panel">
          <div className="video-info">
            <span className="content-tag">GÜNLÜK BÜLTEN</span>
            <h3>Gündemi ULAK'tan takip edin.</h3>
            <p>Günün önemli gelişmeleri, anlaşılır bir anlatım ve güvenilir kaynaklarla.</p>
            <a href="/data/daily.mp4" target="_blank" rel="noreferrer" className="primary-button">
              Videoyu ayrı aç <span>→</span>
            </a>
          </div>
          <div className="print-video-frame">
            <video
              key="ulak-daily-video"
              src="/data/daily.mp4"
              controls
              playsInline
              preload="metadata"
            >
              Tarayıcınız video oynatmayı desteklemiyor.
            </video>
          </div>
        </div>
        <p className="muted print-video-note">
          Günlük sunum otomatik hazırlanır. En yeni bülteni buradan izleyebilirsin.
        </p>
      </section>

      <section className="container news-section print-news-section" id="gundem">
        <div className="section-heading print-section-heading">
          <div>
            <div className="eyebrow">YERELDEN DÜNYAYA</div>
            <h2 className="section-title">Günün gündemi</h2>
          </div>
          <span className="muted news-limit">Güncel haberler ve kaynakları</span>
        </div>
        <NewsFeed />
      </section>

      <footer className="newspaper-footer">
        <div className="container footer-inner">
          <a href="/" className="footer-brand"><BrandMark /><strong>ULAK</strong></a>
          <span>Şehrinden dünyaya, güne hazır ol.</span>
          <span>© ULAK · Günlük Haber Gazetesi</span>
        </div>
      </footer>
    </main>
  );
}
