import type { ReactNode } from "react";
import { Group, Stack, Text } from "@mantine/core";

interface SidebarSectionProps {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function SidebarSection({ title, action, children }: SidebarSectionProps) {
  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap">
        <Text c="gray.4" fz="xs" fw={700} tt="uppercase" lts="0.08em">
          {title}
        </Text>
        {action}
      </Group>
      {children}
    </Stack>
  );
}
