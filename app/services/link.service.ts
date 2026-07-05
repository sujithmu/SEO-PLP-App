import { prisma } from "./db.server";

interface PageWithIntent {
  id: string;
  keyword: string;
  slug: string;
  intent: any;
}

export async function getRelatedPages(
  pageId: string,
  maxLinks: number = 3
): Promise<PageWithIntent[]> {
  // Get the current page
  const currentPage = await prisma.page.findUnique({
    where: { id: pageId },
    select: {
      id: true,
      keyword: true,
      slug: true,
      intent: true,
    },
  });

  if (!currentPage || !currentPage.intent) {
    return [];
  }

  const intent = currentPage.intent as any;

  // ✅ Fix: Only get pages with non-null intent
  const allPages = await prisma.page.findMany({
    where: {
      id: { not: pageId },
      status: "published",
      intent: { not: null }, // ✅ Only pages with intent
    },
    select: {
      id: true,
      keyword: true,
      slug: true,
      intent: true,
    },
  });

  // Score each page based on shared attributes
  const scoredPages = allPages.map((page: PageWithIntent) => {
    const pageIntent = page.intent as any;
    let score = 0;

    // Skip if pageIntent is null (shouldn't happen due to filter)
    if (!pageIntent) return { ...page, score: 0 };

    // Style match
    if (intent.style && pageIntent.style === intent.style) {
      score += 3;
    }

    // Room match
    if (intent.room && pageIntent.room === intent.room) {
      score += 2;
    }

    // Audience match
    if (intent.audience && pageIntent.audience === intent.audience) {
      score += 2;
    }

    // Attribute match
    if (intent.attributes && pageIntent.attributes) {
      const commonAttributes = intent.attributes.filter((attr: string) => 
        (pageIntent.attributes || []).includes(attr)
      );
      score += commonAttributes.length;
    }

    // Color match
    if (intent.color && pageIntent.color === intent.color) {
      score += 1;
    }

    // Use-case match
    if (intent.use_case && pageIntent.use_case === intent.use_case) {
      score += 1;
    }

    return { ...page, score };
  });

  // Sort by score and return top matches
  return scoredPages
    .filter((p: { score: number }) => p.score > 0)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, maxLinks);
}