'use client'

import { SunIcon } from '@heroicons/react/24/outline'
import { SunIcon as SunIconSolid } from '@heroicons/react/24/solid'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function AppearanceSwitch() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="w-5 h-5" aria-label="Toggle theme">
        <SunIcon className="w-5 h-5 text-[var(--light-gray)]" />
      </button>
    )
  }

  return (
    <button 
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="transition-all hover:opacity-70"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <SunIcon className="w-5 h-5 text-[var(--light-gray)] transition-all" />
      ) : (
        <SunIconSolid className="w-5 h-5 text-[var(--near-black)] transition-all" />
      )}
    </button>
  )
}