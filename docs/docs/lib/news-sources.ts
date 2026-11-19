
export type NewsSource = {
  id: string;
  name: string;
  region: "local" | "ankara" | "turkey" | "world" | "science";
  url: string;
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
    url: "https://www.etimesgut.bel.tr/",
    priority: 1,
    enabled: true
  },
  {
    id: "ankara",
    name: "Ankara Büyükşehir Belediyesi",
    region: "ankara",
    url: "https://www.ankara.bel.tr/tr/haberler",
    priority: 2,
    enabled: true
  },
  {
    id: "nasa",
    name: "NASA",
    region: "science",
    url: "https://www.nasa.gov/news/",
    priority: 5,
    enabled: true
  },
  {
    id: "esa",
    name: "European Space Agency",
    region: "science",
    url: "https://www.esa.int/Newsroom",
    priority: 5,
    enabled: true
  }
];
