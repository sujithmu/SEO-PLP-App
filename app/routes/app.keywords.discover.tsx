import { json } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { discoverKeywords } from "../services/discovery.service";

export const loader: LoaderFunction = async () => {
  return json({ message: "Route is working!" });
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const discovered = await discoverKeywords(admin);
    console.log(`Discovered ${discovered.length} keywords:`, discovered);

    return json({
      success: true,
      discoveredKeywords: discovered,
    });
  } catch (error) {
    console.error("Discovery error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Discovery failed",
    }, { status: 500 });
  }
};