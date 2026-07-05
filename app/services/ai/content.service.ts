import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Intent } from "./intent.service";
import { getLocaleConfig } from "../locale.service";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: process.env.AI_MODEL || "gemini-1.5-flash" });

export interface PageContent {
  h1: string;
  intro: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  meta_title: string;
  meta_description: string;
  schema_markup: {
    collectionPage: any;
    itemList: any;
  };
}

// Helper to generate slug from keyword
export function generateSlug(keyword: string, locale: string = "en-us"): string { // Helper to generate slug with locale
  const baseSlug = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${baseSlug}-${locale}`;
}

export async function generatePageContent(
  intent: Intent,
  products: any[],
  locale: string = "en-us"
): Promise<PageContent> {
  const productTitles = products.map(p => p.title).slice(0, 5).join(", ");

  const prompt = `
    You are an expert SEO content writer specializing in home decor and wallpaper.
    
    Create a product listing page (PLP) for a wallpaper collection.
    
    Intent: ${JSON.stringify(intent, null, 2)}
    Available Products (${products.length} total): ${productTitles}
    Locale: ${locale}
    
    Return ONLY valid JSON with this structure:
    {
      "h1": "string (SEO-optimized H1 heading, under 60 chars)",
      "intro": "string (150-200 words introducing the collection, engaging for readers)",
      "sections": [
        {
          "heading": "string (H2 heading)",
          "content": "string (paragraph content)"
        }
      ],
      "faq": [
        {
          "question": "string (FAQ question)",
          "answer": "string (FAQ answer, self-contained)"
        }
      ],
      "meta_title": "string (under 60 characters)",
      "meta_description": "string (under 160 characters)",
      "schema_markup": {
        "collectionPage": { "name": "string", "description": "string" },
        "itemList": { "itemListElement": [] }
      }
    }
    
    Guidelines:
    - The H1 should match the primary keyword exactly
    - The intro should be engaging and include the main keyword naturally
    - Include at least 3 sections with unique content
    - FAQ answers must be self-contained and useful for voice search
    - Meta title should include the primary keyword
    - Meta description should drive clicks
    - Use locale-appropriate terminology
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // ✅ Try multiple ways to extract JSON
    let jsonStr = text;
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    
    // Try to find JSON object in the text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    // ✅ Clean up common JSON issues
    jsonStr = jsonStr
      .replace(/\n/g, " ")  // Remove newlines
      .replace(/,\s*}/g, "}")  // Remove trailing commas
      .replace(/,\s*\]/g, "]")  // Remove trailing commas in arrays
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');  // Quote unquoted keys
    
    // ✅ Parse JSON with error handling
    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      // If parsing fails, try a more aggressive cleanup
      const cleaned = jsonStr
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        .replace(/:\s*'([^']*)'/g, ':"$1"');
      
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        console.error("JSON parsing failed:", e);
        return getFallbackContent(intent, locale);
      }
    }
  } catch (error) {
    console.error("Content generation error:", error);
    return getFallbackContent(intent, locale);
  }
}

// Fallback content when AI fails
function getFallbackContent(intent: Intent, locale: string = "en-us"): PageContent {
  const style = intent.style || "stylish";
  const room = intent.room || "your home";
  
  return {
    h1: `${style.charAt(0).toUpperCase() + style.slice(1)} Wallpaper${room ? ` for ${room}` : ""}`,
    intro: `Discover our stunning collection of ${style} wallpaper${room ? ` for ${room}` : ""}. Featuring beautiful designs, this collection combines style and functionality to transform your space.`,
    sections: [
      {
        heading: "Why Choose This Collection",
        content: `This wallpaper collection features premium ${style} designs that bring character to any room. Each roll is crafted with attention to detail and durability in mind.`
      },
      {
        heading: `Perfect for ${room || "Your Space"}`,
        content: `Whether you're decorating a ${room || "room"} or looking for a fresh new look, this collection offers versatile designs that complement any interior style.`
      },
      {
        heading: "Quality You Can Trust",
        content: `All wallpapers in this collection are manufactured using high-quality materials and printing techniques that ensure vibrant colors and long-lasting beauty.`
      }
    ],
    faq: [
      {
        question: `What makes ${style} wallpaper special?`,
        answer: `This collection features ${style} designs that are both stylish and practical. The patterns are carefully selected to create visual interest while maintaining a timeless appeal.`
      },
      {
        question: `Is this wallpaper suitable for ${room || "any room"}?`,
        answer: `Yes, these wallpapers are designed to work in various spaces including ${room || "living rooms, bedrooms, and home offices"}. They offer both style and durability.`
      },
      {
        question: `How do I install this wallpaper?`,
        answer: `Installation instructions vary by product. Please refer to the specific product page for detailed application guidance.`
      },
      {
        question: `Is this wallpaper easy to maintain?`,
        answer: `Yes, these wallpapers are designed for easy maintenance. Most can be wiped clean with a soft, damp cloth. Always check the product specifications for care instructions.`
      }
    ],
    meta_title: `${style.charAt(0).toUpperCase() + style.slice(1)} Wallpaper${room ? ` for ${room}` : ""} | Collection`,
    meta_description: `Explore our ${style} wallpaper collection${room ? ` for ${room}` : ""}. High-quality designs at great prices. Shop now.`,
    schema_markup: {
      collectionPage: {
        name: `${style} Wallpaper Collection`,
        description: `A collection of ${style} wallpaper${room ? ` for ${room}` : ""}.`
      },
      itemList: { itemListElement: [] }
    }
  };
}