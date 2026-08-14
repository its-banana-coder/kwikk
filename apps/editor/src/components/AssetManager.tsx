import { useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconApps,
  IconLayoutDashboard,
  IconMusic,
  IconTrash,
  IconUpload,
  IconVideo,
} from "@tabler/icons-react";
import type { Asset, AudioTrack } from "@kwikk/shared-types";
import { AudioPanel } from "./AudioPanel";
import { IconPanel } from "./IconPanel";
import { BackgroundPanel, type BackgroundLibraryItem } from "./BackgroundPanel";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "personal" | "common";
type PersonalCat = "videos" | "audio";
type CommonCat = "icons" | "backgrounds";

// ── Category app-icon button ──────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  images:      "#f97316",
  videos:      "#8b5cf6",
  audio:       "#14b8a6",
  icons:       "#4f46e5",
  backgrounds: "#0ea5e9",
};

function AppIcon({
  icon,
  label,
  colorKey,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  colorKey: string;
  selected: boolean;
  onClick: () => void;
}) {
  const color = CAT_COLORS[colorKey] ?? "#6b7280";
  return (
    <Box
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <Box
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: selected ? color : "rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: selected ? `0 3px 10px ${color}55` : "none",
          transition: "background 0.15s, box-shadow 0.15s",
        }}
      >
        <Box style={{ color: selected ? "#fff" : "#6b7280" }}>{icon}</Box>
      </Box>
      <Text fz={10} fw={600} c={selected ? "dark.5" : "gray.5"} lh={1}>
        {label}
      </Text>
    </Box>
  );
}

// ── Section pill toggle ───────────────────────────────────────────────────────

function SectionToggle({ value, onChange }: { value: Section; onChange: (v: Section) => void }) {
  return (
    <Box
      style={{
        display: "flex",
        background: "rgba(0,0,0,0.06)",
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {(["personal", "common"] as Section[]).map((s) => (
        <Box
          key={s}
          onClick={() => onChange(s)}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "5px 0",
            borderRadius: 8,
            background: value === s ? "#fff" : "transparent",
            boxShadow: value === s ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          <Text fz={12} fw={600} c={value === s ? "dark.7" : "gray.5"}>
            {s === "personal" ? "Personal" : "Common"}
          </Text>
        </Box>
      ))}
    </Box>
  );
}



// ── Personal — videos grid ────────────────────────────────────────────────────

function VideoGrid({
  assets,
  onAddToCanvas,
  onDelete,
  onUpload,
}: {
  assets: Asset[];
  onAddToCanvas: (a: Asset) => void;
  onDelete: (id: string) => void;
  onUpload: () => void;
}) {
  const videos = assets.filter((a) => a.type === "video");
  return (
    <Stack gap={8} p={8} style={{ flex: 1 }}>
      <Button fullWidth size="sm" variant="light" color="violet" leftSection={<IconUpload size={14} />} onClick={onUpload}>
        Upload Video
      </Button>
      {videos.length === 0 ? (
        <Text c="gray.5" fz="xs" ta="center" pt={4}>No videos yet.</Text>
      ) : (
        <Stack gap={4}>
          {videos.map((a) => (
            <Box
              key={a.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, border: "1px solid rgba(0,0,0,0.09)", background: "#f8f9fa", cursor: "pointer" }}
              onClick={() => onAddToCanvas(a)}
            >
              <Box style={{ width: 28, height: 28, borderRadius: 6, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconVideo size={14} color="rgba(255,255,255,0.7)" />
              </Box>
              <Text fz={11} fw={500} c="gray.7" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</Text>
              <ActionIcon size={18} variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}>
                <IconTrash size={10} />
              </ActionIcon>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}



// ── AssetManager (main export) ────────────────────────────────────────────────

export interface AssetManagerProps {
  assets: Asset[];
  audioTracks: AudioTrack[];
  onAddToCanvas: (asset: Asset) => void;
  onAddImageUrl: (src: string, name: string) => void;
  onDelete: (assetId: string) => void;
  onToggleFavorite: (assetId: string, current: boolean) => void;
  onUploadImages: () => void;
  onUploadVideos: () => void;
  onUploadAudio: () => void;
  onAddAudioTrack: (track: AudioTrack) => void;
  onDeleteAudioTrack: (trackId: string) => void;
  onUpdateAudioTrack: (trackId: string, patch: Partial<Omit<AudioTrack, "id" | "src" | "durationMs">>) => void;
  onSelectBackground: (background: BackgroundLibraryItem) => void;
}

export function AssetManager({
  assets,
  audioTracks,
  onAddToCanvas,
  onAddImageUrl,
  onDelete,
  onUploadVideos,
  onUploadAudio,
  onAddAudioTrack,
  onDeleteAudioTrack,
  onUpdateAudioTrack,
  onSelectBackground,
}: AssetManagerProps) {
  const [section, setSection] = useState<Section>("personal");
  const [personalCat, setPersonalCat] = useState<PersonalCat>("videos");
  const [commonCat, setCommonCat] = useState<CommonCat>("icons");

  const personalCats: { key: PersonalCat; label: string; icon: React.ReactNode }[] = [
    { key: "videos", label: "Videos", icon: <IconVideo size={22} /> },
    { key: "audio",  label: "Audio",  icon: <IconMusic size={22} /> },
  ];

  const commonCats: { key: CommonCat; label: string; icon: React.ReactNode }[] = [
    { key: "icons",       label: "Icons",       icon: <IconApps size={22} /> },
    { key: "backgrounds", label: "Backgrounds", icon: <IconLayoutDashboard size={22} /> },
  ];

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Section toggle */}
      <Box px={10} pt={10} pb={8} style={{ flexShrink: 0 }}>
        <SectionToggle value={section} onChange={(s) => setSection(s)} />
      </Box>

      {/* Category app icons */}
      <Box
        style={{
          flexShrink: 0,
          padding: "8px 10px 10px",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          display: "flex",
          gap: 10,
          justifyContent: section === "personal" ? "space-around" : "flex-start",
        }}
      >
        {section === "personal"
          ? personalCats.map(({ key, label, icon }) => (
              <AppIcon key={key} icon={icon} label={label} colorKey={key} selected={personalCat === key} onClick={() => setPersonalCat(key)} />
            ))
          : commonCats.map(({ key, label, icon }) => (
              <AppIcon key={key} icon={icon} label={label} colorKey={key} selected={commonCat === key} onClick={() => setCommonCat(key)} />
            ))}
      </Box>

      {/* Content */}
      <Box style={{ flex: 1, overflow: "auto" }}>

        {section === "personal" && personalCat === "videos" && (
          <VideoGrid assets={assets} onAddToCanvas={onAddToCanvas} onDelete={onDelete} onUpload={onUploadVideos} />
        )}
        {section === "personal" && personalCat === "audio" && (
          <AudioPanel
            audioTracks={audioTracks}
            audioAssets={assets.filter((a) => a.type === "audio")}
            onAdd={onAddAudioTrack}
            onDelete={onDeleteAudioTrack}
            onUpdate={onUpdateAudioTrack}
            onUpload={onUploadAudio}
          />
        )}
        {section === "common" && commonCat === "icons" && (
          <IconPanel onAddToCanvas={onAddImageUrl} />
        )}
        {section === "common" && commonCat === "backgrounds" && (
          <BackgroundPanel onSelect={onSelectBackground} />
        )}
      </Box>
    </Box>
  );
}
