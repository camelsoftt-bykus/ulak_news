
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
    url: "https://www.ankara.bel.tr/tr/haberler",
    pageUrl: "https://www.ankara.bel.tr/haberler",
    priority: 2,
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
  }
];
