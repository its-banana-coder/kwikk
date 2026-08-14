import "@mantine/core/styles.css";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { editorTheme } from "@kwikk/ui-kit";
import { initFontRegistry } from "@kwikk/render-core";
import App from "./App";
import "./styles.css";

// Fetch font catalog from the API before first render so FontPicker shows all
// stored fonts immediately. The Vite dev proxy maps /api → http://localhost:8080.
initFontRegistry({ apiBaseUrl: "/api" }).then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <MantineProvider theme={editorTheme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  );
});
