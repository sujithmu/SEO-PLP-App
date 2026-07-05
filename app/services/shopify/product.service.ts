// import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
// import type { Intent } from "../ai/intent.service";

// export async function matchProducts(admin: AdminApiContext, intent: Intent, shop: string) {
//   // Build search query based on intent
//   const queryParts = [];
  
//   if (intent.style) queryParts.push(`title:${intent.style}*`);
//   if (intent.color) queryParts.push(`title:${intent.color}*`);
//   if (intent.room) queryParts.push(`title:${intent.room}*`);
  
//   const query = queryParts.length > 0 ? queryParts.join(" OR ") : "*";
  
//   console.log(`🔍 Searching for products with query: "${query}"`); // ✅ Debug log

//   try {
//     const response = await admin.graphql(`
//       query ($query: String!, $first: Int!) {
//         products(first: $first, query: $query) {
//           edges {
//             node {
//               id
//               title
//               handle
//               description
//               tags
//               featuredImage {
//                 url
//                 altText
//               }
//             }
//           }
//         }
//       }
//     `, {
//       variables: {
//         query,
//         first: 50,
//       },
//     });

//     const data = await response.json();
//     const products = data.data?.products?.edges?.map((e: any) => e.node) || [];
    
//     console.log(`✅ Found ${products.length} products for query: "${query}"`); // ✅ Debug log

//     return {
//       products,
//       count: products.length,
//       matchesThreshold: products.length >= 6,
//       query,
//     };
//   } catch (error) {
//     console.error("Product matching error:", error);
//     return {
//       products: [],
//       count: 0,
//       matchesThreshold: false,
//       query: "",
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }