import { useCallback, useEffect, useRef, useState } from "react";
import { Box, ColorSwatch, Popover, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

interface IconMeta {
  name: string;
  style: string;
  tags: string[];
}

const PALETTE = [
  "#0f172a", "#475569", "#94a3b8", "#ffffff",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

function iconSvgUrl(name: string, color: string): string {
  const hex = color.replace("#", "");
  return `/api/v1/icons/${encodeURIComponent(name)}/svg?color=${hex}`;
}

// PixiJS cannot load SVGs served over HTTP — rasterize to a PNG data URL.
// Renders at 3× the SVG's 256 viewBox (768px) for sharp retina display.
// Uses an inline data: URL rather than a blob URL for cross-browser reliability.
async function svgToPng(svgUrl: string, size = 768): Promise<string> {
  const res = await fetch(svgUrl);
  if (!res.ok) throw new Error(`fetch ${svgUrl} → ${res.status}`);
  const svgText = await res.text();
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error(`img failed to load SVG data URL for ${svgUrl}`));
    img.src = dataUrl;
  });
}

interface IconCardProps {
  icon: IconMeta;
  color: string;
  onAdd: (url: string, name: string) => void;
}

function IconCard({ icon, color, onAdd }: IconCardProps) {
  const [hovered, setHovered] = useState(false);
  const url = iconSvgUrl(icon.name, color);

  async function handleClick() {
    try {
      const png = await svgToPng(url, 256);
      onAdd(png, icon.name);
    } catch {
      // fall back to raw URL if rasterization fails
      onAdd(url, icon.name);
    }
  }

  return (
    <Box
      title={icon.name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        padding: "6px 4px",
        borderRadius: 7,
        cursor: "pointer",
        background: hovered ? "rgba(79,70,229,0.08)" : "transparent",
        border: `1px solid ${hovered ? "#4f46e5" : "transparent"}`,
        transition: "background 0.1s, border-color 0.1s",
      }}
    >
      <img src={url} alt={icon.name} width={32} height={32} style={{ display: "block" }} />
      <Text
        fz={9}
        c="gray.6"
        ta="center"
        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", maxWidth: 56 }}
      >
        {icon.name}
      </Text>
    </Box>
  );
}

interface IconPanelProps {
  onAddToCanvas: (src: string, name: string) => void;
}

export function IconPanel({ onAddToCanvas }: IconPanelProps) {
  const [query, setQuery] = useState("");
  const [icons, setIcons] = useState<IconMeta[]>([]);
  const [color, setColor] = useState("#0f172a");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchIcons = useCallback((q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "120" });
    if (q) params.set("q", q);
    fetch(`/api/v1/icons?${params}`)
      .then((r) => r.json())
      .then((data) => setIcons(data.icons ?? []))
      .catch(() => setIcons([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchIcons("");
  }, [fetchIcons]);

  function handleSearch(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchIcons(q), 220);
  }

  return (
    <Stack gap={0} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search + color picker */}
      <Box p={8} pb={6} style={{ flexShrink: 0, display: "flex", gap: 6, alignItems: "center" }}>
        <TextInput
          size="xs"
          placeholder="Search icons…"
          leftSection={<IconSearch size={12} />}
          value={query}
          onChange={(e) => handleSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Popover position="bottom-end" withinPortal>
          <Popover.Target>
            <Box
              title="Icon color"
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: color,
                border: "1.5px solid rgba(0,0,0,0.2)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            />
          </Popover.Target>
          <Popover.Dropdown p="xs">
            <SimpleGrid cols={4} spacing={4}>
              {PALETTE.map((c) => (
                <ColorSwatch
                  key={c}
                  color={c}
                  size={20}
                  style={{ cursor: "pointer", outline: c === color ? "2px solid #4f46e5" : "none", outlineOffset: 1 }}
                  onClick={() => setColor(c)}
                />
              ))}
            </SimpleGrid>
          </Popover.Dropdown>
        </Popover>
      </Box>

      {/* Grid */}
      <Box style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <Text fz="xs" c="gray.5" ta="center" pt={16}>Loading…</Text>
        ) : icons.length === 0 ? (
          <Text fz="xs" c="gray.5" ta="center" pt={16}>No icons found</Text>
        ) : (
          <SimpleGrid cols={3} spacing={2} p={6}>
            {icons.map((ic) => (
              <IconCard
                key={`${ic.name}-${ic.style}`}
                icon={ic}
                color={color}
                onAdd={onAddToCanvas}
              />
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Stack>
  );
}
