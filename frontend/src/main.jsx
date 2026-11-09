import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store.js";
import axios from "axios";

// Dynamic Backend URL (supports localhost, local network IPs e.g. 192.168.x.x, or deployed Render backend)
export const serverUrl =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168.") ||
    window.location.hostname.startsWith("10.") ||
    window.location.hostname.endsWith(".local"))
    ? `http://${window.location.hostname}:8000`
    : "https://realtimechatapp-index.onrender.com");

console.log("[PULSECHAT] Connected backend target:", serverUrl);

// Set axios defaults and token interceptor
axios.defaults.withCredentials = true;
axios.interceptors.request.use((config) => {
  try {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);
