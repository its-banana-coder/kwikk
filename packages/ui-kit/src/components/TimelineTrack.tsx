import type { ReactNode } from "react";
import { Group, Stack, Text } from "@mantine/core";

interface TimelineTrackProps {
  label: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}

export function TimelineTrack({ label, meta, children }: TimelineTrackProps) {
  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Text c="gray.3" fw={600} fz="sm">
          {label}
        </Text>
        {meta ? (
          <Text c="gray.5" fz="xs">
            {meta}
          </Text>
        ) : null}
      </Group>
      <Group gap="sm" wrap="nowrap">
        {children}
      </Group>
    </Stack>
  );
}
