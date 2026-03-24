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

export interface ArticleLink {
  source: string;
  headline: string;
  url: string;
  biasLevel: "low" | "medium" | "high";
}

export interface StoryCluster {
  id: string;
  title: string;
  summary: string;
  keyEvent: string;
  sources: string[];
  sourceCount: number;
  articles: ArticleLink[];
  showBiasNote: boolean;
  biasNote?: string;
}

export interface StoriesResponse {
  stories: StoryCluster[];
  count: number;
  timestamp: string;
}

export async function getStories(): Promise<StoriesResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/stories`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch stories");
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching stories:", error);
    return { stories: [], count: 0, timestamp: new Date().toISOString() };
  }
}
