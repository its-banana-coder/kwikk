import { createTheme } from "@mantine/core";
import { tokens } from "./tokens";

export { tokens } from "./tokens";

export const editorTheme = createTheme({
  primaryColor: "orange",
  defaultRadius: tokens.radius.md,
  fontFamily: '"DM Sans", "Segoe UI", sans-serif',
  headings: {
    fontFamily: '"Space Grotesk", "DM Sans", sans-serif'
  },
  colors: {
    midnight: [
      "#eef2f9",
      "#d7ddea",
      "#b0bdd4",
      "#879bbf",
      "#647ea8",
      "#4f6992",
      "#41567a",
      "#344463",
      "#24314b",
      "#121d32"
    ]
  },
  other: {
    editorTokens: tokens
  }
});
