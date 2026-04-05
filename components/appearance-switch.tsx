"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";

export default function AppearanceSwitch() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <FontAwesomeIcon icon={faSun} style={{ width: 20, height: 20, color: "var(--light-gray)" }} />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <FontAwesomeIcon
        icon={isDark ? faSun : faMoon}
        style={{ width: 20, height: 20, color: "var(--muted)", transition: "color 0.2s ease" }}
      />
    </button>
  );
}