'use client'

import { SunIcon, MoonIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'

export default function AppearanceSwitch() {
  const [isDark, setIsDark] = useState(true)

  return (
    <button 
      onClick={() => setIsDark(!isDark)}
    >
      {isDark ? (
        <SunIcon className="w-5 h-5 text-[#999999]" />
      ) : (
        <MoonIcon className="w-5 h-5 text-[#F2F2F2]" />
      )}
    </button>
  )
}