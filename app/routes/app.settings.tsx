// app/routes/app.settings.tsx
import { useState, useEffect } from "react";
import { useActionData, Form, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { getSettings, updateSettings, type AppSettings } from "../services/settings.service";
import { authenticate } from "../shopify.server";
import { prisma } from "../services/db.server";

export const loader: LoaderFunction = async ({ request }) => {
  // Get settings
  const settings = await getSettings();
  
  // Get stats for display
  const pageCount = await prisma.page.count();
  const publishedCount = await prisma.page.count({ where: { status: "published" } });
  const draftCount = await prisma.page.count({ where: { status: "draft" } });
  
  return json({
    settings,
    stats: {
      totalPages: pageCount,
      published: publishedCount,
      draft: draftCount,
    }
  });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  
  if (action === "update_settings") {
    const competitorUrlsValue = formData.get("competitorUrls");
    const competitorUrls = typeof competitorUrlsValue === 'string' ? competitorUrlsValue.split(",").filter(Boolean).map(s => s.trim()) : [];
    const aiProviderValue = formData.get("aiProvider");
    const brandToneValue = formData.get("brandTone");
    const defaultLocaleValue = formData.get("defaultLocale");

    const settings: Partial<AppSettings> = {
      aiProvider: typeof aiProviderValue === 'string' ? aiProviderValue as AppSettings["aiProvider"] : "google",
      brandTone: typeof brandToneValue === 'string' ? brandToneValue as AppSettings["brandTone"] : "professional",
      defaultLocale: typeof defaultLocaleValue === 'string' ? defaultLocaleValue : "en-us",
      competitorUrls,
      autoPublish: formData.get("autoPublish") === "on",
    };
    
    await updateSettings(settings);
    return json({ success: true, message: "Settings updated successfully!" });
  }
  
  return json({ error: "Invalid action" }, { status: 400 });
};

export default function SettingsPage() {
  const { settings, stats } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (actionData?.success) {
      setMessage(actionData.message);
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
    if (actionData?.error) {
      setMessage(`❌ ${actionData.error}`);
      setIsSaving(false);
    }
  }, [actionData]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Settings</h1>
      <p className="text-gray-600 mb-8">
        Configure your AI provider, brand tone, and other app preferences.
      </p>

      {/* Success Message */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.startsWith('❌') ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
          {message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-600">Total Pages</p>
          <p className="text-2xl font-bold">{stats.totalPages}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4">
          <p className="text-sm font-medium text-green-600">Published</p>
          <p className="text-2xl font-bold text-green-700">{stats.published}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-4">
          <p className="text-sm font-medium text-yellow-600">Draft</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.draft}</p>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <Form method="post">
          <input type="hidden" name="action" value="update_settings" />
          
          {/* AI Provider */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Provider
            </label>
            <select
              name="aiProvider"
              defaultValue={settings.aiProvider}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="google">🤖 Google Gemini</option>
              <option value="openai">🧠 OpenAI (GPT-4o)</option>
              <option value="anthropic">🎯 Anthropic (Claude)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select which AI provider to use for content generation. Requires an API key in .env.
            </p>
          </div>

          {/* Brand Tone */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand Tone
            </label>
            <select
              name="brandTone"
              defaultValue={settings.brandTone}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="professional">💼 Professional</option>
              <option value="friendly">😊 Friendly & Approachable</option>
              <option value="luxury">💎 Luxury & Premium</option>
              <option value="minimalist">✨ Minimalist & Clean</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Defines the voice and style of AI-generated content.
            </p>
          </div>

          {/* Default Locale */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Locale
            </label>
            <select
              name="defaultLocale"
              defaultValue={settings.defaultLocale}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="en-us">🇺🇸 United States (imperial)</option>
              <option value="en-au">🇦🇺 Australia (metric)</option>
              <option value="en-gb">🇬🇧 United Kingdom (metric)</option>
              <option value="en-ca">🇨🇦 Canada (metric)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Default market for new keyword uploads.
            </p>
          </div>

          {/* Competitor URLs */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Competitor URLs
            </label>
            <input
              type="text"
              name="competitorUrls"
              defaultValue={settings.competitorUrls.join(", ")}
              placeholder="https://competitor1.com, https://competitor2.com"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated list of competitor URLs for reference.
            </p>
          </div>

          {/* Auto-Publish */}
          <div className="mb-6 flex items-center gap-3">
            <input
              type="checkbox"
              name="autoPublish"
              defaultChecked={settings.autoPublish}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">
              Auto-publish pages when threshold is met
            </label>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            onClick={() => setIsSaving(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:bg-blue-400"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "💾 Save Settings"}
          </button>
        </Form>
      </div>

      {/* API Key Reminder */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          ⚠️ <strong>Note:</strong> To switch AI providers, ensure the corresponding API key is set in your .env file:
        </p>
        <ul className="text-xs text-yellow-700 mt-2 list-disc list-inside">
          <li><code>GOOGLE_GENERATIVE_AI_API_KEY</code> for Gemini</li>
          <li><code>OPENAI_API_KEY</code> for GPT-4o</li>
          <li><code>ANTHROPIC_API_KEY</code> for Claude</li>
        </ul>
      </div>
    </div>
  );
}