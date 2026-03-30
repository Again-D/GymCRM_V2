import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";

import App from "./App";
import { AppProviders } from "./app/providers";
import { initializeThemeOnDocument } from "./app/theme";
import "./index.css";

initializeThemeOnDocument();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
