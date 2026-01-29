'use client'

import { useEffect, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer } from '@deck.gl/layers'
import { DataFilterExtension } from '@deck.gl/extensions'
import Map from 'react-map-gl/maplibre'

const INITIAL_VIEW = {
  longitude: -100,
  latitude: 40,
  zoom: 4,
  pitch: 0,
  bearing: 0
}

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000

export default function SDMPage() {
  const [data, setData] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState([0, 1])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    fetch('/species-distribution-model/occurrence-data/danaus-plexippus.geojson')
      .then(res => res.json())
      .then((geojson: any) => {
        const points = geojson.features.map((f: any) => ({
          position: f.geometry.coordinates,
          timestamp: new Date(f.properties.eventDate).getTime()
        }))
        
        const timestamps = points.map((p: any) => p.timestamp).filter((t: any) => !isNaN(t))
        const minTime = Math.min(...timestamps)
        const maxTime = Math.max(...timestamps)
        
        setData(points)
        setTimeRange([minTime, maxTime])
        setCurrentTime(minTime)
      })
  }, [])

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentTime(t => {
        const newTime = t + (7 * 24 * 60 * 60 * 1000)
        if (newTime > timeRange[1]) {
          return timeRange[0]
        }
        return newTime
      })
    }, 1000 / 15)

    return () => clearInterval(interval)
  }, [isPlaying, timeRange])

  const layer = new ScatterplotLayer({
    id: 'occurrences',
    data,
    getPosition: (d: any) => d.position,
    getFilterValue: (d: any) => d.timestamp,
    filterRange: [currentTime - TWO_WEEKS, currentTime],
    extensions: [new DataFilterExtension({ filterSize: 1 })],
    getFillColor: [255, 140, 0],
    getRadius: 3000,
    radiusMinPixels: 1,
    radiusMaxPixels: 3
  })

  const currentDate = new Date(currentTime).toLocaleDateString()
  const visibleCount = data.filter((d: any) => 
    d.timestamp <= currentTime && d.timestamp >= currentTime - TWO_WEEKS
  ).length

  return (
    <div className="relative">
      <DeckGL
        initialViewState={INITIAL_VIEW}
        controller={true}
        layers={[layer]}
        style={{ width: '100vw', height: '100vh' }}
      >
        <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" />
      </DeckGL>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 p-4 rounded text-white">
        <div className="text-center mb-2">
          <div className="text-xl font-bold">{currentDate}</div>
          <div className="text-sm">{visibleCount} observations</div>
        </div>
        
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-4 py-2 bg-orange-500 rounded hover:bg-orange-600"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  )
}