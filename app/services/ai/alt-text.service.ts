import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Intent } from "./intent.service";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: process.env.AI_MODEL || "gemini-1.5-flash" });

export async function generateAltText(
  product: any,
  intent: Intent,
  locale: string = "en-us"
): Promise<string> {
  const prompt = `
    Generate a concise, SEO-friendly alt text for a product image.
    
    Product: ${product.title}
    Description: ${product.description || "No description available"}
    Intent: ${JSON.stringify(intent)}
    Locale: ${locale}
    
    Guidelines:
    - Max 125 characters
    - Include the product name and key attributes
    - Use natural, descriptive language
    - Include the primary keyword from the intent
    - Example: "Botanical green wallpaper with leaf pattern for living room"
    
    Return ONLY the alt text, no quotes, no preamble.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text.trim().slice(0, 125);
  } catch (error) {
    console.error("Alt text generation error:", error);
    return `${product.title} - ${intent.style || ""} ${intent.room || ""}`;
  }
}