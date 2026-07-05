import { useState } from "react";
import { useActionData, Form, useNavigation, useFetcher } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { parseIntent } from "../services/ai/intent.service";
import { matchProducts } from "../services/product.service";
import { generatePageContent, generateSlug } from "../services/ai/content.service";
import { createPage } from "../services/db.server";

export const loader: LoaderFunction = async () => {
  return json({});
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get("csvFile");
  const locale = (formData.get("locale") as string) || "en-us";
  
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  
  if (!file || !(file instanceof File)) {
    return json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split("\n").filter(line => line.trim());
  
  const keywords = lines
    .slice(1)
    .map(line => line.split(",")[0]?.trim())
    .filter(Boolean);

  const results = await Promise.all(
    keywords.map(async (keyword) => {
      try {
        console.log(`🔍 Processing: "${keyword}"`);
        const intent = await parseIntent(keyword);
        console.log(`📊 Intent:`, intent);
        const match = await matchProducts(admin, intent, shop);
        console.log(`📦 Products found: ${match.count}`);
        const thresholdMet = match.count >= 6;
        const content = await generatePageContent(intent, match.products, locale);
        const slug = generateSlug(keyword, locale);
        const page = await createPage({
          keyword,
          slug,
          intent,
          products: match.products,
          content,
          status: thresholdMet ? "draft" : "review",
          locale,
        });
        return {
          keyword,
          intent,
          productCount: match.count,
          thresholdMet,
          contentGenerated: !!content,
          pageId: page.id,
          slug,
          status: thresholdMet ? "draft" : "review",
          locale,
        };
      } catch (error) {
        console.error(`❌ Error processing "${keyword}":`, error);
        return {
          keyword,
          error: error instanceof Error ? error.message : "Processing failed",
          status: "error",
        };
      }
    })
  );

  return json({
    success: true,
    count: keywords.length,
    results,
    fileName: file.name,
    locale,
    processed: results.filter(r => r.status !== "error").length,
    errors: results.filter(r => r.status === "error").length,
  });
};

export default function UploadPage() {
  const actionData = useActionData<typeof action>();
  const [fileName, setFileName] = useState<string>("");
  const [locale, setLocale] = useState<string>("en-us");
  const navigation = useNavigation();
  const isProcessing = navigation.state === "submitting";
  
  // ✅ Single fetcher for generate actions
  const generateFetcher = useFetcher();

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Upload Keywords</h1>
        <p className="text-sm text-gray-600">
          Upload a CSV file to generate SEO-optimized product listing pages
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <Form method="post" encType="multipart/form-data">
          {/* Locale Selector */}
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Target Market
            </label>
            <select
              name="locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm w-48"
            >
              <option value="en-us">🇺🇸 United States</option>
              <option value="en-au">🇦🇺 Australia</option>
              <option value="en-gb">🇬🇧 United Kingdom</option>
              <option value="en-ca">🇨🇦 Canada</option>
            </select>
            <span className="text-xs text-gray-400">
              {locale === "en-us" ? "imperial" : "metric"}
            </span>
          </div>

          {/* Clean File Upload */}
          <div className="flex items-center gap-4">
            <input
              type="file"
              name="csvFile"
              accept=".csv"
              className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setFileName(file.name);
              }}
            />
            
            {fileName && (
              <span className="text-sm text-gray-600">
                📄 {fileName}
              </span>
            )}
            
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-6 rounded-lg transition-colors shadow-sm hover:shadow disabled:bg-blue-400 disabled:cursor-not-allowed"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Process Keywords"}
            </button>
          </div>
        </Form>

        {/* Results */}
        {actionData?.success && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  ✅ Processed {actionData.count} Keywords
                </p>
                <p className="text-xs text-gray-500">
                  From: {actionData.fileName} | Locale: {actionData.locale || "en-us"}
                </p>
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                  Ready: {actionData.results.filter((r: any) => r.status === "draft").length}
                </span>
                <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  Review: {actionData.results.filter((r: any) => r.status === "review").length}
                </span>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Intent</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {actionData.results.map((item: any, index: number) => {
                    const isGenerating = generateFetcher.state === "submitting" && 
                                         generateFetcher.formData?.get("pageId") === item.pageId;
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                          {item.keyword}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">
                          <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {item.intent?.style || "N/A"}
                          </span>
                          <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs ml-1">
                            {item.intent?.room || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">
                          <span className={`font-medium ${
                            item.productCount >= 6 ? "text-green-600" : "text-yellow-600"
                          }`}>
                            {item.productCount}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            item.status === "draft"
                              ? "bg-green-100 text-green-800" 
                              : item.status === "review"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {item.status === "draft" ? "Ready" : 
                             item.status === "review" ? "Review" : 
                             item.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {item.error ? (
                            <span className="text-red-600 text-sm">Error</span>
                          ) : (
                            <generateFetcher.Form method="post" action="/app/pages/generate">
                              <input type="hidden" name="keyword" value={item.keyword} />
                              <input type="hidden" name="pageId" value={item.pageId} />
                              <button
                                type="submit"
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                                disabled={isGenerating}
                              >
                                {isGenerating ? "Generating..." : "Generate →"}
                              </button>
                            </generateFetcher.Form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {actionData?.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">❌ {actionData.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}