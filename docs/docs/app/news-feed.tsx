"use client";

import { useEffect, useState } from "react";
import NewspaperPages from "./newspaper-pages";

export type NewsItem = {
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  summary: string;
  editorialSummary?: string;
  whyImportant?: string;
  publishedAt: string | null;
  imageUrl?: string;
  imageTitle?: string;
  fallbackImageUrl?: string;
  fallbackImageTitle?: string;
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
  "google-sincan": { label: "SİNCAN & ETİMESGUT", section: "Yerel Gündem" },
  ankara: { label: "ANKARA", section: "Ankara" },
  "google-ankara": { label: "ANKARA", section: "Ankara" },
  "trt-turkiye": { label: "TÜRKİYE", section: "Türkiye" },
  "aa-guncel": { label: "TÜRKİYE", section: "Türkiye" },
  "bbc-turkce": { label: "TÜRKİYE", section: "Türkiye" },
  "trt-dunya": { label: "DÜNYA", section: "Dünya" },
  "aa-dunya": { label: "DÜNYA", section: "Dünya" },
  "bbc-dunya": { label: "DÜNYA", section: "Dünya" },
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
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("tr-TR");
}

function formatGeneratedAt(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul", dateStyle: "long", timeStyle: "short",
  });
}

function uniqueStories(items: NewsItem[]): NewsItem[] {
  const ignored = new Set(["icin", "olan", "olarak", "ile", "bir", "bu", "de", "da", "sonra", "yeni", "haber", "gundem", "sincan", "etimesgut"]);
  const kept: NewsItem[] = [];
  for (const item of items) {
    const words = new Set(item.title.toLocaleLowerCase("tr-TR")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i")
      .split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !ignored.has(word)));
    const duplicate = kept.some((prior) => {
      const priorWords = new Set(prior.title.toLocaleLowerCase("tr-TR")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i")
        .split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !ignored.has(word)));
      const common = [...words].filter((word) => priorWords.has(word)).length;
      return common >= 2 && common / Math.max(1, Math.min(words.size, priorWords.size)) >= 0.65;
    });
    if (!duplicate) kept.push(item);
  }
  return kept;
}

export default function NewsFeed({ selectedSection = "Tümü" }: { selectedSection?: string }) {
  const [bulletin, setBulletin] = useState<DailyBulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadBulletin() {
      try {
        const response = await fetch("/data/daily.json?t=" + Date.now(), { cache: "no-store" });
        if (!response.ok) throw new Error("Günlük haberler alınamadı.");
        const data = await response.json();
        if (!Array.isArray(data.news)) throw new Error("Haber listesi geçersiz.");
        if (active) setBulletin(data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadBulletin();
    return () => { active = false; };
  }, []);

  if (loading) return <p className="muted">ULAK’TAN HABERLER hazırlanıyor...</p>;
  if (error || !bulletin) return <p className="muted">Haberler şu anda yüklenemiyor. Lütfen biraz sonra yeniden dene.</p>;

  const stories = uniqueStories(bulletin.news).map((item) => ({
    ...item,
    categoryLabel: categoryInfo[item.sourceId]?.label || "GÜNDEM",
  }));
  const visibleStories = selectedSection === "Tümü"
    ? stories
    : stories.filter((item) => categoryInfo[item.sourceId]?.section === selectedSection);

  return (
    <NewspaperPages
      items={visibleStories}
      generatedAt={bulletin.generatedAt}
    />
  );
}
