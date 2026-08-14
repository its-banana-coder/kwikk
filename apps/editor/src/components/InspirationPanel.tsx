import { useCallback, useEffect, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Code,
  Collapse,
  Group,
  Loader,
  MultiSelect,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconBookmark,
  IconChevronDown,
  IconChevronRight,
  IconSearch,
  IconTrash,
  IconRefresh,
  IconDownload,
} from "@tabler/icons-react";
import { apiFetch } from "../apiClient";

type ExampleKind = "typography" | "scene" | "video";

interface ExampleMeta {
  tags: string[];
  mood: string[];
  palette: string;
  scenePosition: string;
  motionAxis: string;
  contentNiches: string[];
  difficulty: string;
  visualLanguage?: string;
}

interface InspirationExample {
  id: string;
  kind: ExampleKind;
  subcategory?: string;
  label: string;
  description: string;
  meta: ExampleMeta;
  fontPair?: { headline: string; body: string; tone: string };
  annotations: {
    whatMakesItGood?: string[];
    keyDecisions?: string[];
    remixHints?: string[];
    avoidPatterns?: string[];
    narrative?: string;
    scenePacing?: string[];
    motionPhilosophy?: string;
    paletteRationale?: string;
  };
  scene?: unknown;
  elements?: unknown;
  project?: unknown;
}

const KIND_COLORS: Record<ExampleKind, string> = {
  typography: "violet",
  scene: "orange",
  video: "blue",
};

const KIND_LABELS: Record<ExampleKind, string> = {
  typography: "Typography",
  scene: "Scene",
  video: "Video",
};

const PALETTE_OPTIONS = [
  { value: "", label: "All palettes" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "vivid", label: "Vivid" },
  { value: "luxury", label: "Luxury" },
];

const POSITION_OPTIONS = [
  { value: "", label: "Any position" },
  { value: "hook", label: "Hook" },
  { value: "body", label: "Body" },
  { value: "cta", label: "CTA" },
];

const NICHE_OPTIONS = [
  "finance", "tech", "wellness", "travel", "luxury", "food", "education", "sports", "general",
];

interface InspirationPanelProps {
  onLoadProject?: (project: unknown) => void;
  onLoadScene?: (scene: unknown) => void;
}

export function InspirationPanel({ onLoadProject, onLoadScene }: InspirationPanelProps = {}) {
  const [examples, setExamples] = useState<InspirationExample[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dataExpanded, setDataExpanded] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [paletteFilter, setPaletteFilter] = useState<string>("");
  const [positionFilter, setPositionFilter] = useState<string>("");
  const [nicheFilters, setNicheFilters] = useState<string[]>([]);

  const fetchExamples = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (kindFilter) params.set("kind", kindFilter);
      if (paletteFilter) params.set("palette", paletteFilter);
      if (positionFilter) params.set("scene_position", positionFilter);
      if (nicheFilters.length === 1) params.set("content_niche", nicheFilters[0]);

      const res = await apiFetch(`/api/v1/examples?${params}`);
      const data = await res.json() as { examples: InspirationExample[] };
      setExamples(data.examples ?? []);
    } catch {
      setExamples([]);
    } finally {
      setLoading(false);
    }
  }, [kindFilter, paletteFilter, positionFilter, nicheFilters]);

  useEffect(() => { void fetchExamples(); }, [fetchExamples]);

  async function handleDelete(id: string) {
    await apiFetch(`/api/v1/examples/${id}`, { method: "DELETE" });
    setExamples((prev) => prev.filter((e) => e.id !== id));
  }

  function toggleExpand(id: string) {
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleData(id: string) {
    setDataExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const filtered = examples.filter((ex) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ex.label.toLowerCase().includes(q) ||
      ex.description.toLowerCase().includes(q) ||
      ex.meta.tags.some((t) => t.includes(q)) ||
      ex.meta.mood.some((m) => m.includes(q))
    );
  });

  return (
    <Stack gap={0} style={{ height: "100%", overflow: "hidden" }}>
      {/* Filter bar */}
      <Box style={{ padding: "8px 10px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
        <Stack gap={6}>
          <TextInput
            size="xs"
            leftSection={<IconSearch size={12} />}
            placeholder="Search label, tags, mood…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Group gap={4}>
            <Select
              size="xs"
              style={{ flex: 1 }}
              data={[
                { value: "", label: "All kinds" },
                { value: "scene", label: "Scene" },
                { value: "typography", label: "Typography" },
                { value: "video", label: "Video" },
              ]}
              value={kindFilter}
              onChange={(v) => setKindFilter(v ?? "")}
              placeholder="Kind"
            />
            <Select
              size="xs"
              style={{ flex: 1 }}
              data={PALETTE_OPTIONS}
              value={paletteFilter}
              onChange={(v) => setPaletteFilter(v ?? "")}
              placeholder="Palette"
            />
            <Select
              size="xs"
              style={{ flex: 1 }}
              data={POSITION_OPTIONS}
              value={positionFilter}
              onChange={(v) => setPositionFilter(v ?? "")}
              placeholder="Position"
            />
          </Group>
          <Group gap={4} justify="space-between">
            <MultiSelect
              size="xs"
              style={{ flex: 1 }}
              data={NICHE_OPTIONS}
              value={nicheFilters}
              onChange={setNicheFilters}
              placeholder="Niche"
              maxValues={2}
            />
            <Tooltip label="Refresh" position="right" withArrow>
              <ActionIcon size="sm" variant="subtle" onClick={() => void fetchExamples()}>
                <IconRefresh size={12} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
      </Box>

      {/* Results */}
      <ScrollArea style={{ flex: 1 }}>
        {loading && (
          <Box style={{ display: "flex", justifyContent: "center", padding: 20 }}>
            <Loader size="sm" />
          </Box>
        )}

        {!loading && filtered.length === 0 && (
          <Box style={{ padding: "20px 12px", textAlign: "center" }}>
            <IconBookmark size={28} color="#ccc" />
            <Text size="xs" c="dimmed" mt={6}>
              {examples.length === 0
                ? "No examples saved yet. Use the bookmark button in the toolbar to save scenes."
                : "No examples match your filters."}
            </Text>
          </Box>
        )}

        {!loading && filtered.map((ex) => {
          const isOpen = expanded.has(ex.id);
          const isDataOpen = dataExpanded.has(ex.id);
          const dataPayload = ex.kind === "typography" ? ex.elements : ex.kind === "scene" ? ex.scene : ex.project;

          return (
            <Box
              key={ex.id}
              style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
            >
              {/* Card header */}
              <Box
                style={{ padding: "8px 10px", cursor: "pointer" }}
                onClick={() => toggleExpand(ex.id)}
              >
                <Group gap={6} wrap="nowrap" justify="space-between">
                  <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                    <ActionIcon size="xs" variant="transparent" color="gray">
                      {isOpen ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
                    </ActionIcon>
                    <Badge size="xs" color={KIND_COLORS[ex.kind]} variant="light" style={{ flexShrink: 0 }}>
                      {KIND_LABELS[ex.kind]}
                    </Badge>
                    <Text size="xs" fw={600} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ex.label}
                    </Text>
                  </Group>
                  <Tooltip label="Delete" position="left" withArrow>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={(e) => { e.stopPropagation(); void handleDelete(ex.id); }}
                    >
                      <IconTrash size={11} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                {/* Quick meta row */}
                <Group gap={4} mt={4} ml={20}>
                  {ex.kind !== "typography" && ex.meta.palette !== "any" && (
                    <Badge size="xs" variant="outline" color="gray">{ex.meta.palette}</Badge>
                  )}
                  {ex.kind !== "typography" && ex.meta.scenePosition !== "any" && (
                    <Badge size="xs" variant="outline" color="gray">{ex.meta.scenePosition}</Badge>
                  )}
                  {ex.subcategory && (
                    <Badge size="xs" variant="outline" color="orange">{ex.subcategory}</Badge>
                  )}
                </Group>

                {/* Tags */}
                {ex.meta.tags.length > 0 && (
                  <Group gap={3} mt={4} ml={20}>
                    {ex.meta.tags.slice(0, 5).map((t) => (
                      <Text key={t} size="10px" c="dimmed" style={{ background: "#f3f3f3", padding: "1px 5px", borderRadius: 4 }}>
                        {t}
                      </Text>
                    ))}
                    {ex.meta.tags.length > 5 && (
                      <Text size="10px" c="dimmed">+{ex.meta.tags.length - 5}</Text>
                    )}
                  </Group>
                )}
              </Box>

              {/* Expanded detail */}
              <Collapse in={isOpen}>
                <Box style={{ padding: "0 10px 10px 20px", background: "#fafafa" }}>
                  {ex.description && (
                    <Text size="xs" c="dimmed" mb={6}>{ex.description}</Text>
                  )}

                  {/* Font pair for typography kind */}
                  {ex.kind === "typography" && ex.fontPair && (
                    <Box mb={6}>
                      <Text size="xs" fw={600} c="violet.7">
                        {ex.fontPair.headline} + {ex.fontPair.body}
                      </Text>
                      <Text size="10px" c="dimmed">{ex.fontPair.tone}</Text>
                    </Box>
                  )}

                  {/* Mood chips */}
                  {ex.meta.mood.length > 0 && (
                    <Group gap={4} mb={6}>
                      {ex.meta.mood.map((m) => (
                        <Badge key={m} size="xs" color="gray" variant="dot">{m}</Badge>
                      ))}
                    </Group>
                  )}

                  {/* Annotations */}
                  {ex.annotations.whatMakesItGood && ex.annotations.whatMakesItGood.length > 0 && (
                    <Box mb={6}>
                      <Text size="10px" fw={700} tt="uppercase" c="gray.5" mb={3}>Why it works</Text>
                      {ex.annotations.whatMakesItGood.map((p, i) => (
                        <Text key={i} size="xs" c="dark.4">• {p}</Text>
                      ))}
                    </Box>
                  )}

                  {ex.annotations.keyDecisions && ex.annotations.keyDecisions.length > 0 && (
                    <Box mb={6}>
                      <Text size="10px" fw={700} tt="uppercase" c="gray.5" mb={3}>Key decisions</Text>
                      {ex.annotations.keyDecisions.map((p, i) => (
                        <Text key={i} size="xs" c="dark.4">• {p}</Text>
                      ))}
                    </Box>
                  )}

                  {ex.annotations.remixHints && ex.annotations.remixHints.length > 0 && (
                    <Box mb={6}>
                      <Text size="10px" fw={700} tt="uppercase" c="gray.5" mb={3}>Remix</Text>
                      {ex.annotations.remixHints.map((p, i) => (
                        <Text key={i} size="xs" c="violet.6">• {p}</Text>
                      ))}
                    </Box>
                  )}

                  {/* Diff info for video */}
                  {ex.kind === "video" && ex.annotations.narrative && (
                    <Box mb={6}>
                      <Text size="10px" fw={700} tt="uppercase" c="gray.5" mb={3}>Narrative</Text>
                      <Text size="xs" c="dark.4">{ex.annotations.narrative}</Text>
                    </Box>
                  )}

                  {/* Action buttons */}
                  <Group gap={6} mt={8}>
                    {ex.kind === "video" && Boolean(ex.project) && onLoadProject && (
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="orange"
                        leftSection={<IconDownload size={10} />}
                        onClick={() => onLoadProject(ex.project)}
                      >
                        Load project
                      </Button>
                    )}
                    {ex.kind === "scene" && Boolean(ex.scene) && onLoadScene && (
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="orange"
                        leftSection={<IconDownload size={10} />}
                        onClick={() => onLoadScene(ex.scene)}
                      >
                        Use scene
                      </Button>
                    )}
                  </Group>

                  {/* Toggle raw data */}
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="gray"
                    leftSection={isDataOpen ? <IconChevronDown size={10} /> : <IconChevronRight size={10} />}
                    onClick={() => toggleData(ex.id)}
                    mt={4}
                  >
                    {isDataOpen ? "Hide" : "Show"} raw JSON
                  </Button>

                  <Collapse in={isDataOpen}>
                    <Code
                      block
                      style={{ fontSize: 10, maxHeight: 280, overflow: "auto", marginTop: 6, whiteSpace: "pre", display: "block" }}
                    >
                      {JSON.stringify(dataPayload, null, 2)}
                    </Code>
                  </Collapse>
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </ScrollArea>

      {/* Footer count */}
      {!loading && examples.length > 0 && (
        <Box style={{ padding: "4px 10px", borderTop: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
          <Text size="10px" c="dimmed">{filtered.length} of {examples.length} examples</Text>
        </Box>
      )}
    </Stack>
  );
}
