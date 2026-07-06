// app/services/cluster.service.ts
import type { Intent } from "./ai/intent.service";

export interface KeywordCluster {
  id: string;
  name: string;
  keywords: string[];
  intent: Intent;
  count: number;
}

export interface ClusterResult {
  clusters: KeywordCluster[];
  totalKeywords: number;
  clusterCount: number;
}

/**
 * Cluster keywords based on their parsed intent
 * Groups by style + room + audience combination
 */
export function clusterKeywords(
  keywords: string[],
  intents: Map<string, Intent>
): ClusterResult {
  const clusters = new Map<string, KeywordCluster>();

  keywords.forEach((keyword) => {
    const intent = intents.get(keyword);
    if (!intent) return;

    // Create a cluster key based on shared attributes
    const clusterKey = generateClusterKey(intent);
    
    if (!clusters.has(clusterKey)) {
      clusters.set(clusterKey, {
        id: clusterKey,
        name: generateClusterName(intent),
        keywords: [],
        intent: intent,
        count: 0,
      });
    }

    const cluster = clusters.get(clusterKey)!;
    cluster.keywords.push(keyword);
    cluster.count = cluster.keywords.length;
  });

  return {
    clusters: Array.from(clusters.values()),
    totalKeywords: keywords.length,
    clusterCount: clusters.size,
  };
}

/**
 * Generate a unique key for the cluster
 */
function generateClusterKey(intent: Intent): string {
  const parts = [
    intent.style || "general",
    intent.room || "any",
    intent.audience || "all",
  ];
  return parts.join("-").toLowerCase().replace(/\s+/g, "-");
}

/**
 * Generate a human-readable cluster name
 */
function generateClusterName(intent: Intent): string {
  const parts = [];
  if (intent.style) parts.push(intent.style);
  if (intent.room) parts.push(intent.room);
  if (intent.audience) parts.push(`for ${intent.audience}`);
  
  return parts.length > 0 
    ? parts.join(" ").charAt(0).toUpperCase() + parts.join(" ").slice(1)
    : "General Wallpaper";
}

/**
 * Get the best keyword from a cluster (the one with highest confidence)
 */
export function getBestKeyword(cluster: KeywordCluster): string {
  // Return the first keyword (or you could sort by confidence)
  return cluster.keywords[0] || "";
}

/**
 * Generate a canonical slug for a cluster
 */
export function generateClusterSlug(cluster: KeywordCluster): string {
  const baseName = cluster.name.toLowerCase().replace(/\s+/g, "-");
  return baseName;
}