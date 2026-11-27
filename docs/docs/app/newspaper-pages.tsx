"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "./news-feed";

type NewspaperItem = NewsItem & { categoryLabel: string };
type Props = { items: NewspaperItem[]; generatedAt?: string };

const PER_PAGE = 1;

function formatEditionDate(value?: string): string {
  if (!value) return new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })
    : date.toLocaleDateString("tr-TR", {
        timeZone: "Europe/Istanbul", day: "numeric", month: "long", year: "numeric",
      });
}

function formatStoryDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("tr-TR");
}

export default function NewspaperPages({ items, generatedAt }: Props) {
  const pages: NewspaperItem[][] = [];
  for (let index = 0; index < items.length; index += PER_PAGE) {
    pages.push(items.slice(index, index + PER_PAGE));
  }

  const [current, setCurrent] = useState(0);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);

  useEffect(() => {
    setCurrent((page) => Math.min(page, Math.max(0, pages.length - 1)));
  }, [pages.length]);

  useEffect(() => {
    if (!turning) return;
    const timer = window.setTimeout(() => {
      setCurrent((page) => turning === "next" ? page + 1 : page - 1);
      setTurning(null);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [turning]);

  const go = (direction: "next" | "prev") => {
    if (turning) return;
    if (direction === "next" && current >= pages.length - 1) return;
    if (direction === "prev" && current <= 0) return;
    setTurning(direction);
  };

  const pageItems = pages[current] ?? [];
  const lead = pageItems[0];
  const secondary = pageItems.slice(1);

  const renderImage = (item: NewspaperItem, className: string) => {
    const initialImageUrl = item.imageUrl || item.fallbackImageUrl;
    if (!initialImageUrl) return null;
    return (
      <img
        className={className}
        src={"/api/news-image?url=" + encodeURIComponent(initialImageUrl)}
        alt={item.imageTitle || item.title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(event) => {
          const image = event.currentTarget;
          if (item.imageUrl && item.fallbackImageUrl && image.dataset.fallback !== "used") {
            image.dataset.fallback = "used";
            image.src = "/api/news-image?url=" + encodeURIComponent(item.fallbackImageUrl);
            image.alt = item.fallbackImageTitle || item.title;
          } else {
            image.style.display = "none";
            const fallback = image.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = "grid";
          }
        }}
        data-fallback={!item.imageUrl && item.fallbackImageUrl ? "used" : undefined}
      />
    );
  };

  const renderStoryText = (item: NewspaperItem, leadStory = false) => (
    <>
      <div className="np-story-meta">
        <span>{item.categoryLabel}</span>
        <span>{item.sourceName}{formatStoryDate(item.publishedAt) ? " · " + formatStoryDate(item.publishedAt) : ""}</span>
      </div>
      {leadStory ? <h2>{item.title}</h2> : <h3>{item.title}</h3>}
      <p>{item.editorialSummary || item.summary || "Bu haber için özet bulunmuyor."}</p>
      {item.whyImportant && <p className="np-why"><strong>Neden önemli?</strong> {item.whyImportant}</p>}
      {item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer">Haberin devamı →</a> : <span className="np-source-unavailable">Kaynak bağlantısı mevcut değil.</span>}
    </>
  );

  return (
    <div className="np-wrap" aria-label="ULAK gazete sayfaları">
      <article className={"np-page" + (turning ? " np-turn-" + turning : "")}>
        <header className="np-masthead">
          <div className="np-edition-line">
            <span>ULAK’TAN HABERLER</span>
            <span>{formatEditionDate(generatedAt)}</span>
            <span>{current + 1}. SAYFA</span>
          </div>
          <div className="np-paper-title">GÜNÜN GAZETESİ</div>
          <div className="np-paper-subtitle">Türkiye’den ve dünyadan gündemin özeti</div>
        </header>

        {items.length === 0 ? (
          <div className="np-empty">Bugün yayımlanacak haber bulunmuyor.</div>
        ) : lead ? (
          <>
            <section className="np-lead">
              <div className="np-image-frame">
                {renderImage(lead, "np-lead-image")}
                <div className="np-image-fallback" style={{ display: lead.imageUrl || lead.fallbackImageUrl ? "none" : "grid" }}>{lead.title}</div>
              </div>
              <div className="np-lead-copy">{renderStoryText(lead, true)}</div>
            </section>
            {secondary.length > 0 && (
              <div className="np-columns">
                {secondary.map((item) => (
                  <article className="np-story" key={item.sourceId + "-" + item.link}>
                    <div className="np-image-frame">
                      {renderImage(item, "np-story-image")}
                      <div className="np-image-fallback" style={{ display: item.imageUrl || item.fallbackImageUrl ? "none" : "grid" }}>{item.title}</div>
                    </div>
                    {renderStoryText(item)}
                  </article>
                ))}
              </div>
            )}
          </>
        ) : null}

        <footer className="np-page-footer">
          <span>ULAK’TAN HABERLER · GÜNÜN BÜLTENİ</span>
          <span>{current + 1} / {pages.length || 1}</span>
        </footer>
      </article>

      <nav className="np-nav" aria-label="Gazete sayfaları arasında gezin">
        <button type="button" aria-label="Önceki haber sayfası" onClick={() => go("prev")} disabled={current === 0 || !!turning}>
          ← Önceki sayfa
        </button>
        <span className="np-page-count">{pages.length ? current + 1 + " / " + pages.length : "0 / 0"}</span>
        <button type="button" aria-label="Sonraki haber sayfası" onClick={() => go("next")} disabled={current >= pages.length - 1 || !!turning}>
          Sonraki sayfa →
        </button>
      </nav>
    </div>
  );
}
