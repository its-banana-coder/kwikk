import type { ReactNode } from "react";
import { AppShell, Box } from "@mantine/core";
import { AnimatePresence, motion } from "framer-motion";
import { tokens } from "../theme";

interface EditorAppShellProps {
  header: ReactNode;
  leftSidebar?: ReactNode;
  rightInspector?: ReactNode;
  bottomTimeline?: ReactNode;
  leftSidebarWidth?: number;
  rightInspectorWidth?: number;
  bottomTimelineHeight?: number;
  leftSidebarCollapsed?: boolean;
  rightInspectorCollapsed?: boolean;
  bottomTimelineCollapsed?: boolean;
  children: ReactNode;
}

export function EditorAppShell({
  header,
  leftSidebar,
  rightInspector,
  bottomTimeline,
  leftSidebarWidth = tokens.panelSizes.leftSidebar,
  rightInspectorWidth = tokens.panelSizes.rightInspector,
  bottomTimelineHeight = tokens.panelSizes.timeline,
  leftSidebarCollapsed = false,
  rightInspectorCollapsed = false,
  bottomTimelineCollapsed = false,
  children
}: EditorAppShellProps) {
  return (
    <AppShell
      padding={0}
      header={{ height: tokens.panelSizes.toolbar }}
      navbar={{
        width: leftSidebarWidth,
        breakpoint: 0,
        collapsed: { mobile: leftSidebarCollapsed, desktop: leftSidebarCollapsed }
      }}
      aside={{
        width: rightInspectorWidth,
        breakpoint: 0,
        collapsed: { mobile: rightInspectorCollapsed, desktop: rightInspectorCollapsed }
      }}
      footer={{
        height: bottomTimelineCollapsed ? 0 : bottomTimelineHeight,
        collapsed: bottomTimelineCollapsed
      }}
      styles={{
        main: {
          background:
            "radial-gradient(circle at top left, rgba(255, 159, 64, 0.12), transparent 28%), linear-gradient(180deg, #0d1627 0%, #111f36 100%)"
        }
      }}
    >
      <AppShell.Header bg="transparent" withBorder={false} p={0}>
        {header}
      </AppShell.Header>
      <AppShell.Navbar bg="transparent" withBorder={false} p={0}>
        <AnimatePresence initial={false}>
          {!leftSidebarCollapsed && leftSidebar ? (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: tokens.motion.base, ease: tokens.motion.ease }}
              style={{ height: "100%" }}
            >
              {leftSidebar}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </AppShell.Navbar>
      <AppShell.Aside bg="transparent" withBorder={false} p={0}>
        <AnimatePresence initial={false}>
          {!rightInspectorCollapsed && rightInspector ? (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: tokens.motion.base, ease: tokens.motion.ease }}
              style={{ height: "100%" }}
            >
              {rightInspector}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </AppShell.Aside>
      <AppShell.Footer bg="transparent" withBorder={false} p={0}>
        <AnimatePresence initial={false}>
          {!bottomTimelineCollapsed && bottomTimeline ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: tokens.motion.base, ease: tokens.motion.ease }}
              style={{ height: "100%" }}
            >
              {bottomTimeline}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </AppShell.Footer>
      <AppShell.Main>
        <Box h="100%">{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
