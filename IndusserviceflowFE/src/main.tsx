import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@emotion/react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={{}}>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
