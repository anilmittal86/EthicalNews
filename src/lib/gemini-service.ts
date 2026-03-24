import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface BiasAnalysis {
  headline: string;
  source: string;
  biasNote: string;
  biasLevel: "low" | "medium" | "high";
  indicators: string[];
  isSensationalist: boolean;
}

const BIAS_PROMPT = `You are a media bias detector specializing in financial and stock market news. Analyze the following news headline and provide a brief bias analysis.

Headline: "{headline}"
Source: {source}

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "biasNote": "Brief explanation of any bias detected (1-2 sentences)",
  "biasLevel": "low" or "medium" or "high",
  "indicators": ["list of specific bias indicators found"],
  "isSensationalist": true or false
}

Rules:
- biasLevel "low" means balanced, factual reporting
- biasLevel "medium" means minor bias or selective framing
- biasLevel "high" means clear political/economic bias, one-sided, or misleading
- isSensationalist should be true if the headline uses exaggeration, emotional language, or clickbait tactics
- indicators should include specific phrases or techniques detected (e.g., "uses loaded language", "omits counterarguments", "cherry-picks data")
- If no bias is detected, biasLevel should be "low" and biasNote should be "No significant bias detected."
- Keep it concise and objective`;

export async function analyzeHeadlineBias(
  headline: string,
  source: string
): Promise<BiasAnalysis> {
  const defaultResponse: BiasAnalysis = {
    headline,
    source,
    biasNote: "Analysis unavailable",
    biasLevel: "medium",
    indicators: [],
    isSensationalist: false,
  };

  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set, returning default response");
    return { ...defaultResponse, biasNote: "Gemini API key not configured" };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = BIAS_PROMPT.replace("{headline}", headline).replace(
      "{source}",
      source
    );

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        headline,
        source,
        biasNote: parsed.biasNote || defaultResponse.biasNote,
        biasLevel: ["low", "medium", "high"].includes(parsed.biasLevel)
          ? parsed.biasLevel
          : defaultResponse.biasLevel,
        indicators: Array.isArray(parsed.indicators)
          ? parsed.indicators
          : defaultResponse.indicators,
        isSensationalist: Boolean(parsed.isSensationalist),
      };
    }

    console.error("Could not parse JSON from Gemini response:", text);
    return defaultResponse;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return { ...defaultResponse, biasNote: "Error analyzing bias" };
  }
}

export async function analyzeMultipleHeadlines(
  headlines: Array<{ headline: string; source: string }>
): Promise<BiasAnalysis[]> {
  const results = await Promise.all(
    headlines.map((item) => analyzeHeadlineBias(item.headline, item.source))
  );
  return results;
}
