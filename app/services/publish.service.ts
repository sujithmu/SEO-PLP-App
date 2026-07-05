import shopify from "../shopify.server";

export async function publishPage(pageData: any, shop: string) {
  // shopify.authenticate.admin expects a Request object; wrap the shop string in a Request
  const { admin } = await shopify.authenticate.admin(new Request(`https://${shop}`));

  // Create a metaobject for the PLP
  const response = await admin.graphql(`
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
  `, {
    variables: {
      metaobject: {
        type: "plp_page",
        handle: pageData.slug,
        fields: [
          { key: "h1", value: pageData.h1 },
          { key: "intro", value: pageData.intro },
          { key: "content", value: JSON.stringify(pageData.sections) },
          { key: "faq", value: JSON.stringify(pageData.faq) },
          { key: "meta_title", value: pageData.meta_title },
          { key: "meta_description", value: pageData.meta_description },
          { key: "schema_markup", value: JSON.stringify(pageData.schema_markup) },
          { key: "status", value: "published" }
        ]
      }
    }
  });

  const data = await response.json();
  return data.data?.metaobjectCreate?.metaobject;
}