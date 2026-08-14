import type { ReactNode } from "react";
import { Stack } from "@mantine/core";
import { PropertyRow } from "./PropertyRow";

interface InspectorFieldProps {
  label: ReactNode;
  description?: ReactNode;
  input: ReactNode;
}

export function InspectorField({ label, description, input }: InspectorFieldProps) {
  return (
    <Stack gap="xs">
      <PropertyRow label={label} description={description}>
        {input}
      </PropertyRow>
    </Stack>
  );
}
