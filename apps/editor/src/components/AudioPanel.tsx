import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  ScrollArea,
  SimpleGrid,
  Slider,
  Stack,
  Text
} from "@mantine/core";
import { IconMusic, IconPlus, IconTrash, IconUpload, IconVolume, IconVolumeOff } from "@tabler/icons-react";
import type { Asset, AudioTrack } from "@kwikk/shared-types";
import { InspectorField } from "@kwikk/ui-kit";

export interface AudioPanelProps {
  audioTracks: AudioTrack[];
  audioAssets: Asset[];
  onAdd: (track: AudioTrack) => void;
  onDelete: (trackId: string) => void;
  onUpdate: (trackId: string, patch: Partial<Omit<AudioTrack, "id" | "src" | "durationMs">>) => void;
  onUpload: () => void;
}

function AudioTrackRow({
  track,
  onDelete,
  onUpdate
}: {
  track: AudioTrack;
  onDelete: () => void;
  onUpdate: (patch: Partial<Omit<AudioTrack, "id" | "src" | "durationMs">>) => void;
}) {
  return (
    <Stack gap={6} style={{ padding: "8px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.09)", background: "rgba(0,0,0,0.02)" }}>
      <Group gap={6} wrap="nowrap">
        <IconMusic size={12} color="#20c997" style={{ flexShrink: 0 }} />
        <Text fz="xs" fw={600} c="gray.8" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {track.name}
        </Text>
        <ActionIcon
          size="xs"
          variant={track.muted ? "filled" : "subtle"}
          color={track.muted ? "orange" : "gray"}
          title={track.muted ? "Unmute" : "Mute"}
          onClick={() => onUpdate({ muted: !track.muted })}
        >
          {track.muted ? <IconVolumeOff size={11} /> : <IconVolume size={11} />}
        </ActionIcon>
        <ActionIcon size="xs" variant="subtle" color="red" onClick={onDelete}>
          <IconTrash size={11} />
        </ActionIcon>
      </Group>

      <Group gap={8} wrap="nowrap" align="center">
        <Text fz={10} c="gray.5" w={24}>
          Vol
        </Text>
        <Slider
          size="xs"
          style={{ flex: 1 }}
          min={0}
          max={1}
          step={0.05}
          value={track.volume}
          onChange={(v) => onUpdate({ volume: v })}
        />
        <Text fz={10} c="gray.6" w={28} ta="right">
          {Math.round(track.volume * 100)}%
        </Text>
      </Group>

      <SimpleGrid cols={2} spacing={6}>
        <InspectorField
          label="Fade in"
          input={
            <NumberInput
              size="xs"
              min={0}
              max={5000}
              step={100}
              value={track.fadeInMs}
              suffix=" ms"
              onChange={(v) => onUpdate({ fadeInMs: typeof v === "number" ? v : 0 })}
            />
          }
        />
        <InspectorField
          label="Fade out"
          input={
            <NumberInput
              size="xs"
              min={0}
              max={5000}
              step={100}
              value={track.fadeOutMs}
              suffix=" ms"
              onChange={(v) => onUpdate({ fadeOutMs: typeof v === "number" ? v : 0 })}
            />
          }
        />
      </SimpleGrid>

      <Group gap={6}>
        <Checkbox size="xs" label="Loop" checked={track.loop} onChange={(e) => onUpdate({ loop: e.currentTarget.checked })} />
      </Group>
    </Stack>
  );
}

export function AudioPanel({ audioTracks, audioAssets, onAdd, onDelete, onUpdate, onUpload }: AudioPanelProps) {
  return (
    <Stack gap={0} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box p={8} style={{ flexShrink: 0 }}>
        <Button fullWidth size="sm" variant="light" color="teal" leftSection={<IconUpload size={14} />} onClick={onUpload}>
          Upload Audio
        </Button>
      </Box>

      {audioAssets.length > 0 && (
        <>
          <Text fz="xs" fw={700} tt="uppercase" c="gray.5" px={10} pb={4} lts="0.06em">
            Library
          </Text>
          <Stack gap={4} px={8} pb={8}>
            {audioAssets.map((asset) => {
              const alreadyAdded = audioTracks.some((t) => t.src === asset.src);
              return (
                <Group
                  key={asset.id}
                  gap={6}
                  wrap="nowrap"
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(0,0,0,0.02)"
                  }}
                >
                  <IconMusic size={13} color="#20c997" style={{ flexShrink: 0 }} />
                  <Text fz="xs" c="gray.7" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {asset.name}
                  </Text>
                  <ActionIcon
                    size="xs"
                    variant="light"
                    color="teal"
                    disabled={alreadyAdded}
                    onClick={() =>
                      onAdd({
                        id: crypto.randomUUID(),
                        name: asset.name,
                        src: asset.src,
                        volume: 0.8,
                        startMs: 0,
                        trimStartMs: 0,
                        trimEndMs: undefined,
                        durationMs: Math.max(1, asset.durationMs ?? 1),
                        fadeInMs: 0,
                        fadeOutMs: 0,
                        loop: false,
                        muted: false
                      })
                    }
                  >
                    <IconPlus size={10} />
                  </ActionIcon>
                </Group>
              );
            })}
          </Stack>
        </>
      )}

      <Divider color="rgba(0,0,0,0.07)" />
      <Text fz="xs" fw={700} tt="uppercase" c="gray.5" px={10} pt={8} pb={4} lts="0.06em">
        Active Tracks
      </Text>
      <ScrollArea style={{ flex: 1 }}>
        {audioTracks.length === 0 ? (
          <Text fz="xs" c="gray.5" ta="center" p={16}>
            No audio tracks yet.
          </Text>
        ) : (
          <Stack gap={6} p={8}>
            {audioTracks.map((track) => (
              <AudioTrackRow
                key={track.id}
                track={track}
                onDelete={() => onDelete(track.id)}
                onUpdate={(patch) => onUpdate(track.id, patch)}
              />
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  );
}
