import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: process.env.AI_MODEL || "gemini-1.5-flash" });

export async function generatePageContent(intent: any, products: any[], locale: string = "en-us") {
  const prompt = `
    Create a product listing page (PLP) for ${intent.style || intent.use_case || "this"} wallpaper.
    
    Intent: ${JSON.stringify(intent, null, 2)}
    Products: ${products.length} products available
    
    Locale: ${locale}
    
    Return ONLY valid JSON with this structure:
    {
      "h1": "string (SEO-optimized heading)",
      "intro": "string (150-200 words introducing the collection)",
      "sections": [
        {
          "heading": "string",
          "content": "string"
        }
      ],
      "faq": [
        {
          "question": "string",
          "answer": "string"
        }
      ],
      "meta_title": "string (under 60 characters)",
      "meta_description": "string (under 160 characters)",
      "schema_markup": {
        "collectionPage": {},
        "itemList": {}
      }
    }
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return JSON.parse(jsonMatch[0]);
}