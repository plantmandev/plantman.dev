"use client";
import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { ScatterplotLayer } from "@deck.gl/layers";
import { DataFilterExtension } from "@deck.gl/extensions";
import { WebMercatorViewport, FlyToInterpolator } from "@deck.gl/core";
import SupportBar from "@/components/support-bar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faSpinner } from "@fortawesome/free-solid-svg-icons";
const DeckGL = dynamic(() => import("@deck.gl/react").then((mod) => mod.default), { ssr: false });
const Map    = dynamic(() => import("react-map-gl/maplibre").then((mod) => mod.default), { ssr: false });

// ── Constants ────────────────────────────────────────────────────────────────
const INITIAL_VIEW  = { longitude: 10, latitude: 20, zoom: 1.8, pitch: 0, bearing: 0 };
const TUTORIAL_KEY  = "sdm-tutorial-done";
const PAGE_SIZE     = 30;
const COLOR_PALETTE: [number, number, number][] = [
  [255, 140, 0], [220, 20, 60], [255, 215, 0], [240, 240, 240],
  [75, 0, 130], [255, 105, 180], [50, 205, 50], [138, 43, 226],
  [0, 191, 255], [255, 69, 0], [147, 112, 219], [34, 139, 34],
];
const STEP_OPTIONS = [
  { label: "1 Day",    days: 1  },
  { label: "1 Week",   days: 7  },
  { label: "2 Weeks",  days: 14 },
  { label: "All Time", days: -1 },
];
const ALL_TIME_STEP_DAYS = 30;
const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

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

function SpeciesCard({ sp, isSelected, onClick }: any) {
  return (
    <button
      onClick={sp.disabled ? undefined : onClick}
      className={`sdm-card${isSelected ? " selected" : ""}${sp.disabled ? " disabled" : ""}`}
      disabled={sp.disabled}
      title={sp.disabled ? "Temporarily unavailable — large dataset, tiles coming soon" : undefined}
    >
      <div className="sdm-card-image" style={sp.disabled ? { opacity: 0.3 } : undefined}>
        <img
          src={getSpeciesImage(sp.scientificName)}
          alt={sp.commonName}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      </div>
      <div className="sdm-card-body" style={sp.disabled ? { opacity: 0.4 } : undefined}>
        <div className="sdm-card-header">
          <div
            className="sdm-card-dot"
            style={{ background: sp.disabled ? "#666" : `rgb(${sp.color.join(",")})` }}
          />
          <span className="sdm-card-name">{sp.commonName}</span>
        </div>
        <span className="sdm-card-scientific">{sp.scientificName}</span>
        {sp.actualObs && (
          <span className="sdm-card-obs">{sp.actualObs.toLocaleString()} obs</span>
        )}
        {sp.disabled && (
          <span className="sdm-card-obs" style={{ color: "#888" }}>tiles coming soon</span>
        )}
      </div>
    </button>
  );
}

function SelectorSection({
  title,
  items,
  selectedFileName,
  onSelect,
  visibleCount,
  onLoadMore,
  loadingMore,
}: {
  title: string;
  items: Species[];
  selectedFileName: string;
  onSelect: (sp: Species) => void;
  visibleCount: number;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  return (
    <div className="sdm-section">
      <div className="sdm-section-title">{title}</div>
      {items.length === 0 ? (
        <div className="sdm-section-empty">No species loaded</div>
      ) : (
        <>
          <div className="sdm-card-grid">
            {visible.map((sp) => (
              <SpeciesCard
                key={sp.fileName}
                sp={sp}
                isSelected={sp.fileName === selectedFileName}
                onClick={() => onSelect(sp)}
              />
            ))}
          </div>
          {hasMore && (
            <button
              className="sdm-load-more"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore
                ? <><FontAwesomeIcon icon={faSpinner} spin /> loading…</>
                : <><FontAwesomeIcon icon={faChevronDown} /> load more <span className="sdm-load-more-count">({items.length - visibleCount})</span></>
              }
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
  const mapStyle = resolvedTheme === "light"
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
  const [selectedStep, setSelectedStep]       = useState(STEP_OPTIONS[3]);
  const [viewState, setViewState]             = useState<any>(INITIAL_VIEW);
  const [visibleCount, setVisibleCount]       = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore]         = useState(false);
  const fittedSpeciesRef                      = React.useRef<string | null>(null);

  // Tutorial: null = done, 1/2/3 = steps
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  // ── Mount / canvas ───────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    setTimeout(() => setCanvasReady(true), 500);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(TUTORIAL_KEY);
    if (!done) setTutorialStep(1);
  }, []);

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
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((c) => c + PAGE_SIZE);
      setLoadingMore(false);
    }, 150);
  }, []);

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
        // Auto-select first non-disabled species
        const firstEnabled = parsed.find((s) => !s.disabled) ?? parsed[0] ?? null;
        setSelectedSpecies(firstEnabled);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load species");
        setLoading(false);
      }
    };
    load();
  }, [mounted, canvasReady]);

  // ── Load occurrences ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSpecies || !mounted || !canvasReady) return;

    if (selectedSpecies.disabled) {
      setData([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsPlaying(false);
        const res = await fetch(`/api/occurrences/${encodeURIComponent(selectedSpecies.scientificName)}`);
        if (!res.ok) throw new Error(`API failed (${res.status})`);
        const geojson = await res.json();
        if (!Array.isArray(geojson.features)) throw new Error("Invalid GeoJSON");
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
        if (fittedSpeciesRef.current !== selectedSpecies.scientificName) {
          const lngs = points.map((p: any) => p.position[0]);
          const lats = points.map((p: any) => p.position[1]);
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
        setData(points);
        setTimeRange([min, max]);
        setCurrentTime(min);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setData([]);
        setLoading(false);
      }
    };
    load();
  }, [selectedSpecies, mounted, canvasReady]);

  // ── Playback ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || loading || timeRange[0] === 0) return;
    const stepDays = selectedStep.days === -1 ? ALL_TIME_STEP_DAYS : selectedStep.days;
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
  const timeWindowMs =
    selectedStep.days === -1
      ? timeRange[1] - timeRange[0]
      : selectedStep.days * 24 * 60 * 60 * 1000;

  const layers = [
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
                <p className="sdm-description" style={{ color: "#888" }}>
                  This species has a very large dataset. Vector tile support is coming soon.
                </p>
              )}
              {!selectedSpecies.disabled && (
                <p className="sdm-description">Species description will be loaded from the database.</p>
              )}
            </>
          ) : (
            <p className="sdm-description">Loading…</p>
          )}
        </div>

        {/* Playback */}
        <div className="sdm-block sdm-playback">
          <div className="sdm-playback-row">
            {/* Play button — tutorial step 3 */}
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
                {loading ? "…" : selectedSpecies?.disabled ? "—" : data.length.toLocaleString()}
              </span>
            </div>
            <div className="sdm-stat-col">
              <span className="sdm-stat-label">Date</span>
              <span className="sdm-stat-value">
                {selectedSpecies?.disabled ? "—" : currentDate}
              </span>
            </div>
            {/* Interval button — tutorial step 2 */}
            <div className="sdm-interval-wrapper">
              <div className="sdm-stat-col">
                <span className="sdm-stat-label">Interval</span>
                <span className="sdm-stat-value">{selectedStep.label}</span>
              </div>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setShowStepMenu(!showStepMenu);
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
              {showStepMenu && (
                <div className="sdm-dropdown">
                  {STEP_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        setSelectedStep(opt);
                        setShowStepMenu(false);
                        advanceTutorial(2);
                      }}
                      className={`sdm-dropdown-item${opt.label === selectedStep.label ? " active" : ""}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
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
              if (e.key === "ArrowRight") setCurrentTime((t) => Math.min(t + selectedStep.days * 86400000, timeRange[1]));
              if (e.key === "ArrowLeft")  setCurrentTime((t) => Math.max(t - selectedStep.days * 86400000, timeRange[0]));
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
        <div
          className={`sdm-block sdm-selector${tutorialStep === 1 ? " sdm-tutorial-target" : ""}`}
        >
          {tutorialStep === 1 && (
            <div className="sdm-tutorial-tip sdm-tutorial-tip--inset">
              select a species
            </div>
          )}
          <SelectorSection
            title="Butterflies"
            items={butterflies}
            selectedFileName={selectedSpecies?.fileName ?? ""}
            onSelect={handleSelectSpecies}
            visibleCount={visibleCount}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
          />
          {nectarPlants.length > 0 && (
            <SelectorSection
              title="Nectar Plants"
              items={nectarPlants}
              selectedFileName={selectedSpecies?.fileName ?? ""}
              onSelect={handleSelectSpecies}
              visibleCount={visibleCount}
              onLoadMore={handleLoadMore}
              loadingMore={loadingMore}
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
              loadingMore={loadingMore}
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
        >
          <Map mapStyle={mapStyle} />
        </DeckGL>
        {loading && !selectedSpecies?.disabled && (
          <div className="sdm-map-loading">
            <span className="sdm-map-loading-text">loading</span>
          </div>
        )}
        {selectedSpecies?.disabled && (
          <div className="sdm-map-loading">
            <span className="sdm-map-loading-text">vector tiles coming soon</span>
          </div>
        )}
      </div>

      {error && <div className="sdm-error">{error}</div>}
      <SupportBar />
    </div>
  );
}


