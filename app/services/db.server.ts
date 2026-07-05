import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  (globalForPrisma.prisma ||
    new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    })) as any;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper functions
export async function createPage(data: {
  keyword: string;
  slug: string;
  intent: any;
  products: any[];
  content: any;
  status: string;
  locale: string;
}) {
  return prisma.page.upsert({
    where: { slug: data.slug },
    update: {
      keyword: data.keyword,
      intent: data.intent,
      products: data.products,
      content: data.content,
      status: data.status,
    },
    create: {
      keyword: data.keyword,
      slug: data.slug,
      intent: data.intent,
      products: data.products,
      content: data.content,
      status: data.status,
      locale: data.locale,
    },
  });
}

export async function getPages(shop: string) {
  return prisma.page.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPageBySlug(slug: string) {
  return prisma.page.findUnique({
    where: { slug },
  });
}

export async function updatePageStatus(id: string, status: string) {
  return prisma.page.update({
    where: { id },
    data: { status },
  });
}