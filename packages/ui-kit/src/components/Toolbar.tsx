import type { ReactNode } from "react";
import { Group, Paper } from "@mantine/core";
import { tokens } from "../theme";

interface ToolbarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

export function Toolbar({ left, center, right }: ToolbarProps) {
  return (
    <Paper
      radius={tokens.radius.lg}
      p="sm"
      h={tokens.panelSizes.toolbar - tokens.spacing.md}
      bg="rgba(9, 17, 31, 0.82)"
      withBorder
      style={{
        borderColor: "rgba(169, 184, 210, 0.12)",
        boxShadow: tokens.shadows.raised,
        backdropFilter: "blur(18px)"
      }}
    >
      <Group h="100%" justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          {left}
        </Group>
        <Group gap="xs" wrap="nowrap">
          {center}
        </Group>
        <Group gap="xs" wrap="nowrap" justify="flex-end">
          {right}
        </Group>
      </Group>
    </Paper>
  );
}
