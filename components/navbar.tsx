"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

import AppearanceSwitch from "./appearance-switch";

export const SiteLogo = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const src = mounted && resolvedTheme === "light"
    ? "/logos/plantman Logo (Light Mode).svg"
    : "/logos/plantman Logo (Dark Mode).svg";

  return (
    <Image alt="Plantman Logo" height={32} priority src={src} width={32} />
  );
};

const navItems = [
  { label: "Projects",     href: "/projects"     },
  { label: "Certificates", href: "/certificates" },
] as const;

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => { setIsMenuOpen(false); }, [pathname]);

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        <Link href="/" aria-label="Home" className="navbar-logo">
          <SiteLogo />
        </Link>

        <div className="navbar-links">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`navbar-item${isActive(item.href) ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
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
          {navItems.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-dropdown-item${i < navItems.length - 1 ? " bordered" : ""}${isActive(item.href) ? " active" : ""}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}