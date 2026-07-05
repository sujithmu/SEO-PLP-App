import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";
import { useState } from "react";
import { getRelatedPages } from "../services/link.service";
import { prisma } from "../services/db.server";

type Page = {
  id: string;
  keyword: string;
  status: "published" | "draft" | "review";
  productCount: number;
  slug: string;
  createdAt: string;
  views: number;
  content?: any;
  products?: any[];
  locale?: string;
  intent?: any;
  relatedPages?: Array<{
    id: string;
    keyword: string;
    slug: string;
    score: number;
  }>;
};

export const loader: LoaderFunction = async () => {
  const pages = await prisma.page.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      keyword: true,
      slug: true,
      status: true,
      products: true,
      content: true,
      views: true,
      createdAt: true,
      locale: true,
      intent: true,
    }
  });

  const formattedPages: Page[] = await Promise.all(
    pages.map(async (page: any) => {
      // Get related pages
      const related = await getRelatedPages(page.id, 3);
      
      return {
        id: page.id,
        keyword: page.keyword,
        status: page.status as "published" | "draft" | "review",
        productCount: Array.isArray(page.products) ? page.products.length : 0,
        slug: page.slug,
        createdAt: page.createdAt.toISOString(),
        views: page.views || 0,
        content: page.content ? (typeof page.content === "string" ? JSON.parse(page.content) : page.content) : null,
        products: page.products,
        locale: page.locale || "en-us",
        intent: page.intent,
        relatedPages: related,
      };
    })
  );

  return json({ pages: formattedPages });
};

export default function PagesPage() {
  const { pages } = useLoaderData<{ pages: Page[] }>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  
  // ✅ Modal state
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stats = {
    published: pages.filter((p: Page) => p.status === "published").length,
    draft: pages.filter((p: Page) => p.status === "draft").length,
    review: pages.filter((p: Page) => p.status === "review").length,
    totalViews: pages.reduce((sum: number, p: Page) => sum + (p.views || 0), 0),
  };

  // ✅ Open modal with page data
  const openModal = (page: Page) => {
    console.log("🔍 Opening modal for:", page.keyword); // ✅ Debug
    console.log("📄 Page data:", page); // ✅ Debug
    setSelectedPage(page);
    setIsModalOpen(true);
  };

  // ✅ Close modal
  const closeModal = () => {
    console.log("🔒 Closing modal"); // ✅ Debug
    setIsModalOpen(false);
    setSelectedPage(null);
  };

  // ✅ Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-green-100 text-green-800">Published</span>;
      case "draft":
        return <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-800">Draft</span>;
      case "review":
        return <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-red-100 text-red-800">Review</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Generated Pages</h1>
            <p className="text-gray-600 mt-1">
              Manage and monitor your programmatic SEO pages
            </p>
          </div>
          <button 
            onClick={() => navigate("/app/upload")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            + Generate New
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Pages</p>
          <p className="text-2xl font-bold text-gray-900">{pages.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
          <p className="text-sm font-medium text-green-600">Published</p>
          <p className="text-2xl font-bold text-green-700">{stats.published}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6">
          <p className="text-sm font-medium text-yellow-600">In Draft</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.draft}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          <p className="text-sm font-medium text-blue-600">Total Views</p>
          <p className="text-2xl font-bold text-blue-700">{stats.totalViews}</p>
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {page.keyword}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    /{page.slug}
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <span className={`font-medium ${
                    page.productCount >= 6 ? "text-green-600" : "text-yellow-600"
                  }`}>
                    {page.productCount}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(page.status)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(page.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {page.views || 0}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {/* ✅ View button opens modal */}
                    <button
                      onClick={() => openModal(page)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View
                    </button>
                    
                    <fetcher.Form method="post" action="/app/pages/publish">
                      <input type="hidden" name="pageId" value={page.id} />
                      {page.status !== "published" && (
                        <button
                          type="submit"
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                          disabled={fetcher.state === "submitting"}
                        >
                          {fetcher.state === "submitting" ? "..." : "Publish"}
                        </button>
                      )}
                    </fetcher.Form>

                    <fetcher.Form method="post" action="/app/pages/delete">
                      <input type="hidden" name="pageId" value={page.id} />
                      <button
                        type="submit"
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                        onClick={(e) => {
                          if (!confirm("Delete this page?")) e.preventDefault();
                        }}
                      >
                        Delete
                      </button>
                    </fetcher.Form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {pages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No pages generated yet</p>
            <button 
              onClick={() => navigate("/app/upload")}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg"
            >
              Upload Keywords to Get Started
            </button>
          </div>
        )}
      </div>

      {/* ✅ Modal - Inline Styles Version */}
      {isModalOpen && selectedPage && (() => {
        // Add this before the return in the modal
        console.log("Selected page products:", selectedPage.products);
        return (<div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '48rem',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}>
            {/* Close button */}
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#9CA3AF',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
                {selectedPage.keyword}
              </h2>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {selectedPage.status === 'published' && (
                  <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '9999px', backgroundColor: '#D1FAE5', color: '#065F46' }}>
                    ✅ Published
                  </span>
                )}
                {selectedPage.status === 'draft' && (
                  <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '9999px', backgroundColor: '#FEF3C7', color: '#92400E' }}>
                    📝 Draft
                  </span>
                )}
                {selectedPage.status === 'review' && (
                  <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '9999px', backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                    ⚠️ Review
                  </span>
                )}
                <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                  Products: {selectedPage.productCount}
                </span>
                <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                  Views: {selectedPage.views || 0}
                </span>
                <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                  Locale: {selectedPage.locale || 'en-us'}
                </span>
              </div>
            </div>

            {/* Content */}
            {selectedPage.content ? (
              <div>
                {/* H1 */}
                {selectedPage.content.h1 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6B7280' }}>H1</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                      {selectedPage.content.h1}
                    </p>
                  </div>
                )}

                {/* Intro */}
                {selectedPage.content.intro && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6B7280' }}>Intro</h3>
                    <p style={{ marginTop: '0.25rem', color: '#374151' }}>
                      {selectedPage.content.intro}
                    </p>
                  </div>
                )}

                {/* Sections */}
                {selectedPage.content.sections && selectedPage.content.sections.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6B7280' }}>Sections</h3>
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selectedPage.content.sections.map((section: any, index: number) => (
                        <div key={index} style={{ borderLeft: '4px solid #93C5FD', paddingLeft: '1rem' }}>
                          <h4 style={{ fontWeight: '600', fontSize: '0.875rem' }}>{section.heading}</h4>
                          <p style={{ color: '#374151', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            {section.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQ */}
                {selectedPage.content.faq && selectedPage.content.faq.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6B7280' }}>FAQ</h3>
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedPage.content.faq.map((item: any, index: number) => (
                        <div key={index} style={{ backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '0.5rem' }}>
                          <p style={{ fontWeight: '500', fontSize: '0.875rem' }}>Q: {item.question}</p>
                          <p style={{ color: '#374151', fontSize: '0.875rem', marginTop: '0.25rem' }}>A: {item.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

          {/* Product Alt Text */}
          {selectedPage.products && selectedPage.products.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6B7280', marginBottom: '0.5rem' }}>
                🖼️ Product Alt Text
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedPage.products.slice(0, 3).map((product: any, index: number) => (
                  <div key={index} style={{
                    backgroundColor: '#F9FAFB',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    color: '#374151'
                  }}>
                    <strong>{product.title}</strong>
                    <p style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                      alt: "{product.altText || 'No alt text generated'}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Pages */}
          {selectedPage.relatedPages && selectedPage.relatedPages.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6B7280', marginBottom: '0.5rem' }}>
                🔗 Related Pages
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedPage.relatedPages.map((related) => (
                  <Link
                    key={related.id}
                    to={`/app/pages/${related.slug}`}
                    style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: '#EBF5FF',
                      color: '#2563EB',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      textDecoration: 'none',
                    }}
                  >
                    {related.keyword}
                  </Link>
                ))}
              </div>
            </div>
          )}

                {/* SEO Meta */}
                {(selectedPage.content.meta_title || selectedPage.content.meta_description) && (
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem', marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6B7280' }}>SEO</h3>
                    {selectedPage.content.meta_title && (
                      <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
                        <strong>Title:</strong> {selectedPage.content.meta_title}
                      </p>
                    )}
                    {selectedPage.content.meta_description && (
                      <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
                        <strong>Description:</strong> {selectedPage.content.meta_description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#6B7280' }}>
                <p>No content generated yet.</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  This page needs at least 6 products to generate content.
                </p>
              </div>
            )}
          </div>
        </div>);
      })()}
    </div>
  );
}