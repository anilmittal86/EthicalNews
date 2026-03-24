import { GoogleGenerativeAI } from "@google/generative-ai";
import { NewsItem, StoryCluster, ArticleLink } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const MODEL_NAME = "gemini-2.0-flash";

export interface BiasAnalysisResult {
  headline: string;
  source: string;
  biasNote: string;
  biasLevel: "low" | "medium" | "high";
  indicators: string[];
  isSensationalist: boolean;
}

interface ClusterResult {
  clusters: Array<{
    title: string;
    headlineIndices: number[];
    keyEvent: string;
  }>;
}

const CLUSTERING_PROMPT = `You are a news editor organizing financial news stories. Group these headlines by topic/story.

Headlines:
{headlines}

Respond ONLY with valid JSON (no markdown):
{
  "clusters": [
    {
      "title": "Neutral, factual title for this story",
      "headlineIndices": [0, 2, 5],
      "keyEvent": "Brief description of what happened (1-2 sentences)"
    }
  ]
}

Rules:
- Group headlines about the same event/story together
- Title should be factual, neutral - avoid loaded words
- Minimum 2 headlines per cluster (single-source stories get single-item clusters)
- headlineIndices must reference valid indices from the input
- Cover all headlines - no orphaned headlines`;

const SUMMARY_PROMPT = `You are writing a neutral news summary for a curated financial news briefing.

Story: {title}
Key Event: {keyEvent}
Headlines from {sourceCount} sources: {headlines}

Tasks:
1. Write a 2-3 sentence neutral summary of what happened
2. Assess if any coverage shows notable bias or sensationalism

Respond ONLY with valid JSON:
{
  "summary": "Neutral summary text (2-3 sentences)",
  "showBiasNote": true or false,
  "biasNote": "Brief note about coverage tone if notable, else empty string"
}

Rules:
- Summary must be factual, neutral, no opinion
- showBiasNote: true only if coverage has notable emotional language or one-sided framing
- If all sources are balanced, showBiasNote should be false`;

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

export async function analyzeHeadlineBias(
  headline: string,
  source: string
): Promise<BiasAnalysisResult> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      headline,
      source,
      biasNote: "API not configured",
      biasLevel: "medium",
      indicators: [],
      isSensationalist: false,
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Analyze this financial news headline for bias.

Headline: "${headline}"
Source: ${source}

Respond ONLY with valid JSON:
{
  "biasNote": "Brief explanation (1-2 sentences)",
  "biasLevel": "low" or "medium" or "high",
  "indicators": ["specific phrases or techniques detected"],
  "isSensationalist": true or false
}

Low = balanced, factual. Medium = minor framing. High = clear bias or sensationalism.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const parsed = parseJsonResponse<{
      biasNote: string;
      biasLevel: string;
      indicators: string[];
      isSensationalist: boolean;
    }>(text, {
      biasNote: "Analysis unavailable",
      biasLevel: "medium",
      indicators: [],
      isSensationalist: false,
    });

    return {
      headline,
      source,
      biasNote: parsed.biasNote,
      biasLevel: ["low", "medium", "high"].includes(parsed.biasLevel)
        ? parsed.biasLevel as "low" | "medium" | "high"
        : "medium",
      indicators: Array.isArray(parsed.indicators) ? parsed.indicators : [],
      isSensationalist: Boolean(parsed.isSensationalist),
    };
  } catch (error) {
    console.error("Error analyzing bias:", error);
    return {
      headline,
      source,
      biasNote: "Error analyzing",
      biasLevel: "medium",
      indicators: [],
      isSensationalist: false,
    };
  }
}

export async function clusterHeadlines(
  news: NewsItem[]
): Promise<ClusterResult> {
  if (news.length === 0) {
    return { clusters: [] };
  }

  const headlinesText = news
    .map((item, idx) => `${idx}. [${item.source}] ${item.title}`)
    .join("\n");

  const prompt = CLUSTERING_PROMPT.replace("{headlines}", headlinesText);

  try {
    const response = await callGemini(prompt);
    const result = parseJsonResponse<ClusterResult>(response, { clusters: [] });

    for (const cluster of result.clusters) {
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

export async function buildStoryClusters(
  news: NewsItem[]
): Promise<StoryCluster[]> {
  if (news.length === 0) return [];

  const clusterResult = await clusterHeadlines(news);

  const clusters: StoryCluster[] = [];

  for (let i = 0; i < clusterResult.clusters.length; i++) {
    const cluster = clusterResult.clusters[i];
    const articles: ArticleLink[] = cluster.headlineIndices.map((idx) => ({
      source: news[idx].source,
      headline: news[idx].title,
      url: news[idx].link,
      biasLevel: "medium",
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
