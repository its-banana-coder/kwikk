/**
 * Pixabay API client — free stock images, videos, and music.
 * All functions return [] silently if PIXABAY_API_KEY is not set.
 */

const BASE = "https://pixabay.com/api";

export interface PixabayImage {
  id: number;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  tags: string;
  imageWidth: number;
  imageHeight: number;
  user: string;
}

export interface PixabayVideo {
  id: number;
  tags: string;
  duration: number;
  user: string;
  videos: {
    large: { url: string; width: number; height: number };
    medium: { url: string; width: number; height: number };
    small: { url: string; width: number; height: number };
  };
}

export interface PixabayAudio {
  id: number;
  title: string;
  duration: number;
  audio_url: string;
  tags: string;
  user: string;
  genre: string;
}

async function pixabayFetch<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json() as { hits?: T[] };
    return data.hits ?? [];
  } catch {
    return [];
  }
}

export async function searchImages(
  query: string,
  opts: { image_type?: string; orientation?: string; per_page?: number } = {}
): Promise<PixabayImage[]> {
  return pixabayFetch<PixabayImage>("", {
    q: query,
    image_type: opts.image_type ?? "photo",
    orientation: opts.orientation ?? "all",
    per_page: String(opts.per_page ?? 8),
    safesearch: "true",
  });
}

export async function searchVideos(
  query: string,
  opts: { orientation?: string; per_page?: number } = {}
): Promise<PixabayVideo[]> {
  return pixabayFetch<PixabayVideo>("/videos/", {
    q: query,
    orientation: opts.orientation ?? "all",
    per_page: String(opts.per_page ?? 6),
    safesearch: "true",
  });
}

export async function searchAudio(
  query: string,
  opts: { genre?: string; per_page?: number } = {}
): Promise<PixabayAudio[]> {
  const params: Record<string, string> = {
    q: query,
    per_page: String(opts.per_page ?? 6),
  };
  if (opts.genre) params.genre = opts.genre;
  return pixabayFetch<PixabayAudio>("/music/", params);
}
