import type { ReactNode } from "react";
import { Box, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { tokens } from "../theme";

interface EditorPanelProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  h?: string | number;
}

export function EditorPanel({
  title,
  description,
  icon,
  actions,
  children,
  padded = true,
  h
}: EditorPanelProps) {
  const hasHeader = !!(title || description || actions || icon);
  return (
    <Paper
      radius={tokens.radius.lg}
      shadow="md"
      p={padded ? "md" : 0}
      h={h}
      withBorder
      bg="rgba(11, 20, 36, 0.86)"
      c="gray.0"
      style={{
        borderColor: "rgba(169, 184, 210, 0.12)",
        boxShadow: tokens.shadows.panel,
        backdropFilter: "blur(18px)",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {hasHeader && (
        <Group justify="space-between" align="flex-start" mb="md" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Group gap="sm" align="flex-start" wrap="nowrap">
            {icon ? (
              <Box
                p={6}
                style={{
                  borderRadius: tokens.radius.md,
                  background: "rgba(255,255,255,0.06)",
                  color: "#ffd1a0",
                  flexShrink: 0
                }}
              >
                {icon}
              </Box>
            ) : null}
            <Stack gap={2}>
              {title ? (
                <Title order={4} fz={16} fw={600}>
                  {title}
                </Title>
              ) : null}
              {description ? (
                <Text c="gray.4" fz="sm">
                  {description}
                </Text>
              ) : null}
            </Stack>
          </Group>
          {actions}
        </Group>
      )}
      <Box style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {children}
      </Box>
    </Paper>
  );
}
