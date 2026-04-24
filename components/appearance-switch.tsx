"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const svgMask = (url: string): React.CSSProperties => ({
  width: 26,
  height: 26,
  backgroundColor: "var(--foreground)",
  WebkitMaskImage: `url(${url})`,
  WebkitMaskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskImage: `url(${url})`,
  maskSize: "contain",
  maskRepeat: "no-repeat",
  maskPosition: "center",
  transition: "background-color 0.2s ease",
  flexShrink: 0,
});

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
        <div style={svgMask("/logos/light-mode-button.svg")} />
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
      <div style={svgMask(isDark ? "/logos/light-mode-button.svg" : "/logos/dark-mode-button.svg")} />
    </button>
  );
}