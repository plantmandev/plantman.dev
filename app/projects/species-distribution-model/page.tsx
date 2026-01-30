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

// Color palette for species
const COLOR_PALETTE: [number, number, number][] = [
  [255, 140, 0],   // Orange
  [220, 20, 60],   // Crimson
  [255, 215, 0],   // Gold
  [240, 240, 240], // White
  [75, 0, 130],    // Indigo
  [255, 105, 180], // Pink
  [50, 205, 50],   // Lime
  [138, 43, 226],  // Blue Violet
  [0, 191, 255],   // Deep Sky Blue
  [255, 69, 0],    // Red Orange
  [147, 112, 219], // Medium Purple
  [34, 139, 34],   // Forest Green
]

type Species = {
  id: string
  name: string
  color: [number, number, number]
}

export default function SDMPage() {
  const [data, setData] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState([0, 1])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [species, setSpecies] = useState<Species[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)
  const [loading, setLoading] = useState(true)

  // List of species files (update this list as you add more species)
  const SPECIES_FILES = [
    'danaus-plexippus',
    'vanessa-atalanta', 
    'papilio-glaucus',
    'pieris-rapae',
    'limenitis-arthemis',
    'vanessa-cardui',
    'euptoieta-claudia',
    'eurytides-marcellus',
    'junonia-coenia',
    'papilio-polyxenes',
    'hypaurotis-crysalus',
    'battus-philenor',
  ]

  // Generate species list from filenames
  useEffect(() => {
    const discoveredSpecies: Species[] = SPECIES_FILES.map((id, idx) => {
      const name = id.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
      
      return {
        id,
        name,
        color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
      }
    })
    
    setSpecies(discoveredSpecies)
    if (discoveredSpecies.length > 0) {
      setSelectedSpecies(discoveredSpecies[0])
    }
  }, [])

  // Load data for selected species
  useEffect(() => {
    if (!selectedSpecies) return
    
    setLoading(true)
    fetch(`/species-distribution-model/occurrence-data/${selectedSpecies.id}.geojson`)
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
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading species data:', err)
        setLoading(false)
      })
  }, [selectedSpecies])

  // Animation loop
  useEffect(() => {
    if (!isPlaying || loading) return

    const interval = setInterval(() => {
      setCurrentTime(t => {
        const newTime = t + (7 * 24 * 60 * 60 * 1000) // 1 week per frame
        if (newTime > timeRange[1]) {
          return timeRange[0] // Loop back to start
        }
        return newTime
      })
    }, 1000 / 15) // 15 FPS

    return () => clearInterval(interval)
  }, [isPlaying, timeRange, loading])

  if (!selectedSpecies) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-2xl mb-2">Loading species...</div>
          <div className="text-sm text-gray-400">Discovering available datasets</div>
        </div>
      </div>
    )
  }

  const layer = new ScatterplotLayer({
    id: 'occurrences',
    data,
    getPosition: (d: any) => d.position,
    getFilterValue: (d: any) => d.timestamp,
    filterRange: [currentTime - TWO_WEEKS, currentTime],
    extensions: [new DataFilterExtension({ filterSize: 1 })],
    getFillColor: selectedSpecies.color,
    getRadius: 3000,
    radiusMinPixels: 2,
    radiusMaxPixels: 4,
    opacity: 0.8
  })

  const currentDate = new Date(currentTime).toLocaleDateString()
  const visibleCount = data.filter((d: any) => 
    d.timestamp <= currentTime && d.timestamp >= currentTime - TWO_WEEKS
  ).length

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 64px)' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW}
        controller={true}
        layers={[layer]}
        style={{ width: '100%', height: '100%' }}
      >
        <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json" />
      </DeckGL>

      {/* Species selector */}
      <div className="absolute top-4 left-4 bg-black/90 p-4 rounded-lg text-white max-w-xs max-h-[80vh] overflow-y-auto shadow-xl">
        <h3 className="font-bold mb-3 text-lg">Species ({species.length})</h3>
        <div className="grid grid-cols-1 gap-2">
          {species.map(sp => (
            <button
              key={sp.id}
              onClick={() => setSelectedSpecies(sp)}
              className={`px-3 py-2 rounded text-sm transition-colors text-left ${
                selectedSpecies.id === sp.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              style={{
                borderLeft: `4px solid rgb(${sp.color.join(',')})`,
              }}
            >
              {sp.name}
            </button>
          ))}
        </div>
      </div>

      {/* Compact timeline controls - embedded in map */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/90 px-6 py-3 rounded-full text-white shadow-xl flex items-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-10 h-10 flex items-center justify-center bg-orange-500 rounded-full hover:bg-orange-600 transition-colors font-bold text-lg"
          disabled={loading}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <div className="flex flex-col min-w-[200px]">
          <div className="text-sm font-bold">{currentDate}</div>
          <div className="text-xs text-gray-300">{visibleCount.toLocaleString()} observations</div>
        </div>
        
        <button
          onClick={() => setCurrentTime(timeRange[0])}
          className="w-10 h-10 flex items-center justify-center bg-gray-700 rounded-full hover:bg-gray-600 transition-colors text-lg"
          disabled={loading}
          title="Reset to start"
        >
          ↺
        </button>

        {/* Compact progress indicator */}
        <div className="w-32 bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-orange-500 h-full transition-all duration-100"
            style={{
              width: `${((currentTime - timeRange[0]) / (timeRange[1] - timeRange[0])) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Compact legend */}
      <div className="absolute top-4 right-4 bg-black/90 p-3 rounded-lg text-white text-sm shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: `rgb(${selectedSpecies.color.join(',')})` }}
          />
          <span className="font-bold">{selectedSpecies.name}</span>
        </div>
        <div className="text-xs text-gray-400">
          {data.length.toLocaleString()} total records
        </div>
      </div>
    </div>
  )
}