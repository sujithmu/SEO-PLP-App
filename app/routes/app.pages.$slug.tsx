import { useLoaderData, Link } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { prisma } from "../services/db.server";

export const loader: LoaderFunction = async ({ params }) => {
  const { slug } = params;
  
  if (!slug) {
    return redirect("/app/pages");
  }

  const page = await prisma.page.findUnique({
    where: { slug },
  });

  if (!page) {
    return redirect("/app/pages");
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

  // Generate JSON-LD schema
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

  // ✅ Get base URL from environment (server-side)
  const baseUrl = process.env.SHOPIFY_APP_URL || "https://example.com";
  const canonicalUrl = `${baseUrl}/pages/${page.slug}`;
  
  // Check if page should be indexed
  const noindex = page.status === "draft" || page.status === "review";

  // Metadata
  const metaTitle = content?.meta_title || page.keyword;
  const metaDescription = content?.meta_description || `Explore our ${page.keyword} collection.`;

  // ✅ Add header to skip ngrok warning
  const headers = new Headers();
  headers.set("ngrok-skip-browser-warning", "true");

  return json({ 
    page, 
    content, 
    schemaMarkup, 
    noindex,
    metaTitle,
    metaDescription,
    canonicalUrl,
  }, { headers });
};

// Meta tags for the page
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

export default function ViewPage() {
  const { page, content, schemaMarkup, noindex, metaTitle, metaDescription } = useLoaderData<typeof loader>();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />

      <div className="mb-6">
        <Link 
          to="/app/pages" 
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Back to Pages
        </Link>
        {noindex && (
          <span className="ml-4 text-xs text-red-500">🔒 Draft - Not Indexed</span>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold">{page.keyword}</h1>
          <div className="flex gap-4 mt-2">
            <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
              page.status === "published" 
                ? "bg-green-100 text-green-800" 
                : page.status === "draft" 
                ? "bg-yellow-100 text-yellow-800" 
                : "bg-red-100 text-red-800"
            }`}>
              {page.status.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">
              Products: {Array.isArray(page.products) ? page.products.length : 0}
            </span>
            <span className="text-sm text-gray-500">
              Views: {page.views || 0}
            </span>
            <span className="text-sm text-gray-500">
              Locale: {page.locale || "en-us"}
            </span>
          </div>
        </div>

        {/* Content */}
        {content ? (
          <>
            {content.h1 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500">H1</h2>
                <p className="text-xl font-bold mt-1">{content.h1}</p>
              </div>
            )}

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

            {(content.meta_title || content.meta_description) && (
              <div className="border-t pt-4">
                <h2 className="text-sm font-medium text-gray-500">SEO</h2>
                {content.meta_title && (
                  <p className="mt-1"><strong>Title:</strong> {content.meta_title}</p>
                )}
                {content.meta_description && (
                  <p className="mt-1"><strong>Description:</strong> {content.meta_description}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No content generated yet.</p>
            <p className="text-sm mt-2">
              This page needs at least 6 products to generate content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}