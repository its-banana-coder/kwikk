import { describe, expect, it, beforeEach } from "vitest";
import { useEditorLayoutStore } from "./useEditorLayoutStore";

describe("useEditorLayoutStore", () => {
  beforeEach(() => {
    // Reset store to default
    useEditorLayoutStore.setState({
      leftSidebarCollapsed: false,
      rightInspectorCollapsed: false,
      bottomTimelineCollapsed: true,
      leftSidebarWidth: 260,
      rightInspectorWidth: 320,
      bottomTimelineHeight: 120
    });
  });

  it("toggles sidebars", () => {
    const { toggleLeftSidebar } = useEditorLayoutStore.getState();
    
    toggleLeftSidebar();
    expect(useEditorLayoutStore.getState().leftSidebarCollapsed).toBe(true);
    
    toggleLeftSidebar();
    expect(useEditorLayoutStore.getState().leftSidebarCollapsed).toBe(false);
  });

  it("clamps width updates", () => {
    const { setLeftSidebarWidth } = useEditorLayoutStore.getState();
    
    setLeftSidebarWidth(1000); // Exceeds max 420
    expect(useEditorLayoutStore.getState().leftSidebarWidth).toBe(420);
    
    setLeftSidebarWidth(10); // Below min 56
    expect(useEditorLayoutStore.getState().leftSidebarWidth).toBe(56);
  });

  it("clamps height updates", () => {
    const { setBottomTimelineHeight } = useEditorLayoutStore.getState();
    
    setBottomTimelineHeight(600); // Exceeds max 500
    expect(useEditorLayoutStore.getState().bottomTimelineHeight).toBe(500);

    setBottomTimelineHeight(0); // Below min 80
    expect(useEditorLayoutStore.getState().bottomTimelineHeight).toBe(80);
  });
});
