import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export async function createMetaobject(admin: AdminApiContext, pageData: any) {
  // Define the metaobject type (create this once in Shopify)
  const metaobjectType = "plp_page";

  // Prepare fields
  const fields = [
    { key: "h1", value: pageData.h1 || "" },
    { key: "intro", value: pageData.intro || "" },
    { key: "sections", value: JSON.stringify(pageData.sections || []) },
    { key: "faq", value: JSON.stringify(pageData.faq || []) },
    { key: "meta_title", value: pageData.meta_title || "" },
    { key: "meta_description", value: pageData.meta_description || "" },
    { key: "keyword", value: pageData.keyword || "" },
    { key: "status", value: "published" },
  ];

  try {
    const response = await admin.graphql(
      `
      mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
      {
        variables: {
          metaobject: {
            type: metaobjectType,
            handle: pageData.slug,
            fields,
          },
        },
      }
    );

    const data = await response.json();
    
    if (data.data?.metaobjectCreate?.userErrors?.length) {
      throw new Error(data.data.metaobjectCreate.userErrors[0].message);
    }

    return {
      success: true,
      metaobjectId: data.data?.metaobjectCreate?.metaobject?.id,
      handle: data.data?.metaobjectCreate?.metaobject?.handle,
    };
  } catch (error) {
    console.error("Metaobject creation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}