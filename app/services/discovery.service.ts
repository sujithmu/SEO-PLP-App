// app/services/discovery.service.ts
export async function discoverKeywords(admin: any): Promise<string[]> {
  const response = await admin.graphql(`
    query {
      products(first: 50) {
        edges {
          node {
            title
            tags
            collections(first: 5) {
              edges {
                node {
                  title
                }
              }
            }
          }
        }
      }
    }
  `);

  const data = await response.json();
  const products = data.data.products.edges.map((e: any) => e.node);

  const keywords = new Set<string>();

  products.forEach((product: any) => {
    // From product titles
    if (product.title) {
      const cleanTitle = product.title.replace(/wallpaper/i, "").trim();
      if (cleanTitle) {
        keywords.add(`${cleanTitle} wallpaper`);
      }
    }

    // From tags
    if (product.tags) {
      product.tags.forEach((tag: string) => {
        keywords.add(`${tag} wallpaper`);
      });
    }

    // From collections
    if (product.collections?.edges) {
      product.collections.edges.forEach((edge: any) => {
        const collectionName = edge.node.title;
        keywords.add(`${collectionName} wallpaper`);
      });
    }
  });

  return Array.from(keywords);
}