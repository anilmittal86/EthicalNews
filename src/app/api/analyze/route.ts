import { NextRequest, NextResponse } from "next/server";
import { analyzeHeadlineBias } from "@/lib/gemini-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { headline, source } = body;

    if (!headline || !source) {
      return NextResponse.json(
        { error: "Missing headline or source" },
        { status: 400 }
      );
    }

    const analysis = await analyzeHeadlineBias(headline, source);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error analyzing bias:", error);
    return NextResponse.json(
      { error: "Failed to analyze bias" },
      { status: 500 }
    );
  }
}
