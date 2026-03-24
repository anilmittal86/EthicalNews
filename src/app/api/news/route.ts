import { NextResponse } from "next/server";
import { fetchAllFinanceNews } from "@/lib/rss-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const news = await fetchAllFinanceNews(10);
    return NextResponse.json({
      news,
      count: news.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news", news: [], count: 0 },
      { status: 500 }
    );
  }
}
