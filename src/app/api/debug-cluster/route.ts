import { NextResponse } from "next/server";
import { fetchAllFinanceNews } from "@/lib/rss-service";
import { clusterHeadlines } from "@/lib/gemini-service";

export async function GET() {
  try {
    const news = await fetchAllFinanceNews(15);
    const headlinesText = news.slice(0, 20).map((item, idx) => `${idx} - ${item.source}: ${item.title}`).join("\n");

    const clusterResult = await clusterHeadlines(news);

    return NextResponse.json({
      rawHeadlines: headlinesText,
      clusterResult,
      newsCount: news.length,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}