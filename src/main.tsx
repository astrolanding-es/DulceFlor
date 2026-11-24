import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/jost";
import "@fontsource/great-vibes";
import "./index.css";
import App from "./App";
import { Analytics } from "@vercel/analytics/react";
import { analyticsBeforeSend, installContactTracking } from "./lib/contactTracking";

installContactTracking();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Analytics beforeSend={analyticsBeforeSend} />
  </React.StrictMode>
);
