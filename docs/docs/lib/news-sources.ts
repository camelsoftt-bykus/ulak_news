
export type NewsSource = {
  id: string;
  name: string;
  region: "local" | "ankara" | "turkey" | "world" | "science";
  url: string;
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
    priority: 1,
    enabled: true
  },
  {
    id: "etimesgut",
    name: "Etimesgut Belediyesi",
    region: "local",
    url: "https://www.etimesgut.bel.tr/haberler",
    priority: 1,
    enabled: true
  },
  {
    id: "ankara",
    name: "Ankara Büyükşehir Belediyesi",
    region: "ankara",
    url: "https://www.ankara.bel.tr/",
    priority: 2,
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
  },
  {
    id: "esa",
    name: "European Space Agency",
    region: "science",
    url: "https://www.esa.int/Newsroom",
    rssUrl: "https://www.esa.int/rssfeed/TopNews",
    priority: 5,
    enabled: true
  }
];
