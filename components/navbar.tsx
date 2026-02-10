"use client";

import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import Logo from "@/public/plantman Logo (B&W).svg";

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

// Custom hamburger button
const HamburgerButton = ({ 
  isOpen, 
  onClick 
}: { 
  isOpen: boolean; 
  onClick: () => void 
}) => (
  <button
    aria-label={isOpen ? "Close menu" : "Open menu"}
    className="hamburger-button"
    onClick={onClick}
  >
    <span className={isOpen ? "open" : ""} />
    <span className={isOpen ? "open" : ""} />
    <span className={isOpen ? "open" : ""} />
  </button>
);

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <HeroUINavbar
      className="bg-[var(--near-black)] border-b border-[var(--dark-gray)]"
      height="60px"
      isMenuOpen={isMenuOpen}
      maxWidth="full"
      onMenuOpenChange={setIsMenuOpen}
    >
      {/* Mobile: Logo on Left */}
      <NavbarContent className="sm:hidden" justify="start">
        <NavbarBrand>
          <Link aria-label="Home" className="flex items-center" href="/">
            <SiteLogo />
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop: Logo */}
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

      {/* Desktop: Nav Items - Center */}
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

      {/* Right side - Theme toggle (desktop) and Hamburger (mobile) */}
      <NavbarContent justify="end">
        {/* Theme toggle - desktop only */}
        <NavbarItem className="hidden sm:flex">
          <AppearanceSwitch />
        </NavbarItem>

        {/* Custom Hamburger menu - mobile only */}
        <div className="sm:hidden">
          <HamburgerButton 
            isOpen={isMenuOpen} 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
          />
        </div>
      </NavbarContent>

      {/* Mobile Menu Dropdown */}
      <NavbarMenu className="bg-[var(--near-black)] pt-8 gap-4">
        {navItems.map((item) => (
          <NavbarMenuItem key={item.href}>
            <Link
              className={`mobile-menu-item ${
                pathname === item.href ? "active" : ""
              }`}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </HeroUINavbar>
  );
}