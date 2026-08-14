import { describe, expect, it, afterEach } from "vitest";
import { ensureSchema, insertFont, queryFonts, getFontByFamily, getFontById, deleteFont, getPool } from "./db.js";

// IDs used across tests — cleaned up in afterEach
const TEST_IDS = ["test_font_a", "test_font_b"];

afterEach(async () => {
  const pool = getPool();
  for (const id of TEST_IDS) {
    await pool.query("DELETE FROM fonts WHERE id = $1", [id]);
  }
});

describe("@kwikk/font-manager db helpers", () => {
  it("inserts fonts and resolves summaries by query", async () => {
    await ensureSchema();

    await insertFont({
      id: "test_font_a",
      family: "Test Font A",
      label: "Test Font A",
      category: "sans-serif",
      source: "custom",
      license: "OFL-1.1",
      pair_category: "MODERN_CLEAN",
      pair_role: "body",
      weights: [{ weight: 400, style: "normal" }],
      tags: ["modern"],
      industry_scores: { tech: 0.8 },
      semantic_roles: { body: 0.95 },
      pairings: [{ paired_family: "Pair B", role: "heading_body", compatibility_score: 0.66 }],
    });

    const summary = await queryFonts({ category: "sans-serif", tags: ["modern"] });
    const found = summary.find((f) => f.id === "test_font_a");
    expect(found).toBeDefined();
    expect(found?.weights[0]).toEqual({ weight: 400, style: "normal" });
    expect(found?.tags).toContain("modern");
    expect(found?.pair_category).toBe("MODERN_CLEAN");
    expect(found?.pair_role).toBe("body");

    const record = await getFontByFamily("Test Font A");
    expect(record).not.toBeNull();
    expect(record?.pairings[0].paired_family).toBe("Pair B");

    const byId = await getFontById("test_font_a");
    expect(byId?.family).toBe("Test Font A");
  });

  it("filters fonts by semantic role and score", async () => {
    await ensureSchema();

    await insertFont({
      id: "test_font_a",
      family: "Test Font A",
      label: "Test Font A",
      category: "sans-serif",
      source: "custom",
      license: "OFL-1.1",
      weights: [{ weight: 400, style: "normal" }],
      tags: ["modern"],
      industry_scores: { tech: 0.8 },
      semantic_roles: { body: 0.95 },
    });

    await insertFont({
      id: "test_font_b",
      family: "Test Font B",
      label: "Test Font B",
      category: "serif",
      source: "custom",
      license: "OFL-1.1",
      weights: [{ weight: 400, style: "normal" }],
      tags: ["vintage"],
      industry_scores: { fashion: 0.7 },
      semantic_roles: { headline: 0.75 },
    });

    const results = await queryFonts({ semantic_role: "body", min_semantic_score: 0.9 });
    const bodyFonts = results.filter((f) => TEST_IDS.includes(f.id));
    expect(bodyFonts).toHaveLength(1);
    expect(bodyFonts[0].family).toBe("Test Font A");
  });

  it("filters fonts by pair_category", async () => {
    await ensureSchema();

    await insertFont({
      id: "test_font_a",
      family: "Test Font A",
      label: "Test Font A",
      category: "display",
      source: "custom",
      license: "OFL-1.1",
      pair_category: "BOLD_IMPACT",
      pair_role: "headline",
      weights: [{ weight: 700 }],
      tags: [],
      industry_scores: {},
      semantic_roles: { headline: 0.9 },
    });

    const results = await queryFonts({ pair_category: "BOLD_IMPACT", pair_role: "headline" });
    const found = results.filter((f) => TEST_IDS.includes(f.id));
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe("test_font_a");
  });

  it("deletes fonts and removes related metadata", async () => {
    await ensureSchema();

    await insertFont({
      id: "test_font_a",
      family: "Test Font A",
      label: "Test Font A",
      category: "sans-serif",
      source: "custom",
      license: "OFL-1.1",
      weights: [{ weight: 400, style: "normal" }],
      tags: ["modern"],
      industry_scores: { tech: 0.8 },
      semantic_roles: { body: 0.95 },
    });

    expect(await getFontById("test_font_a")).not.toBeNull();
    await deleteFont("test_font_a");
    expect(await getFontById("test_font_a")).toBeNull();
  });
});
