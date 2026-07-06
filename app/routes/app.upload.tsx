import { useState, useEffect, useRef } from "react";
import { useActionData, Form, useNavigation, Link, useFetcher } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { parseIntent } from "../services/ai/intent.service";
import { matchProducts } from "../services/product.service";
import { generatePageContent, generateSlug } from "../services/ai/content.service";
import { clusterKeywords, type KeywordCluster } from "../services/cluster.service";
import { discoverKeywords } from "../services/discovery.service";
import { createPage } from "../services/db.server";

// Helper to get the best keyword from a cluster (e.g., the shortest one)
function getBestKeyword(cluster: KeywordCluster): string {
  return cluster.keywords.sort((a, b) => a.length - b.length)[0];
}

// Helper to generate a slug from a cluster name
function generateClusterSlug(cluster: KeywordCluster, locale: string): string {
  return generateSlug(cluster.name, locale);
}

export const loader: LoaderFunction = async () => {
  return json({});
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  
  console.log("📋 Upload action called, intent:", intent);
  
  // Handle discovery
  if (intent === "discover") {
    console.log("🔍 Discovery intent detected!");
    try {
      const { admin } = await authenticate.admin(request);
      console.log("✅ Admin authenticated for discovery");
      
      // ✅ Add more detailed logging for discoverKeywords
      console.log("🔍 Calling discoverKeywords...");
      const discovered = await discoverKeywords(admin);
      console.log(`✅ Discovered ${discovered.length} keywords:`, discovered);
      
      return json({
        discovery: {
          success: true,
          keywords: discovered,
        }
      });
    } catch (error) {
      console.error("❌ Discovery error:", error);
      return json({
        discovery: {
          success: false,
          error: error instanceof Error ? error.message : "Discovery failed",
        }
      }, { status: 500 });
    }
  }
  
  // Handle CSV upload (existing code)
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

  // Parse all intents first
  const parsedResults = await Promise.all(
    keywords.map(async (keyword) => {
      const intent = await parseIntent(keyword);
      return { keyword, intent };
    })
  );

  // Build a map of keyword -> intent
  const intentMap = new Map();
  parsedResults.forEach(({ keyword, intent }) => {
    intentMap.set(keyword, intent);
  });

  // ✅ Cluster the keywords
  const clusterResult = clusterKeywords(keywords, intentMap);

  console.log(`📊 Found ${clusterResult.clusterCount} clusters from ${clusterResult.totalKeywords} keywords`);

  // Process each cluster
  const results = await Promise.all(
    clusterResult.clusters.map(async (cluster) => {
      try {
        // Use the best keyword from the cluster
        const primaryKeyword = getBestKeyword(cluster);
        const intent = cluster.intent;
        
        console.log(`🔍 Processing cluster: "${cluster.name}" with ${cluster.count} keywords`);
        
        // Match products using the cluster's intent
        const match = await matchProducts(admin, intent, shop);
        console.log(`📦 Products found: ${match.count}`);
        
        const thresholdMet = match.count >= 6;
        const content = await generatePageContent(intent, match.products, locale);
        const slug = generateClusterSlug(cluster, locale);
        
        // Store all keywords in the cluster
        const page = await createPage({
          keyword: primaryKeyword, // Primary keyword
          slug,
          intent: {
            ...intent,
            clusterKeywords: cluster.keywords, // Store all keywords
            clusterName: cluster.name,
          },
          products: match.products,
          content,
          status: thresholdMet ? "draft" : "review",
          locale,
        });
        
        return {
          clusterName: cluster.name,
          primaryKeyword,
          keywords: cluster.keywords,
          keywordCount: cluster.count,
          productCount: match.count,
          thresholdMet,
          contentGenerated: !!content,
          pageId: page.id,
          slug,
          status: thresholdMet ? "draft" : "review",
        };
      } catch (error) {
        console.error(`❌ Error processing cluster "${cluster.name}":`, error);
        return {
          clusterName: cluster.name,
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
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [locale, setLocale] = useState<string>("en-us");
  const navigation = useNavigation();
  const isProcessing = navigation.state === "submitting";
  const [discoveredKeywords, setDiscoveredKeywords] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Add a handler for the discovery response
  useEffect(() => {
    // ✅ Add this to debug
    console.log("📊 actionData received:", actionData);
    if (actionData?.discovery?.success) {
      console.log("✅ Discovery success! Keywords:", actionData.discovery.keywords);
      setDiscoveredKeywords(actionData.discovery.keywords);
      setIsDiscovering(false);
    }
    if (actionData?.discovery?.error) {
      console.error("❌ Discovery error:", actionData.discovery.error);
      setIsDiscovering(false);
    }
  }, [actionData]);
  
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        {/* Locale Selector */}
        <div className="flex items-center gap-4">
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

        {/* Keyword Discovery */}
        <div className="flex items-center gap-4">
          <Form method="post" action="/app/upload">
            <input type="hidden" name="intent" value="discover" />
            <button type="submit">🔍 Auto-Discover Keywords</button>
          </Form>
          <p className="text-sm text-gray-500">
            Automatically find keyword opportunities from your store's data.
          </p>
        </div>

        {/* Display discovered keywords below the form */}
        {discoveredKeywords.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-medium text-green-800">
              ✅ Discovered {discoveredKeywords.length} Keywords
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {discoveredKeywords.map((keyword, idx) => (
                <span key={idx} className="px-2 py-1 bg-white border border-green-300 rounded text-xs text-green-700">
                  {keyword}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                console.log('📋 Adding discovered keywords:', discoveredKeywords);
                // Create a CSV file from the keywords
                const csvContent = 'keyword\n' + discoveredKeywords.join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const file = new File([blob], 'discovered-keywords.csv', { type: 'text/csv' });
                
                // Set the file input
                const fileInput = document.querySelector('input[name="csvFile"]') as HTMLInputElement;
                if (fileInput) {
                  const dataTransfer = new DataTransfer();
                  dataTransfer.items.add(file);
                  fileInput.files = dataTransfer.files;
                  setFileName(file.name);
                  // Trigger the form submission
                  formRef.current?.requestSubmit();
                }
              }}
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-3 rounded-lg"
            >
              + Add All Keywords
            </button>
          </div>
        )}

        {/* CSV Upload Form */}
        <Form ref={formRef} method="post" encType="multipart/form-data" className="border-t pt-4">
          <input type="hidden" name="locale" value={locale} />
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Or Upload CSV
            </label>
            <input
              type="file"
              name="csvFile"
              accept=".csv"
              className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 transition-colors"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setFileName(file.name);
              }}
            />
            {fileName && <span className="text-sm text-gray-600">📄 {fileName}</span>}
            <button
              type="submit"
              className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-6 rounded-lg transition-colors shadow-sm hover:shadow disabled:bg-blue-400 disabled:cursor-not-allowed"
              disabled={isProcessing || !fileName}
            >
              {isProcessing ? "Processing..." : "Process CSV"}
            </button>
          </div>
        </Form>

        {/* Results */}
        {actionData?.success && (
          <div className="mt-6">
            {/* Cluster Stats */}
            {actionData?.results && (
              <div className="flex items-center gap-4 mb-3 text-sm">
                <span className="font-medium text-gray-700">
                  📊 {actionData.results.length} clusters from {actionData.count} keywords
                </span>
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                  Ready: {actionData.results.filter((r: any) => r.status === "draft").length}
                </span>
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  Review: {actionData.results.filter((r: any) => r.status === "review").length}
                </span>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cluster</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Keywords</th>
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
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900 w-1/4">
                          {item.clusterName || item.keyword}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600 w-1/2">
                          <details>
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                              {item.keywordCount} keywords
                            </summary>
                            <ul className="mt-1 text-xs text-gray-500 list-disc list-inside">
                              {item.keywords?.map((kw: string, i: number) => (
                                <li key={i}>{kw}</li>
                              ))}
                            </ul>
                          </details>
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
                              <input type="hidden" name="keyword" value={item.primaryKeyword} />
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