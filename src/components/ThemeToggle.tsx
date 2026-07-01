"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("wc26_theme", next ? "light" : "dark");
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark / light theme"
      title={light ? "Switch to dark" : "Switch to light"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm transition hover:bg-hover"
    >
      {light ? "🌙" : "☀️"}
    </button>
  );
}
