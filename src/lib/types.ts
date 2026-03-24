export interface BiasAnalysis {
  headline: string;
  source: string;
  biasNote: string;
  biasLevel: "low" | "medium" | "high";
  indicators: string[];
  isSensationalist: boolean;
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  content?: string;
  creator?: string;
  biasAnalysis?: BiasAnalysis;
}

export interface NewsResponse {
  news: NewsItem[];
  count: number;
  timestamp: string;
}

export async function getNewsWithAnalysis(): Promise<NewsResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/news-with-analysis`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch news");
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching news:", error);
    return { news: [], count: 0, timestamp: new Date().toISOString() };
  }
}
