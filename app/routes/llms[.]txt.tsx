import type { LoaderFunction } from "@remix-run/node";
import { prisma } from "../services/db.server";

export const loader: LoaderFunction = async () => {
  // Get all published pages
  const pages = await prisma.page.findMany({
    where: { status: "published" },
    orderBy: { createdAt: "desc" },
  });

  // Generate llms.txt content
  let content = "# Wild Palace - Product Listing Pages\n\n";
  content += "This file lists all published product listing pages for AI crawlers.\n\n";
  content += "## Collections\n\n";
  content += "- Wallpaper Collections\n";
  content += "- Peel and Stick Collections\n\n";
  content += "## All Published Pages\n\n";

  if (pages.length === 0) {
    content += "No published pages yet.\n";
  } else {
    pages.forEach((page: { keyword: string; slug: string; locale?: string }) => {
      const locale = page.locale || "en-us";
      // ✅ Fix the template literal syntax
      content += `- ${page.keyword} (${locale}) → /pages/${page.slug}\n`;
    });
  }

  // ✅ Return AFTER the loop, not inside it
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  });
};