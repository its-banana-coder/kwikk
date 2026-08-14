import { config } from "dotenv";
config();

import { getPool } from "../db.js";
import { searchImages } from "../pixabay.js";
import { embedAndStore } from "../embed.js";

async function fetchAndSeedBackgrounds() {
  console.log("[fetch-backgrounds] Fetching abstract backgrounds from Pixabay...");
  
  // Search for abstract backgrounds on Pixabay (requesting 50 hits)
  const hits = await searchImages("abstract background", { per_page: 50 });
  
  if (!hits || hits.length === 0) {
    console.error("[fetch-backgrounds] No images found. Check your PIXABAY_API_KEY.");
    process.exit(1);
  }

  console.log(`[fetch-backgrounds] Found ${hits.length} images. Seeding database...`);
  const pool = getPool();
  let totalInserted = 0;

  for (const hit of hits) {
    // Extract tags into an array
    const tagArray = hit.tags
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    // Clean name from tags
    const name = tagArray.length > 0
      ? tagArray.slice(0, 3).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(" ")
      : "Abstract Background";

    const url = hit.largeImageURL || hit.webformatURL;

    try {
      // Check if image URL already exists in database to avoid duplicate seeds
      const existing = await pool.query(
        "SELECT id FROM backgrounds WHERE url = $1 AND deleted_at IS NULL",
        [url]
      );

      let recordId: number;

      if (existing.rows.length > 0) {
        recordId = Number(existing.rows[0].id);
        console.log(`[fetch-backgrounds] Skiped duplicate: "${name}"`);
      } else {
        // Insert new record into backgrounds table
        const insertRes = await pool.query(
          `INSERT INTO backgrounds (name, type, category, tags, url)
           VALUES ($1, 'image', 'abstract', $2, $3)
           RETURNING id`,
          [name, tagArray, url]
        );
        recordId = Number(insertRes.rows[0].id);
        totalInserted++;
        console.log(`[fetch-backgrounds] Inserted background #${recordId}: "${name}"`);
      }

      // Generate embedding and store it in backgrounds table (fire-and-forget)
      embedAndStore("backgrounds", recordId, `${name} abstract background ${tagArray.join(" ")}`);

    } catch (err: any) {
      console.error(`[fetch-backgrounds] Error inserting image ${hit.id}:`, err.message);
    }
  }

  console.log(`[fetch-backgrounds] Seeding done! Inserted ${totalInserted} new abstract backgrounds.`);
  
  // Wait a few seconds for background embedding promises to resolve
  console.log("[fetch-backgrounds] Generating semantic search embeddings in background...");
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  await pool.end();
  console.log("[fetch-backgrounds] Script completed successfully.");
}

fetchAndSeedBackgrounds().catch(err => {
  console.error("[fetch-backgrounds] Fatal script error:", err);
  process.exit(1);
});
