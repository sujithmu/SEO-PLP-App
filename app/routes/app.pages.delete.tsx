import { json, redirect } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { prisma } from "../services/db.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const pageId = formData.get("pageId");
  
  if (!pageId || typeof pageId !== "string") {
    return json({ error: "Page ID required" }, { status: 400 });
  }
  
  await prisma.page.delete({ where: { id: pageId } });
  return redirect("/app/pages");
};