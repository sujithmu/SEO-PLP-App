# SEO PLP App - Programmatic SEO for Shopify

## Overview
This Shopify app automatically generates SEO-optimized Product Listing Pages (PLPs) using AI. It ingests keywords, matches products, and publishes pages with full technical SEO.

## Architecture Decisions

### Why Metaobjects?
I chose Shopify Metaobjects because they:
- Store structured data natively in Shopify
- Support rich fields (JSON, text, images)
- Can be queried via Storefront API
- Allow for flexible schemas without code changes

### AI Provider Abstraction
The app uses a provider-agnostic AI service layer. Switching from Gemini to Claude or GPT-4o requires only a .env change:
```env
AI_PROVIDER=google  # or openai, anthropic

Publishing Mechanism
Pages are stored as Metaobjects with the type plp_page. Each page contains:

SEO metadata (title, description, hreflang)

Content sections (H1, intro, FAQ)

Product references

Schema markup

Key Features
1. Keyword Ingestion
CSV upload with automatic parsing

Locale selection (US, AU, UK, CA)

Supports up to 1000 keywords per upload

2. Intent Parsing
Uses Google's Gemini AI to extract structured data from keywords:

Style (botanical, modern, floral)

Room (living room, bedroom, office)

Attributes (sustainable, peel-and-stick)

Audience (parents, renters)

3. Product Matching
Searches Shopify products by title, tags, and collections

Enforces minimum 6-product threshold

Pages with <6 products are flagged for review

4. AI Content Generation
Generates complete PLP content including:

H1 heading (SEO-optimized)

150-200 word intro

3+ sections with headings

4+ FAQ items

Meta title (max 60 chars)

Meta description (max 160 chars)

5. Multi-locale Support
en-us: Imperial units, USD, "wallpaper paste"

en-au: Metric units, AUD, "wallpaper adhesive"

en-gb: Metric units, GBP, "wallpaper paste"

en-ca: Metric units, CAD, "wallpaper paste"

6. Technical SEO
JSON-LD schema (CollectionPage + ItemList)

Self-referencing canonical tags

Noindex for draft/review pages

hreflang support for locale variants

7. AI Presence
/llms.txt - AI crawler index

/sitemap-ai.xml - AI-specific sitemap