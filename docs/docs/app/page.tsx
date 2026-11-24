"use client";

import NewsFeed from "./news-feed";

const sections = [
  { name: "Sincan & Etimesgut", id: "yerel-gundem" },
  { name: "Ankara", id: "ankara" },
  { name: "Türkiye", id: "turkiye" },
  { name: "Dünya", id: "dunya" },
  { name: "Bilim & Uzay", id: "bilim-ve-uzay" },
];

export default function Home() {
  const today = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date());

  return (
    <main style={{ color: "#24211e" }}>
      <header style={{ borderBottom: "1px solid #d8d0c4", background: "#fbf8f1" }}>
        <div className="container" style={{ paddingTop: 18, paddingBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#766e64", fontSize: 12 }}>
            <span>{today}</span><span>ŞEHRİNDEN DÜNYAYA</span>
          </div>
          <a href="/" style={{ display: "block", textAlign: "center", padding: "12px 0 10px", fontFamily: "Georgia, serif", fontSize: "clamp(42px, 7vw, 66px)", fontWeight: 800, letterSpacing: "-3px" }}>ULAK</a>
          <nav style={{ borderTop: "3px double #3b352e", borderBottom: "1px solid #3b352e", padding: "10px 0", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px 28px", fontSize: 13, fontWeight: 700 }}>
            {sections.map((section) => <a key={section.id} href={"#" + section.id}>{section.name}</a>)}
          </nav>
        </div>
      </header>
      <section className="container" style={{ paddingTop: 28, paddingBottom: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, fontWeight: 800, color: "#9a5c2c" }}>GÜNÜN GAZETESİ</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px, 4vw, 42px)", margin: "8px 0" }}>Gündem, olduğu gibi.</h1>
          <p style={{ color: "#756d63", margin: 0 }}>Önce Sincan ve Etimesgut. Ardından Ankara, Türkiye ve dünya.</p>
        </div>
        <NewsFeed />
      </section>
      <footer style={{ marginTop: 36, borderTop: "3px double #3b352e", background: "#f2ece1" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 22, paddingBottom: 22, color: "#71695f", fontSize: 12 }}>
          <strong style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#29231d" }}>ULAK</strong>
          <span>Yerelden dünyaya, doğru ve anlaşılır haber.</span><span>© ULAK</span>
        </div>
      </footer>
    </main>
  );
}
