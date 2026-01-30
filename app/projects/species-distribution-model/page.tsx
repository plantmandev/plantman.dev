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
]

type Species = {
  scientificName: string
  commonName: string
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

  const SPECIES_FILES = [
    { scientificName: 'danaus-plexippus', commonName: 'Monarch Butterfly' },
    { scientificName: 'vanessa-atalanta', commonName: 'Red Admiral' },
    { scientificName: 'papilio-glaucus', commonName: 'Eastern Tiger Swallowtail' },
    { scientificName: 'pieris-rapae', commonName: 'Cabbage White' },
    { scientificName: 'limenitis-arthemis', commonName: 'Red-spotted Purple' },
    { scientificName: 'vanessa-cardui', commonName: 'Painted Lady' },
    { scientificName: 'euptoieta-claudia', commonName: 'Variegated Fritillary' },
    { scientificName: 'eurytides-marcellus', commonName: 'Zebra Swallowtail' },
    { scientificName: 'junonia-coenia', commonName: 'Common Buckeye' },
    { scientificName: 'papilio-polyxenes', commonName: 'Black Swallowtail' },
    { scientificName: 'hypaurotis-crysalus', commonName: 'Colorado Hairstreak' },
    { scientificName: 'battus-philenor', commonName: 'Pipevine Swallowtail' },
  ]

  useEffect(() => {
    const discoveredSpecies: Species[] = SPECIES_FILES.map((species, idx) => {
      return {
        scientificName: species.scientificName,
        commonName: species.commonName,
        color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
      }
    })
    
    setSpecies(discoveredSpecies)
    if (discoveredSpecies.length > 0) {
      setSelectedSpecies(discoveredSpecies[0])
    }
  }, [])

  useEffect(() => {
    if (!selectedSpecies) return
    
    setLoading(true)
    fetch(`/species-distribution-model/occurrence-data/${selectedSpecies.scientificName}.geojson`)
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

  useEffect(() => {
    if (!isPlaying || loading) return

    const interval = setInterval(() => {
      setCurrentTime(t => {
        const newTime = t + (7 * 24 * 60 * 60 * 1000)
        if (newTime > timeRange[1]) {
          const currentIndex = species.findIndex(s => s.scientificName === selectedSpecies?.scientificName)
          const nextIndex = (currentIndex + 1) % species.length
          setSelectedSpecies(species[nextIndex])
          return timeRange[0]
        }
        return newTime
      })
    }, 1000 / 10)

    return () => clearInterval(interval)
  }, [isPlaying, timeRange, loading, species, selectedSpecies])

  if (!selectedSpecies) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-2xl font-semibold text-white">Loading species data...</div>
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
    getRadius: 2500,
    radiusMinPixels: 1.5,
    radiusMaxPixels: 3,
    opacity: 0.7
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

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/90 px-8 py-4 rounded shadow-lg text-white flex items-center gap-6">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-12 h-12 bg-blue-600 text-white rounded flex items-center justify-center text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          {isPlaying ? '||' : '▶'}
        </button>
        
        <div className="min-w-[180px]">
          <div className="text-sm font-medium">{currentDate}</div>
          <div className="text-xs text-gray-400">{visibleCount.toLocaleString()} observations</div>
        </div>
        
        <button
          onClick={() => setCurrentTime(timeRange[0])}
          className="w-12 h-12 bg-gray-700 text-white rounded flex items-center justify-center hover:bg-gray-600 transition-colors"
          title="Reset"
        >
          ⟲
        </button>

        <div className="w-40 bg-gray-700 rounded h-2">
          <div 
            className="bg-blue-600 h-full rounded transition-all"
            style={{
              width: `${((currentTime - timeRange[0]) / (timeRange[1] - timeRange[0])) * 100}%`
            }}
          />
        </div>
      </div>

      <div className="absolute top-4 left-4 bg-black/90 px-6 py-4 rounded shadow-lg text-white">
        <div className="text-base font-semibold">{selectedSpecies.commonName}</div>
        <div className="text-sm italic text-gray-400 mt-1">
          {selectedSpecies.scientificName.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')}
        </div>
        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
          {data.length.toLocaleString()} total records
        </div>
      </div>
    </div>
  )
}