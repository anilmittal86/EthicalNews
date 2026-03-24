import { NextResponse } from "next/server";
import { fetchAllFinanceNews } from "@/lib/rss-service";
import { callGemini } from "@/lib/gemini-service";

const CLUSTERING_PROMPT = `Group these financial news headlines into topics.

HEADLINES:
{headlines}

Return ONLY valid JSON array. Each item: {"title":"Brief title","headlineIndices":[0,1,2],"keyEvent":"What happened"}

Rules:
- Group headlines about same event
- Indices 0 to {maxIndex}`;

const SIMPLE_PROMPT = `Group these headlines by topic. Return JSON: [{"title":"Topic","indices":[0,2],"event":"What"}]`;

function parseClusterResponse(text: string): { clusters: any[]; parseError?: string } {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    let parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return { clusters: parsed.map((item: any) => ({
        title: item.title || item.t || "News",
        headlineIndices: item.headlineIndices || item.indices || item.i || [],
        keyEvent: item.keyEvent || item.event || item.e || ""
      }))};
    }
    if (parsed.clusters && Array.isArray(parsed.clusters)) {
      return { clusters: parsed.clusters };
    }
    return { clusters: [] };
  } catch (e: any) {
    return { clusters: [], parseError: String(e) };
  }
}

export async function GET() {
  try {
    const news = await fetchAllFinanceNews(15);
    const headlines = news.slice(0, 20);
    
    const headlinesText = headlines.map((item, idx) => `${idx} - ${item.source}: ${item.title}`).join("\n");
    
    const prompt1 = CLUSTERING_PROMPT.replace("{headlines}", headlinesText).replace("{maxIndex}", String(headlines.length - 1));
    const prompt2 = SIMPLE_PROMPT.replace("{headlines}", headlinesText);

    const [response1, response2] = await Promise.all([
      callGemini(prompt1).catch((e: any) => `Error: ${e}`),
      callGemini(prompt2).catch((e: any) => `Error: ${e}`)
    ]);

    const parsed1 = parseClusterResponse(response1);
    const parsed2 = parseClusterResponse(response2);

    return NextResponse.json({
      headlines: headlinesText,
      response1,
      parsed1,
      response2,
      parsed2,
      newsCount: news.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}