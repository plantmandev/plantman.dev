"use client";

import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import Logo from "@/public/logos/plantman Logo (Dark Mode).svg";

import AppearanceSwitch from "./appearance-switch";

export const SiteLogo = () => {
  return (
    <Image alt="Plantman Logo" height={30} priority src={Logo} width={30} />
  );
};

const navItems = [
  { label: "About", href: "/about" },
  { label: "Projects", href: "/projects" },
  { label: "Certificates", href: "/certificates" },
] as const;

const HamburgerButton = ({ onClick }: { onClick: () => void }) => (
  <button
    aria-label="Open menu"
    className="hamburger-button"
    onClick={onClick}
  >
    <svg
      width="28"
      height="20"
      viewBox="0 0 28 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        x1="0"
        y1="1"
        x2="28"
        y2="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="0"
        y1="10"
        x2="28"
        y2="10"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="0"
        y1="19"
        x2="28"
        y2="19"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  </button>
);

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <HeroUINavbar
      className="bg-[var(--near-black)] border-b border-[var(--dark-gray)]"
      height="60px"
      maxWidth="full"
    >
      <NavbarContent className="sm:hidden" justify="start">
        <NavbarBrand>
          <Link aria-label="Home" className="flex items-center" href="/">
            <SiteLogo />
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex" justify="start">
        <NavbarBrand>
          <Link
            aria-label="Home"
            className="flex items-center transition-opacity hover:opacity-70"
            href="/"
          >
            <SiteLogo />
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-12" justify="center">
        {navItems.map((item) => (
          <NavbarItem key={item.href}>
            <Link
              className={`navbar-item ${
                pathname === item.href ? "active" : ""
              }`}
              href={item.href}
            >
              {item.label}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem className="hidden sm:flex">
          <AppearanceSwitch />
        </NavbarItem>

        <NavbarItem className="sm:hidden">
          <div className="mobile-menu-container">
            <HamburgerButton onClick={() => setIsMenuOpen(!isMenuOpen)} />

            {isMenuOpen && (
              <div className="mobile-dropdown">
                {navItems.map((item, index) => (
                  <Link
                    key={item.href}
                    className={`mobile-dropdown-item ${
                      index !== navItems.length - 1 ? "bordered" : ""
                    }`}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </NavbarItem>
      </NavbarContent>
    </HeroUINavbar>
  );
}