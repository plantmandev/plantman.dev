"use client";
import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { ScatterplotLayer } from "@deck.gl/layers";
import { DataFilterExtension } from "@deck.gl/extensions";
import { WebMercatorViewport, FlyToInterpolator } from "@deck.gl/core";
import SupportBar from "@/components/support-bar";

const SPRITE_FRAMES = 20;
function SpriteLoader({ size = 36 }: { size?: number }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % SPRITE_FRAMES), 67);
    return () => clearInterval(id);
  }, []);
  return (
    <img
      src={`/loading-loop/${String(frame).padStart(2, "0")}.png`}
      width={size}
      height={size * 1.25}
      alt=""
      aria-hidden
      style={{ display: "block" }}
    />
  );
}
const DeckGL = dynamic(() => import("@deck.gl/react").then((mod) => mod.default), { ssr: false });
const Map    = dynamic(() => import("react-map-gl/maplibre").then((mod) => mod.default), { ssr: false });

// ── Constants ────────────────────────────────────────────────────────────────
const INITIAL_VIEW  = { longitude: 10, latitude: 20, zoom: 1.8, pitch: 0, bearing: 0 };
const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    satellite: {
      type: "raster" as const,
      tiles: ["https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg"],
      tileSize: 256,
      maxzoom: 8,
      attribution: "Imagery courtesy NASA Earth Observatory",
    },
  },
  layers: [{ id: "satellite", type: "raster" as const, source: "satellite" }],
};
const TUTORIAL_KEY  = "sdm-tutorial-done";
const PAGE_SIZE     = 30;
const COLOR_PALETTE: [number, number, number][] = [
  [255, 140, 0], [220, 20, 60], [255, 215, 0], [240, 240, 240],
  [75, 0, 130], [255, 105, 180], [50, 205, 50], [138, 43, 226],
  [0, 191, 255], [255, 69, 0], [147, 112, 219], [34, 139, 34],
];
const STEP_OPTIONS = [
  { label: "1 Week",   days: 7  },
  { label: "2 Weeks",  days: 14 },
  { label: "All Time", days: -1 },
];
const ALL_TIME_STEP_DAYS = 30;
const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const CHUNK_SIZE = 150000;

function getDefaultStep(obs: number) {
  if (obs >= 50000) return STEP_OPTIONS[0]; // 1 Week
  if (obs >= 10000) return STEP_OPTIONS[1]; // 2 Weeks
  return STEP_OPTIONS[2];                    // All Time
}

// ── Types ────────────────────────────────────────────────────────────────────
type Species = {
  scientificName: string;
  fileName: string;
  commonName: string;
  color: [number, number, number];
  actualObs?: number;
  status?: string;
  category?: string;
  disabled?: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function toFileName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-gbif";
}
function roundObs(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} million`;
  if (n >= 1000)      return `${Math.round(n / 1000)}k`;
  if (n >= 100)       return `${Math.round(n / 10) * 10}`;
  return `${n}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  if (!hex || !hex.startsWith("#") || hex.length !== 7) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ── Sub-components ───────────────────────────────────────────────────────────
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

function getSpeciesImage(scientificName: string): string {
  const slug = scientificName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `/species/${slug}.svg`;
}

function SpeciesCard({ sp, isSelected, onClick, isTutorialTarget, showTip }: any) {
  const btn = (
    <button
      onClick={sp.disabled ? undefined : onClick}
      className={`sdm-card${isSelected ? " selected" : ""}${sp.disabled ? " disabled" : ""}${isTutorialTarget ? " sdm-tutorial-target" : ""}`}
      disabled={sp.disabled}
      title={sp.disabled ? "Temporarily unavailable" : undefined}
      style={showTip ? { width: "100%" } : undefined}
    >
      <div className="sdm-card-image">
        <img
          src={getSpeciesImage(sp.scientificName)}
          alt={sp.commonName}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        {sp.disabled && (
          <div className="sdm-card-disabled-overlay">
            <svg
              className="sdm-card-disabled-x"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: "55%", height: "55%" }}
            >
              <line x1="10" y1="10" x2="90" y2="90" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              <line x1="90" y1="10" x2="10" y2="90" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="sdm-card-body">
        <span className="sdm-card-name">{sp.commonName}</span>
        <span className="sdm-card-scientific">{sp.scientificName}</span>
        {sp.disabled && (
          <span className="sdm-card-obs">temporarily unavailable</span>
        )}
      </div>
    </button>
  );

  if (!showTip) return btn;
  return (
    <div style={{ position: "relative" }}>
      {btn}
      <div className="sdm-tutorial-tip">select a species</div>
    </div>
  );
}

function SelectorSection({
  title,
  items,
  selectedFileName,
  onSelect,
  visibleCount,
  onLoadMore,
  tutorialCardIndex,
}: {
  title: string;
  items: Species[];
  selectedFileName: string;
  onSelect: (sp: Species) => void;
  visibleCount: number;
  onLoadMore: () => void;
  tutorialCardIndex?: number | null;
}) {
  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  const loadMoreRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) onLoadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);
  return (
    <div className="sdm-section">
      <div className="sdm-section-title">{title}</div>
      {items.length === 0 ? (
        <div className="sdm-section-empty">No species loaded</div>
      ) : (
        <>
          <div className="sdm-card-grid">
            {visible.map((sp, index) => (
              <SpeciesCard
                key={sp.fileName}
                sp={sp}
                isSelected={sp.fileName === selectedFileName}
                onClick={() => onSelect(sp)}
                isTutorialTarget={tutorialCardIndex != null && index === tutorialCardIndex}
                showTip={tutorialCardIndex != null && index === tutorialCardIndex}
              />
            ))}
          </div>
          {hasMore && (
            <button ref={loadMoreRef} className="sdm-load-more" onClick={onLoadMore} aria-label={`Load ${items.length - visibleCount} more`}>
              <SpriteLoader />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function SDMPage() {
  const { resolvedTheme } = useTheme();
  const [terrainMode, setTerrainMode] = useState(false);
  const mapStyle = terrainMode
    ? SATELLITE_STYLE
    : resolvedTheme === "light"
      ? "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";

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
  const [dropdownAnchor, setDropdownAnchor]   = useState<{ top: number; right: number } | null>(null);
  const [selectedStep, setSelectedStep]       = useState(STEP_OPTIONS[2] ?? STEP_OPTIONS[0]);
  const [viewState, setViewState]             = useState<any>(INITIAL_VIEW);
  const [visibleCount, setVisibleCount]       = useState(PAGE_SIZE);
  const fittedSpeciesRef                      = React.useRef<string | null>(null);
  const tutorialInitializedRef                = React.useRef(false);
  const intervalArrowRef                      = React.useRef<HTMLButtonElement>(null);

  const [tutorialStep, setTutorialStep]         = useState<number | null>(null);
  const [tutorialCardIndex, setTutorialCardIndex] = useState<number>(0);

  // ── Mount / canvas ───────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    setTimeout(() => setCanvasReady(true), 800);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (species.length === 0 || loading) return;
    if (tutorialInitializedRef.current) return;
    tutorialInitializedRef.current = true;
    const done = localStorage.getItem(TUTORIAL_KEY);
    if (!done) {
      setTutorialCardIndex(Math.floor(Math.random() * 6));
      setTutorialStep(1);
    }
  }, [species, loading]);

  // ── Tutorial helpers ─────────────────────────────────────────────────────
  const advanceTutorial = useCallback((fromStep: number) => {
    setTutorialStep((current) => {
      if (current !== fromStep) return current;
      if (fromStep >= 3) {
        localStorage.setItem(TUTORIAL_KEY, "1");
        return null;
      }
      return fromStep + 1;
    });
  }, []);

  const skipTutorial = useCallback(() => {
    setTutorialStep(null);
    localStorage.setItem(TUTORIAL_KEY, "1");
  }, []);

  // ── Load more handler ────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    setVisibleCount((c) => c + PAGE_SIZE);
  }, []);

  // ── Auto-select interval based on dataset size ───────────────────────────
  useEffect(() => {
    if (!selectedSpecies || selectedSpecies.disabled) return;
    setSelectedStep(getDefaultStep(selectedSpecies.actualObs ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpecies]);

  // ── Load species list ────────────────────────────────────────────────────
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
            disabled:       item.disabled ?? false,
          };
        });
        parsed.sort((a, b) => (b.actualObs ?? 0) - (a.actualObs ?? 0));
        setSpecies(parsed);
        const firstEnabled = parsed.find((s) => !s.disabled) ?? parsed[0] ?? null;
        setSelectedSpecies(firstEnabled);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load species");
        setLoading(false);
      }
    };
    load();
  }, [mounted, canvasReady]);

  // ── Load occurrences (chunked, progressive) ──────────────────────────────
  useEffect(() => {
    if (!selectedSpecies || !mounted || !canvasReady) return;

    if (selectedSpecies.disabled) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setData([]);
      setTimeRange([0, 1]);
      setCurrentTime(0);
      setError(null);
      setIsPlaying(false);

      let offset = 0;
      let allPoints: any[] = [];

      try {
        while (true) {
          const res = await fetch(
            `/api/occurrences/${encodeURIComponent(selectedSpecies.scientificName)}?offset=${offset}`
          );
          if (cancelled) return;
          if (!res.ok) throw new Error(`API failed (${res.status})`);

          const geojson = await res.json();
          if (!Array.isArray(geojson.features)) throw new Error("Invalid GeoJSON");

          const newPoints = geojson.features.map((f: any) => {
            try {
              return {
                position:  f.geometry.coordinates,
                timestamp: new Date(f.properties.eventDate).getTime(),
              };
            } catch { return null; }
          }).filter((p: any) => p && !isNaN(p.timestamp) && p.timestamp > 0);

          allPoints = [...allPoints, ...newPoints];
          if (cancelled) return;

          const ts = allPoints.map((p: any) => p.timestamp);
          if (ts.length === 0 && !geojson.hasMore) throw new Error("No valid timestamps");

          if (ts.length > 0) {
            const min = ts.reduce((a: number, b: number) => a < b ? a : b);
            const max = ts.reduce((a: number, b: number) => a > b ? a : b);
            setData([...allPoints]);
            setTimeRange([min, max]);

            if (offset === 0) {
              // First chunk: initialise time position and fit viewport
              setCurrentTime(min);
              if (fittedSpeciesRef.current !== selectedSpecies.scientificName) {
                const lngs = allPoints.map((p: any) => p.position[0]);
                const lats = allPoints.map((p: any) => p.position[1]);
                const minLng = lngs.reduce((a: number, b: number) => a < b ? a : b);
                const maxLng = lngs.reduce((a: number, b: number) => a > b ? a : b);
                const minLat = lats.reduce((a: number, b: number) => a < b ? a : b);
                const maxLat = lats.reduce((a: number, b: number) => a > b ? a : b);
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
                } catch { /* degenerate extent — leave view unchanged */ }
              }
            }
          }

          if (!geojson.hasMore) break;
          offset += CHUNK_SIZE;
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load data");
        setData([]);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedSpecies, mounted, canvasReady]);

  // ── Playback ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || loading || timeRange[0] === 0) return;
    const stepDays = (selectedStep?.days === -1 ? ALL_TIME_STEP_DAYS : selectedStep?.days) ?? ALL_TIME_STEP_DAYS;
    const interval = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + stepDays * 24 * 60 * 60 * 1000;
        if (next >= timeRange[1]) return timeRange[0];
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, timeRange, loading, selectedStep]);

  const handleSelectSpecies = useCallback((sp: Species) => {
    setSelectedSpecies(sp);
    setIsPlaying(false);
    setShowStepMenu(false);
    advanceTutorial(1);
  }, [advanceTutorial]);

  if (!mounted || !canvasReady) {
    return (
      <div className="sdm-loading">
        <span className="sdm-loading-text">Initializing canvas…</span>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const safeStep = selectedStep ?? STEP_OPTIONS[2];

  const timeWindowMs =
    safeStep.days === -1
      ? timeRange[1] - timeRange[0]
      : safeStep.days * 24 * 60 * 60 * 1000;

  const layers = [
    new ScatterplotLayer({
      id:             "occurrences",
      data,
      getPosition:    (d: any) => d.position,
      getFilterValue: (d: any) => d.timestamp,
      filterRange:
        safeStep.days === -1
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
  ];

  const currentDate = new Date(currentTime).toLocaleDateString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="sdm-root">
      {tutorialStep !== null && (
        <button className="sdm-tutorial-skip" onClick={skipTutorial}>
          skip tutorial
        </button>
      )}

      {/* ── Left panel ───────────────────────────────────────────────────── */}
      <div className="sdm-left">

        {/* Info */}
        <div className="sdm-block sdm-info">
          {selectedSpecies ? (
            <>
              <p className="sdm-common-name">{selectedSpecies.commonName}</p>
              <p className="sdm-scientific-name">{selectedSpecies.scientificName}</p>
              {selectedSpecies.disabled && (
                <p className="sdm-description">
                  This species is temporarily unavailable.
                </p>
              )}
            </>
          ) : (
            <p className="sdm-description">Loading…</p>
          )}
        </div>

        {/* Playback */}
        <div className="sdm-block sdm-playback">
          <div className="sdm-playback-row">

            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setIsPlaying(!isPlaying);
                  advanceTutorial(3);
                }}
                className={`sdm-play-btn${tutorialStep === 3 ? " sdm-tutorial-target" : ""}`}
                disabled={loading || selectedSpecies?.disabled}
              >
                {loading ? "…" : isPlaying ? "||" : "▶"}
              </button>
              {tutorialStep === 3 && (
                <div className="sdm-tutorial-tip">press play</div>
              )}
            </div>

            <div className="sdm-stat-col">
              <span className="sdm-stat-label">Total Records</span>
              <span className="sdm-stat-value">
                {loading ? "…" : selectedSpecies?.disabled ? "—" : roundObs(selectedSpecies?.actualObs ?? data.length)}
              </span>
            </div>

            <div className="sdm-stat-col">
              <span className="sdm-stat-label">Date</span>
              <span className="sdm-stat-value">
                {selectedSpecies?.disabled ? "—" : loading ? "…" : currentDate}
              </span>
            </div>

            <div className="sdm-interval-wrapper">
              <div className="sdm-stat-col">
                <span className="sdm-stat-label">Interval</span>
                <span className="sdm-stat-value">{safeStep.label}</span>
              </div>
              <div style={{ position: "relative" }}>
                <button
                  ref={intervalArrowRef}
                  onClick={() => {
                    const next = !showStepMenu;
                    if (next && intervalArrowRef.current) {
                      const rect = intervalArrowRef.current.getBoundingClientRect();
                      setDropdownAnchor({
                        top:   rect.bottom + 4,
                        right: window.innerWidth - rect.right,
                      });
                    }
                    setShowStepMenu(next);
                    advanceTutorial(2);
                  }}
                  className={`sdm-interval-arrow${tutorialStep === 2 ? " sdm-tutorial-target" : ""}`}
                >
                  ▼
                </button>
                {tutorialStep === 2 && (
                  <div className="sdm-tutorial-tip">choose an interval</div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div
            role="slider"
            aria-label="Playback position"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            className="sdm-progress-track"
            onClick={(e) => {
              if (selectedSpecies?.disabled) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct  = (e.clientX - rect.left) / rect.width;
              setCurrentTime(timeRange[0] + pct * (timeRange[1] - timeRange[0]));
              setIsPlaying(false);
            }}
            onKeyDown={(e) => {
              if (selectedSpecies?.disabled) return;
              const stepMs = (safeStep.days === -1 ? ALL_TIME_STEP_DAYS : safeStep.days) * 86400000;
              if (e.key === "ArrowRight") setCurrentTime((t) => Math.min(t + stepMs, timeRange[1]));
              if (e.key === "ArrowLeft")  setCurrentTime((t) => Math.max(t - stepMs, timeRange[0]));
            }}
          >
            <div className="sdm-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Year grid */}
          <div className="sdm-years">
            {YEARS.map((y) => (
              <YearBlock key={y} year={y} status={yearStatuses[y]} />
            ))}
          </div>
        </div>

        {/* Species selector — tutorial step 1 */}
        <div className="sdm-block sdm-selector">
          <SelectorSection
            title="Butterflies"
            items={butterflies}
            selectedFileName={selectedSpecies?.fileName ?? ""}
            onSelect={handleSelectSpecies}
            visibleCount={visibleCount}
            onLoadMore={handleLoadMore}
            tutorialCardIndex={tutorialStep === 1 ? tutorialCardIndex : null}
          />
          {nectarPlants.length > 0 && (
            <SelectorSection
              title="Nectar Plants"
              items={nectarPlants}
              selectedFileName={selectedSpecies?.fileName ?? ""}
              onSelect={handleSelectSpecies}
              visibleCount={visibleCount}
              onLoadMore={handleLoadMore}
            />
          )}
          {hostPlants.length > 0 && (
            <SelectorSection
              title="Host Plants"
              items={hostPlants}
              selectedFileName={selectedSpecies?.fileName ?? ""}
              onSelect={handleSelectSpecies}
              visibleCount={visibleCount}
              onLoadMore={handleLoadMore}
            />
          )}
        </div>

      </div>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="sdm-map-wrapper">
        <DeckGL
          controller={true}
          viewState={viewState}
          onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
          layers={layers}
          style={{ width: "100%", height: "100%" }}
          useDevicePixels={1}
          onError={(error: Error) => console.warn("DeckGL:", error.message)}
        >
          <Map key={terrainMode ? "satellite" : "basemap"} mapStyle={mapStyle} />
        </DeckGL>
        {loading && !selectedSpecies?.disabled && (
          <div className="sdm-map-loading">
            <span className="sdm-map-loading-text">loading</span>
          </div>
        )}
        {selectedSpecies?.disabled && (
          <div className="sdm-map-loading">
            <span className="sdm-map-loading-text">temporarily unavailable</span>
          </div>
        )}
      </div>

      {showStepMenu && dropdownAnchor && (
        <div
          className="sdm-dropdown"
          style={{ position: "fixed", top: dropdownAnchor.top, right: dropdownAnchor.right, bottom: "auto", left: "auto" }}
        >
          {STEP_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                setSelectedStep(opt);
                setShowStepMenu(false);
                advanceTutorial(2);
              }}
              className={`sdm-dropdown-item${opt.label === safeStep.label ? " active" : ""}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {error && <div className="sdm-error">{error}</div>}
      <SupportBar terrainEnabled={terrainMode} onTerrainToggle={() => setTerrainMode(m => !m)} />
    </div>
  );
}