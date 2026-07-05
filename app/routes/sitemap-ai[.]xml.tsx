import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { prisma } from "../services/db.server";

export const loader: LoaderFunction = async () => {
  const pages = await prisma.page.findMany({
    where: { status: "published" },
  });

  const baseUrl = process.env.SHOPIFY_APP_URL || "https://example.com";

  // Generate XML
  const urls = pages.map((page: { slug: string; updatedAt: Date }) => `
    <url>
      <loc>${baseUrl}/pages/${page.slug}</loc>
      <lastmod>${page.updatedAt.toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>
  `).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
};