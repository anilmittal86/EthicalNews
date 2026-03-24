import { GoogleGenerativeAI } from "@google/generative-ai";
import { NewsItem, StoryCluster, ArticleLink } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const MODEL_NAME = "gemini-1.5-flash";

interface ClusterResult {
  clusters: Array<{
    title: string;
    headlineIndices: number[];
    keyEvent: string;
  }>;
}

const CLUSTERING_PROMPT = `Group these financial news headlines into topics. Each topic should have headlines about the same story.

HEADLINES (index - source - title):
{headlines}

Return ONLY valid JSON array. Each cluster needs:
- title: Brief neutral title (max 8 words)
- headlineIndices: Array of headline numbers
- keyEvent: One sentence about what happened

Example: [{"title":"Oil Prices Rise","headlineIndices":[0,3,7],"keyEvent":"Oil prices rose 5% after OPEC announcement"}]

Rules:
- Group headlines about same event
- Every headline index must be in exactly one cluster
- Indices must be 0 to {maxIndex}
- Keep title factual, no opinions`;

const SIMPLE_CLUSTERING_PROMPT = `Simple task: Group these headlines by topic.

{headlines}

Return JSON: [{"title":"Topic","indices":[0,2,5],"event":"What happened"}]`;

export async function analyzeHeadlineBias(
  headline: string,
  source: string
): Promise<{ biasNote: string; biasLevel: "low" | "medium" | "high" }> {
  if (!process.env.GEMINI_API_KEY) {
    return { biasNote: "API not configured", biasLevel: "medium" };
  }

  try {
    const prompt = `Analyze for bias. Return JSON.

Headline: "${headline}"
Source: ${source}

{"biasNote":"brief","biasLevel":"low|medium|high"}`;

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
    return { biasNote: "Error", biasLevel: "medium" };
  }
}

export async function callGemini(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

function parseClusterResponse(text: string): { clusters: Array<{ title: string; headlineIndices: number[]; keyEvent: string }> } {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    let parsed = JSON.parse(cleaned);
    
    if (Array.isArray(parsed)) {
      return {
        clusters: parsed.map((item) => ({
          title: item.title || "News Update",
          headlineIndices: item.headlineIndices || item.indices || [],
          keyEvent: item.keyEvent || item.event || "",
        }))
      };
    }
    
    if (parsed.clusters && Array.isArray(parsed.clusters)) {
      return {
        clusters: parsed.clusters.map((item: any) => ({
          title: item.title || "News Update",
          headlineIndices: item.headlineIndices || item.indices || [],
          keyEvent: item.keyEvent || item.event || "",
        }))
      };
    }
    
    return { clusters: [] };
  } catch (error) {
    console.error("JSON parse error:", error);
    return { clusters: [] };
  }
}

function parseJsonResponse<T>(text: string, defaultValue: T): T {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error("JSON parse error:", error);
    return defaultValue;
  }
}

async function clusterWithRetry(news: NewsItem[], retryCount = 0): Promise<ClusterResult> {
  if (news.length === 0) return { clusters: [] };

  const headlinesText = news
    .map((item, idx) => `${idx} - ${item.source}: ${item.title}`)
    .join("\n");

  const prompt = retryCount === 0
    ? CLUSTERING_PROMPT.replace("{headlines}", headlinesText).replace("{maxIndex}", String(news.length - 1))
    : SIMPLE_CLUSTERING_PROMPT.replace("{headlines}", headlinesText);

  try {
    const response = await callGemini(prompt);
    console.log(`Clustering response (attempt ${retryCount + 1}):`, response.substring(0, 300));

    const result = parseClusterResponse(response);

    if (!result.clusters || result.clusters.length === 0 || !Array.isArray(result.clusters)) {
      if (retryCount < 2) {
        console.log(`Retrying with simpler prompt (attempt ${retryCount + 2})`);
        return clusterWithRetry(news, retryCount + 1);
      }
      return { clusters: [] };
    }

    const validClusters = result.clusters
      .filter((c) => c.headlineIndices && c.headlineIndices.length > 0)
      .map((c) => ({
        title: c.title || "News Update",
        headlineIndices: c.headlineIndices.filter((idx) => idx >= 0 && idx < news.length),
        keyEvent: c.keyEvent || "",
      }))
      .filter((c) => c.headlineIndices.length > 0);

    return { clusters: validClusters };
  } catch (error) {
    console.error("Clustering error:", error);
    if (retryCount < 2) {
      console.log(`Retrying after error (attempt ${retryCount + 2})`);
      return clusterWithRetry(news, retryCount + 1);
    }
    return { clusters: [] };
  }
}

export async function clusterHeadlines(news: NewsItem[]): Promise<ClusterResult> {
  const limitedNews = news.slice(0, 20);
  return clusterWithRetry(limitedNews);
}

export async function generateClusterSummary(
  title: string,
  keyEvent: string,
  headlines: string[],
  sourceCount: number
): Promise<{ summary: string; showBiasNote: boolean; biasNote: string }> {
  const prompt = `Write 2 sentences of neutral news summary for Indian corporate readers.

Story: ${title}
Key event: ${keyEvent}
Sources: ${sourceCount}

Return JSON: {"summary":"text","showBiasNote":false,"biasNote":""}

Rules:
- Summary factual, professional tone
- showBiasNote=true only if headlines use emotional language`;

  try {
    const response = await callGemini(prompt);
    const result = parseJsonResponse<{ summary: string; showBiasNote: boolean; biasNote: string }>(
      response,
      { summary: keyEvent, showBiasNote: false, biasNote: "" }
    );

    return {
      summary: result.summary || keyEvent,
      showBiasNote: Boolean(result.showBiasNote),
      biasNote: result.biasNote || "",
    };
  } catch (error) {
    console.error("Summary error:", error);
    return { summary: keyEvent, showBiasNote: false, biasNote: "" };
  }
}

function buildFallbackClusters(news: NewsItem[]): StoryCluster[] {
  const seen = new Set<string>();
  const clusters: StoryCluster[] = [];

  for (let i = 0; i < Math.min(news.length, 20); i++) {
    const item = news[i];
    const key = item.title.substring(0, 50).toLowerCase();
    
    if (seen.has(key)) continue;
    seen.add(key);

    const article: ArticleLink = {
      source: item.source,
      headline: item.title,
      url: item.link,
      biasLevel: "medium",
    };

    clusters.push({
      id: `cluster-${clusters.length}`,
      title: item.title.substring(0, 80) + (item.title.length > 80 ? "..." : ""),
      summary: `Latest update from ${item.source}`,
      keyEvent: item.title,
      sources: [item.source],
      sourceCount: 1,
      articles: [article],
      showBiasNote: false,
      biasNote: "",
    });

    if (clusters.length >= 10) break;
  }

  return clusters;
}

export async function buildStoryClusters(news: NewsItem[]): Promise<StoryCluster[]> {
  if (news.length === 0) return [];

  const clusterResult = await clusterHeadlines(news);

  if (clusterResult.clusters.length === 0) {
    console.log("Using fallback clustering");
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
