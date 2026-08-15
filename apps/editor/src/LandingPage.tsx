import { useEffect, useState } from "react";
import { Box, Button, Loader, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconMovie, IconPlus } from "@tabler/icons-react";

type ProjectSummary = {
  id: number;
  title: string;
  thumbnail: string | null;
  updated_at: string;
};

function projectHref(id: number): string {
  return `${window.location.pathname}?projectId=${id}`;
}

export function LandingPage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/projects")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ProjectSummary[]>;
      })
      .then(setProjects)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <Box style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <Stack gap={4} mb={32}>
        <Title order={2}>Your videos</Title>
        <Text c="dimmed" size="sm">
          Open an existing project or start a new one.
        </Text>
      </Stack>

      {error && <Text c="red">Could not load projects: {error}</Text>}

      {!projects && !error && (
        <Box style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Loader />
        </Box>
      )}

      {projects && projects.length === 0 && (
        <Text c="dimmed">No videos yet — create one to get started.</Text>
      )}

      {projects && projects.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {projects.map((p) => (
            <a
              key={p.id}
              href={projectHref(p.id)}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Box
                style={{
                  border: "1px solid var(--mantine-color-gray-3)",
                  borderRadius: 8,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "box-shadow 120ms ease",
                }}
              >
                <Box
                  style={{
                    aspectRatio: "16 / 9",
                    background: p.thumbnail ? `url(${p.thumbnail}) center/cover` : "#f1f3f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {!p.thumbnail && <IconMovie size={32} color="#adb5bd" />}
                </Box>
                <Box p="sm">
                  <Text fw={500} truncate>{p.title || "Untitled video"}</Text>
                  <Text size="xs" c="dimmed">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </Text>
                </Box>
              </Box>
            </a>
          ))}
        </SimpleGrid>
      )}

      <Button
        component="a"
        href={window.location.pathname}
        leftSection={<IconPlus size={16} />}
        variant="outline"
        mt={32}
      >
        New video
      </Button>
    </Box>
  );
}
