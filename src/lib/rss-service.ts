import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "EthicalNews/1.0",
  },
});

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  content?: string;
  creator?: string;
}

export interface NewsSource {
  name: string;
  url: string;
  category: string;
}

export const financeSources: NewsSource[] = [
  {
    name: "Reuters Business",
    url: "https://feeds.reuters.com/reuters/businessNews",
    category: "finance",
  },
  {
    name: "Bloomberg Markets",
    url: "https://feeds.bloomberg.com/markets/news.rss",
    category: "finance",
  },
  {
    name: "CNBC Finance",
    url: "https://www.cnbc.com/id/10000664/device/rss/rss.html",
    category: "finance",
  },
  {
    name: "MarketWatch",
    url: "https://feeds.marketwatch.com/marketwatch/topstories/",
    category: "finance",
  },
  {
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com/news/rssindex",
    category: "finance",
  },
];

export async function fetchNewsFromSource(
  source: NewsSource,
  limit: number = 10
): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const items: NewsItem[] = (feed.items || [])
      .slice(0, limit)
      .map((item) => ({
        title: item.title || "No title",
        link: item.link || "",
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        source: source.name,
        content: item.content || item.contentSnippet || "",
        creator: item.creator || item.author || "",
      }))
      .filter((item) => item.title && item.link);
    return items;
  } catch (error) {
    console.error(`Error fetching from ${source.name}:`, error);
    return [];
  }
}

export async function fetchAllFinanceNews(limitPerSource: number = 10): Promise<NewsItem[]> {
  const allNews: NewsItem[] = [];
  const results = await Promise.allSettled(
    financeSources.map((source) => fetchNewsFromSource(source, limitPerSource))
  );
  for (const result of results) {
    if (result.status === "fulfilled") {
      allNews.push(...result.value);
    }
  }
  allNews.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
  return allNews;
}
