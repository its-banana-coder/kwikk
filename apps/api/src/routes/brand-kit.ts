import { Hono } from "hono";
import { queryOne, execute } from "../db.js";

const DEFAULT_USER_ID = 2;

type BrandKit = {
  id: number;
  brand_name: string;
  category: string;
  audience: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  motion_style: string;
  subtitle_style: string;
  logo_url: string;
  user_id: number | null;
};

const DEFAULTS: Omit<BrandKit, "id" | "user_id"> = {
  brand_name: "",
  category: "",
  audience: "",
  primary_color: "#F59E0B",
  secondary_color: "#18181B",
  accent_color: "#FAFAFA",
  font_family: "modern",
  motion_style: "cinematic",
  subtitle_style: "minimal",
  logo_url: "",
};

export const brandKitRoutes = new Hono();

brandKitRoutes.get("/", async (c) => {
  const kit = await queryOne<BrandKit>(
    "SELECT * FROM brand_kits WHERE user_id = $1 AND deleted_at IS NULL ORDER BY id LIMIT 1",
    [DEFAULT_USER_ID]
  );
  return c.json(kit ?? { ...DEFAULTS, id: 0, user_id: DEFAULT_USER_ID });
});

brandKitRoutes.put("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Partial<BrandKit>;
  const existing = await queryOne<BrandKit>(
    "SELECT * FROM brand_kits WHERE user_id = $1 AND deleted_at IS NULL ORDER BY id LIMIT 1",
    [DEFAULT_USER_ID]
  );

  const next = {
    brand_name: body.brand_name ?? existing?.brand_name ?? DEFAULTS.brand_name,
    category: body.category ?? existing?.category ?? DEFAULTS.category,
    audience: body.audience ?? existing?.audience ?? DEFAULTS.audience,
    primary_color: body.primary_color ?? existing?.primary_color ?? DEFAULTS.primary_color,
    secondary_color: body.secondary_color ?? existing?.secondary_color ?? DEFAULTS.secondary_color,
    accent_color: body.accent_color ?? existing?.accent_color ?? DEFAULTS.accent_color,
    font_family: body.font_family ?? existing?.font_family ?? DEFAULTS.font_family,
    motion_style: body.motion_style ?? existing?.motion_style ?? DEFAULTS.motion_style,
    subtitle_style: body.subtitle_style ?? existing?.subtitle_style ?? DEFAULTS.subtitle_style,
    logo_url: body.logo_url ?? existing?.logo_url ?? DEFAULTS.logo_url,
  };

  if (existing) {
    await execute(
      `UPDATE brand_kits SET
        brand_name = $1, category = $2, audience = $3,
        primary_color = $4, secondary_color = $5, accent_color = $6,
        font_family = $7, motion_style = $8, subtitle_style = $9,
        logo_url = $10, updated_at = NOW()
       WHERE id = $11`,
      [
        next.brand_name, next.category, next.audience,
        next.primary_color, next.secondary_color, next.accent_color,
        next.font_family, next.motion_style, next.subtitle_style,
        next.logo_url, existing.id,
      ]
    );
    return c.json({ ...next, id: existing.id, user_id: DEFAULT_USER_ID });
  }

  const created = await queryOne<BrandKit>(
    `INSERT INTO brand_kits
       (brand_name, category, audience, primary_color, secondary_color,
        accent_color, font_family, motion_style, subtitle_style, logo_url, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      next.brand_name, next.category, next.audience,
      next.primary_color, next.secondary_color, next.accent_color,
      next.font_family, next.motion_style, next.subtitle_style, next.logo_url,
      DEFAULT_USER_ID,
    ]
  );
  return c.json(created);
});
