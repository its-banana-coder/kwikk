import { useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Progress,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import type { ExportPreset } from "@kwikk/render-core";
import type { ProjectDocument } from "@kwikk/shared-types";

type ExportState = "idle" | "encoding" | "done" | "error";

interface ExportModalProps {
  opened: boolean;
  onClose: () => void;
  project: ProjectDocument;
}

export function ExportModal({ opened, onClose, project }: ExportModalProps) {
  const [preset, setPreset] = useState<ExportPreset>("1080p");
  const [frameRate, setFrameRate] = useState<"24" | "30" | "60">("30");

  const [exportState, setExportState] = useState<ExportState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const resultUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleExport() {
    resultUrlRef.current = null;
    setProgress(0);
    setExportState("encoding");
    setErrorMsg("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/v1/render/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, fps: Number(frameRate), preset }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(`Export request failed: ${text}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });

        // SSE lines are delimited by \n\n; parse complete events
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          for (const line of part.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as
                | { type: "progress"; pct: number }
                | { type: "done"; url: string }
                | { type: "error"; message: string };

              if (event.type === "progress") {
                setProgress(event.pct);
              } else if (event.type === "done") {
                resultUrlRef.current = event.url;
                setProgress(100);
                setExportState("done");
              } else if (event.type === "error") {
                throw new Error(event.message);
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue; // malformed SSE line
              throw parseErr;
            }
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") return; // user cancelled
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setExportState("error");
    } finally {
      abortRef.current = null;
    }
  }

  function handleDownload() {
    const url = resultUrlRef.current;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name ?? "export"}.mp4`;
    a.click();
  }

  function handleClose() {
    if (exportState === "encoding") {
      abortRef.current?.abort();
    }
    setExportState("idle");
    setProgress(0);
    resultUrlRef.current = null;
    onClose();
  }

  const isEncoding = exportState === "encoding";

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Text fw={600} fz="sm">Export Video</Text>}
      size={400}
      closeOnClickOutside={!isEncoding}
      closeOnEscape={!isEncoding}
    >
      <Stack gap={16}>
        <Box
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(6,182,212,0.06)",
            border: "1px solid rgba(6,182,212,0.2)",
          }}
        >
          <Text fz={12} c="cyan.7">
            CSS renderer export — all text effects, filters, HTML embeds and animations captured at full fidelity via headless Chrome.
          </Text>
        </Box>

        {/* Resolution */}
        <Box>
          <Text fz={12} fw={500} c="gray.6" mb={6}>Resolution</Text>
          <SegmentedControl
            fullWidth
            size="xs"
            value={preset}
            onChange={(v) => setPreset(v as ExportPreset)}
            data={[
              { label: "Match canvas", value: "match" },
              { label: "720p", value: "720p" },
              { label: "1080p", value: "1080p" },
              { label: "4K", value: "4k" },
            ]}
            disabled={isEncoding}
          />
        </Box>

        {/* Frame rate */}
        <Box>
          <Text fz={12} fw={500} c="gray.6" mb={6}>Frame rate</Text>
          <Select
            size="xs"
            value={frameRate}
            onChange={(v) => setFrameRate((v ?? "30") as "24" | "30" | "60")}
            data={[
              { label: "24 fps — cinematic", value: "24" },
              { label: "30 fps — standard", value: "30" },
              { label: "60 fps — smooth", value: "60" },
            ]}
            disabled={isEncoding}
          />
        </Box>

        {/* Progress */}
        {(isEncoding || exportState === "done") && (
          <Box>
            <Group justify="space-between" mb={4}>
              <Text fz={12} c="gray.6">
                {isEncoding
                  ? progress < 60
                    ? "Rendering frames…"
                    : progress < 70
                      ? "Processing audio…"
                      : "Encoding MP4…"
                  : "Complete"}
              </Text>
              <Badge size="xs" variant="light" color={exportState === "done" ? "teal" : "orange"}>
                {progress}%
              </Badge>
            </Group>
            <Progress
              value={progress}
              color={exportState === "done" ? "teal" : "orange"}
              animated={isEncoding}
              size="sm"
            />
          </Box>
        )}

        {exportState === "error" && (
          <Text fz={12} c="red.6">{errorMsg}</Text>
        )}

        {/* Actions */}
        <Group justify="flex-end" gap={8}>
          <Button size="xs" variant="subtle" color="gray" onClick={handleClose} disabled={false}>
            {exportState === "done" ? "Close" : isEncoding ? "Cancel" : "Cancel"}
          </Button>

          {exportState === "done" ? (
            <Button
              size="xs"
              color="teal"
              leftSection={<IconDownload size={13} />}
              onClick={handleDownload}
            >
              Download MP4
            </Button>
          ) : (
            <Button
              size="xs"
              color="orange"
              loading={isEncoding}
              onClick={handleExport}
              disabled={isEncoding}
            >
              {isEncoding ? "Rendering…" : "Export"}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
