import type { ReactNode } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";

interface PropertyRowProps {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}

export function PropertyRow({ label, description, children }: PropertyRowProps) {
  return (
    <Group justify="space-between" align="center" wrap="nowrap" gap="md">
      <Stack gap={2} maw="40%">
        <Text c="gray.3" fw={600} fz="sm">
          {label}
        </Text>
        {description ? (
          <Text c="gray.5" fz="xs">
            {description}
          </Text>
        ) : null}
      </Stack>
      <Box flex={1}>{children}</Box>
    </Group>
  );
}
