export const tokens = {
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 20,
    xl: 28
  },
  shadows: {
    panel: "0 24px 48px rgba(5, 15, 30, 0.14)",
    raised: "0 14px 28px rgba(5, 15, 30, 0.1)"
  },
  zIndex: {
    canvasOverlay: 10,
    floatingToolbar: 30,
    modal: 200
  },
  fontSizes: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20
  },
  motion: {
    fast: 0.16,
    base: 0.24,
    slow: 0.36,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
  },
  panelSizes: {
    leftSidebar: 56,
    rightInspector: 300,
    timeline: 220,
    toolbar: 52
  }
} as const;

export type EditorTokens = typeof tokens;
