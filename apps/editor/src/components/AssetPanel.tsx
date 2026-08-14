import { useState } from "react";
import {
  ActionIcon,
  Box,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput
} from "@mantine/core";
import {
  IconMusic,
  IconPlayerPlay,
  IconSearch,
  IconStar,
  IconTrash,
  IconUpload
} from "@tabler/icons-react";
import type { Asset } from "@kwikk/shared-types";

export interface AssetPanelProps {
  assets: Asset[];
  onAddToCanvas: (asset: Asset) => void;
  onDelete: (assetId: string) => void;
  onToggleFavorite: (assetId: string, current: boolean) => void;
  onUpload: () => void;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function AssetGridCard({
  asset,
  onAddToCanvas,
  onDelete,
  onToggleFavorite
}: {
  asset: Asset;
  onAddToCanvas: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      style={{
        borderRadius: 8,
        border: "1px solid rgba(0,0,0,0.09)",
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        background: "#f8f9fa"
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Box style={{ aspectRatio: "1", overflow: "hidden", position: "relative" }} onClick={onAddToCanvas}>
        {asset.type === "image" && (
          <img
            src={asset.src}
            alt={asset.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        {asset.type === "video" && (
          <Box
            style={{
              width: "100%",
              height: "100%",
              background: "#1a1a2e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative"
            }}
          >
            <IconPlayerPlay size={20} color="rgba(255,255,255,0.7)" />
            {asset.durationMs != null && asset.durationMs > 0 && (
              <Text
                fz={9}
                c="white"
                fw={600}
                style={{
                  position: "absolute",
                  bottom: 4,
                  right: 6,
                  background: "rgba(0,0,0,0.6)",
                  borderRadius: 3,
                  padding: "1px 4px"
                }}
              >
                {formatDuration(asset.durationMs)}
              </Text>
            )}
          </Box>
        )}
        {asset.type === "audio" && (
          <Box
            style={{
              width: "100%",
              height: "100%",
              background: "#1a1a2e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <IconMusic size={20} color="rgba(255,255,255,0.5)" />
          </Box>
        )}

        {hovered && (
          <Box
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text fz="xs" c="white" fw={600}>
              Use
            </Text>
          </Box>
        )}
      </Box>

      <Box style={{ padding: "5px 7px", display: "flex", alignItems: "center", gap: 4 }}>
        <Text
          fz={10}
          fw={600}
          c="gray.7"
          style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {asset.name}
        </Text>
        <ActionIcon
          size={16}
          variant="subtle"
          color={asset.favorite ? "yellow" : "gray"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          <IconStar size={10} fill={asset.favorite ? "currentColor" : "none"} />
        </ActionIcon>
        <ActionIcon
          size={16}
          variant="subtle"
          color="red"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <IconTrash size={10} />
        </ActionIcon>
      </Box>
    </Box>
  );
}

export function AssetPanel({ assets, onAddToCanvas, onDelete, onToggleFavorite, onUpload }: AssetPanelProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video" | "audio">("all");

  const filtered = assets.filter((a) => {
    const matchesType = typeFilter === "all" || a.type === typeFilter;
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      a.name.toLowerCase().includes(q) ||
      (a.tags ?? []).some((t) => t.toLowerCase().includes(q));
    return matchesType && matchesQuery;
  });

  return (
    <Stack gap={0} style={{ display: "flex", flexDirection: "column" }}>
      <Group gap={6} p={8} style={{ flexShrink: 0 }}>
        <TextInput
          size="xs"
          placeholder="Search assets..."
          leftSection={<IconSearch size={12} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <ActionIcon size="sm" variant="filled" color="grape" onClick={onUpload} title="Upload">
          <IconUpload size={13} />
        </ActionIcon>
      </Group>

      <SegmentedControl
        size="xs"
        data={[
          { label: "All", value: "all" },
          { label: "Images", value: "image" },
          { label: "Videos", value: "video" },
          { label: "Audio", value: "audio" }
        ]}
        value={typeFilter}
        onChange={(v) => setTypeFilter(v as typeof typeFilter)}
        style={{ margin: "0 8px 8px", flexShrink: 0 }}
      />

      <Box style={{ flex: 1 }}>
        {filtered.length === 0 ? (
          <Text c="gray.5" fz="xs" ta="center" p={16}>
            {query ? "No assets match your search." : "No assets yet. Upload files to get started."}
          </Text>
        ) : (
          <SimpleGrid cols={2} spacing={6} p={8}>
            {filtered.map((asset) => (
              <AssetGridCard
                key={asset.id}
                asset={asset}
                onAddToCanvas={() => onAddToCanvas(asset)}
                onDelete={() => onDelete(asset.id)}
                onToggleFavorite={() => onToggleFavorite(asset.id, !!asset.favorite)}
              />
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Stack>
  );
}
