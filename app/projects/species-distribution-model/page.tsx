"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ScatterplotLayer, BitmapLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";
import { DataFilterExtension } from "@deck.gl/extensions";
import { WebMercatorViewport, FlyToInterpolator } from "@deck.gl/core";

const DeckGL = dynamic(() => import("@deck.gl/react").then((mod) => mod.default), { ssr: false });
const Map = dynamic(() => import("react-map-gl/maplibre").then((mod) => mod.default), { ssr: false });

const INITIAL_VIEW = { longitude: 10, latitude: 20, zoom: 1.8, pitch: 0, bearing: 0 };

const COLOR_PALETTE: [number, number, number][] = [
  [255, 140, 0], [220, 20, 60], [255, 215, 0], [240, 240, 240],
  [75, 0, 130], [255, 105, 180], [50, 205, 50], [138, 43, 226],
  [0, 191, 255], [255, 69, 0], [147, 112, 219], [34, 139, 34],
];

const STEP_OPTIONS = [
  { label: "1 Day",     days: 1  },
  { label: "1 Week",    days: 7  },
  { label: "2 Week(s)", days: 14 },
  { label: "1 Month",   days: 30 },
  { label: "3 Months",  days: 90 },
  { label: "All Time",  days: -1 },
];

const ALL_TIME_STEP_DAYS = 30;

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

type MapLayer = "occurrence" | "sdm";

type Species = {
  scientificName: string;
  fileName: string;
  commonName: string;
  color: [number, number, number];
  actualObs?: number;
  status?: string;
  category?: string;
};

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

// Auto-derives SVG path from scientific name slug.
// Drop file in /public/species/ and it appears automatically.
function getSpeciesImage(scientificName: string): string {
  const slug = scientificName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `/species/${slug}.svg`;
}

// ── Year block ───────────────────────────────────────────────────────────────
function YearBlock({ year, status }: { year: number; status: "complete" | "ingested" | "missing" | "partial" }) {
  return (
    <div className="sdm-year-block">
      <span className="sdm-year-label">{year}</span>
      <div className={`sdm-year-cell ${status}`}>
        {status === "missing" ? "✕" : ""}
      </div>
    </div>
  );
}

// ── Species card ─────────────────────────────────────────────────────────────
function SpeciesCard({ sp, isSelected, onClick }: any) {
  return (
    <button onClick={onClick} className={`sdm-card${isSelected ? " selected" : ""}`}>
      <div className="sdm-card-image">
        <img
          src={getSpeciesImage(sp.scientificName)}
          alt={sp.commonName}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      </div>
      <div className="sdm-card-body">
        <div className="sdm-card-header">
          <div className="sdm-card-dot" style={{ background: `rgb(${sp.color.join(",")})` }} />
          <span className="sdm-card-name">{sp.commonName}</span>
        </div>
        <span className="sdm-card-scientific">{sp.scientificName}</span>
        {sp.actualObs && (
          <span className="sdm-card-obs">{sp.actualObs.toLocaleString()} obs</span>
        )}
      </div>
    </button>
  );
}

// ── Selector section ─────────────────────────────────────────────────────────
function SelectorSection({ title, items, selectedFileName, onSelect }: any) {
  return (
    <div className="sdm-section">
      <div className="sdm-section-title">{title}</div>
      {items.length === 0 ? (
        <div className="sdm-section-empty">No species loaded</div>
      ) : (
        <div className="sdm-card-grid">
          {items.map((sp: any) => (
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

// ── Layer switch ─────────────────────────────────────────────────────────────
function LayerSwitch({ active, onChange }: { active: MapLayer; onChange: (l: MapLayer) => void }) {
  return (
    <div className="sdm-layer-switch">
      <button
        onClick={() => onChange("occurrence")}
        className={`sdm-layer-btn${active === "occurrence" ? " active-occ" : ""}`}
      >
        <svg width="26" height="22" viewBox="0 0 26 22">
          {([[4,17],[8,7],[14,12],[20,5],[11,18],[6,10],[19,14],[16,7],[9,16]] as [number,number][]).map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r={1.8}
              fill={active === "occurrence" ? "var(--occurrence)" : "var(--layer-icon-inactive)"} />
          ))}
        </svg>
        <span className={`sdm-layer-label${active === "occurrence" ? " active-occ" : ""}`}>
          Occurrence
        </span>
      </button>

      <button
        onClick={() => onChange("sdm")}
        className={`sdm-layer-btn${active === "sdm" ? " active-sdm" : ""}`}
      >
        <svg width="26" height="22" viewBox="0 0 26 22">
          {([0,1,2,3] as number[]).map(row =>
            ([0,1,2,3] as number[]).map(col => {
              const vals = [
                [0.1, 0.35, 0.45, 0.15],
                [0.3, 0.9,  1.0,  0.5 ],
                [0.2, 0.6,  0.7,  0.3 ],
                [0.05,0.2,  0.25, 0.1 ],
              ];
              const v = vals[row][col];
              return (
                <rect key={`${row}-${col}`}
                  x={col * 6 + 1} y={row * 5 + 1} width={5} height={4}
                  fill={active === "sdm"
                    ? `rgba(245,158,11,${v})`
                    : `rgba(80,80,80,${v * 0.7})`}
                />
              );
            })
          )}
        </svg>
        <span className={`sdm-layer-label${active === "sdm" ? " active-sdm" : ""}`}>
          SDM
        </span>
      </button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function SDMPage() {
  const [mounted, setMounted]                 = useState(false);
  const [canvasReady, setCanvasReady]         = useState(false);
  const [data, setData]                       = useState<any[]>([]);
  const [timeRange, setTimeRange]             = useState<[number, number]>([0, 1]);
  const [currentTime, setCurrentTime]         = useState(0);
  const [isPlaying, setIsPlaying]             = useState(false);
  const [species, setSpecies]                 = useState<Species[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [showStepMenu, setShowStepMenu]       = useState(false);
  const [selectedStep, setSelectedStep]       = useState(STEP_OPTIONS[2]);
  const [mapLayer, setMapLayer]               = useState<MapLayer>("occurrence");
  const [sdmOpacity, setSdmOpacity]           = useState(0.65);
  const [viewState, setViewState]             = useState<any>(INITIAL_VIEW);
  const fittedSpeciesRef                      = React.useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setCanvasReady(true), 500);
  }, []);

  // Load species list
  useEffect(() => {
    if (!mounted || !canvasReady) return;
    const load = async () => {
      try {
        const res = await fetch("/api/species");
        if (!res.ok) throw new Error(`API failed (${res.status})`);
        const json = await res.json();
        if (!Array.isArray(json) || json.length === 0) throw new Error("No data");

        const parsed: Species[] = json.map((item: any, index: number) => {
          const colorRGB = hexToRgb(item.color ?? "") ?? COLOR_PALETTE[index % COLOR_PALETTE.length];
          const actualObs = item.actual_obs ? Math.round(parseFloat(item.actual_obs)) : undefined;
          return {
            scientificName: item.species_name,
            commonName:     item.common_name || item.species_name,
            fileName:       toFileName(item.species_name),
            color:          colorRGB,
            actualObs:      actualObs && !isNaN(actualObs) ? actualObs : undefined,
            status:         item.status ?? "",
            category:       item.category ?? "lepidoptera",
          };
        });

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

  // Load occurrences for selected species
  useEffect(() => {
    if (!selectedSpecies || !mounted || !canvasReady) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🦋 Fetching occurrences for:", selectedSpecies.scientificName);

        const res = await fetch(`/api/occurrences/${encodeURIComponent(selectedSpecies.scientificName)}`);
        if (!res.ok) throw new Error(`API failed (${res.status})`);
        const geojson = await res.json();
        if (!Array.isArray(geojson.features)) throw new Error("Invalid GeoJSON");

        console.log("📍 Features returned:", geojson.features.length);

        const points = geojson.features.map((f: any) => {
          try {
            return {
              position:  f.geometry.coordinates,
              timestamp: new Date(f.properties.eventDate).getTime(),
            };
          } catch { return null; }
        }).filter(Boolean);

        const ts = points.map((p: any) => p.timestamp).filter((t: any) => !isNaN(t) && t > 0);
        if (ts.length === 0) throw new Error("No valid timestamps");

        const min = ts.reduce((a: number, b: number) => a < b ? a : b);
        const max = ts.reduce((a: number, b: number) => a > b ? a : b);

        // Auto-fit map to species extent
        const lngs = points.map((p: any) => p.position[0]);
        const lats = points.map((p: any) => p.position[1]);
        const minLng = lngs.reduce((a: number, b: number) => a < b ? a : b);
        const maxLng = lngs.reduce((a: number, b: number) => a > b ? a : b);
        const minLat = lats.reduce((a: number, b: number) => a < b ? a : b);
        const maxLat = lats.reduce((a: number, b: number) => a > b ? a : b);
        // Only fly to extent if we haven't already fit this species
        if (fittedSpeciesRef.current !== selectedSpecies.scientificName) {
          try {
            const vp = new WebMercatorViewport({ width: window.innerWidth, height: window.innerHeight });
            const { longitude, latitude, zoom } = vp.fitBounds(
              [[minLng, minLat], [maxLng, maxLat]],
              { padding: 60 }
            );
            setViewState({
              longitude, latitude,
              zoom: Math.min(zoom, 8),
              transitionDuration: 1200,
              transitionInterpolator: new FlyToInterpolator({ speed: 1.5 }),
            });
            fittedSpeciesRef.current = selectedSpecies.scientificName;
          } catch {
            // degenerate extent — leave view unchanged
          }
        }

        setData(points);
        setTimeRange([min, max]);
        setCurrentTime(min);
        setLoading(false);
      } catch (err) {
        console.error("❌ Occurrence load failed:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        setData([]);
        setLoading(false);
      }
    };
    load();
  }, [selectedSpecies, mounted, canvasReady]);

  // Playback
  useEffect(() => {
    if (!isPlaying || loading || timeRange[0] === 0) return;
    const stepDays = selectedStep.days === -1 ? ALL_TIME_STEP_DAYS : selectedStep.days;
    const interval = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + stepDays * 24 * 60 * 60 * 1000;
        if (next >= timeRange[1]) {
          setIsPlaying(false);
          return timeRange[1];
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, timeRange, loading, selectedStep]);

  const handleSelectSpecies = useCallback((sp: Species) => {
    setSelectedSpecies(sp);
    setIsPlaying(false);
  }, []);

  const handleLayerChange = useCallback((l: MapLayer) => {
    setMapLayer(l);
    if (l === "sdm") setIsPlaying(false);
  }, []);

  if (!mounted || !canvasReady) {
    return (
      <div className="sdm-loading">
        <span className="sdm-loading-text">Initializing canvas…</span>
      </div>
    );
  }

  const timeWindowMs =
    selectedStep.days === -1
      ? timeRange[1] - timeRange[0]
      : selectedStep.days * 24 * 60 * 60 * 1000;

  const layers = [
    ...(mapLayer === "occurrence" ? [
      new ScatterplotLayer({
        id:             "occurrences",
        data,
        getPosition:    (d: any) => d.position,
        getFilterValue: (d: any) => d.timestamp,
        filterRange:
          selectedStep.days === -1
            ? [timeRange[0], currentTime]
            : [currentTime - timeWindowMs, currentTime],
        extensions:      [new DataFilterExtension({ filterSize: 1 })],
        getFillColor:    selectedSpecies?.color ?? [255, 255, 255],
        getRadius:       3000,
        radiusMinPixels: 1.5,
        radiusMaxPixels: 4,
        opacity:         0.75,
        pickable:        false,
      }),
    ] : []),

    ...(mapLayer === "sdm" ? [
      new TileLayer({
        id:       "sdm-raster",
        data:     "https://placeholder-sdm-tiles/{z}/{x}/{y}.png",
        minZoom:  0,
        maxZoom:  12,
        tileSize: 256,
        renderSubLayers: (props: any) => {
          const { bbox } = props.tile;
          const bounds: [number, number, number, number] = [
            bbox.west  ?? bbox.left,
            bbox.south ?? bbox.bottom,
            bbox.east  ?? bbox.right,
            bbox.north ?? bbox.top,
          ];
          return new BitmapLayer(props, { image: props.data, bounds, opacity: sdmOpacity });
        },
      }),
    ] : []),
  ];

  const currentDate = new Date(currentTime).toLocaleDateString("en-US", {
    month: "numeric",
    day:   "numeric",
    year:  "numeric",
  });

  const progressPct =
    timeRange[1] > timeRange[0]
      ? ((currentTime - timeRange[0]) / (timeRange[1] - timeRange[0])) * 100
      : 0;

  const yearStatuses: Record<number, "complete" | "ingested" | "missing" | "partial"> = {};
  YEARS.forEach((y) => {
    yearStatuses[y] = data.some((d: any) => new Date(d.timestamp).getFullYear() === y)
      ? "ingested"
      : "missing";
  });

  const butterflies  = species.filter((s) => !s.category || s.category === "lepidoptera");
  const nectarPlants = species.filter((s) => s.category === "nectar_plant");
  const hostPlants   = species.filter((s) => s.category === "host_plant");
  const isSdm        = mapLayer === "sdm";

  return (
    <div className="sdm-root">

      {/* Map */}
      <div className="sdm-map-wrapper">
        <DeckGL
          controller={true}
          viewState={viewState}
          onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
          layers={layers}
          style={{ width: "100%", height: "100%" }}
          useDevicePixels={1}
        >
          <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json" />
        </DeckGL>
      </div>

      {/* Left panel */}
      <div className="sdm-left">

        {/* Photo */}
        <div className="sdm-block sdm-photo">
          <a
            href={`https://en.wikipedia.org/wiki/${selectedSpecies?.scientificName?.replace(" ", "_")}`}
            target="_blank"
            rel="noreferrer"
            className="sdm-wiki-btn"
          >
            W
          </a>
          <span className="sdm-photo-unavailable">photo unavailable</span>
        </div>

        {/* Info */}
        <div className="sdm-block sdm-info">
          {selectedSpecies ? (
            <>
              <p className="sdm-common-name">{selectedSpecies.commonName}</p>
              <p className="sdm-scientific-name">{selectedSpecies.scientificName}</p>
              <p className="sdm-description">Species description will be loaded from the database.</p>
            </>
          ) : (
            <p className="sdm-description">Loading…</p>
          )}
        </div>

        {/* Playback — hidden in SDM mode */}
        <div className={`sdm-block sdm-playback${isSdm ? " sdm-hidden" : ""}`}>
          <div className="sdm-playback-row">
            <button onClick={() => setIsPlaying(!isPlaying)} className="sdm-play-btn">
              {isPlaying ? "||" : "▶"}
            </button>

            <div className="sdm-stat-col">
              <span className="sdm-stat-label">Total Records</span>
              <span className="sdm-stat-value">{loading ? "…" : data.length.toLocaleString()}</span>
            </div>

            <div className="sdm-stat-col">
              <span className="sdm-stat-label">Date</span>
              <span className="sdm-stat-value">{currentDate}</span>
            </div>

            <div className="sdm-interval-wrapper">
              <div className="sdm-stat-col">
                <span className="sdm-stat-label">Interval</span>
                <span className="sdm-stat-value">{selectedStep.label}</span>
              </div>
              <button onClick={() => setShowStepMenu(!showStepMenu)} className="sdm-interval-arrow">
                ▼
              </button>
              {showStepMenu && (
                <div className="sdm-dropdown">
                  {STEP_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => { setSelectedStep(opt); setShowStepMenu(false); }}
                      className={`sdm-dropdown-item${opt.label === selectedStep.label ? " active" : ""}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div
            role="slider"
            aria-label="Playback position"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            className="sdm-progress-track"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct  = (e.clientX - rect.left) / rect.width;
              setCurrentTime(timeRange[0] + pct * (timeRange[1] - timeRange[0]));
              setIsPlaying(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") setCurrentTime((t) => Math.min(t + selectedStep.days * 86400000, timeRange[1]));
              if (e.key === "ArrowLeft")  setCurrentTime((t) => Math.max(t - selectedStep.days * 86400000, timeRange[0]));
            }}
          >
            <div className="sdm-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="sdm-years">
            {YEARS.map((y) => (
              <YearBlock key={y} year={y} status={yearStatuses[y]} />
            ))}
          </div>

          <div className="sdm-category-row">
            <div className="sdm-category-item">
              <div className="sdm-category-swatch" />
              <span className="sdm-category-label">Nectar Plants</span>
              <span className="sdm-category-info" title="Nectar plant occurrence data">ℹ</span>
            </div>
            <div className="sdm-category-item">
              <div className="sdm-category-swatch" />
              <span className="sdm-category-label">Larval Host Plants</span>
              <span className="sdm-category-info" title="Larval host plant occurrence data">ℹ</span>
            </div>
          </div>
        </div>

        {/* SDM model info */}
        {isSdm && (
          <div className="sdm-block sdm-model-info">
            <div className="sdm-model-info-title">Model Info</div>
            {[
              ["Algorithm",  "MaxEnt 3.4"],
              ["Resolution", "~4.5 km"],
              ["AUC",        "—"],
              ["Variables",  "19 bioclim"],
            ].map(([k, v]) => (
              <div key={k} className="sdm-model-row">
                <span className="sdm-model-key">{k}</span>
                <span className="sdm-model-val">{v}</span>
              </div>
            ))}
            <div className="sdm-colormap">
              <div className="sdm-colormap-label">Probability</div>
              <div className="sdm-colormap-bar" />
              <div className="sdm-colormap-ticks">
                {["0", "0.25", "0.5", "0.75", "1.0"].map(l => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Species selector */}
        <div className="sdm-block sdm-selector">
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

      {/* Layer switch */}
      <LayerSwitch active={mapLayer} onChange={handleLayerChange} />

      {/* Error toast */}
      {error && <div className="sdm-error">{error}</div>}
    </div>
  );
}