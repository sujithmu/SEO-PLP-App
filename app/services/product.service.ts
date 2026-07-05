// app/services/shopify/product.service.ts
import { generateAltText } from "./ai/alt-text.service";
import type { Intent } from "./ai/intent.service";

export async function matchProducts(
  admin: any,
  intent: Intent,
  shop: string
) {
  // Build search query based on intent
  const queryParts = [];
  
  if (intent.style) queryParts.push(`title:${intent.style}*`);
  if (intent.color) queryParts.push(`title:${intent.color}*`);
  if (intent.room) queryParts.push(`title:${intent.room}*`);
  if (intent.attributes?.length) {
    intent.attributes.forEach(attr => {
      queryParts.push(`title:${attr}*`);
    });
  }

  // Also search in tags and collections
  if (intent.style) queryParts.push(`tag:${intent.style}*`);
  if (intent.room) queryParts.push(`tag:${intent.room}*`);

  const query = queryParts.length > 0 ? queryParts.join(" OR ") : "*";

  try {
    const response = await admin.graphql(
      `
      query ($query: String!, $first: Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              handle
              description
              tags
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                url
                altText
              }
              collections(first: 5) {
                edges {
                  node {
                    title
                    handle
                  }
                }
              }
            }
          }
        }
      }
    `,
      {
        variables: {
          query,
          first: 50,
        },
      }
    );

    const data = await response.json();
    const products = data.data?.products?.edges?.map((e: any) => e.node) || [];

    // ✅ Generate alt text for each product
    const enhancedProducts = await Promise.all(
      products.map(async (product: any) => {
        try {
          const altText = await generateAltText(product, intent);
          return {
            ...product,
            altText,
          };
        } catch (error) {
          console.error(`Alt text generation failed for "${product.title}":`, error);
          return {
            ...product,
            altText: `${product.title} - ${intent.style || ""} ${intent.room || ""}`.trim(),
          };
        }
      })
    );

    return {
      products: enhancedProducts,
      count: enhancedProducts.length,
      matchesThreshold: enhancedProducts.length >= 6,
      query,
    };
  } catch (error) {
    console.error("Product matching error:", error);
    return {
      products: [],
      count: 0,
      matchesThreshold: false,
      query: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}