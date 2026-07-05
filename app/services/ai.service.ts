import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: process.env.AI_MODEL || "gemini-1.5-flash" });

export interface Intent {
  color?: string;
  style?: string;
  use_case?: string;
  audience?: string;
  attributes?: string[];
  room?: string;
}

export async function parseIntent(keyword: string): Promise<Intent> {
  const prompt = `
    Parse the following keyword and extract structured data.
    Return ONLY valid JSON, no markdown, no extra text.
    
    Keyword: "${keyword}"
    
    Extract these fields if present:
    - color (string)
    - style (string) 
    - use_case (string)
    - audience (string)
    - room (string)
    - attributes (string array)
    
    Return JSON like this:
    {
      "color": "midnight blue",
      "style": "botanical",
      "use_case": "kids room",
      "audience": "parents",
      "room": "bedroom",
      "attributes": ["sustainable", "eco-friendly"]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Intent parsing error:", error);
    return {};
  }
}