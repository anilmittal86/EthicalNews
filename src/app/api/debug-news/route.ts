import { NextResponse } from "next/server";
import { fetchAllFinanceNews } from "@/lib/rss-service";

export async function GET() {
  try {
    const news = await fetchAllFinanceNews(15);

    return NextResponse.json({
      news,
      count: news.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: String(error), news: [], count: 0 },
      { status: 500 }
    );
  }
}
