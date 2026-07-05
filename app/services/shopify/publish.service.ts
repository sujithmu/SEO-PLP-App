import { authenticate } from "../../shopify.server";
import type { PageContent } from "../../services/ai/content.service";

export async function publishPage(
  pageData: {
    slug: string;
    keyword: string;
    content: PageContent;
    products: any[];
  },
  request: Request
) {
  const { admin } = await authenticate.admin(request);

  // Define the metaobject type (create this once in Shopify)
  const metaobjectType = "plp_page";

  // Prepare fields for metaobject
  const fields = [
    { key: "h1", value: pageData.content.h1 },
    { key: "intro", value: pageData.content.intro },
    { key: "sections", value: JSON.stringify(pageData.content.sections) },
    { key: "faq", value: JSON.stringify(pageData.content.faq) },
    { key: "meta_title", value: pageData.content.meta_title },
    { key: "meta_description", value: pageData.content.meta_description },
    { key: "schema_markup", value: JSON.stringify(pageData.content.schema_markup) },
    { key: "products", value: JSON.stringify(pageData.products) },
    { key: "keyword", value: pageData.keyword },
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
    console.error("Publish error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}