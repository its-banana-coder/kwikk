import "@mantine/core/styles.css";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { editorTheme } from "@kwikk/ui-kit";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={editorTheme} defaultColorScheme="light">
    <App />
  </MantineProvider>
);
