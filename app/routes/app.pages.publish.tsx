import { json, redirect } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../services/db.server";
import { createMetaobject } from "../services/shopify/metaobject.service";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const pageId = formData.get("pageId") as string;
  const { admin } = await authenticate.admin(request);

  if (!pageId) {
    return json({ error: "Page ID required" }, { status: 400 });
  }

  const page = await prisma.page.findUnique({
    where: { id: pageId },
  });

  if (!page) {
    return json({ error: "Page not found" }, { status: 404 });
  }

  // Parse content
  const content = typeof page.content === "string" 
    ? JSON.parse(page.content) 
    : page.content;

  // Create Shopify Metaobject
  const result = await createMetaobject(admin, {
    h1: content?.h1 || page.keyword,
    intro: content?.intro || "",
    sections: content?.sections || [],
    faq: content?.faq || [],
    meta_title: content?.meta_title || page.keyword,
    meta_description: content?.meta_description || "",
    keyword: page.keyword,
    slug: page.slug,
  });

  if (!result.success) {
    return json({ error: result.error }, { status: 500 });
  }

  // Update local database
  await prisma.page.update({
    where: { id: pageId },
    data: {
      status: "published",
      shopifyId: result.metaobjectId,
      updatedAt: new Date(),
    },
  });

  return redirect("/app/pages");
};