import type { ReactNode } from "react";
import { Button, Stack, Text } from "@mantine/core";

interface MotionPresetCardProps {
  title: ReactNode;
  description: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export function MotionPresetCard({
  title,
  description,
  active = false,
  onClick
}: MotionPresetCardProps) {
  return (
    <Button
      variant={active ? "filled" : "subtle"}
      color={active ? "orange" : "gray"}
      fullWidth
      h="auto"
      p="xs"
      radius="md"
      justify="flex-start"
      onClick={onClick}
      styles={{
        inner: { justifyContent: "flex-start", width: "100%" },
        root: {
          border: "1px solid rgba(169, 184, 210, 0.12)",
          background: active ? undefined : "rgba(255,255,255,0.03)"
        }
      }}
    >
      <Stack gap={2} align="flex-start" style={{ minWidth: 0, width: "100%" }}>
        <Text fw={600} fz="sm" truncate="end" style={{ maxWidth: "100%" }}>{title}</Text>
        <Text c={active ? "orange.0" : "gray.5"} fz="xs">
          {description}
        </Text>
      </Stack>
    </Button>
  );
}
