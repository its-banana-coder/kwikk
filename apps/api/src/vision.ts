/**
 * Vision model client — auto-describes uploaded image assets.
 *
 * Uses LLM_API_KEY / LLM_BASE_URL (same as the main LLM client).
 * VISION_MODEL overrides the model name; defaults to LLM_MODEL or gpt-4o-mini.
 *
 * Fails gracefully — callers should never throw on vision errors.
 */

import OpenAI from "openai";
import fs from "node:fs";

function getVisionClient(): OpenAI {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY required");
  return new OpenAI({ apiKey, baseURL: process.env.LLM_BASE_URL });
}

function getVisionModel(): string {
  return process.env.VISION_MODEL ?? process.env.LLM_MODEL ?? "gpt-4o-mini";
}

export interface AssetDescription {
  description: string;
  tags: string[];
}

/**
 * Send an image file through a vision LLM and return a short description + tags.
 * Returns empty strings on failure so callers can safely fire-and-forget.
 */
export async function describeImage(
  filePath: string,
  mimeType: string,
): Promise<AssetDescription> {
  try {
    const bytes = fs.readFileSync(filePath);
    const b64 = bytes.toString("base64");
    const client = getVisionClient();
    const res = await client.chat.completions.create({
      model: getVisionModel(),
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${b64}`, detail: "low" },
            },
            {
              type: "text",
              text: 'Describe this image for a video editor asset library. Respond with JSON only — no markdown fences: {"description":"...","tags":["tag1","tag2"]}. Max 50 words for description, up to 6 tags.',
            },
          ],
        },
      ],
    });
    const text = (res.choices[0]?.message?.content ?? "").trim();
    // Strip accidental markdown fences
    const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    const json = JSON.parse(cleaned) as { description?: unknown; tags?: unknown };
    return {
      description: String(json.description ?? "").slice(0, 500),
      tags: Array.isArray(json.tags) ? json.tags.slice(0, 10).map(String) : [],
    };
  } catch (err) {
    console.warn("[vision] describe failed:", (err as Error).message);
    return { description: "", tags: [] };
  }
}
