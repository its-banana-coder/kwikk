import { useCallback, useEffect, useRef, useState } from "react";
import { Box, SimpleGrid, Stack, Text, TextInput, Loader } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { patternCraftBackgrounds } from "../lib/patternCraftBackgrounds";
import { cssBackgroundStyleToDataUrl, extractBackgroundFallbackColor, rasterizeDataUrlToPng } from "../lib/cssBackgroundRaster";

export interface BackgroundLibraryItem {
  id: string;
  name: string;
  type: string;
  category: string;
  tags: string[];
  url: string;
  previewUrl?: string;
  description?: string;
  source: "stock" | "css";
  backgroundColor?: string;
}

interface BackgroundCardProps {
  bg: BackgroundLibraryItem;
  onSelect: (background: BackgroundLibraryItem) => void;
}

function BackgroundCard({ bg, onSelect }: BackgroundCardProps) {
  const [hovered, setHovered] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  async function handleSelect() {
    if (isApplying) return;
    setIsApplying(true);
    try {
      if (bg.source === "css") {
        const rasterUrl = await rasterizeDataUrlToPng(bg.url, 1080, 1920);
        onSelect({ ...bg, url: rasterUrl });
      } else {
        onSelect(bg);
      }
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <Box
      onClick={() => { void handleSelect(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={bg.name}
      style={{
        position: "relative",
        aspectRatio: "16/9",
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        opacity: isApplying ? 0.72 : 1,
        border: `1.5px solid ${hovered ? "#0ea5e9" : "rgba(0,0,0,0.08)"}`,
        boxShadow: hovered ? "0 4px 12px rgba(14,165,233,0.2)" : "none",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
        transform: hovered ? "scale(1.02)" : "scale(1)",
      }}
    >
      <img
        src={bg.previewUrl ?? bg.url}
        alt={bg.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transition: "transform 0.3s ease",
          transform: hovered ? "scale(1.08)" : "scale(1)",
        }}
      />
      
      {/* Dynamic hover overlay showing the background name */}
      <Box
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 80%)",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.2s ease",
          display: "flex",
          alignItems: "flex-end",
          padding: 8,
        }}
      >
        {bg.source === "css" && (
          <Box
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "2px 6px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              color: "#111827",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {isApplying ? "..." : "CSS"}
          </Box>
        )}
        <Text
          fz={10}
          fw={600}
          c="white"
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
          }}
        >
          {bg.name}
        </Text>
      </Box>
    </Box>
  );
}

interface BackgroundPanelProps {
  onSelect: (background: BackgroundLibraryItem) => void;
}

const cssPresetBackgrounds: BackgroundLibraryItem[] = patternCraftBackgrounds.map((pattern) => ({
  id: `css-${pattern.id}`,
  name: pattern.name,
  type: "image",
  category: pattern.category,
  tags: [pattern.category, "css", "pattern", "background"],
  description: pattern.description,
  source: "css",
  backgroundColor: extractBackgroundFallbackColor(pattern.style),
  url: cssBackgroundStyleToDataUrl(pattern.style, 1080, 1920),
  previewUrl: cssBackgroundStyleToDataUrl(pattern.style, 320, 180),
}));

export function BackgroundPanel({ onSelect }: BackgroundPanelProps) {
  const [query, setQuery] = useState("");
  const [backgrounds, setBackgrounds] = useState<BackgroundLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBackgrounds = useCallback((q: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("type", "image");
    fetch(`/api/v1/backgrounds?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const remote = Array.isArray(data)
          ? data.map((bg) => ({
              id: String(bg.id),
              name: bg.name,
              type: bg.type,
              category: bg.category,
              tags: Array.isArray(bg.tags) ? bg.tags : [],
              url: bg.url,
              previewUrl: bg.thumbnail_url || bg.url,
              source: "stock" as const,
            }))
          : [];

        const normalizedQuery = q.trim().toLowerCase();
        const local = normalizedQuery
          ? cssPresetBackgrounds.filter((bg) => {
              const haystack = [bg.name, bg.category, bg.description, ...bg.tags]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return haystack.includes(normalizedQuery);
            })
          : cssPresetBackgrounds;

        setBackgrounds([...local, ...remote]);
      })
      .catch(() => setBackgrounds(cssPresetBackgrounds))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBackgrounds("");
  }, [fetchBackgrounds]);

  function handleSearch(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchBackgrounds(q), 250);
  }

  return (
    <Stack gap={0} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search Input */}
      <Box p={8} pb={6} style={{ flexShrink: 0 }}>
        <TextInput
          size="xs"
          placeholder="Search backgrounds..."
          leftSection={<IconSearch size={12} />}
          value={query}
          onChange={(e) => handleSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
      </Box>

      {/* Backgrounds Grid */}
      <Box style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <Box style={{ display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 32 }}>
            <Loader size="xs" color="blue" />
          </Box>
        ) : backgrounds.length === 0 ? (
          <Text fz="xs" c="gray.5" ta="center" pt={16}>No backgrounds found</Text>
        ) : (
          <SimpleGrid cols={2} spacing={8} p={8}>
            {backgrounds.map((bg) => (
              <BackgroundCard
                key={bg.id}
                bg={bg}
                onSelect={onSelect}
              />
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Stack>
  );
}
