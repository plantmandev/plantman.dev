"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ScatterplotLayer, BitmapLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";
import { DataFilterExtension } from "@deck.gl/extensions";

const DeckGL = dynamic(
  () => import("@deck.gl/react").then((mod) => mod.default),
  { ssr: false },
);
const Map = dynamic(
  () => import("react-map-gl/maplibre").then((mod) => mod.default),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_VIEW = {
  longitude: 10,
  latitude: 20,
  zoom: 1.8,
  pitch: 0,
  bearing: 0,
};

const COLOR_PALETTE: [number, number, number][] = [
  [255, 140, 0], [220, 20, 60], [255, 215, 0], [240, 240, 240],
  [75, 0, 130], [255, 105, 180], [50, 205, 50], [138, 43, 226],
  [0, 191, 255], [255, 69, 0], [147, 112, 219], [34, 139, 34],
];

const STEP_OPTIONS = [
  { label: "1 Day",    days: 1 },
  { label: "1 Week",   days: 7 },
  { label: "2 Week(s)",days: 14 },
  { label: "1 Month",  days: 30 },
  { label: "3 Months", days: 90 },
  { label: "All Time", days: -1 },
];

const YEARS = [2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Species = {
  scientificName: string;
  fileName: string;
  commonName: string;
  color: [number, number, number];
  actualObs?: number;
  status?: string;
  category?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toFileName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-gbif";
}

function hexToRgb(hex: string): [number, number, number] | null {
  if (!hex || !hex.startsWith("#") || hex.length !== 7) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single year block in the playback timeline */
function YearBlock({ year, status }: { year: number; status: "complete" | "ingested" | "missing" | "partial" }) {
  const colors: Record<string, string> = {
    complete:  "var(--off-white)",
    ingested:  "#4ade80",
    partial:   "#f59e0b",
    missing:   "transparent",
  };
  const bg = colors[status] ?? "transparent";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <span style={{ fontSize: "10px", color: "var(--light-gray)", fontFamily: "inherit" }}>
        {year}
      </span>
      <div
        style={{
          width: "20px",
          height: "20px",
          background: status === "missing" ? "transparent" : bg,
          border: "1px solid var(--light-gray)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          color: "var(--light-gray)",
        }}
      >
        {status === "missing" ? "✕" : ""}
      </div>
    </div>
  );
}

/** Species card in the selector grid */
function SpeciesCard({
  sp,
  isSelected,
  onClick,
}: {
  sp: Species;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: isSelected ? "rgba(242,242,242,0.08)" : "rgba(26,26,26,0.85)",
        border: isSelected ? "1px solid var(--off-white)" : "1px solid var(--dark-gray)",
        padding: "10px 12px",
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.15s ease",
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        minHeight: "56px",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--light-gray)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--dark-gray)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div
          style={{
            width: "8px", height: "8px", flexShrink: 0,
            background: `rgb(${sp.color.join(",")})`,
          }}
        />
        <span style={{
          fontSize: "11px", fontWeight: isSelected ? 700 : 400,
          color: "var(--off-white)", lineHeight: 1.3,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {sp.commonName}
        </span>
      </div>
      <span style={{ fontSize: "10px", color: "var(--light-gray)", fontStyle: "italic", paddingLeft: "14px" }}>
        {sp.scientificName}
      </span>
      {sp.actualObs && (
        <span style={{ fontSize: "9px", color: "var(--light-gray)", paddingLeft: "14px" }}>
          {sp.actualObs.toLocaleString()} obs
        </span>
      )}
    </button>
  );
}

/** Section in species selector */
function SelectorSection({
  title,
  items,
  selectedFileName,
  onSelect,
}: {
  title: string;
  items: Species[];
  selectedFileName: string;
  onSelect: (sp: Species) => void;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        fontSize: "11px", fontWeight: 700, color: "var(--light-gray)",
        letterSpacing: "0.12em", textTransform: "uppercase",
        marginBottom: "10px", paddingBottom: "6px",
        borderBottom: "1px solid var(--dark-gray)",
      }}>
        {title}
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: "11px", color: "var(--light-gray)", fontStyle: "italic" }}>
          No species loaded
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "6px",
        }}>
          {items.map((sp) => (
            <SpeciesCard
              key={sp.fileName}
              sp={sp}
              isSelected={sp.fileName === selectedFileName}
              onClick={() => onSelect(sp)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SDMPage() {
  const [mounted, setMounted]             = useState(false);
  const [canvasReady, setCanvasReady]     = useState(false);
  const [data, setData]                   = useState<any[]>([]);
  const [timeRange, setTimeRange]         = useState<[number, number]>([0, 1]);
  const [currentTime, setCurrentTime]     = useState(0);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [species, setSpecies]             = useState<Species[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [showStepMenu, setShowStepMenu]   = useState(false);
  const [selectedStep, setSelectedStep]   = useState(STEP_OPTIONS[2]);
  const [showTerrain, setShowTerrain]     = useState(false);
  const [terrainOpacity, setTerrainOpacity] = useState(0.25);
  const [globalTimeRange, setGlobalTimeRange] = useState<[number, number]>([0, 1]);

  // mount
  useEffect(() => {
    setMounted(true);
    setTimeout(() => setCanvasReady(true), 500);
  }, []);

  // load species list from metadata CSV
  useEffect(() => {
    if (!mounted || !canvasReady) return;

    const load = async () => {
      try {
        const res  = await fetch("/species-distribution-model/occurrence-data/species-metadata.csv");
        if (!res.ok) throw new Error(`Metadata fetch failed (${res.status})`);
        const text = await res.text();
        const lines = text.trim().split("\n");
        if (lines.length < 2) throw new Error("Empty metadata");

        const parsed: Species[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const v = line.split(",").map((s) => s.trim());
          const scientificName = v[0];
          const commonName     = v[1];
          if (!scientificName || !commonName) continue;

          const colorRGB = hexToRgb(v[11] ?? "") ?? COLOR_PALETTE[parsed.length % COLOR_PALETTE.length];
          const actualObs = v[6] ? Math.round(parseFloat(v[6])) : undefined;
          const status   = v[2] ?? "";
          const category = v[17] ?? "lepidoptera"; // category column

          parsed.push({
            scientificName,
            commonName,
            fileName: toFileName(scientificName),
            color: colorRGB,
            actualObs: actualObs && !isNaN(actualObs) ? actualObs : undefined,
            status,
            category,
          });
        }

        parsed.sort((a, b) => (b.actualObs ?? 0) - (a.actualObs ?? 0));
        setSpecies(parsed);
        setSelectedSpecies(parsed[0] ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load species");
        setLoading(false);
      }
    };

    load();
  }, [mounted, canvasReady]);

  // load occurrence data for selected species
  useEffect(() => {
    if (!selectedSpecies || !mounted || !canvasReady) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/species-distribution-model/occurrence-data/${selectedSpecies.fileName}.geojson`
        );
        if (!res.ok) throw new Error(`GeoJSON fetch failed (${res.status})`);
        const geojson = await res.json();
        if (!Array.isArray(geojson.features)) throw new Error("Invalid GeoJSON");

        const points = geojson.features
          .map((f: any) => {
            try {
              return {
                position: f.geometry.coordinates,
                timestamp: new Date(f.properties.eventDate).getTime(),
              };
            } catch { return null; }
          })
          .filter(Boolean);

        const ts = points.map((p: any) => p.timestamp).filter((t: any) => !isNaN(t) && t > 0);
        if (ts.length === 0) throw new Error("No valid timestamps");

        const min = Math.min(...ts);
        const max = Math.max(...ts);
        setData(points);
        setTimeRange([min, max]);
        setGlobalTimeRange([min, max]);
        setCurrentTime(min);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      }
    };

    load();
  }, [selectedSpecies, mounted, canvasReady]);

  // playback
  useEffect(() => {
    if (!isPlaying || loading || timeRange[0] === 0) return;
    const interval = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + selectedStep.days * 24 * 60 * 60 * 1000;
        return next > timeRange[1] ? timeRange[0] : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, timeRange, loading, selectedStep]);

  const handleSelectSpecies = useCallback((sp: Species) => {
    setSelectedSpecies(sp);
    setIsPlaying(false);
  }, []);

  if (!mounted || !canvasReady) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)", background: "var(--background)" }}>
        <span style={{ color: "var(--light-gray)", fontSize: "13px" }}>Initializing canvas…</span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // DeckGL layers
  // ---------------------------------------------------------------------------

  const timeWindowMs =
    selectedStep.days === -1
      ? timeRange[1] - timeRange[0]
      : selectedStep.days * 24 * 60 * 60 * 1000;

  const layers = [
    ...(showTerrain ? [
      new TileLayer({
        id: "terrain",
        data: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
        minZoom: 0, maxZoom: 15, tileSize: 256,
        renderSubLayers: (props: any) => {
          const { bbox } = props.tile;
          const bounds: [number,number,number,number] = [
            bbox.west ?? bbox.left, bbox.south ?? bbox.bottom,
            bbox.east ?? bbox.right, bbox.north ?? bbox.top,
          ];
          return new BitmapLayer(props, { image: props.data, bounds, opacity: terrainOpacity });
        },
      }),
    ] : []),
    new ScatterplotLayer({
      id: "occurrences",
      data,
      getPosition: (d: any) => d.position,
      getFilterValue: (d: any) => d.timestamp,
      filterRange: selectedStep.days === -1
        ? [timeRange[0], currentTime]
        : [currentTime - timeWindowMs, currentTime],
      extensions: [new DataFilterExtension({ filterSize: 1 })],
      getFillColor: selectedSpecies?.color ?? [255,255,255],
      getRadius: 3000,
      radiusMinPixels: 1.5,
      radiusMaxPixels: 4,
      opacity: 0.75,
      pickable: false,
    }),
  ];

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const currentDate    = new Date(currentTime).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  const progressPct    = timeRange[1] > timeRange[0]
    ? ((currentTime - timeRange[0]) / (timeRange[1] - timeRange[0])) * 100
    : 0;

  // Year block statuses — placeholder until DB integration
  const yearStatuses: Record<number, "complete" | "ingested" | "missing" | "partial"> = {};
  YEARS.forEach((y) => {
    const hasData = data.some((d: any) => new Date(d.timestamp).getFullYear() === y);
    yearStatuses[y] = hasData ? "ingested" : "missing";
  });

  // Split species by category
  const butterflies  = species.filter((s) => !s.category || s.category === "lepidoptera");
  const nectarPlants = species.filter((s) => s.category === "nectar_plant");
  const hostPlants   = species.filter((s) => s.category === "host_plant");

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 64px)", overflow: "hidden" }}>

      {/* ── MAP BACKGROUND ── */}
      <div style={{ position: "absolute", inset: 0 }}>
        <DeckGL
          controller={true}
          initialViewState={INITIAL_VIEW}
          layers={layers}
          style={{ width: "100%", height: "100%" }}
          useDevicePixels={1}
        >
          <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json" />
        </DeckGL>
      </div>

      {/* ── LEFT PANEL — species info + playback ── */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          width: "340px",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "0",
          zIndex: 10,
          scrollbarWidth: "thin",
          scrollbarColor: "var(--dark-gray) transparent",
        }}
      >
        {/* Species photo */}
        <div
          style={{
            width: "100%",
            height: "200px",
            background: "var(--dark-gray)",
            border: "1px solid var(--dark-gray)",
            borderBottom: "none",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Wikipedia button */}
          <a
            href={`https://en.wikipedia.org/wiki/${selectedSpecies?.scientificName?.replace(" ", "_")}`}
            target="_blank"
            rel="noreferrer"
            style={{
              position: "absolute",
              bottom: "8px",
              right: "8px",
              width: "28px",
              height: "28px",
              border: "1px solid var(--off-white)",
              background: "rgba(13,13,13,0.85)",
              color: "var(--off-white)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              zIndex: 2,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "var(--off-white)";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--background)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(13,13,13,0.85)";
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--off-white)";
            }}
          >
            W
          </a>
          {/* Placeholder — swap for <img> when photo data is wired in */}
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "11px", color: "var(--light-gray)", fontStyle: "italic" }}>
              photo unavailable
            </span>
          </div>
        </div>

        {/* Species name + description */}
        <div
          style={{
            background: "rgba(13,13,13,0.92)",
            border: "1px solid var(--dark-gray)",
            borderTop: "none",
            padding: "14px 16px",
          }}
        >
          {selectedSpecies ? (
            <>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--off-white)", lineHeight: 1.2 }}>
                {selectedSpecies.commonName}
              </div>
              <div style={{ fontSize: "12px", fontStyle: "italic", color: "var(--light-gray)", marginTop: "3px" }}>
                {selectedSpecies.scientificName}
              </div>
              <div style={{
                fontSize: "11px", color: "var(--light-gray)", marginTop: "10px",
                lineHeight: 1.6,
              }}>
                {/* Description placeholder — wire to species DB later */}
                Species description will be loaded from the database.
              </div>
            </>
          ) : (
            <div style={{ fontSize: "12px", color: "var(--light-gray)" }}>Loading…</div>
          )}
        </div>

        {/* Playback controls */}
        <div
          style={{
            background: "rgba(13,13,13,0.92)",
            border: "1px solid var(--dark-gray)",
            borderTop: "none",
            padding: "12px 14px",
          }}
        >
          {/* Top row: play, stats, step */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                width: "32px", height: "32px",
                border: "1px solid var(--light-gray)",
                background: "transparent",
                color: "var(--off-white)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", flexShrink: 0,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--off-white)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--background)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--off-white)"; }}
            >
              {isPlaying ? "||" : "▶"}
            </button>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "9px", color: "var(--light-gray)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Records</span>
                <span style={{ fontSize: "9px", color: "var(--light-gray)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Date</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", color: "var(--off-white)", fontWeight: 600 }}>
                  {loading ? "…" : data.length.toLocaleString()}
                </span>
                <span style={{ fontSize: "11px", color: "var(--off-white)" }}>{currentDate}</span>
              </div>
            </div>

            {/* Step selector */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setShowStepMenu(!showStepMenu)}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  border: "1px solid var(--light-gray)",
                  background: "transparent",
                  color: "var(--off-white)",
                  padding: "4px 8px",
                  fontSize: "10px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Step<br />
                {selectedStep.label} ▼
              </button>
              {showStepMenu && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 4px)", right: 0,
                  background: "var(--near-black)", border: "1px solid var(--dark-gray)",
                  zIndex: 20, minWidth: "120px",
                }}>
                  {STEP_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => { setSelectedStep(opt); setShowStepMenu(false); }}
                      style={{
                        display: "block", width: "100%",
                        padding: "8px 12px", textAlign: "left",
                        fontSize: "11px", background: "transparent",
                        color: opt.label === selectedStep.label ? "var(--off-white)" : "var(--light-gray)",
                        fontWeight: opt.label === selectedStep.label ? 700 : 400,
                        cursor: "pointer", border: "none",
                        borderBottom: "1px solid var(--dark-gray)",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Color swatch */}
            <div style={{
              width: "20px", height: "20px",
              border: "1px solid var(--light-gray)",
              flexShrink: 0,
              background: selectedSpecies ? `rgb(${selectedSpecies.color.join(",")})` : "var(--dark-gray)",
            }} />
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "100%", height: "3px",
              background: "var(--dark-gray)",
              marginBottom: "10px",
              cursor: "pointer",
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct  = (e.clientX - rect.left) / rect.width;
              setCurrentTime(timeRange[0] + pct * (timeRange[1] - timeRange[0]));
              setIsPlaying(false);
            }}
          >
            <div style={{ width: `${progressPct}%`, height: "100%", background: "var(--off-white)", transition: "width 0.1s linear" }} />
          </div>

          {/* Year blocks */}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {YEARS.map((y) => (
              <YearBlock key={y} year={y} status={yearStatuses[y]} />
            ))}
          </div>
        </div>


        {/* Species selector — scrollable list below playback */}
        <div
          style={{
            background: "rgba(13,13,13,0.92)",
            border: "1px solid var(--dark-gray)",
            borderTop: "none",
            padding: "16px",
          }}
        >
          <SelectorSection
            title="Butterflies"
            items={butterflies}
            selectedFileName={selectedSpecies?.fileName ?? ""}
            onSelect={handleSelectSpecies}
          />
          <SelectorSection
            title="Nectar Plants"
            items={nectarPlants}
            selectedFileName={selectedSpecies?.fileName ?? ""}
            onSelect={handleSelectSpecies}
          />
          <SelectorSection
            title="Larval Host Plants"
            items={hostPlants}
            selectedFileName={selectedSpecies?.fileName ?? ""}
            onSelect={handleSelectSpecies}
          />
        </div>
      </div>

      {/* ── TOP-RIGHT controls ── */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "rgba(13,13,13,0.92)",
          border: "1px solid var(--dark-gray)",
          padding: "12px 14px",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          minWidth: "160px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <span style={{ fontSize: "11px", color: "var(--light-gray)" }}>Terrain</span>
          <button
            onClick={() => setShowTerrain(!showTerrain)}
            style={{
              padding: "3px 10px",
              border: "1px solid var(--light-gray)",
              background: showTerrain ? "var(--off-white)" : "transparent",
              color: showTerrain ? "var(--background)" : "var(--off-white)",
              fontSize: "10px",
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.08em",
            }}
          >
            {showTerrain ? "ON" : "OFF"}
          </button>
        </div>
        {showTerrain && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "10px", color: "var(--light-gray)" }}>Opacity</span>
            <input
              type="range" min="0" max="100"
              value={Math.round(terrainOpacity * 100)}
              onChange={(e) => setTerrainOpacity(parseInt(e.target.value) / 100)}
              style={{ flex: 1, height: "2px", accentColor: "var(--off-white)" }}
            />
            <span style={{ fontSize: "10px", color: "var(--light-gray)", minWidth: "28px", textAlign: "right" }}>
              {Math.round(terrainOpacity * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Error overlay */}
      {error && (
        <div style={{
          position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)",
          background: "rgba(13,13,13,0.95)", border: "1px solid var(--light-gray)",
          padding: "10px 18px", zIndex: 20,
          fontSize: "11px", color: "var(--light-gray)",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}