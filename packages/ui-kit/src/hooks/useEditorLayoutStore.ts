import { create } from "zustand";
import { tokens } from "../theme";

export interface PanelLayoutState {
  leftSidebarCollapsed: boolean;
  rightInspectorCollapsed: boolean;
  bottomTimelineCollapsed: boolean;
  leftSidebarWidth: number;
  rightInspectorWidth: number;
  bottomTimelineHeight: number;
  toggleLeftSidebar: () => void;
  toggleRightInspector: () => void;
  toggleBottomTimeline: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightInspectorWidth: (width: number) => void;
  setBottomTimelineHeight: (height: number) => void;
}

const minSidebarWidth = 56;
const maxSidebarWidth = 420;
const minTimelineHeight = 80;
const maxTimelineHeight = 500;

export const useEditorLayoutStore = create<PanelLayoutState>((set) => ({
  leftSidebarCollapsed: false,
  rightInspectorCollapsed: false,
  bottomTimelineCollapsed: true,
  leftSidebarWidth: tokens.panelSizes.leftSidebar,
  rightInspectorWidth: tokens.panelSizes.rightInspector,
  bottomTimelineHeight: tokens.panelSizes.timeline,
  toggleLeftSidebar: () =>
    set((state) => ({ leftSidebarCollapsed: !state.leftSidebarCollapsed })),
  toggleRightInspector: () =>
    set((state) => ({ rightInspectorCollapsed: !state.rightInspectorCollapsed })),
  toggleBottomTimeline: () =>
    set((state) => ({ bottomTimelineCollapsed: !state.bottomTimelineCollapsed })),
  setLeftSidebarWidth: (width) =>
    set({ leftSidebarWidth: Math.max(minSidebarWidth, Math.min(width, maxSidebarWidth)) }),
  setRightInspectorWidth: (width) =>
    set({ rightInspectorWidth: Math.max(minSidebarWidth, Math.min(width, maxSidebarWidth)) }),
  setBottomTimelineHeight: (height) =>
    set({ bottomTimelineHeight: Math.max(minTimelineHeight, Math.min(height, maxTimelineHeight)) })
}));
