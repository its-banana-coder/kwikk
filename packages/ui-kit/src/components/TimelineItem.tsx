import type { ReactNode } from "react";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";

interface TimelineItemProps {
  label: ReactNode;
  startMs: number;
  durationMs: number;
  active?: boolean;
  color?: string;
  onClick?: () => void;
}

export function TimelineItem({
  label,
  startMs,
  durationMs,
  active = false,
  color = "orange",
  onClick
}: TimelineItemProps) {
  return (
    <Button
      variant={active ? "filled" : "light"}
      color={color}
      fullWidth
      justify="space-between"
      h="auto"
      px="md"
      py="sm"
      radius="md"
      onClick={onClick}
    >
      <Group justify="space-between" wrap="nowrap" w="100%">
        <Stack gap={2} align="flex-start">
          <Text fw={600} truncate>
            {label}
          </Text>
          <Text c={active ? "orange.0" : "gray.4"} fz="xs">
            {startMs} ms
          </Text>
        </Stack>
        <Badge variant="light" color={color}>
          {Math.round(durationMs / 1000)}s
        </Badge>
      </Group>
    </Button>
  );
}
