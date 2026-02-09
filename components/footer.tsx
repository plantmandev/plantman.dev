'use client'

import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const startYear = 2024
  const yearDisplay = currentYear > startYear ? `${startYear}-${currentYear}` : startYear

  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-text">
          Copyright {yearDisplay},{" "}
          <Link href="/" className="footer-link">
            plantman.dev
          </Link>
          . All rights reserved.
        </p>
      </div>
    </footer>
  )
}