
const newsCategories = [
  "Sincan & Etimesgut",
  "Ankara",
  "Türkiye",
  "Dünya",
  "Bilim & Uzay"
];

const newsPlaceholders = [
  {
    number: "01",
    category: "YEREL GÜNDEM",
    title: "Sincan ve Etimesgut'tan önemli gelişmeler",
    description: "Bölgenin günlük yaşamını etkileyen gelişmeler burada yer alacak."
  },
  {
    number: "02",
    category: "ANKARA",
    title: "Başkentte günün öne çıkan gelişmeleri",
    description: "Ankara genelindeki önemli haberler ve duyurular burada sunulacak."
  },
  {
    number: "03",
    category: "TÜRKİYE & DÜNYA",
    title: "Türkiye ve dünyadan önemli haberler",
    description: "Günün en önemli ulusal ve uluslararası gelişmeleri burada olacak."
  }
];

export default function Home() {
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
          <a href="#gundem" className="nav-button">Güne başla <span>→</span></a>
        </div>
      </header>

      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> KİŞİSEL SABAH BÜLTENİN</div>
          <h1>Günaydın!<br />Güne <span>hazır ol.</span></h1>
          <p>
            Şehrinden dünyaya, günün önemli gelişmeleri.
            Lafı uzatmadan, güvenilir kaynaklarla.
          </p>
          <a href="#video" className="primary-button">
            Günün bültenini keşfet <span>→</span>
          </a>
          <div className="hero-note">Her sabah 08.00 · Yaklaşık 90 saniye</div>
        </div>

        <div className="mascot-stage">
          <div className="sun-shape" />
          <img
            className="ulak-character"
            src="/ulak-character.png"
            alt="ULAK'ın sevimli turuncu ve krem renkli maskotu"
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
          <span className="duration-pill">◷ 01:30</span>
        </div>

        <div className="video-panel">
          <div className="video-art studio-art">
            <img
              src="/ulak-studio.png"
              alt="Ulak'ın haber stüdyosu"
              className="ulak-studio"
            />
            <div className="play-circle">▶</div>
            <span className="video-label">ULAK · GÜNLÜK BÜLTEN</span>
          </div>
          <div className="video-info">
            <span className="content-tag">YAKINDA</span>
            <h3>Günün önemli gelişmeleri tek videoda.</h3>
            <p>
              Ulak'ın sıcak anlatımıyla yerelden dünyaya
              günün gündemini 90 saniyede takip et.
            </p>
            <span className="muted">İlk video yayınlandığında burada görünecek.</span>
          </div>
        </div>
      </section>

      <section className="container news-section" id="gundem">
        <div className="section-heading">
          <div>
            <div className="eyebrow">ÖNCE YAKININDAN BAŞLAYALIM</div>
            <h2 className="section-title">Günün gündemi</h2>
          </div>
          <span className="muted news-limit">En fazla 5 önemli haber</span>
        </div>

        <div className="category-list">
          {newsCategories.map((category) => (
            <span className="category-chip" key={category}>{category}</span>
          ))}
        </div>

        <div className="news-grid">
          {newsPlaceholders.map((item) => (
            <article className="news-card" key={item.number}>
              <div className="news-card-top">
                <span className="news-number">{item.number}</span>
                <span className="news-category">{item.category}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="news-coming">Haber akışı bağlandığında yayınlanacak</span>
            </article>
          ))}
        </div>
      </section>

      <section className="container archive-section" id="arsiv">
        <div className="archive-card">
          <div className="archive-icon">▤</div>
          <div>
            <h2>Günün gündemi geçip gitmesin.</h2>
            <p>Geçmiş sabah bültenlerin ve haber arşivin burada saklanacak.</p>
          </div>
          <span className="archive-coming">Arşiv yakında</span>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <a href="/" className="brand"><span className="brand-mark">U</span><span>ULAK</span></a>
          <span>Şehrinden dünyaya, güne hazır ol.</span>
          <span>© ULAK</span>
        </div>
      </footer>
    </main>
  );
}
