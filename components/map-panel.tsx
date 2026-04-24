"use client";
import React, { useState } from "react";

// ── Row ───────────────────────────────────────────────────────────────────────

export function MapPanelRow({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="map-panel-row">
      <span className="map-panel-label">{label}</span>
      <div className="map-panel-control">{children}</div>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function MapPanelDivider() {
  return <div className="map-panel-divider" />;
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function MapPanel({
  title,
  children,
  defaultCollapsed = false,
  collapsible = true,
  width,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
  width?: number;
  style?: React.CSSProperties;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="map-panel" style={{ ...(width ? { width } : {}), ...style }}>
      {title && (
        collapsible ? (
          <button
            className="map-panel-header"
            onClick={() => setCollapsed(c => !c)}
            aria-expanded={!collapsed}
          >
            <span className="map-panel-title">{title}</span>
            <span className="map-panel-collapse">{collapsed ? "▲" : "▼"}</span>
          </button>
        ) : (
          <div className="map-panel-header" style={{ cursor: "default" }}>
            <span className="map-panel-title">{title}</span>
          </div>
        )
      )}
      {(!collapsible || !collapsed) && (
        <div className="map-panel-body">{children}</div>
      )}
    </div>
  );
}
