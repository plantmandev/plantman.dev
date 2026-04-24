"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

import AppearanceSwitch from "./appearance-switch";

export const SiteLogo = () => (
  <>
    <Image
      alt="Plantman Logo"
      className="logo-dark"
      height={32}
      priority
      src="/logos/plantman Logo (Dark Mode).svg"
      width={32}
    />
    <Image
      alt=""
      aria-hidden
      className="logo-light"
      height={32}
      priority
      src="/logos/plantman Logo (Light Mode).svg"
      width={32}
    />
  </>
);

const navItems = [
  { label: "Projects",     href: "/projects"     },
  { label: "Certificates", href: "/certificates" },
] as const;

const projectLinks = [
  { label: "Species Distribution Model", href: "/projects/species-distribution-model" },
  { label: "Hobet Mine Analysis",        href: "/projects/hobet-mine-analysis"        },
];

export function Navbar() {
  const [isMenuOpen,    setIsMenuOpen]    = useState(false);
  const [projectsOpen,  setProjectsOpen]  = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => { setIsMenuOpen(false); setProjectsOpen(false); }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProjectsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        <Link href="/" aria-label="Home" className="navbar-logo">
          <SiteLogo />
        </Link>

        <div className="navbar-links">
          {navItems.map((item) =>
            item.label === "Projects" ? (
              <div key={item.href} className="navbar-dropdown-wrapper" ref={dropdownRef}>
                <Link
                  href={item.href}
                  className={`navbar-item${isActive(item.href) ? " active" : ""}`}
                >
                  {item.label}
                </Link>
                <button
                  className="navbar-dropdown-chevron"
                  onClick={() => setProjectsOpen(o => !o)}
                  aria-label="Show project list"
                  aria-expanded={projectsOpen}
                >
                  {projectsOpen ? "▴" : "▾"}
                </button>
                {projectsOpen && (
                  <div className="navbar-dropdown-menu">
                    {projectLinks.map(p => (
                      <Link
                        key={p.href}
                        href={p.href}
                        className="navbar-dropdown-item"
                        onClick={() => setProjectsOpen(false)}
                      >
                        {p.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`navbar-item${isActive(item.href) ? " active" : ""}`}
              >
                {item.label}
              </Link>
            )
          )}
        </div>

        <div className="navbar-right">
          <div className="navbar-theme">
            <AppearanceSwitch />
          </div>

          <button
            className="hamburger-button"
            aria-label="Toggle menu"
            onClick={() => setIsMenuOpen((o) => !o)}
          >
            <FontAwesomeIcon icon={faBars} style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="mobile-dropdown">
          <Link
            href="/projects"
            className={`mobile-dropdown-item bordered${isActive("/projects") ? " active" : ""}`}
            onClick={() => setIsMenuOpen(false)}
          >
            Projects
          </Link>
          {projectLinks.map(p => (
            <Link
              key={p.href}
              href={p.href}
              className={`mobile-dropdown-item mobile-dropdown-subitem bordered${isActive(p.href) ? " active" : ""}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {p.label}
            </Link>
          ))}
          <Link
            href="/certificates"
            className={`mobile-dropdown-item${isActive("/certificates") ? " active" : ""}`}
            onClick={() => setIsMenuOpen(false)}
          >
            Certificates
          </Link>
        </div>
      )}
    </nav>
  );
}