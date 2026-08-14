/**
 * Provider-agnostic embedding client.
 * Reads EMBEDDING_API_KEY / EMBEDDING_BASE_URL / EMBEDDING_MODEL.
 * Falls back to LLM_* vars so a single key works for both LLM and embeddings.
 */

import OpenAI from "openai";
import { getPool } from "./db.js";

function getEmbedClient(): OpenAI {
  const apiKey = process.env.EMBEDDING_API_KEY ?? process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("EMBEDDING_API_KEY or LLM_API_KEY env var is required");
  return new OpenAI({
    apiKey,
    baseURL: process.env.EMBEDDING_BASE_URL ?? process.env.LLM_BASE_URL,
  });
}

function getEmbedModel(): string {
  return process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
}

/** Generate an embedding vector for the given text. Returns null on failure. */
export async function embed(text: string): Promise<number[] | null> {
  if (!text.trim()) return null;
  try {
    const client = getEmbedClient();
    const res = await client.embeddings.create({
      model: getEmbedModel(),
      input: text.slice(0, 8000), // token safety cap
    });
    return res.data[0]?.embedding ?? null;
  } catch (err) {
    console.warn("[embed] failed:", (err as Error).message);
    return null;
  }
}

/** Serialize an embedding array to the Postgres vector literal format. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

/**
 * Fire-and-forget: generate embedding and write it to `table.embedding` for the given row id.
 * Never throws — asset/icon creation must not fail because of embedding errors.
 */
export function embedAndStore(
  table: "assets" | "icons" | "fonts" | "templates" | "backgrounds" | "motion_presets",
  id: number | string,
  text: string
): void {
  embed(text).then(async (vec) => {
    if (!vec) return;
    await getPool()
      .query(`UPDATE ${table} SET embedding = $1::vector WHERE id = $2`, [
        toVectorLiteral(vec),
        id,
      ])
      .catch((e) => console.warn(`[embed] store failed for ${table}#${id}:`, e.message));
  });
}
