"use client";

import { useEffect, useState } from "react";
import NewsFeed from "./news-feed";

const sections = [
  { name: "Sincan & Etimesgut", id: "yerel-gundem" },
  { name: "Ankara", id: "ankara" },
  { name: "Türkiye", id: "turkiye" },
  { name: "Dünya", id: "dunya" },
  { name: "Bilim & Uzay", id: "bilim-ve-uzay" },
];

export default function Home() {
  const [presenterReady, setPresenterReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/data/daily.json?t=" + Date.now(), { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Bülten alınamadı");
        return response.json();
      })
      .then((data) => {
        const script = typeof data.script === "string" ? data.script : "";
        // Eski, kaynak URL'lerini seslendiren bültenleri yeni sunum gibi göstermeyiz.
        if (active) setPresenterReady(
          Array.isArray(data.news) &&
          Boolean(data.generatedAt) &&
          !/kaynaklar\s*:/i.test(script) &&
          !/https?:\/\//i.test(script) &&
          data.news.length > 0
        );
      })
      .catch(() => { if (active) setPresenterReady(false); });
    return () => { active = false; };
  }, []);

  const today = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date());

  return (
    <main style={{ color: "#24211e" }}>
      <header style={{ borderBottom: "1px solid #d8d0c4", background: "#fbf8f1" }}>
        <div className="container" style={{ paddingTop: 18, paddingBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#766e64", fontSize: 12 }}>
            <span>{today}</span><span>TÜRKİYE’DEN DÜNYAYA</span>
          </div>
          <a href="/" aria-label="ULAK’TAN HABERLER ana sayfa" style={{ display: "flex", justifyContent: "center", padding: "13px 0 12px" }}><img src="/ulaktan-haberler-logo.svg" alt="ULAK’TAN HABERLER" style={{ display: "block", width: "min(100%, 480px)", height: "auto" }} /></a>
          <nav style={{ borderTop: "3px double #3b352e", borderBottom: "1px solid #3b352e", padding: "10px 0", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px 28px", fontSize: 13, fontWeight: 700 }}>
            {sections.map((section) => <a key={section.id} href={"#" + section.id}>{section.name}</a>)}
          </nav>
        </div>
      </header>
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
              <div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 800, color: "#fff9ef" }}>ULAK</div>
                <div style={{ marginTop: 4, color: "#e6ad70", fontSize: 12, letterSpacing: 1.5, fontWeight: 800, textTransform: "uppercase" }}>Baş Haber Editörü</div>
              </div>
            </div>
            <div style={{ fontSize: 11, letterSpacing: 2.5, fontWeight: 800, color: "#e6ad70" }}>GÜNÜN MANŞETLERİ</div>
            <h2 id="ulak-sunuyor" style={{ fontFamily: "Georgia, serif", fontSize: "clamp(23px, 3vw, 31px)", margin: "6px 0 4px", color: "#fff9ef" }}>Gündemin Öne Çıkanları</h2>
            <p style={{ margin: 0, color: "#c8bdae", fontSize: 14 }}>Günün öne çıkan gelişmeleri, anlaşılır ve akıcı bir anlatımla.</p>
          </div>
          <div style={{ padding: 14 }}>
            {presenterReady ? (
              <>
                <video controls playsInline preload="metadata" poster="/data/daily-poster.jpg" aria-label="ULAK günlük haber sunumu" style={{ display: "block", width: "100%", maxHeight: 620, objectFit: "contain", background: "#090807", borderRadius: 7 }}>
                  <source src={"/data/daily.mp4?v=" + encodeURIComponent("latest")} type="video/mp4" />
                  Tarayıcınız video oynatmayı desteklemiyor.
                </video>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "12px 2px 2px", color: "#c8bdae", fontSize: 12 }}>
                  <span>Günün haber özeti</span>
                  <a href="/data/daily.wav" style={{ color: "#f0bd83", fontWeight: 700 }}>Sesli bülteni dinle ↗</a>
                </div>
              </>
            ) : (
              <div style={{ padding: "28px 12px", textAlign: "center", color: "#e7d9c8" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 20 }}>Günün yeni baskısı hazırlanıyor</div>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#c8bdae" }}>Günün haberleri editoryal kontrolden geçiyor. Yeni sesli ve görüntülü bülten hazır olduğunda burada yayımlanacak.</p>
              </div>
            )}
          </div>
        </section>
        <NewsFeed />
      </section>
      <footer style={{ marginTop: 36, borderTop: "3px double #3b352e", background: "#f2ece1" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 22, paddingBottom: 22, color: "#71695f", fontSize: 12 }}>
          <strong style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#29231d" }}>ULAK’TAN HABERLER</strong>
          <span>Türkiye’den ve dünyadan, doğru haberin adresi.</span><span>© ULAK’TAN HABERLER</span>
        </div>
      </footer>
    </main>
  );
}
