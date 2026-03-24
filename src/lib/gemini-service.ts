import { GoogleGenerativeAI } from "@google/generative-ai";
import { NewsItem, StoryCluster, ArticleLink } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const MODEL_NAME = "gemini-2.0-flash";

interface ClusterResult {
  clusters: Array<{
    title: string;
    headlineIndices: number[];
    keyEvent: string;
  }>;
}

const CLUSTERING_PROMPT = `You are a news editor. Group these financial news headlines by topic/story.

HEADLINES:
{headlines}

TASK: Identify groups of headlines that cover the same event/news story. Each group should contain headlines from different sources about the same topic.

OUTPUT FORMAT: Return ONLY valid JSON, no other text.
{
  "clusters": [
    {
      "title": "Brief factual title for this story (max 10 words)",
      "headlineIndices": [0, 3, 7],
      "keyEvent": "One sentence describing what happened"
    }
  ]
}

RULES:
- Group headlines about the same event/story together
- Title must be factual, neutral, no opinion words
- headlineIndices must be valid integers from 0 to {totalHeadlinesMinus1}
- Every headline index from 0 to {totalHeadlinesMinus1} must appear in exactly one cluster
- Create as few clusters as possible while keeping related stories together

EXAMPLE OUTPUT:
{"clusters":[{"title":"Oil Prices Rise on OPEC Decision","headlineIndices":[0,2,5],"keyEvent":"OPEC announced production cuts causing oil prices to rise 5%"}]}`;

const SUMMARY_PROMPT = `Write a neutral news summary and assess coverage tone.

STORY: {title}
HEADLINES FROM {sourceCount} SOURCES: {headlines}

TASK:
1. Write a 2-3 sentence neutral summary of what happened based on these headlines
2. Assess if the coverage shows notable bias or sensationalism

OUTPUT FORMAT: Return ONLY valid JSON, no other text.
{
  "summary": "Neutral summary text (2-3 sentences)",
  "showBiasNote": false,
  "biasNote": ""
}

RULES:
- Summary must be factual, no opinions or speculation
- showBiasNote should be true ONLY if headlines use emotional/exaggerated language or present one-sided view
- biasNote should briefly explain the tone issue if showBiasNote is true
- Keep summary concise and informative`;

export async function analyzeHeadlineBias(
  headline: string,
  source: string
): Promise<{ biasNote: string; biasLevel: "low" | "medium" | "high" }> {
  if (!process.env.GEMINI_API_KEY) {
    return { biasNote: "API not configured", biasLevel: "medium" };
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Analyze this financial news headline for bias. Return JSON only.

Headline: "${headline}"
Source: ${source}

{"biasNote":"brief note","biasLevel":"low|medium|high"}`;

    const response = await callGemini(prompt);
    const result = parseJsonResponse<{ biasNote: string; biasLevel: string }>(
      response,
      { biasNote: "Analysis unavailable", biasLevel: "medium" }
    );

    return {
      biasNote: result.biasNote,
      biasLevel: ["low", "medium", "high"].includes(result.biasLevel)
        ? result.biasLevel as "low" | "medium" | "high"
        : "medium",
    };
  } catch (error) {
    console.error("Error analyzing bias:", error);
    return { biasNote: "Error analyzing", biasLevel: "medium" };
  }
}

async function callGemini(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

function parseJsonResponse<T>(text: string, defaultValue: T): T {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("JSON parse error:", error);
  }
  return defaultValue;
}

export async function clusterHeadlines(
  news: NewsItem[]
): Promise<ClusterResult> {
  if (news.length === 0) {
    return { clusters: [] };
  }

  const headlinesText = news
    .map((item, idx) => `[${idx}] ${item.source}: ${item.title}`)
    .join("\n");

  const prompt = CLUSTERING_PROMPT
    .replace("{headlines}", headlinesText)
    .replace(/\{totalHeadlinesMinus1\}/g, String(news.length - 1));

  try {
    const response = await callGemini(prompt);
    console.log("Clustering raw response:", response);
    
    const result = parseJsonResponse<ClusterResult>(response, { clusters: [] });
    console.log("Clustering parsed result:", JSON.stringify(result));

    if (!result.clusters || result.clusters.length === 0) {
      console.log("No clusters found in response");
      return { clusters: [] };
    }

    for (const cluster of result.clusters) {
      if (!cluster.headlineIndices) {
        cluster.headlineIndices = [];
      }
      cluster.headlineIndices = cluster.headlineIndices.filter(
        (idx) => idx >= 0 && idx < news.length
      );
    }

    return result;
  } catch (error) {
    console.error("Error clustering headlines:", error);
    return { clusters: [] };
  }
}

export async function generateClusterSummary(
  title: string,
  keyEvent: string,
  headlines: string[],
  sourceCount: number
): Promise<{ summary: string; showBiasNote: boolean; biasNote: string }> {
  const prompt = SUMMARY_PROMPT.replace("{title}", title)
    .replace("{keyEvent}", keyEvent)
    .replace("{sourceCount}", sourceCount.toString())
    .replace("{headlines}", headlines.join("; "));

  try {
    const response = await callGemini(prompt);
    const result = parseJsonResponse<{
      summary: string;
      showBiasNote: boolean;
      biasNote: string;
    }>(response, {
      summary: keyEvent,
      showBiasNote: false,
      biasNote: "",
    });

    return {
      summary: result.summary || keyEvent,
      showBiasNote: Boolean(result.showBiasNote),
      biasNote: result.biasNote || "",
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    return {
      summary: keyEvent,
      showBiasNote: false,
      biasNote: "",
    };
  }
}

function buildFallbackClusters(news: NewsItem[]): StoryCluster[] {
  const groupedBySource = new Map<string, NewsItem[]>();
  
  for (const item of news) {
    const source = item.source;
    if (!groupedBySource.has(source)) {
      groupedBySource.set(source, []);
    }
    groupedBySource.get(source)!.push(item);
  }

  const clusters: StoryCluster[] = [];
  let idx = 0;
  
  groupedBySource.forEach((items) => {
    if (items.length === 0) return;
    
    const articles: ArticleLink[] = items.map((item) => ({
      source: item.source,
      headline: item.title,
      url: item.link,
      biasLevel: "medium" as const,
    }));

    const sources = [...new Set(articles.map((a) => a.source))];

    clusters.push({
      id: `cluster-${idx++}`,
      title: items[0].title.substring(0, 80) + (items[0].title.length > 80 ? "..." : ""),
      summary: `${items.length} article${items.length > 1 ? "s" : ""} from ${sources.join(", ")}`,
      keyEvent: items[0].title,
      sources,
      sourceCount: sources.length,
      articles,
      showBiasNote: false,
      biasNote: "",
    });
  });

  return clusters.slice(0, 10);
}

export async function buildStoryClusters(
  news: NewsItem[]
): Promise<StoryCluster[]> {
  if (news.length === 0) return [];

  const clusterResult = await clusterHeadlines(news);

  if (clusterResult.clusters.length === 0) {
    console.log("Gemini clustering failed, using fallback");
    return buildFallbackClusters(news);
  }

  const clusters: StoryCluster[] = [];

  for (let i = 0; i < clusterResult.clusters.length; i++) {
    const cluster = clusterResult.clusters[i];
    
    if (cluster.headlineIndices.length === 0) continue;

    const articles: ArticleLink[] = cluster.headlineIndices
      .filter((idx) => idx >= 0 && idx < news.length)
      .map((idx) => ({
        source: news[idx].source,
        headline: news[idx].title,
        url: news[idx].link,
        biasLevel: "medium" as const,
      }));

    const sources = [...new Set(articles.map((a) => a.source))];

    const summaryResult = await generateClusterSummary(
      cluster.title,
      cluster.keyEvent,
      articles.map((a) => a.headline),
      sources.length
    );

    clusters.push({
      id: `cluster-${i}`,
      title: cluster.title,
      summary: summaryResult.summary,
      keyEvent: cluster.keyEvent,
      sources,
      sourceCount: sources.length,
      articles,
      showBiasNote: summaryResult.showBiasNote,
      biasNote: summaryResult.biasNote,
    });
  }

  return clusters.sort((a, b) => b.articles.length - a.articles.length);
}
