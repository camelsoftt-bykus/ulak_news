
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
    id: "google-sincan",
    name: "Google Haberler - Sincan ve Etimesgut",
    region: "local",
    url: "https://news.google.com/rss/search?q=Sincan+OR+Etimesgut+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    rssUrl: "https://news.google.com/rss/search?q=Sincan+OR+Etimesgut+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    priority: 1,
    enabled: true
  },
  {
    id: "google-sincan-only",
    name: "Google Haberler - Sincan",
    region: "local",
    url: "https://news.google.com/rss/search?q=Sincan+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    rssUrl: "https://news.google.com/rss/search?q=Sincan+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    priority: 1,
    enabled: true
  },
  {
    id: "google-etimesgut",
    name: "Google Haberler - Etimesgut",
    region: "local",
    url: "https://news.google.com/rss/search?q=Etimesgut+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    rssUrl: "https://news.google.com/rss/search?q=Etimesgut+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    priority: 1,
    enabled: true
  },
  {
    id: "google-ankara-local",
    name: "Google Haberler - Ankara yerel",
    region: "ankara",
    url: "https://news.google.com/rss/search?q=Ankara+yerel+haber+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    rssUrl: "https://news.google.com/rss/search?q=Ankara+yerel+haber+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    priority: 2,
    enabled: true
  },
  {
    id: "google-turkey",
    name: "Google Haberler - Türkiye gündemi",
    region: "turkey",
    url: "https://news.google.com/rss/search?q=Türkiye+gündem+OR+son+dakika+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    rssUrl: "https://news.google.com/rss/search?q=Türkiye+gündem+OR+son+dakika+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    priority: 3,
    enabled: true
  },
  {
    id: "google-turkey-economy",
    name: "Google Haberler - Türkiye ekonomi",
    region: "turkey",
    url: "https://news.google.com/rss/search?q=Türkiye+ekonomi+OR+finans+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    rssUrl: "https://news.google.com/rss/search?q=Türkiye+ekonomi+OR+finans+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    priority: 3,
    enabled: true
  },
  {
    id: "google-world",
    name: "Google Haberler - Dünya gündemi",
    region: "world",
    url: "https://news.google.com/rss/search?q=dünya+gündem+OR+uluslararası+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    rssUrl: "https://news.google.com/rss/search?q=dünya+gündem+OR+uluslararası+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    priority: 4,
    enabled: true
  },
  {
    id: "google-science",
    name: "Google Haberler - Bilim ve teknoloji",
    region: "science",
    url: "https://news.google.com/rss/search?q=bilim+OR+teknoloji+OR+uzay+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    rssUrl: "https://news.google.com/rss/search?q=bilim+OR+teknoloji+OR+uzay+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    priority: 5,
    enabled: true
  },
  {
    id: "google-ankara",
    name: "Google Haberler - Ankara",
    region: "ankara",
    url: "https://news.google.com/rss/search?q=Ankara+when:3d&hl=tr&gl=TR&ceid=TR:tr",
    rssUrl: "https://news.google.com/rss/search?q=Ankara+when:3d&hl=tr&gl=TR&ceid=TR:tr",
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
    id: "aa-guncel",
    name: "Anadolu Ajansı - Güncel",
    region: "turkey",
    url: "https://www.aa.com.tr/tr/rss/default?cat=guncel",
    rssUrl: "https://www.aa.com.tr/tr/rss/default?cat=guncel",
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
    id: "aa-dunya",
    name: "Anadolu Ajansı - Dünya",
    region: "world",
    url: "https://www.aa.com.tr/tr/rss/default?cat=dunya",
    rssUrl: "https://www.aa.com.tr/tr/rss/default?cat=dunya",
    priority: 4,
    enabled: true
  },
  {
    id: "bbc-dunya",
    name: "BBC News - Dünya",
    region: "world",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    rssUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
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
