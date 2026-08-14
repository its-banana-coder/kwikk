import { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Combobox,
  InputBase,
  ScrollArea,
  Text,
  TextInput,
  useCombobox,
} from "@mantine/core";
import { IconChevronDown, IconSearch } from "@tabler/icons-react";
import { ensureFontLoaded, getFontCatalog } from "@kwikk/render-core";

// Load fonts for visible items lazily — triggered by IntersectionObserver.
const loadedForPreview = new Set<string>();

function useFontPreviewLoader() {
  const observer = useRef<IntersectionObserver | null>(null);

  const observe = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    if (!observer.current) {
      observer.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const family = (entry.target as HTMLElement).dataset.family;
            if (family && !loadedForPreview.has(family)) {
              loadedForPreview.add(family);
              ensureFontLoaded(family, 400, "normal");
            }
          }
        },
        { threshold: 0.1 }
      );
    }
    observer.current.observe(el);
  }, []);

  return observe;
}

interface FontOptionProps {
  family: string;
  selected: boolean;
  observe: (el: HTMLElement | null) => void;
  preview: string;
}

function FontOption({ family, selected, observe, preview }: FontOptionProps) {
  return (
    <Box
      ref={observe}
      data-family={family}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 10px",
        borderRadius: 6,
        background: selected ? "rgba(79,70,229,0.08)" : "transparent",
        cursor: "pointer",
        gap: 8,
      }}
    >
      {/* Font name rendered in itself */}
      <Text
        fz={15}
        style={{ fontFamily: `"${family}", sans-serif`, flex: 1, lineHeight: 1.3 }}
      >
        {family}
      </Text>
      {/* Preview string in a lighter weight */}
      <Text
        fz={12}
        c="gray.5"
        style={{
          fontFamily: `"${family}", sans-serif`,
          fontWeight: 400,
          flexShrink: 0,
          maxWidth: 90,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {preview}
      </Text>
    </Box>
  );
}

interface FontPickerProps {
  value: string;
  onChange: (family: string) => void;
  previewText?: string;
}

export function FontPicker({ value, onChange, previewText = "Aa 123" }: FontPickerProps) {
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
  });

  const [search, setSearch] = useState("");
  const observe = useFontPreviewLoader();

  const allFonts = getFontCatalog().map((f) => f.family);

  const filtered = search.trim()
    ? allFonts.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : allFonts;

  // Preload a small set of common fonts immediately on mount so the picker
  // feels responsive on first open.
  useEffect(() => {
    const top10 = getFontCatalog().slice(0, 10).map((f) => f.family);
    for (const family of top10) {
      if (!loadedForPreview.has(family)) {
        loadedForPreview.add(family);
        ensureFontLoaded(family, 400, "normal");
      }
    }
  }, []);

  // Ensure the currently selected font is always loaded.
  useEffect(() => {
    if (value) ensureFontLoaded(value, 400, "normal");
  }, [value]);

  const options = filtered.map((family) => (
    <Combobox.Option value={family} key={family} p={0}>
      <FontOption
        family={family}
        selected={family === value}
        observe={observe}
        preview={previewText}
      />
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={combobox}
      withinPortal
      onOptionSubmit={(v) => {
        onChange(v);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={<IconChevronDown size={13} />}
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
          style={{ width: "100%", fontFamily: `"${value}", sans-serif` }}
          styles={{ input: { fontFamily: `"${value}", sans-serif`, fontSize: 13 } }}
        >
          {value || "Select font"}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown style={{ width: 280 }}>
        {/* Search */}
        <Box p={6} pb={4}>
          <TextInput
            placeholder="Search fonts…"
            size="xs"
            leftSection={<IconSearch size={12} />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              combobox.resetSelectedOption();
            }}
            styles={{ input: { fontSize: 12 } }}
          />
        </Box>

        <Combobox.Options>
          <ScrollArea.Autosize mah={320} scrollbarSize={4}>
            {options.length > 0 ? (
              options
            ) : (
              <Text fz="xs" c="gray.5" ta="center" py={12}>
                No fonts found
              </Text>
            )}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
