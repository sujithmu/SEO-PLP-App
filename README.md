# SEO PLP App – Programmatic SEO for Shopify

[![Shopify App](https://img.shields.io/badge/Shopify-App-green)](https://shopify.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Remix](https://img.shields.io/badge/Remix-React_Router-purple)](https://remix.run/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📋 Overview

The **SEO PLP App** is a Shopify app that automatically generates SEO-optimized Product Listing Pages (PLPs) using AI. It ingests keywords, matches them with products, and publishes fully optimized pages with technical SEO requirements.

### Key Features

- ✅ **Keyword Ingestion** – CSV upload + auto-discovery from store data
- ✅ **AI Intent Parsing** – Extract structured data from keywords using Google Gemini
- ✅ **Product Matching** – Filter Shopify catalog with 6-product threshold
- ✅ **AI Content Generation** – Generate SEO-optimized PLP content
- ✅ **Multi-locale Support** – US, Australia, UK, Canada with market-specific content
- ✅ **Technical SEO** – JSON-LD schema, canonical tags, noindex for drafts
- ✅ **AI Presence** – `/llms.txt` and `/sitemap-ai.xml` for AI crawlers
- ✅ **Keyword Clustering** – Group semantically similar keywords to prevent cannibalization
- ✅ **Internal Linking** – Auto-link related PLPs based on shared intent
- ✅ **Alt Text Generation** – AI-generated alt text for product images
- ✅ **Merchant UI** – Dashboard with draft/published/review status

---

## 🏗️ Architecture Decisions

### Why Metaobjects?

I chose **Shopify Metaobjects** as the publishing mechanism because:

1. **Structured Data** – Metaobjects store structured data natively in Shopify
2. **Flexible Schema** – Support JSON fields for sections, FAQ, and product data
3. **Storefront API** – Queried via Storefront API for headless builds
4. **Versioning** – Built-in version management
5. **No Code Changes** – Adding new fields doesn't require schema migrations

### Why Metaobjects over Collections or Pages API?

| Approach | Pros | Cons |
|----------|------|------|
| **Metaobjects** | Structured data, Storefront API, flexible schema | Requires custom template development |
| **Collections** | Native Shopify, easy to manage | Limited to product collections, no custom fields |
| **Pages API** | Simple, built-in routes | Limited schema, no structured data |

**Decision:** Metaobjects offer the best balance of flexibility and native Shopify integration.

### AI Provider Abstraction

The app uses a **provider-agnostic AI service layer**. Switching from Gemini to Claude or GPT-4o requires only a `.env` change:

```env
AI_PROVIDER=google  # or openai, anthropic
AI_MODEL=gemini-2.5-flash

The architecture includes:

AIService interface with parseIntent() and generateContent() methods

Provider-specific implementations (Gemini, OpenAI, Anthropic)

Factory pattern for provider selection ```

### 📊 Database Schema

Pages Table
Column	Type	Description
id	String (CUID)	Primary key, auto-generated
keyword	String	Primary keyword for the page
slug	String (Unique)	URL-friendly identifier (e.g., botanical-wallpaper-living-room-en-us)
intent	JSON	Parsed AI intent with clusterKeywords and clusterName
products	JSON	Array of matched Shopify products with altText
content	JSON	AI-generated content (h1, intro, sections, faq, meta)
status	String	draft | published | review
locale	String	en-us | en-au | en-gb | en-ca
shopifyId	String	Metaobject ID after publishing
views	Int	Page view counter
createdAt	DateTime	Creation timestamp
updatedAt	DateTime	Last update timestamp

### Intent JSON Structure

{
  "style": "botanical",
  "room": "living room",
  "audience": "parents",
  "attributes": ["sustainable", "eco-friendly"],
  "use_case": "living room decor",
  "color": "green",
  "confidence": 0.95,
  "clusterName": "Botanical living room",
  "clusterKeywords": [
    "botanical wallpaper living room",
    "botanical wallpaper bedroom"
  ]
}

### Content JSON Structure

{
  "h1": "Botanical Living Room Wallpaper",
  "intro": "Welcome to our exquisite collection...",
  "sections": [
    { "heading": "Discover Our Diverse Botanical Styles", "content": "..." },
    { "heading": "Tips for Decorating with Botanical Wallpaper", "content": "..." }
  ],
  "faq": [
    { "question": "How do I choose the right wallpaper?", "answer": "..." }
  ],
  "meta_title": "Botanical Living Room Wallpaper | Nature Inspired Walls",
  "meta_description": "Transform your living room with our stunning botanical wallpaper collection.",
  "schema_markup": {
    "collectionPage": {
      "name": "Botanical Living Room Wallpaper",
      "description": "A collection of botanical wallpaper for living rooms."
    },
    "itemList": { "itemListElement": [] }
  }
}

### 🚀 Features

1. Keyword Ingestion

CSV Upload
keyword
botanical wallpaper living room
peel and stick wallpaper for renters
modern geometric wallpaper office

Auto-Discovery

Automatically analyzes product titles, tags, and collections

Suggests keywords from store data

One-click import of discovered keywords

Supported Formats

CSV with keyword header

Locale selection (US, AU, UK, CA)

Up to 1000 keywords per upload

2. Keyword Clustering

Groups semantically similar keywords to generate one canonical page per cluster:

Input Keywords	Cluster
"botanical wallpaper living room"	Botanical living room
"botanical wallpaper bedroom"	→ One page with both keywords
"floral wallpaper living room"	Floral living room
Why this matters:

✅ Prevents keyword cannibalization

✅ Reduces duplicate content

✅ Creates stronger, more focused pages

3. Intent Parsing
Uses Google Gemini to extract structured data:

Input:"sustainable midnight blue wallpaper kids room"
Output: 
{
  "color": "midnight blue",
  "style": "general",
  "use_case": "kids room decor",
  "audience": "parents",
  "room": "kids room",
  "attributes": ["sustainable"],
  "confidence": 0.95
}

4. Product Matching
Searches Shopify products by title, tags, and collections

Enforces minimum 6-product threshold

Pages with <6 products are flagged for review

Matched products are stored in the database with AI-generated alt text

5. AI Content Generation
Generates complete PLP content:
{
  "h1": "Botanical Living Room Wallpaper",
  "intro": "Welcome to our exquisite collection...",
  "sections": [
    { "heading": "Discover Our Diverse Botanical Styles", "content": "..." },
    { "heading": "Tips for Decorating with Botanical Wallpaper", "content": "..." }
  ],
  "faq": [
    { "question": "How do I choose the right botanical wallpaper?", "answer": "..." }
  ],
  "meta_title": "Botanical Living Room Wallpaper | Nature Inspired Walls",
  "meta_description": "Transform your living room with our stunning botanical wallpaper collection."
}

6. Multi-locale Support

Locale	Measurement	Currency	Terminology
en-us	Imperial (feet/inches)	USD	"wallpaper paste"
en-au	Metric (cm)	AUD	"wallpaper adhesive"
en-gb	Metric (cm)	GBP	"wallpaper paste"
en-ca	Metric (cm)	CAD	"wallpaper paste"

Adding a New Locale:

Add config in app/services/locale.service.ts

"en-de": {
  code: "en-de",
  language: "English",
  measurement: "metric",
  currency: "EUR",
  terminology: { wallpaper: "wallpaper", adhesive: "wallpaper paste" }
}
No code changes required – the app automatically supports new locales.

7. Technical SEO

Each published PLP includes:

✅ JSON-LD Schema – CollectionPage + ItemList + FAQPage

✅ Self-referencing Canonical Tag – Prevents duplicate content

✅ Noindex for Draft/Review Pages – Prevents indexing of unfinished pages

✅ H1 Unique per Page – Matches target keyword exactly

✅ Meta Title (max 60 chars) – Optimized for click-through rate

✅ Meta Description (max 160 chars) – Compelling and keyword-rich

8. Alt Text Generation

Product images automatically receive AI-generated alt text based on:

Product Title – The product name

Parsed Intent – Style, room, audience, attributes

Locale Context – Market-specific terminology

Example:

Product: "Botanical Green Wallpaper"

Intent: { style: "botanical", room: "living room" }

Generated Alt Text: "Botanical green wallpaper with leaf pattern for living room"

9. Internal Linking
Pages automatically link to related PLPs based on shared intent attributes:

Style Match – Same design style (botanical, modern, floral)

Room Match – Same room type (living room, bedroom, office)

Audience Match – Same target audience (parents, renters)

Attribute Match – Shared attributes (sustainable, peel-and-stick)

Color Match – Same color palette

Use Case Match – Similar use cases

10. AI Presence Strategy
Two files for AI crawler discoverability:

/llms.txt – Plain-text index of all published pages

# Wild Palace - Product Listing Pages

This file lists all published product listing pages for AI crawlers.

## All Published Pages

- peel and stick wallpaper for renters (en-us) → /pages/peel-and-stick-wallpaper-for-renters-en-us
- botanical wallpaper living room (en-au) → /pages/botanical-wallpaper-living-room-en-au

/sitemap-ai.xml – Metadata-rich sitemap for AI crawlers

<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:ai="https://example.com/ai/sitemap/1.0">
  <url>
    <loc>https://example.com/pages/peel-and-stick-wallpaper-for-renters-en-us</loc>
    <lastmod>2026-07-05T...</lastmod>
    <ai:metadata>
      <ai:intent>
        <ai:style>general</ai:style>
        <ai:room>any</ai:room>
        <ai:attributes>peel-and-stick</ai:attributes>
      </ai:intent>
      <ai:productCount>23</ai:productCount>
      <ai:locale>en-us</ai:locale>
    </ai:metadata>
  </url>
</urlset>

### 🛠️ Installation

Prerequisites
Node.js 18+ (Download)

Shopify Partner Account (Sign up)

Shopify Development Store (Create)

Gemini API Key (Get)

Step 1: Clone the Repository
git clone https://github.com/sujithmu/SEO-PLP-App.git
cd seo-plp-app

Step 2: Install Dependencies
npm install

Step 3: Set Up Environment Variables
cp .env.example .env

Update .env with your credentials:

# Shopify
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=http://localhost:3000
SCOPES=write_products,write_metaobjects,read_products,read_metaobjects

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.project_ref.supabase.co:5432/postgres

# AI
AI_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-1.5-flash

Step 4: Database Setup

# Push schema to Supabase
npx prisma db push

# Generate Prisma client
npx prisma generate

Step 5: Run the App

# Start development server
npx vite dev

Step 6: Install on Shopify
Go to http://localhost:3000

Enter your development store URL

Click "Install"

Authorize the app

### 🧪 Testing

End-to-End Flow
Upload CSV – Go to /app/upload and upload a CSV file

Auto-Discover – Click "Auto-Discover Keywords" to find keywords from your store

Check Results – View clusters with product counts

Generate Content – Click "Generate →" for pages with ≥6 products

View Pages – Click "View" to see AI-generated content in the modal

Publish Page – Click "Publish" to make the page live

AI Presence – Visit /llms.txt and /sitemap-ai.xml

Test URLs
URL	Purpose
/app/pages	Dashboard with all pages
/app/upload	CSV upload interface
/app/settings	AI provider, brand tone configuration
/llms.txt	AI crawler index
/sitemap-ai.xml	AI-specific sitemap

Sample CSV File:
keyword
botanical wallpaper living room
peel and stick wallpaper for renters
modern geometric wallpaper office
floral wallpaper bedroom
textured wallpaper dining room
sustainable midnight blue wallpaper kids room

### 📊 Prompt Strategy
How Content is Differentiated
The AI prompt includes multiple factors to ensure unique content:

Parsed Intent – Style, room, audience, attributes

Product List – Actual product titles and descriptions

Locale Context – Market-specific terminology and measurement

Unique H1 – Matches the target keyword exactly

Section Count – At least 3 sections with unique headings

Example Differentiation:

Keyword	H1	Intro Focus
botanical wallpaper living room	Botanical Living Room Wallpaper	Nature, tranquility, biophilic design
peel and stick wallpaper for renters	Peel and Stick Wallpaper for Renters	Damage-free, temporary, landlord-friendly
modern geometric wallpaper office	Modern Geometric Wallpaper Office	Productivity, focus, minimalist design
Preventing Keyword Substitution
The prompt explicitly instructs the AI to:

"Create unique content for this specific keyword"

"Do not use generic placeholder text"

"Reference the specific products available"

### 🐛 Known Gaps & What's Next
Current Limitations
Issue	Description	Priority
Similarity Check	No automatic check before publishing to prevent cannibalization	High
Analytics	No tracking of page views, clicks, or conversions	High
Image Generation	No AI-generated images for PLPs	Medium
Roadmap
Phase 1 (Current) – ✅ Complete
✅ CSV upload

✅ Auto-discovery

✅ AI intent parsing

✅ Product matching (6-product threshold)

✅ Keyword clustering

✅ AI content generation

✅ Multi-locale support

✅ Pages dashboard

✅ View modal

✅ Alt text generation

✅ Internal linking

✅ Technical SEO (JSON-LD, canonical, noindex)

✅ llms.txt & sitemap-ai.xml

✅ Settings UI (AI provider, brand tone)

Phase 2 (Next)
🔄 Similarity Check – Compare intents before publishing to prevent cannibalization

🔄 Analytics Dashboard – Track page views, clicks, and conversions

🔄 AI Image Generation – Generate hero images for PLPs

Phase 3 (Future)
🔄 Bulk Actions – Batch publish, delete, and regenerate content

🔄 Scheduled Publishing – Schedule pages to go live at specific times

🔄 A/B Testing – Test different AI-generated content variations

### 📦 Tech Stack
Category	Technology
Framework	Shopify Remix (React Router v7)
Language	TypeScript
Database	PostgreSQL (Supabase)
ORM	Prisma
AI	Google Gemini (provider-agnostic)
Styling	Tailwind CSS
UI Components	Polaris (Shopify design system)
Hosting	ngrok (development)
Authentication	Shopify OAuth

### 📁 Project Structure
text
seo-plp-app/
├── app/
│   ├── routes/
│   │   ├── app._index.tsx          # Dashboard
│   │   ├── app.upload.tsx          # CSV upload + auto-discovery
│   │   ├── app.pages.tsx           # Pages dashboard + modal
│   │   ├── app.settings.tsx        # Settings UI
│   │   ├── app.pages.publish.tsx   # Publish action
│   │   ├── app.pages.delete.tsx    # Delete action
│   │   ├── app.pages.generate.tsx  # Generate content action
│   │   ├── llms[.]txt.tsx          # AI crawler index
│   │   └── sitemap-ai[.]xml.tsx    # AI sitemap
│   ├── services/
│   │   ├── ai/
│   │   │   ├── intent.service.ts   # Intent parsing
│   │   │   ├── content.service.ts  # Content generation
│   │   │   └── alt-text.service.ts # Alt text generation
│   │   ├── cluster.service.ts      # Keyword clustering
│   │   ├── discovery.service.ts    # Auto-discovery
│   │   ├── link.service.ts         # Internal linking
│   │   └── product.service.ts      # Product matching
│   ├── styles/
│   │   └── tailwind.css            # Tailwind styles
│   └── root.tsx                    # Root layout
├── prisma/
│   └── schema.prisma               # Database schema
├── .env.example                     # Environment variables template
├── package.json
├── tailwind.config.ts
├── postcss.config.js
└── README.md

### 📊 Architecture Diagram

┌─────────────────────────────────────────────────────────────────┐
│                          Merchant UI                           │
│         (Shopify Admin → Apps → SEO PLP App)                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CSV Upload / Auto-Discovery                │
│                  (Google Gemini AI Provider)                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Keyword Clustering                        │
│           (Groups semantically similar keywords)               │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Product Matching                          │
│            (Shopify Admin API - GraphQL)                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    6-Product Threshold                         │
│                (≥6 → Draft | <6 → Review)                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Content Generation                       │
│                  (Google Gemini AI Provider)                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Publishing                               │
│            (Shopify Metaobjects - plp_page)                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SEO & AI Presence                           │
│          (JSON-LD, canonical, /llms.txt, /sitemap-ai.xml)      │
└─────────────────────────────────────────────────────────────────┘