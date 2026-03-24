import { NextResponse } from "next/server";
import { fetchAllFinanceNews } from "@/lib/rss-service";
import { buildStoryClusters } from "@/lib/gemini-service";

export async function GET() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        error: "GEMINI_API_KEY not configured",
        stories: [],
        count: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const news = await fetchAllFinanceNews(15);

    const stories = await buildStoryClusters(news);

    return NextResponse.json({
      stories,
      count: stories.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error building stories:", error);
    return NextResponse.json(
      { 
        error: String(error),
        stories: [], 
        count: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
