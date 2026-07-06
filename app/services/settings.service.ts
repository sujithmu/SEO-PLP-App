// app/services/settings.service.ts
import { prisma } from "./db.server";

export interface AppSettings {
  aiProvider: "google" | "openai" | "anthropic";
  brandTone: "professional" | "friendly" | "luxury" | "minimalist";
  defaultLocale: string;
  competitorUrls: string[];
  autoPublish: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: "google",
  brandTone: "professional",
  defaultLocale: "en-us",
  competitorUrls: [],
  autoPublish: false,
};

export async function getSettings(): Promise<AppSettings> {
  // In a real app, fetch from database
  // For now, return from environment or defaults
  const provider = process.env.AI_PROVIDER as AppSettings["aiProvider"] || "google";
  return {
    ...DEFAULT_SETTINGS,
    aiProvider: provider,
  };
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  // In a real app, save to database
  // For now, update environment or memory
  console.log("📝 Settings updated:", settings);
  return { ...DEFAULT_SETTINGS, ...settings };
}