"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewsFeed from "./news-feed";
import UlakMotion from "./ulak-motion";

type Bulletin = {
  generatedAt?: string;
  news?: Array<{ title?: string }>;
};

const sections = [
  { name: "Sincan & Etimesgut", id: "yerel-gundem" },
  { name: "Ankara", id: "ankara" },
  { name: "Türkiye", id: "turkiye" },
  { name: "Dünya", id: "dunya" },
  { name: "Bilim & Uzay", id: "bilim-ve-uzay" },
];

export default function Home() {
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);

  useEffect(() => {
    let active = true;
    const loadBulletin = () => {
      fetch("/data/daily.json?t=" + Date.now(), { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Bülten alınamadı");
          return response.json();
        })
        .then((data: Bulletin) => {
          if (active && data && Array.isArray(data.news) && data.generatedAt) setBulletin(data);
        })
        .catch(() => {
          // Ağ hatasında son başarılı video ekranda kalır.
        });
    };
    loadBulletin();
    const refresh = window.setInterval(loadBulletin, 60_000);
    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, []);

  const today = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date());
  const version = bulletin?.generatedAt ? encodeURIComponent(bulletin.generatedAt) : "";
  const publishedAt = bulletin?.generatedAt
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul",
      }).format(new Date(bulletin.generatedAt))
    : "";

  return (
    <main style={{ color: "#24211e" }}>
      <header style={{ borderBottom: "1px solid #d8d0c4", background: "#fbf8f1" }}>
        <div className="container" style={{ paddingTop: 18, paddingBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#766e64", fontSize: 12 }}>
            <span>{today}</span><span>TÜRKİYE’DEN DÜNYAYA</span>
          </div>
          <Link href="/" aria-label="ULAK’TAN HABERLER ana sayfa" style={{ display: "flex", justifyContent: "center", padding: "13px 0 12px" }}><img src="/ulaktan-haberler-logo.svg" alt="ULAK’TAN HABERLER" style={{ display: "block", width: "min(100%, 480px)", height: "auto" }} /></Link>
          <nav style={{ borderTop: "3px double #3b352e", borderBottom: "1px solid #3b352e", padding: "10px 0", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px 28px", fontSize: 13, fontWeight: 700 }}>
            {sections.map((section) => <a key={section.id} href={"#" + section.id}>{section.name}</a>)}
          </nav>
        </div>
      </header>
      <UlakMotion variant="welcome" />
      <section className="container" style={{ paddingTop: 28, paddingBottom: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, fontWeight: 800, color: "#9a5c2c" }}>ULAK’TAN HABERLER · GÜNÜN GAZETESİ</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px, 4vw, 42px)", margin: "8px 0" }}>Gündem, olduğu gibi.</h1>
          <p style={{ color: "#756d63", margin: 0 }}>Türkiye’den ve dünyadan, doğru haberin adresi.</p>
        </div>
        <section aria-labelledby="ulak-sunuyor" style={{ margin: "0 0 34px", border: "1px solid #d8d0c4", background: "#211e1b", color: "#f8f1e7", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid #50483f" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", marginBottom: 16 }}>
              <img src="/1795512817665.jpg" alt="ULAK, Baş Haber Editörü" style={{ width: 116, height: 116, objectFit: "cover", objectPosition: "center", borderRadius: 12, border: "1px solid #8b684b", boxShadow: "0 8px 24px #0008" }} />
              <div><div style={{ fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 800, color: "#fff9ef" }}>ULAK</div><div style={{ marginTop: 4, color: "#e6ad70", fontSize: 12, letterSpacing: 1.5, fontWeight: 800, textTransform: "uppercase" }}>Baş Haber Editörü</div></div>
            </div>
            <div style={{ fontSize: 11, letterSpacing: 2.5, fontWeight: 800, color: "#e6ad70" }}>GÜNÜN VİDEOLU BÜLTENİ</div>
            <h2 id="ulak-sunuyor" style={{ fontFamily: "Georgia, serif", fontSize: "clamp(23px, 3vw, 31px)", margin: "6px 0 4px", color: "#fff9ef" }}>ULAK’tan Haberler</h2>
            <p style={{ margin: 0, color: "#c8bdae", fontSize: 14 }}>
              {publishedAt ? `Son bülten: ${publishedAt} · ${bulletin?.news?.length ?? 0} haber` : "Yeni video bülteni hazırlandığında burada yayımlanacak."}
            </p>
          </div>
          {bulletin?.generatedAt ? (
            <div style={{ padding: 16 }}>
              <video
                key={version}
                controls
                playsInline
                preload="metadata"
                poster={`/data/daily-poster.jpg?v=${version}`}
                style={{ display: "block", width: "100%", maxHeight: 620, background: "#090807", borderRadius: 8 }}
                aria-label="ULAK günlük video haber bülteni"
              >
                <source src={`/data/daily.mp4?v=${version}`} type="video/mp4" />
                Tarayıcınız video oynatmayı desteklemiyor.
              </video>
              <p style={{ margin: "12px 2px 0", color: "#c8bdae", fontSize: 13 }}>
                {bulletin?.news?.length === 0
                  ? "Bu yayında doğrulanabilir önemli haber bulunamadı; ULAK kısa bir bilgilendirme ve kapanış sunuyor."
                  : "ULAK, seçilen haberleri stüdyo sunumu ve haber görselleriyle aktarıyor."}
              </p>
            </div>
          ) : (
            <div style={{ padding: 20, color: "#c8bdae", fontSize: 14, lineHeight: 1.7 }}>
              Yeni video henüz yayımlanmadı. Son başarılı yayın hazır olduğunda video oynatıcı burada görünecek.
            </div>
          )}
        </section>
        <NewsFeed />
      </section>
      <UlakMotion variant="farewell" />
      <footer style={{ marginTop: 36, borderTop: "3px double #3b352e", background: "#f2ece1" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 22, paddingBottom: 22, color: "#71695f", fontSize: 12 }}>
          <strong style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#29231d" }}>ULAK’TAN HABERLER</strong>
          <span>Türkiye’den ve dünyadan, doğru haberin adresi.</span><span>© ULAK’TAN HABERLER</span>
        </div>
      </footer>
    </main>
  );
}
