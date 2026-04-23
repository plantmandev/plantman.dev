"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { BitmapLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";

const DeckGL  = dynamic(() => import("@deck.gl/react").then(m => m.default), { ssr: false });
const MapLibre = dynamic(() => import("react-map-gl/maplibre").then(m => m.default), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

type Band = "ndvi" | "nbr";

type Stat = {
  mean_ndvi: number | null;
  std_ndvi:  number | null;
  mean_nbr:  number | null;
  pct_valid: number;
};

type Manifest = {
  bounds:      [number, number, number, number];
  years:       number[];
  zoom_levels: number[];
};

type FrameMeta = {
  bounds: [number, number, number, number]; // [west, south, east, north]
  zoom:   number;
  width:  number;
  height: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_VIEW = {
  longitude: -81.85,
  latitude:  38.0,
  zoom:      11,
  pitch:     0,
  bearing:   0,
};

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

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({
  stats,
  years,
  currentYear,
}: {
  stats: Record<string, Stat>;
  years: number[];
  currentYear: number;
}) {
  const W = 252, H = 52;

  const values = years.map(y => stats[String(y)]?.mean_ndvi ?? null);
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
    const v = stats[String(yr)]?.mean_ndvi;
    if (v != null) {
      seg.push(`${xp(i).toFixed(1)},${yp(v).toFixed(1)}`);
    } else if (seg.length) {
      segments.push(seg);
      seg = [];
    }
  });
  if (seg.length) segments.push(seg);

  const curIdx = years.indexOf(currentYear);
  const curVal = stats[String(currentYear)]?.mean_ndvi;

  const beforeStartIdx = years.indexOf(1985);
  const beforeEndIdx   = years.indexOf(2005);
  const afterStartIdx  = years.indexOf(2014);
  const afterEndIdx    = years.indexOf(2020);

  return (
    <svg width={W} height={H + 16} style={{ display: "block", overflow: "visible" }}>
      {beforeStartIdx >= 0 && beforeEndIdx >= 0 && (
        <rect
          x={xp(beforeStartIdx)} y={0}
          width={xp(beforeEndIdx) - xp(beforeStartIdx)} height={H}
          fill="#4A90D9" opacity={0.1}
        />
      )}
      {afterStartIdx >= 0 && afterEndIdx >= 0 && (
        <rect
          x={xp(afterStartIdx)} y={0}
          width={xp(afterEndIdx) - xp(afterStartIdx)} height={H}
          fill="#78C679" opacity={0.12}
        />
      )}
      {segments.map((pts, i) => (
        <polyline
          key={i}
          points={pts.join(" ")}
          fill="none"
          stroke="#78C679"
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
            <text key={yr} x={xp(idx)} y={H + 13} textAnchor="middle" fontSize={8} fill="#3a3a50">
              {yr}
            </text>
          );
        })}
      {curIdx >= 0 && curVal != null && (
        <>
          <line x1={xp(curIdx)} x2={xp(curIdx)} y1={0} y2={H} stroke="#ffffff" strokeWidth={0.5} opacity={0.15} />
          <circle cx={xp(curIdx)} cy={yp(curVal)} r={3} fill="#0d0d12" stroke="#78C679" strokeWidth={1.5} />
        </>
      )}
    </svg>
  );
}

// ── Colormap legend ───────────────────────────────────────────────────────────

function Legend({ band }: { band: Band }) {
  const gradient =
    band === "ndvi"
      ? "linear-gradient(to right, #8B5E3C, #C8A96E, #FFFFCC, #78C679, #006837)"
      : "linear-gradient(to right, #7B3F00, #D4956A, #F5F5DC, #5DA35D, #1A4731)";
  const [lo, hi] = band === "ndvi" ? ["−0.1", "0.8"] : ["−0.3", "0.8"];

  return (
    <div className="hobet-legend">
      <span className="hobet-legend-label">{lo}</span>
      <div className="hobet-legend-bar" style={{ background: gradient }} />
      <span className="hobet-legend-label">{hi}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HobetPage() {
  const [mounted,     setMounted]     = useState(false);
  const [viewState,   setViewState]   = useState<any>(INITIAL_VIEW);
  const [band,        setBand]        = useState<Band>("ndvi");
  const [years,       setYears]       = useState<number[]>([]);
  const [yearIdx,     setYearIdx]     = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [stats,       setStats]       = useState<Record<string, Stat>>({});
  const [opacity,     setOpacity]     = useState(0.85);
  const [frameMeta,   setFrameMeta]   = useState<FrameMeta | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);

  // Cache of pre-rendered frame images: "ndvi-1985" → HTMLImageElement
  const frameCache = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => { setMounted(true); }, []);

  // Load manifest, stats, and frame meta in parallel
  useEffect(() => {
    Promise.all([
      fetch("/tiles/manifest.json").then(r => r.json()),
      fetch("/tiles/stats.json").then(r => r.json()),
      fetch("/frames/meta.json").then(r => r.json()).catch(() => null),
    ])
      .then(([manifest, statsData, meta]: [Manifest, Record<string, Stat>, FrameMeta | null]) => {
        setYears(manifest.years);
        setStats(statsData);
        setFrameMeta(meta);
      })
      .catch(() => {
        const fallback: number[] = [];
        for (let y = 1985; y <= 2025; y++) if (y !== 2012) fallback.push(y);
        setYears(fallback);
      });
  }, []);

  // Preload all frame images once years + frameMeta are available.
  // Active band loads first so animation is ready sooner.
  useEffect(() => {
    if (years.length === 0 || !frameMeta) return;
    const bands: Band[] = band === "ndvi" ? ["ndvi", "nbr"] : ["nbr", "ndvi"];
    for (const b of bands) {
      for (const year of years) {
        const key = `${b}-${year}`;
        if (frameCache.current.has(key)) continue;
        const img = new Image();
        img.onload = () => {
          frameCache.current.set(key, img);
          setLoadedCount(c => c + 1);
        };
        img.onerror = () => {}; // missing frame — falls back to TileLayer
        img.src = `/frames/${b}/${year}.png`;
      }
    }
  // Only re-run if years or frameMeta change, not on band toggle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years, frameMeta]);

  // Year playback
  useEffect(() => {
    if (!isPlaying || years.length === 0) return;
    const id = setInterval(() => setYearIdx(i => (i + 1) % years.length), 600);
    return () => clearInterval(id);
  }, [isPlaying, years.length]);

  const currentYear = years[yearIdx] ?? 1985;
  const currentStat = stats[String(currentYear)];
  const totalFrames = years.length * 2;

  const layers = useMemo(() => {
    // Use pre-rendered frame if available
    if (frameMeta) {
      const img = frameCache.current.get(`${band}-${currentYear}`);
      if (img) {
        const [west, south, east, north] = frameMeta.bounds;
        return [
          new BitmapLayer({
            id: "frame-layer",
            image: img,
            bounds: [west, south, east, north] as [number, number, number, number],
            opacity,
          }),
        ];
      }
    }
    // Fallback: live tile fetch (used before render_frames.py has been run)
    return [
      new TileLayer({
        id: `${band}-${currentYear}`,
        data: `/tiles/${band}/${currentYear}/{z}/{x}/{y}.png`,
        minZoom: 9,
        maxZoom: 12,
        tileSize: 256,
        opacity,
        renderSubLayers: (props: any) => {
          const { west, south, east, north } = props.tile.bbox;
          return new BitmapLayer({
            ...props,
            data: null,
            image: props.data,
            bounds: [west, south, east, north],
          });
        },
      }),
    ];
  // loadedCount is intentional: re-evaluate as each frame arrives
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [band, currentYear, opacity, frameMeta, loadedCount]);

  const progressPct = years.length > 1 ? (yearIdx / (years.length - 1)) * 100 : 0;

  if (!mounted) {
    return (
      <div className="hobet-loading">
        <span className="hobet-loading-text">Initializing…</span>
      </div>
    );
  }

  return (
    <div className="hobet-root">

      {/* ── Left panel ───────────────────────────────────────────────────── */}
      <div className="hobet-left">

        {/* Header */}
        <div className="hobet-block">
          <p className="hobet-eyebrow">Remote Sensing · West Virginia</p>
          <h1 className="hobet-title">Hobet Mine</h1>
          <p className="hobet-subtitle">
            Mountaintop removal &amp; vegetation recovery<br />
            Lincoln &amp; Boone County, WV
          </p>
        </div>

        {/* Band toggle */}
        <div className="hobet-block">
          <div className="hobet-band-row">
            {(["ndvi", "nbr"] as Band[]).map(b => (
              <button
                key={b}
                className={`hobet-band-btn${band === b ? " hobet-band-active" : ""}`}
                onClick={() => setBand(b)}
              >
                {b.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="hobet-band-hint">
            {band === "ndvi"
              ? "Vegetation health — (NIR − Red) / (NIR + Red)"
              : "Burn & disturbance recovery — (NIR − SWIR) / (NIR + SWIR)"}
          </p>
          <Legend band={band} />
        </div>

        {/* Year + playback */}
        <div className="hobet-block">
          <div className="hobet-year-row">
            <span className="hobet-year-number">{currentYear}</span>
            <button
              className="hobet-play-btn"
              onClick={() => setIsPlaying(p => !p)}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
          </div>

          <div
            role="slider"
            aria-label="Year"
            aria-valuenow={currentYear}
            aria-valuemin={years[0] ?? 1985}
            aria-valuemax={years[years.length - 1] ?? 2025}
            tabIndex={0}
            className="hobet-scrubber"
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
            <div className="hobet-scrubber-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="hobet-scrubber-labels">
            <span>{years[0] ?? 1985}</span>
            <span>May – Sep composite</span>
            <span>{years[years.length - 1] ?? 2025}</span>
          </div>
        </div>

        {/* Year grid */}
        <div className="hobet-block">
          <div className="hobet-year-grid">
            {years.map((yr, i) => (
              <button
                key={yr}
                className={`hobet-year-cell${yr === currentYear ? " hobet-year-active" : ""}`}
                onClick={() => { setYearIdx(i); setIsPlaying(false); }}
                title={String(yr)}
              >
                {String(yr).slice(2)}
              </button>
            ))}
          </div>
        </div>

        {/* Per-year stats */}
        <div className="hobet-block">
          <div className="hobet-stats-grid">
            <div className="hobet-stat-item">
              <span className="hobet-stat-label">Mean NDVI</span>
              <span className="hobet-stat-val">
                {currentStat?.mean_ndvi != null ? currentStat.mean_ndvi.toFixed(3) : "—"}
              </span>
            </div>
            <div className="hobet-stat-item">
              <span className="hobet-stat-label">Mean NBR</span>
              <span className="hobet-stat-val">
                {currentStat?.mean_nbr != null ? currentStat.mean_nbr.toFixed(3) : "—"}
              </span>
            </div>
            <div className="hobet-stat-item">
              <span className="hobet-stat-label">Valid pixels</span>
              <span className="hobet-stat-val">
                {currentStat?.pct_valid != null ? `${currentStat.pct_valid.toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="hobet-stat-item">
              <span className="hobet-stat-label">Landsat</span>
              <span className="hobet-stat-val">
                {currentYear <= 1999
                  ? "LS-5"
                  : currentYear <= 2012
                  ? "LS-5/7"
                  : currentYear <= 2021
                  ? "LS-8"
                  : "LS-8/9"}
              </span>
            </div>
          </div>
        </div>

        {/* NDVI sparkline */}
        {Object.keys(stats).length > 0 && (
          <div className="hobet-block">
            <p className="hobet-spark-title">Mean NDVI · 1985 – 2025</p>
            <Sparkline stats={stats} years={years} currentYear={currentYear} />
            <div className="hobet-spark-legend">
              <span style={{ color: "#4A90D9" }}>▬</span> before&nbsp;
              <span style={{ color: "#78C679" }}>▬</span> after
            </div>
          </div>
        )}

        {/* Key findings */}
        <div className="hobet-block">
          <p className="hobet-findings-title">Key Findings</p>
          <ul className="hobet-findings">
            <li>Mine footprint <span className="hobet-accent">−13.3%</span></li>
            <li>
              Forest cover <span className="hobet-accent">+3.3 pp</span>
              <span className="hobet-dim"> (89.4 → 92.7%)</span>
            </li>
            <li>Active mining visible 1985 – 2008</li>
            <li>NDVI recovery sustained post-2010</li>
          </ul>
          <p className="hobet-data-note">
            {frameMeta && loadedCount < totalFrames
              ? `Preloading frames… ${loadedCount}/${totalFrames}`
              : "Microsoft Planetary Computer · Landsat C2 L2"}
          </p>
        </div>

        {/* Opacity */}
        <div className="hobet-block">
          <label className="hobet-opacity-label">
            <span>Layer opacity — {Math.round(opacity * 100)}%</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={e => setOpacity(parseFloat(e.target.value))}
              className="hobet-opacity-slider"
            />
          </label>
        </div>

      </div>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="hobet-map-wrapper">
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
      </div>

    </div>
  );
}
