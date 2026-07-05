// app/routes/pages.$slug.tsx – Public PLP route
import { useLoaderData, Link } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { prisma } from "../services/db.server";

// ✅ Loader: Fetch the published page by slug
export const loader: LoaderFunction = async ({ params }) => {
  const { slug } = params;
  
  if (!slug) {
    return redirect("/");
  }

  // ✅ Only fetch published pages (SEO-friendly)
  const page = await prisma.page.findUnique({
    where: { 
      slug: slug,
      status: "published", // Only published pages are public
    },
  });

  if (!page) {
    throw new Response("Page not found", { status: 404 });
  }

  // Parse content
  let content = null;
  if (page.content) {
    try {
      content = typeof page.content === "string" 
        ? JSON.parse(page.content) 
        : page.content;
    } catch (e) {
      console.error("Failed to parse content:", e);
    }
  }

  // ✅ Generate JSON-LD schema
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": page.keyword,
    "description": content?.intro?.slice(0, 200) || "",
    "url": `${process.env.SHOPIFY_APP_URL}/pages/${page.slug}`,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": (Array.isArray(page.products) ? page.products : []).map((product: any, index: number) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "name": product.title,
          "description": product.description || "",
          "image": product.featuredImage?.url || "",
        },
      })),
    },
  };

  // ✅ Meta data for SEO
  const metaTitle = content?.meta_title || page.keyword;
  const metaDescription = content?.meta_description || `Explore our ${page.keyword} collection.`;
  const canonicalUrl = `${process.env.SHOPIFY_APP_URL}/pages/${page.slug}`;
  const noindex = page.status !== "published"; // Only index published pages

  // ✅ Add header to skip ngrok warning
  const headers = new Headers();
  headers.set("ngrok-skip-browser-warning", "true");

  return json({ 
    page, 
    content, 
    schemaMarkup,
    metaTitle,
    metaDescription,
    canonicalUrl,
    noindex,
  }, { headers });
};

// ✅ SEO Meta Tags (this is what Google sees!)
export function meta({ data }: { data: any }) {
  if (!data) {
    return [{ title: "Page not found" }];
  }
  
  const { metaTitle, metaDescription, noindex, canonicalUrl } = data;
  
  const tags = [
    { title: metaTitle },
    { name: "description", content: metaDescription },
    { name: "robots", content: noindex ? "noindex, nofollow" : "index, follow" },
    { rel: "canonical", href: canonicalUrl },
  ];

  return tags;
}

// ✅ Public Page Component
export default function PublicPage() {
  const { page, content, schemaMarkup } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* ✅ JSON-LD Schema (for Google) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />

      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <div className="border-b pb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {content?.h1 || page.keyword}
            </h1>
            <div className="flex gap-4 mt-2">
              <span className="text-sm text-gray-500">
                Products: {Array.isArray(page.products) ? page.products.length : 0}
              </span>
              <span className="text-sm text-gray-500">
                Locale: {page.locale || "en-us"}
              </span>
            </div>
          </div>

          {/* Content */}
          {content ? (
            <>
              {content.intro && (
                <div>
                  <h2 className="text-sm font-medium text-gray-500">Intro</h2>
                  <p className="mt-1 text-gray-700">{content.intro}</p>
                </div>
              )}

              {content.sections && content.sections.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-gray-500">Sections</h2>
                  <div className="space-y-4 mt-2">
                    {content.sections.map((section: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-300 pl-4">
                        <h3 className="font-semibold">{section.heading}</h3>
                        <p className="text-gray-700 mt-1">{section.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.faq && content.faq.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-gray-500">FAQ</h2>
                  <div className="space-y-3 mt-2">
                    {content.faq.map((item: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium">Q: {item.question}</p>
                        <p className="text-gray-700 mt-1">A: {item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No content available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}