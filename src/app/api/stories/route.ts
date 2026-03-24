import { NextResponse } from "next/server";
import { fetchAllFinanceNews } from "@/lib/rss-service";
import { buildStoryClusters } from "@/lib/gemini-service";

export async function GET() {
  try {
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
      { error: "Failed to build stories", stories: [], count: 0 },
      { status: 500 }
    );
  }
}
