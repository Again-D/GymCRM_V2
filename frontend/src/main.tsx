import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthStateProvider } from "./app/auth";
import { ThemeProvider, initializeThemeOnDocument } from "./app/theme";
import "./index.css";

initializeThemeOnDocument();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthStateProvider>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </AuthStateProvider>
  </React.StrictMode>
);
