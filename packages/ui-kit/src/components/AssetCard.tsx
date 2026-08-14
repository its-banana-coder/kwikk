import type { ReactNode } from "react";
import { Button, Group, Stack, Text } from "@mantine/core";

interface AssetCardProps {
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
}

export function AssetCard({ title, description, icon, onClick }: AssetCardProps) {
  return (
    <Button
      variant="subtle"
      color="gray"
      fullWidth
      h="auto"
      p="sm"
      radius="md"
      justify="flex-start"
      onClick={onClick}
      styles={{
        inner: { justifyContent: "flex-start" },
        root: {
          border: "1px solid rgba(169, 184, 210, 0.12)",
          background: "rgba(255,255,255,0.03)"
        }
      }}
    >
      <Group align="flex-start" wrap="nowrap">
        {icon}
        <Stack gap={2} align="flex-start">
          <Text fw={600}>{title}</Text>
          <Text c="gray.5" fz="xs">
            {description}
          </Text>
        </Stack>
      </Group>
    </Button>
  );
}
