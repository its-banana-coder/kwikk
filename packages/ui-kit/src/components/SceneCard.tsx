import type { ReactNode } from "react";
import { ActionIcon, Badge, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

interface SceneCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  active?: boolean;
  durationMs?: number;
  onClick?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
}

export function SceneCard({
  title,
  subtitle,
  active = false,
  durationMs,
  onClick,
  onDelete,
  deleteDisabled = false
}: SceneCardProps) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        width: "100%",
        borderRadius: 10,
        border: "1px solid rgba(169, 184, 210, 0.12)",
        background: active ? "rgba(255, 166, 77, 0.18)" : "rgba(255,255,255,0.03)",
        padding: 12
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={2} align="flex-start" style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
          <Text fw={700} truncate="end" style={{ maxWidth: "100%" }}>{title}</Text>
          {subtitle ? (
            <Text c="gray.5" fz="xs" truncate="end" style={{ maxWidth: "100%" }}>
              {subtitle}
            </Text>
          ) : null}
        </Stack>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          {typeof durationMs === "number" ? (
            <Badge variant="light" color="orange">
              {Math.round(durationMs / 1000)}s
            </Badge>
          ) : null}
          {onDelete ? (
            <ActionIcon
              variant="subtle"
              color="gray"
              disabled={deleteDisabled}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          ) : null}
        </Group>
      </Group>
    </UnstyledButton>
  );
}
