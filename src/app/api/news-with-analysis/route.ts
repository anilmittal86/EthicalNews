import { NextResponse } from "next/server";
import { fetchAllFinanceNews } from "@/lib/rss-service";
import { analyzeHeadlineBias } from "@/lib/gemini-service";

export async function GET() {
  try {
    const news = await fetchAllFinanceNews(10);
    const analyses = await Promise.all(
      news.map(async (item) => {
        const analysis = await analyzeHeadlineBias(item.title, item.source);
        return {
          ...item,
          biasAnalysis: analysis,
        };
      })
    );

    return NextResponse.json({
      news: analyses,
      count: analyses.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching news with analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch and analyze news", news: [], count: 0 },
      { status: 500 }
    );
  }
}
