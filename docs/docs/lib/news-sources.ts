
export type NewsSource = {
  id: string;
  name: string;
  region: "local" | "ankara" | "turkey" | "world" | "science";
  url: string;
  pageUrl?: string;
  rssUrl?: string;
  priority: number;
  enabled: boolean;
};

export const newsSources: NewsSource[] = [
  {
    id: "sincan",
    name: "Sincan Belediyesi",
    region: "local",
    url: "https://www.sincan.bel.tr/haberler",
    pageUrl: "https://www.sincan.bel.tr/haberler",
    priority: 1,
    enabled: true
  },
  {
    id: "etimesgut",
    name: "Etimesgut Belediyesi",
    region: "local",
    url: "https://www.etimesgut.bel.tr/haberler",
    pageUrl: "https://www.etimesgut.bel.tr/haberler",
    priority: 1,
    enabled: true
  },
  {
    id: "ankara",
    name: "Ankara Büyükşehir Belediyesi",
    region: "ankara",
    url: "https://www.ankara.bel.tr/haberler",
    pageUrl: "https://www.ankara.bel.tr/haberler",
    priority: 2,
    enabled: true
  },
  {
    id: "trt-turkiye",
    name: "TRT Haber - Türkiye",
    region: "turkey",
    url: "https://www.trthaber.com/turkiye_articles.rss",
    rssUrl: "https://www.trthaber.com/turkiye_articles.rss",
    priority: 3,
    enabled: true
  },
  {
    id: "bbc-turkce",
    name: "BBC News Türkçe",
    region: "turkey",
    url: "https://feeds.bbci.co.uk/turkce/rss.xml",
    rssUrl: "https://feeds.bbci.co.uk/turkce/rss.xml",
    priority: 3,
    enabled: true
  },
  {
    id: "trt-dunya",
    name: "TRT Haber - Dünya",
    region: "world",
    url: "https://www.trthaber.com/dunya_articles.rss",
    rssUrl: "https://www.trthaber.com/dunya_articles.rss",
    priority: 4,
    enabled: true
  },
  {
    id: "tubitak",
    name: "TÜBİTAK",
    region: "science",
    url: "https://tubitak.gov.tr/tr/haberler",
    rssUrl: "https://www.tubitak.gov.tr/rss.xml",
    priority: 5,
    enabled: true
  },
  {
    id: "tubitak-uzay",
    name: "TÜBİTAK UZAY",
    region: "science",
    url: "https://uzay.tubitak.gov.tr/gundem/haberler/",
    pageUrl: "https://uzay.tubitak.gov.tr/gundem/haberler/",
    priority: 5,
    enabled: true
  },
  {
    id: "trt-uzay",
    name: "TRT Haber - Uzay",
    region: "science",
    url: "https://www.trthaber.com/etiket/uzay/",
    pageUrl: "https://www.trthaber.com/etiket/uzay/",
    priority: 5,
    enabled: true
  },
  {
    id: "nasa",
    name: "NASA",
    region: "science",
    url: "https://www.nasa.gov/news/",
    rssUrl: "https://www.nasa.gov/news-release/feed/",
    priority: 5,
    enabled: true
  }
];
