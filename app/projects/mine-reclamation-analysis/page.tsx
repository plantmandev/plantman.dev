"use client";

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { BitmapLayer } from "@deck.gl/layers";
import MapPanel, { MapPanelRow } from "@/components/map-panel";

const DeckGL   = dynamic(() => import("@deck.gl/react").then(m => m.default), { ssr: false });
const MapLibre = dynamic(() => import("react-map-gl/maplibre").then(m => m.default), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

type Band = "ndvi" | "nbr";

type Stat = {
  mean_ndvi: number | null;
  std_ndvi:  number | null;
  mean_nbr:  number | null;
  pct_valid: number;
};

type FrameMeta = {
  bounds: [number, number, number, number];
  width:  number;
  height: number;
};

type Mine = {
  slug:              string;
  label:             string;
  location:          string;
  bounds:            [number, number, number, number];
  initialView:       { longitude: number; latitude: number; zoom: number; pitch: number; bearing: number };
  milestoneYear?:    number;
  statusYear?:       number;
  operationalStart?: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TUTORIAL_KEY = "mra-tutorial-done";

const SATELLITE_STYLE = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 23,
      attribution: "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    },
  },
  layers: [{ id: "esri-satellite", type: "raster", source: "esri-satellite" }],
};

// ── Sprite loader ─────────────────────────────────────────────────────────────

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

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({
  stats,
  years,
  currentYear,
  milestoneYear,
  band,
}: {
  stats: Record<string, Stat>;
  years: number[];
  currentYear: number;
  milestoneYear?: number;
  band: Band;
}) {
  const W = 252, H = 52;
  const color = band === "ndvi" ? "#78C679" : "#E8A838";

  const values = years.map(y => stats[String(y)]?.[band === "ndvi" ? "mean_ndvi" : "mean_nbr"] ?? null);
  const valid  = values.filter((v): v is number => v !== null);
  if (valid.length < 2) return null;

  const minV  = Math.min(...valid);
  const maxV  = Math.max(...valid);
  const range = maxV - minV || 0.01;

  const xp = (i: number) => (i / (years.length - 1)) * W;
  const yp = (v: number) => H - ((v - minV) / range) * H * 0.82 - 3;

  const segments: string[][] = [];
  let seg: string[] = [];
  years.forEach((yr, i) => {
    const v = values[i];
    if (v != null) {
      seg.push(`${xp(i).toFixed(1)},${yp(v).toFixed(1)}`);
    } else if (seg.length) {
      segments.push(seg);
      seg = [];
    }
  });
  if (seg.length) segments.push(seg);

  const curIdx = years.indexOf(currentYear);
  const curVal = values[curIdx];

  const milestoneIdx = milestoneYear ? years.indexOf(milestoneYear) : -1;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} style={{ display: "block", overflow: "visible" }}>
      {milestoneIdx > 0 && (
        <rect
          x={xp(0)} y={0}
          width={xp(milestoneIdx) - xp(0)} height={H}
          fill="#4A90D9" opacity={0.1}
        />
      )}
      {milestoneIdx >= 0 && milestoneIdx < years.length - 1 && (
        <rect
          x={xp(milestoneIdx)} y={0}
          width={xp(years.length - 1) - xp(milestoneIdx)} height={H}
          fill={color} opacity={0.12}
        />
      )}
      {segments.map((pts, i) => (
        <polyline
          key={i}
          points={pts.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {years
        .filter(yr => yr % 10 === 0)
        .map(yr => {
          const idx = years.indexOf(yr);
          return (
            <text key={yr} x={xp(idx)} y={H + 13} textAnchor="middle" fontSize={8} style={{ fill: "var(--muted)" }}>
              {yr}
            </text>
          );
        })}
      {curIdx >= 0 && curVal != null && (
        <>
          <line x1={xp(curIdx)} x2={xp(curIdx)} y1={0} y2={H} stroke="currentColor" strokeWidth={0.5} opacity={0.15} />
          <circle cx={xp(curIdx)} cy={yp(curVal)} r={3} fill="var(--background)" stroke={color} strokeWidth={1.5} />
        </>
      )}
    </svg>
  );
}

// ── Colormap legend ───────────────────────────────────────────────────────────

const NDVI_STEPS = ["#7B4A28","#9C6B3C","#B88B55","#D4AA78","#EDD9A8","#FFFFCC","#C4E89A","#8DC878","#4DAE54","#006837"];
const NBR_STEPS  = ["#6B3200","#8C4A14","#B06530","#CE8A56","#E8B888","#F5F0D0","#C0D8A0","#8AB87A","#4A8A4A","#1A4731"];

function Legend({ band }: { band: Band }) {
  const steps     = band === "ndvi" ? NDVI_STEPS : NBR_STEPS;
  const [lo, hi]  = band === "ndvi" ? ["−0.1", "0.8"] : ["−0.3", "0.8"];
  const pct       = 100 / steps.length;
  const gradient  = `linear-gradient(to right, ${steps.map((c, i) =>
    `${c} ${(i * pct).toFixed(1)}% ${((i + 1) * pct).toFixed(1)}%`
  ).join(", ")})`;

  return (
    <div className="mra-legend">
      <span className="mra-legend-label">{lo}</span>
      <div className="mra-legend-bar" style={{ background: gradient }} />
      <span className="mra-legend-label">{hi}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MineReclamationPage() {
  const [mounted,      setMounted]      = useState(false);
  const [mines,        setMines]        = useState<Mine[]>([]);
  const [minesLoaded,  setMinesLoaded]  = useState(false);
  const [viewState,    setViewState]    = useState<any>({ longitude: -81.914, latitude: 37.996, zoom: 9, pitch: 0, bearing: 0 });
  const [selectedMine, setSelectedMine] = useState<Mine | null>(null);
  const [mineOpen,     setMineOpen]     = useState(false);
  const [band,         setBand]         = useState<Band>("ndvi");
  const [bandInfo,     setBandInfo]     = useState<Band | null>(null);
  const [years,        setYears]        = useState<number[]>([]);
  const [yearIdx,      setYearIdx]      = useState(0);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [stats,        setStats]        = useState<Record<string, Stat>>({});
  const [frameMeta,    setFrameMeta]    = useState<FrameMeta | null>(null);
  const [loadedCount,  setLoadedCount]  = useState(0);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  const frameCache           = useRef<Map<string, HTMLImageElement>>(new Map());
  const mineDropRef          = useRef<HTMLDivElement>(null);
  const tutorialInitialized  = useRef(false);

  const totalFrames = years.length * 2;

  useEffect(() => { setMounted(true); }, []);

  // Fetch mine list from DB on mount
  useEffect(() => {
    fetch("/api/mines")
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: any[]) => {
        if (!Array.isArray(data)) throw new Error("Unexpected response");
        const list: Mine[] = data.map(m => ({
          slug:         m.slug,
          label:        m.mine_name,
          location:     [m.county, m.state].filter(Boolean).join(", "),
          bounds:       [m.bounds_west, m.bounds_south, m.bounds_east, m.bounds_north] as [number, number, number, number],
          initialView:  {
            longitude: (m.img_west != null && m.img_east  != null)
              ? (m.img_west + m.img_east)   / 2
              : m.lon  ?? -81.85,
            latitude:  (m.img_south != null && m.img_north != null)
              ? (m.img_south + m.img_north) / 2
              : m.lat  ?? 38.0,
            zoom: 9, pitch: 0, bearing: 0,
          },
          milestoneYear:    m.operational_end   ?? undefined,
          statusYear:       m.operational_end   ?? undefined,
          operationalStart: m.operational_start ?? undefined,
        }));
        setMines(list);
        if (list.length > 0) {
          setSelectedMine(list[0]);
          setViewState(list[0].initialView);
        }
        setMinesLoaded(true);
      })
      .catch(err => {
        console.error("Failed to load mines:", err);
        setMinesLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (tutorialInitialized.current || totalFrames === 0 || loadedCount < totalFrames) return;
    tutorialInitialized.current = true;
    if (!localStorage.getItem(TUTORIAL_KEY)) setTutorialStep(1);
  }, [loadedCount, totalFrames]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mineDropRef.current && !mineDropRef.current.contains(e.target as Node)) {
        setMineOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reload data when selected mine changes
  useEffect(() => {
    if (!selectedMine) return;
    setYears([]);
    setStats({});
    setFrameMeta(null);
    setLoadedCount(0);
    frameCache.current.clear();
    setYearIdx(0);
    setIsPlaying(false);
    setViewState(selectedMine.initialView);

    fetch(`/api/mines/${selectedMine.slug}/data`)
      .then(r => r.json())
      .then(({ years: y, stats: s, frameMeta: fm }) => {
        setYears(y);
        setStats(s);
        setFrameMeta(fm);
      })
      .catch(() => {
        const fallback: number[] = [];
        for (let y = 1985; y <= 2025; y++) if (y !== 2012) fallback.push(y);
        setYears(fallback);
      });
  }, [selectedMine]);

  // Preload all frame images; active band loads first
  useEffect(() => {
    if (!selectedMine || years.length === 0 || !frameMeta) return;
    const bands: Band[] = band === "ndvi" ? ["ndvi", "nbr"] : ["nbr", "ndvi"];
    for (const b of bands) {
      for (const year of years) {
        const key = `${selectedMine.slug}-${b}-${year}`;
        if (frameCache.current.has(key)) continue;
        const img = new Image();
        img.onload = () => {
          frameCache.current.set(key, img);
          setLoadedCount(c => c + 1);
        };
        img.onerror = () => {};
        img.src = `/api/mines/${selectedMine.slug}/frame/${year}/${b}`;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years, frameMeta, selectedMine]);

  // Year playback — pauses for 3 extra ticks at the milestone year
  useEffect(() => {
    if (!isPlaying || years.length === 0 || !selectedMine) return;
    let pauseCount = 0;
    const PAUSE_TICKS = 3;
    const { milestoneYear } = selectedMine;
    const id = setInterval(() => {
      setYearIdx(i => {
        if (milestoneYear && years[i] === milestoneYear && pauseCount < PAUSE_TICKS) {
          pauseCount++;
          return i;
        }
        pauseCount = 0;
        return (i + 1) % years.length;
      });
    }, 600);
    return () => clearInterval(id);
  }, [isPlaying, years, selectedMine]);

  const currentYear = years[yearIdx] ?? 1985;
  const currentStat = stats[String(currentYear)];

  // Autoplay once all frames are cached.
  // New users: blocked until they complete step 3 (localStorage not yet set).
  // Returning users: fires immediately when frames load.
  // Tutorial completion (step 3 → null): tutorialStep dep re-triggers this.
  useEffect(() => {
    if (totalFrames > 0 && loadedCount >= totalFrames && tutorialStep === null && !!localStorage.getItem(TUTORIAL_KEY)) {
      setIsPlaying(true);
    }
  }, [loadedCount, totalFrames, tutorialStep]);

  const layers = useMemo(() => {
    if (!frameMeta || !selectedMine) return [];
    const img = frameCache.current.get(`${selectedMine.slug}-${band}-${currentYear}`);
    if (!img) return [];
    const [west, south, east, north] = frameMeta.bounds;
    return [
      new BitmapLayer({
        id: "frame-layer",
        image: img,
        bounds: [west, south, east, north] as [number, number, number, number],
        opacity: 1,
      }),
    ];
  // loadedCount is intentional — re-evaluate as frames arrive
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [band, currentYear, frameMeta, loadedCount, selectedMine]);

  const progressPct    = years.length > 1 ? (yearIdx / (years.length - 1)) * 100 : 0;
  const milestoneIdx   = selectedMine?.milestoneYear ? years.indexOf(selectedMine.milestoneYear) : -1;
  const milestonePct   = years.length > 1 && milestoneIdx >= 0
    ? (milestoneIdx / (years.length - 1)) * 100
    : null;
  const isAbandoned    = selectedMine?.statusYear != null && currentYear >= selectedMine.statusYear;

  const advanceTutorial = useCallback((fromStep: number) => {
    setTutorialStep(current => {
      if (current !== fromStep) return current;
      if (fromStep >= 3) { localStorage.setItem(TUTORIAL_KEY, "1"); return null; }
      return fromStep + 1;
    });
  }, []);

  const skipTutorial = useCallback(() => {
    setTutorialStep(null);
    localStorage.setItem(TUTORIAL_KEY, "1");
  }, []);

  if (!mounted || !minesLoaded) {
    return (
      <div className="mra-loading">
        <span className="mra-loading-text">Initializing…</span>
      </div>
    );
  }

  if (!selectedMine) {
    return (
      <div className="mra-loading">
        <span className="mra-loading-text">No mine data available</span>
      </div>
    );
  }

  return (
    <div className="mra-root">

      {/* ── Left panel ───────────────────────────────────────────────────── */}
      <div className="mra-left">

        {/* Mine selector */}
        <div className="mra-block" style={{ paddingTop: 28 }}>
          <div className={`mra-mine-selector-wrap${tutorialStep === 1 ? " sdm-tutorial-target" : ""}`} ref={mineDropRef}>
            <button
              className="mra-mine-selector-btn"
              onClick={() => setMineOpen(o => !o)}
              aria-expanded={mineOpen}
              aria-label="Select mine"
            >
              <span>{selectedMine.label}</span>
              <span className="mra-mine-chevron">{mineOpen ? "▴" : "▾"}</span>
            </button>
            {tutorialStep === 1 && <div className="sdm-tutorial-tip sdm-tutorial-tip--below">select a mine</div>}
            {mineOpen && (
              <div className="mra-mine-dropdown">
                {mines.map(mine => (
                  <button
                    key={mine.slug}
                    className={`mra-mine-option${mine.slug === selectedMine.slug ? " active" : ""}`}
                    onClick={() => { setSelectedMine(mine); setMineOpen(false); advanceTutorial(1); }}
                  >
                    <span>{mine.label}</span>
                    <span className="mra-mine-option-loc">{mine.location}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mra-location">{selectedMine.location}</p>
        </div>

        {/* Year + playback */}
        <div className="mra-block">
          <div className="mra-year-row">
            <button
              className={`mra-play-btn${tutorialStep === 3 ? " sdm-tutorial-target" : ""}`}
              onClick={() => { setIsPlaying(p => !p); advanceTutorial(3); }}
              aria-label={isPlaying ? "Pause" : "Play"}
              disabled={years.length === 0 || (frameMeta !== null && loadedCount < totalFrames)}
            >
              {years.length === 0 || (frameMeta !== null && loadedCount < totalFrames)
                ? <SpriteLoader size={26} />
                : isPlaying ? "||" : "▶"}
              {tutorialStep === 3 && <div className="sdm-tutorial-tip">press play</div>}
            </button>
            <span className="mra-year-number">{currentYear}</span>
          </div>

          <div
            role="slider"
            aria-label="Year"
            aria-valuenow={currentYear}
            aria-valuemin={years[0] ?? 1985}
            aria-valuemax={years[years.length - 1] ?? 2025}
            tabIndex={0}
            className="mra-scrubber"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct  = (e.clientX - rect.left) / rect.width;
              setYearIdx(Math.round(pct * (years.length - 1)));
              setIsPlaying(false);
            }}
            onKeyDown={e => {
              if (e.key === "ArrowRight") setYearIdx(i => Math.min(i + 1, years.length - 1));
              if (e.key === "ArrowLeft")  setYearIdx(i => Math.max(i - 1, 0));
            }}
          >
            <div className="mra-scrubber-fill" style={{ width: `${progressPct}%` }} />
            {milestonePct !== null && (
              <div style={{
                position: "absolute",
                left: `${milestonePct}%`,
                top: -8,
                bottom: -8,
                width: 2,
                background: "#c0392b",
                pointerEvents: "none",
              }} />
            )}
          </div>

          <div className="mra-scrubber-labels">
            <span>{years[0] ?? 1985}</span>
            <span>May – Sep composite</span>
            <span>{years[years.length - 1] ?? 2025}</span>
          </div>
        </div>

        {/* Statistics */}
        <div className="mra-block">
          <div className="mra-stats-grid">
            <div className="mra-stat-item">
              <span className="mra-stat-label">Mean NDVI</span>
              <span className="mra-stat-val">
                {currentStat?.mean_ndvi != null ? currentStat.mean_ndvi.toFixed(3) : "—"}
              </span>
            </div>
            <div className="mra-stat-item">
              <span className="mra-stat-label">Mean NBR</span>
              <span className="mra-stat-val">
                {currentStat?.mean_nbr != null ? currentStat.mean_nbr.toFixed(3) : "—"}
              </span>
            </div>
            <div className="mra-stat-item">
              <span className="mra-stat-label">Valid pixels</span>
              <span className="mra-stat-val">
                {currentStat?.pct_valid != null ? `${currentStat.pct_valid.toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="mra-stat-item">
              <span className="mra-stat-label">Landsat</span>
              <span className="mra-stat-val">
                {currentYear <= 1999 ? "LS-5" : currentYear <= 2012 ? "LS-5/7" : currentYear <= 2021 ? "LS-8" : "LS-8/9"}
              </span>
            </div>
          </div>
        </div>

        {/* Sparkline */}
        {Object.keys(stats).length > 0 && (
          <div className="mra-block">
            <p className="mra-spark-title">Mean {band.toUpperCase()} · {years[0]} – {years[years.length - 1]}</p>
            <Sparkline stats={stats} years={years} currentYear={currentYear} milestoneYear={selectedMine.milestoneYear} band={band} />
            <div className="mra-spark-legend">
              <span style={{ color: "#4A90D9" }}>▬</span> before&nbsp;
              <span style={{ color: band === "ndvi" ? "#78C679" : "#E8A838" }}>▬</span> after
            </div>
          </div>
        )}

      </div>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="mra-map-wrapper">
        <DeckGL
          controller
          viewState={viewState}
          onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
          layers={layers}
          style={{ width: "100%", height: "100%" }}
          useDevicePixels={1}
          onError={(err: Error) => console.warn("DeckGL:", err.message)}
        >
          <MapLibre mapStyle={SATELLITE_STYLE as any} />
        </DeckGL>

        {years.length === 0 || (frameMeta !== null && loadedCount < totalFrames) ? (
          <div className="sdm-map-loading">
            <span className="sdm-map-loading-text">loading</span>
          </div>
        ) : null}

        {selectedMine.statusYear != null && (
          <div className={`mra-status-panel${isAbandoned ? " abandoned" : " active"}`}>
            <span className="mra-status-label">Status</span>
            <span className="mra-status-dot" />
            <span className="mra-status-value">
              {isAbandoned ? "Abandoned" : "Active"}
            </span>
          </div>
        )}

        <MapPanel title="Controls" width={280}>
          <MapPanelRow label="Layer">
            <div style={{ display: "flex", gap: 6, position: "relative" }} className={tutorialStep === 2 ? "sdm-tutorial-target" : undefined}>
              {(["ndvi", "nbr"] as Band[]).map(b => (
                <button
                  key={b}
                  className={`map-panel-btn${band === b ? " active" : ""}`}
                  onClick={() => { setBand(b); advanceTutorial(2); }}
                >
                  {b.toUpperCase()}
                  <span
                    className={`mra-band-info-btn${bandInfo === b ? " open" : ""}`}
                    role="button"
                    aria-label={`Info about ${b.toUpperCase()}`}
                    onClick={e => { e.stopPropagation(); setBandInfo(cur => cur === b ? null : b); }}
                  >
                    ⓘ
                  </span>
                </button>
              ))}
              {tutorialStep === 2 && <div className="sdm-tutorial-tip">choose a band</div>}
            </div>
          </MapPanelRow>
          {bandInfo !== null && (
            <p className="mra-band-hint" style={{ margin: 0 }}>
              {bandInfo === "ndvi"
                ? "Vegetation health — (NIR − Red) / (NIR + Red)"
                : "Burn & disturbance recovery — (NIR − SWIR) / (NIR + SWIR)"}
            </p>
          )}
          <Legend band={band} />
        </MapPanel>
      </div>

      {tutorialStep !== null && (
        <button className="sdm-tutorial-skip" onClick={skipTutorial}>skip tutorial</button>
      )}

    </div>
  );
}
