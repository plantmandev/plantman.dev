"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ScatterplotLayer } from "@deck.gl/layers";
import { DataFilterExtension } from "@deck.gl/extensions";

const DeckGL = dynamic(
  () => import("@deck.gl/react").then((mod) => mod.default),
  { ssr: false },
);
const Map = dynamic(
  () => import("react-map-gl/maplibre").then((mod) => mod.default),
  { ssr: false },
);

const INITIAL_VIEW = {
  longitude: -100,
  latitude: 40,
  zoom: 4,
  pitch: 0,
  bearing: 0,
};

const COLOR_PALETTE: [number, number, number][] = [
  [255, 140, 0],
  [220, 20, 60],
  [255, 215, 0],
  [240, 240, 240],
  [75, 0, 130],
  [255, 105, 180],
  [50, 205, 50],
  [138, 43, 226],
  [0, 191, 255],
  [255, 69, 0],
  [147, 112, 219],
  [34, 139, 34],
];

type Species = {
  scientificName: string;
  fileName: string;
  commonName: string;
  color: [number, number, number];
  actualObs?: number;
};

type TimeWindowOption = {
  label: string;
  days: number;
};

const TIME_WINDOWS: TimeWindowOption[] = [
  { label: "1 Week", days: 7 },
  { label: "2 Weeks", days: 14 },
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "All Time", days: -1 },
];

function toFileName(speciesName: string): string {
  return (
    speciesName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") + "-gbif"
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("WebGL Error caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Error loading map</div>;
    }

    return this.props.children;
  }
}

export default function SDMPage() {
  const [mounted, setMounted] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 1]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [species, setSpecies] = useState<Species[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSpeciesMenu, setShowSpeciesMenu] = useState(false);
  const [showTimeWindowMenu, setShowTimeWindowMenu] = useState(false);
  const [selectedTimeWindow, setSelectedTimeWindow] =
    useState<TimeWindowOption>(TIME_WINDOWS[1]);

  const [globalTimeRange, setGlobalTimeRange] = useState<[number, number]>([
    0, 1,
  ]);
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number]>([
    2015, 2026,
  ]);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setCanvasReady(true), 500);
  }, []);

  useEffect(() => {
    const loadSpecies = async () => {
      try {
        setError(null);

        const metadataResponse = await fetch(
          "/species-distribution-model/occurrence-data/species-metadata.csv",
        );

        if (!metadataResponse.ok) {
          throw new Error(
            `Failed to load metadata (${metadataResponse.status})`,
          );
        }

        const metadataText = await metadataResponse.text();
        const lines = metadataText.trim().split("\n");

        if (lines.length < 2) {
          throw new Error("Metadata file is empty");
        }

        const speciesFromMetadata: Species[] = [];

        for (let i = 1; i < lines.length; i++) {
          try {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(",").map((v) => v.trim());

            const speciesName = values[0];
            const commonName = values[1];

            if (!speciesName || !commonName) {
              continue;
            }

            const fileName = toFileName(speciesName);
            const actualObs = values[6]
              ? Math.round(parseFloat(values[6]))
              : undefined;
            const color = values[11] || undefined;

            let colorRGB: [number, number, number];

            if (color && color.startsWith("#") && color.length === 7) {
              try {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                colorRGB = [r, g, b];
              } catch {
                colorRGB =
                  COLOR_PALETTE[
                    speciesFromMetadata.length % COLOR_PALETTE.length
                  ];
              }
            } else {
              colorRGB =
                COLOR_PALETTE[speciesFromMetadata.length % COLOR_PALETTE.length];
            }

            speciesFromMetadata.push({
              scientificName: speciesName,
              fileName: fileName,
              commonName: commonName,
              color: colorRGB,
              actualObs: actualObs && !isNaN(actualObs) ? actualObs : undefined,
            });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn(`Error parsing line ${i}:`, err);
          }
        }

        speciesFromMetadata.sort((a, b) => {
          const obsA = a.actualObs ?? 0;
          const obsB = b.actualObs ?? 0;

          if (obsB !== obsA) {
            return obsB - obsA;
          }

          return a.commonName.localeCompare(b.commonName);
        });

        if (speciesFromMetadata.length === 0) {
          throw new Error("No species found in metadata");
        }

        setSpecies(speciesFromMetadata);
        setSelectedSpecies(speciesFromMetadata[0]);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error loading species:", err);
        setError(err instanceof Error ? err.message : "Failed to load species");
        setLoading(false);
      }
    };

    if (mounted && canvasReady) {
      loadSpecies();
    }
  }, [mounted, canvasReady]);

  useEffect(() => {
    if (!selectedSpecies || !mounted || !canvasReady) return;

    const loadSpeciesData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/species-distribution-model/occurrence-data/${selectedSpecies.fileName}.geojson`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load ${selectedSpecies.fileName}.geojson (${response.status})`,
          );
        }

        const geojson = await response.json();

        if (!geojson.features || !Array.isArray(geojson.features)) {
          throw new Error("Invalid GeoJSON");
        }

        const points = geojson.features
          .map((f: any) => {
            try {
              return {
                position: f.geometry.coordinates,
                timestamp: new Date(f.properties.eventDate).getTime(),
              };
            } catch {
              return null;
            }
          })
          .filter((p: any) => p !== null);

        const timestamps = points
          .map((p: any) => p.timestamp)
          .filter((t: any) => !isNaN(t) && t > 0);

        if (timestamps.length === 0) {
          throw new Error("No valid timestamps");
        }

        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);

        setData(points);
        setTimeRange([minTime, maxTime]);
        setGlobalTimeRange([minTime, maxTime]);

        const minYear = new Date(minTime).getFullYear();
        const maxYear = new Date(maxTime).getFullYear();
        setSelectedYearRange([minYear, maxYear]);

        setCurrentTime(minTime);
        setLoading(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      }
    };

    loadSpeciesData();
  }, [selectedSpecies, mounted, canvasReady]);

  useEffect(() => {
    if (globalTimeRange[0] === 0) return;

    const startTime = new Date(selectedYearRange[0], 0, 1).getTime();
    const endTime = new Date(
      selectedYearRange[1],
      11,
      31,
      23,
      59,
      59,
    ).getTime();

    const newRange: [number, number] = [
      Math.max(startTime, globalTimeRange[0]),
      Math.min(endTime, globalTimeRange[1]),
    ];

    setTimeRange(newRange);
    setCurrentTime(newRange[0]);
  }, [selectedYearRange, globalTimeRange]);

  useEffect(() => {
    if (!isPlaying || loading || timeRange[0] === 0) return;

    const interval = setInterval(() => {
      setCurrentTime((t) => {
        const newTime = t + 7 * 24 * 60 * 60 * 1000;

        if (newTime > timeRange[1]) {
          return timeRange[0];
        }

        return newTime;
      });
    }, 1000 / 10);

    return () => clearInterval(interval);
  }, [isPlaying, timeRange, loading]);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
    };

    if (isDraggingStart || isDraggingEnd) {
      window.addEventListener("mouseup", handleMouseUp);

      return () => window.removeEventListener("mouseup", handleMouseUp);
    }
  }, [isDraggingStart, isDraggingEnd]);

  const handleStartDrag = useCallback(() => {
    setIsDraggingStart(true);
    setIsPlaying(false);
  }, []);

  const handleEndDrag = useCallback(() => {
    setIsDraggingEnd(true);
    setIsPlaying(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDraggingStart && !isDraggingEnd) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));

      const minYear = new Date(globalTimeRange[0]).getFullYear();
      const maxYear = new Date(globalTimeRange[1]).getFullYear();
      const yearRange = maxYear - minYear;
      const year = Math.round(minYear + percent * yearRange);

      if (isDraggingStart) {
        setSelectedYearRange([
          Math.min(year, selectedYearRange[1]),
          selectedYearRange[1],
        ]);
      } else if (isDraggingEnd) {
        setSelectedYearRange([
          selectedYearRange[0],
          Math.max(year, selectedYearRange[0]),
        ]);
      }
    },
    [isDraggingStart, isDraggingEnd, globalTimeRange, selectedYearRange],
  );

  if (!mounted || !canvasReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-2xl font-semibold text-white">
            Initializing...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center max-w-md px-4">
          <div className="text-2xl font-semibold text-red-400 mb-2">
            Error Loading Data
          </div>
          <div className="text-gray-300 mb-4">{error}</div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!selectedSpecies || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-2xl font-semibold text-white">
            {!selectedSpecies
              ? "Loading species..."
              : `Loading ${selectedSpecies.commonName}...`}
          </div>
        </div>
      </div>
    );
  }

  const timeWindowMs =
    selectedTimeWindow.days === -1
      ? timeRange[1] - timeRange[0]
      : selectedTimeWindow.days * 24 * 60 * 60 * 1000;

  const layers = [
    new ScatterplotLayer({
      id: "occurrences",
      data,
      getPosition: (d: any) => d.position,
      getFilterValue: (d: any) => d.timestamp,
      filterRange:
        selectedTimeWindow.days === -1
          ? [timeRange[0], currentTime]
          : [currentTime - timeWindowMs, currentTime],
      extensions: [new DataFilterExtension({ filterSize: 1 })],
      getFillColor: selectedSpecies.color,
      getRadius: 2500,
      radiusMinPixels: 1.5,
      radiusMaxPixels: 3,
      opacity: 0.7,
      pickable: false,
    }),
  ];

  const currentDate = new Date(currentTime).toLocaleDateString();
  const visibleCount = data.filter((d: any) => {
    return d.timestamp >= timeRange[0] && d.timestamp <= timeRange[1];
  }).length;

  const minYear = new Date(globalTimeRange[0]).getFullYear();
  const maxYear = new Date(globalTimeRange[1]).getFullYear();
  const yearRange = maxYear - minYear || 1;

  return (
    <div
      className="relative w-full bg-gray-900"
      style={{ height: "calc(100vh - 64px)" }}
    >
      <ErrorBoundary
        fallback={
          <div className="flex items-center justify-center h-full">
            <div className="text-white">Map loading...</div>
          </div>
        }
      >
        <DeckGL
          controller={true}
          initialViewState={INITIAL_VIEW}
          layers={layers}
          style={{ width: "100%", height: "100%" }}
          useDevicePixels={1}
        >
          <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json" />
        </DeckGL>
      </ErrorBoundary>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/90 px-8 py-4 rounded shadow-lg text-white flex flex-col gap-4">
        <div className="flex items-center gap-6">
          <button
            className="w-12 h-12 bg-blue-600 text-white rounded flex items-center justify-center text-lg font-semibold hover:bg-blue-700 transition-colors"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? "||" : "▶"}
          </button>

          <div className="min-w-[180px]">
            <div className="text-sm font-medium">{currentDate}</div>
            <div className="text-xs text-gray-400">
              {visibleCount.toLocaleString()} observations
            </div>
          </div>

          <button
            className="w-12 h-12 bg-gray-700 text-white rounded flex items-center justify-center hover:bg-gray-600 transition-colors"
            onClick={() => setCurrentTime(timeRange[0])}
          >
            ⟲
          </button>

          <div className="w-40 bg-gray-700 rounded h-2">
            <div
              className="bg-blue-600 h-full rounded transition-all"
              style={{
                width: `${((currentTime - timeRange[0]) / (timeRange[1] - timeRange[0])) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Year Range:
            </span>
            <div className="flex-1 min-w-[300px]">
              <div
                className="relative h-8 cursor-pointer select-none"
                onMouseMove={handleMouseMove}
              >
                <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-700 rounded" />

                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded"
                  style={{
                    left: `${((selectedYearRange[0] - minYear) / yearRange) * 100}%`,
                    width: `${((selectedYearRange[1] - selectedYearRange[0]) / yearRange) * 100}%`,
                  }}
                />

                <button
                  aria-label="Adjust start year"
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                  style={{
                    left: `${((selectedYearRange[0] - minYear) / yearRange) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  type="button"
                  onMouseDown={handleStartDrag}
                />

                <button
                  aria-label="Adjust end year"
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                  style={{
                    left: `${((selectedYearRange[1] - minYear) / yearRange) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  type="button"
                  onMouseDown={handleEndDrag}
                />

                <div className="absolute -bottom-5 left-0 text-xs text-gray-500">
                  {minYear}
                </div>
                <div className="absolute -bottom-5 right-0 text-xs text-gray-500">
                  {maxYear}
                </div>
              </div>
            </div>
            <div className="text-sm font-medium whitespace-nowrap min-w-[100px] text-right">
              {selectedYearRange[0]} - {selectedYearRange[1]}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 left-4 bg-black/90 rounded shadow-lg text-white max-w-md">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-base font-semibold">
                {selectedSpecies.commonName}
              </div>
              <div className="text-sm italic text-gray-400 mt-1">
                {selectedSpecies.scientificName}
              </div>
              <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
                {data.length.toLocaleString()} total records
              </div>
            </div>
            <button
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors whitespace-nowrap"
              onClick={() => setShowSpeciesMenu(!showSpeciesMenu)}
            >
              Change
            </button>
          </div>
        </div>

        {showSpeciesMenu && (
          <div className="border-t border-gray-700 max-h-96 overflow-y-auto">
            {species.map((sp) => (
              <button
                key={sp.fileName}
                className={`w-full px-6 py-3 text-left hover:bg-gray-800 transition-colors border-l-4 ${
                  sp.fileName === selectedSpecies.fileName
                    ? "bg-gray-800 border-blue-600"
                    : "border-transparent"
                }`}
                onClick={() => {
                  setSelectedSpecies(sp);
                  setShowSpeciesMenu(false);
                  setIsPlaying(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `rgb(${sp.color.join(",")})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {sp.commonName}
                    </div>
                    <div className="text-xs italic text-gray-400 truncate">
                      {sp.scientificName}
                    </div>
                    {sp.actualObs !== undefined && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {sp.actualObs.toLocaleString()} obs
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 bg-black/90 rounded shadow-lg text-white">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Window:</span>
            <button
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors flex items-center gap-2"
              onClick={() => setShowTimeWindowMenu(!showTimeWindowMenu)}
            >
              {selectedTimeWindow.label}
              <span className="text-xs">▼</span>
            </button>
          </div>
        </div>

        {showTimeWindowMenu && (
          <div className="border-t border-gray-700">
            {TIME_WINDOWS.map((window) => (
              <button
                key={window.label}
                className={`w-full px-6 py-2.5 text-left text-sm hover:bg-gray-800 transition-colors ${
                  window.label === selectedTimeWindow.label
                    ? "bg-gray-800 text-blue-400"
                    : ""
                }`}
                onClick={() => {
                  setSelectedTimeWindow(window);
                  setShowTimeWindowMenu(false);
                }}
              >
                {window.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}