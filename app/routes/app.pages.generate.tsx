import { json, redirect } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { parseIntent } from "../services/ai/intent.service";
import { matchProducts } from "../services/product.service";
import { generatePageContent } from "../services/ai/content.service";
import { prisma } from "../services/db.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const keyword = formData.get("keyword") as string;
  const pageId = formData.get("pageId") as string;
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  if (!keyword || !pageId) {
    return json({ error: "Missing keyword or pageId" }, { status: 400 });
  }

  try {
    // 1. Get the existing page
    const existingPage = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!existingPage) {
      return json({ error: "Page not found" }, { status: 404 });
    }

    // 2. Parse intent (if not already parsed)
    let intent = existingPage.intent as any;
    if (!intent || Object.keys(intent).length === 0) {
      intent = await parseIntent(keyword);
    }

    // 3. Match products
    const match = await matchProducts(admin, intent, shop);

    // 4. Check threshold
    const thresholdMet = match.count >= 6;

    // 5. Generate content
    let content = null;
    if (thresholdMet) {
      content = await generatePageContent(intent, match.products, "en-us");
    }

    // 6. Update the page
    const updatedPage = await prisma.page.update({
      where: { id: pageId },
      data: {
        intent,
        products: match.products,
        content,
        status: thresholdMet ? "draft" : "review",
        updatedAt: new Date(),
      },
    });

    return json({
      success: true,
      page: updatedPage,
      productCount: match.count,
      thresholdMet,
      contentGenerated: !!content,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return json({
      error: error instanceof Error ? error.message : "Generation failed",
    }, { status: 500 });
  }
};