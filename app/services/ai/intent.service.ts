import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: process.env.AI_MODEL || "gemini-1.5-flash" });

export interface Intent {
  color?: string;
  style?: string;
  use_case?: string;
  audience?: string;
  room?: string;
  attributes?: string[];
  confidence?: number;
}

export async function parseIntent(keyword: string): Promise<Intent> {
  const prompt = `
    You are an expert at parsing interior design and home decor keywords.
    
    Parse the following keyword and extract structured data.
    Return ONLY valid JSON, no markdown, no extra text.
    
    Keyword: "${keyword}"
    
    Extract these fields if present:
    - color (string): color mentioned in the keyword
    - style (string): design style (botanical, modern, floral, geometric, etc.)
    - use_case (string): how the wallpaper will be used
    - audience (string): who the wallpaper is for (parents, kids, renters, etc.)
    - room (string): room type (living room, bedroom, kids room, office, etc.)
    - attributes (string[]): list of attributes (sustainable, eco-friendly, peel-and-stick, etc.)
    
    Return JSON like this example:
    {
      "color": "midnight blue",
      "style": "botanical",
      "use_case": "kids room decor",
      "audience": "parents",
      "room": "kids room",
      "attributes": ["sustainable", "eco-friendly"],
      "confidence": 0.95
    }
    
    If a field isn't present, omit it or set to null.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Intent parsing error for:", keyword, error);
    return {
      style: "general",
      use_case: keyword,
      confidence: 0.5
    };
  }
}