import { useEffect, useState } from "react";
import {
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconBookmark, IconCheck } from "@tabler/icons-react";
import type { ProjectDocument, Scene } from "@kwikk/shared-types";
import { apiFetch } from "../apiClient";

type ExampleKind = "scene" | "typography" | "video";

interface Props {
  opened: boolean;
  onClose: () => void;
  project: ProjectDocument;
  selectedScene: Scene | null;
}

const TAG_SUGGESTIONS = [
  "dark_bg", "light_bg", "image_led", "text_only", "hook", "body", "cta",
  "finance", "tech", "wellness", "travel", "luxury", "food", "education", "sports",
  "dramatic", "energetic", "luxurious", "cinematic", "viral",
  "cinematic_hero", "typographic_statement", "layered_card", "minimal_bold",
  "gradient_text", "rich_text", "depth_charge", "slam_down", "drift_in",
  "word_slide_up", "count_up", "typewriter", "animated_stat",
  "shadow_stack", "glow_effect", "pattern_interrupt", "lower_third",
  "6_layers", "animated_gradient", "spring_in", "momentum_carry",
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseLines(text: string) {
  return text.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

// Auto-infer palette from background color luminance/hue
function inferPalette(scene: Scene | null): string {
  const hex = scene?.background?.color ?? "#111111";
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum > 0.7) return "light";
  if (lum < 0.15) return r > g + 0.05 ? "warm" : g > r + 0.05 ? "cool" : "dark";
  return r > g + 0.08 ? "warm" : g > r + 0.08 ? "cool" : "dark";
}

// Auto-infer scene position from index in project
function inferPosition(project: ProjectDocument, scene: Scene | null): string {
  if (!scene) return "any";
  const idx = project.scenes.findIndex((s) => s.id === scene.id);
  if (idx === 0) return "hook";
  if (idx === project.scenes.length - 1) return "cta";
  return "body";
}

export function SaveAsExampleModal({ opened, onClose, project, selectedScene }: Props) {
  const [kind, setKind] = useState<ExampleKind>("scene");
  const [label, setLabel] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!opened) return;
    setSaved(false);
    setError("");
    setNotes("");
    setTags([]);
    setLabel(kind === "video" ? (project.name ?? "") : (selectedScene?.name ?? ""));
  }, [opened, kind, project, selectedScene]);

  function getDataPayload() {
    if (kind === "typography") {
      // Background-agnostic: only text elements with their styles and animations
      return (selectedScene?.elements ?? []).filter((el) => el.type === "text");
    }
    if (kind === "scene") {
      // Full scene: background, all elements with animations, transition
      return selectedScene;
    }
    // Full video: all scenes in sequence including transitions between them
    return { name: project.name, viewport: project.viewport, scenes: project.scenes };
  }

  async function handleSave() {
    if (!label) { setError("Label is required."); return; }
    if (kind !== "video" && !selectedScene) { setError("No scene selected."); return; }

    // Typography is background-agnostic — palette and position are irrelevant
    const palette = kind === "typography" ? "any" : inferPalette(selectedScene);
    const scenePosition = kind === "typography" ? "any" : inferPosition(project, selectedScene);
    const noteLines = parseLines(notes);

    setSaving(true);
    setError("");
    try {
      const res = await apiFetch("/api/v1/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: slugify(label) + "_" + Date.now(),
          kind,
          label,
          description: noteLines[0] ?? "",
          meta: {
            tags,
            mood: [],
            palette,
            scenePosition,
            motionAxis: "mixed",
            contentNiches: ["general"],
            difficulty: "intermediate",
          },
          data: getDataPayload(),
          annotations: {
            whatMakesItGood: noteLines,
            keyDecisions: [],
            remixHints: [],
          },
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => { onClose(); setSaved(false); }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Group gap="xs"><IconBookmark size={14} /><Text fw={600} size="sm">Save as Example</Text></Group>}
      size="sm"
    >
      <Stack gap="sm">
        <SegmentedControl
          size="xs"
          value={kind}
          onChange={(v) => setKind(v as ExampleKind)}
          data={[
            { value: "scene", label: "Scene" },
            { value: "typography", label: "Typography" },
            { value: "video", label: "Full video" },
          ]}
        />

        <TextInput
          size="sm"
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <TagsInput
          size="sm"
          placeholder="Tags — pick or type"
          data={TAG_SUGGESTIONS}
          value={tags}
          onChange={setTags}
          clearable
        />

        <Textarea
          size="sm"
          placeholder={"Notes — what makes this good, key decisions, remix hints (one per line)"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          autosize
          minRows={3}
          maxRows={8}
        />

        {error && <Text size="xs" c="red">{error}</Text>}

        <Group justify="flex-end" gap="xs">
          <Button size="xs" variant="subtle" onClick={onClose}>Cancel</Button>
          <Button
            size="xs"
            leftSection={saved ? <IconCheck size={12} /> : <IconBookmark size={12} />}
            color={saved ? "green" : "orange"}
            onClick={handleSave}
            loading={saving}
          >
            {saved ? "Saved!" : "Save"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
