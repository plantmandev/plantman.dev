"use client";

import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
} from "@heroui/navbar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/public/plantman Logo (B&W).svg";
import AppearanceSwitch from "./appearance-switch";

export const SiteLogo = () => {
  return (
    <Image src={Logo} alt="Plantman Logo" width={30} height={30} priority />
  );
};

const navItems = [
  { label: "About", href: "/about" },
  { label: "Projects", href: "/projects" },
  { label: "Certificates", href: "/certificates" },
] as const;

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <HeroUINavbar
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      maxWidth="full"
      className="bg-[var(--near-black)] border-b border-[var(--dark-gray)]"
      height="60px"
    >
      {/* Mobile: Hamburger + Logo */}
      <NavbarContent className="sm:hidden" justify="start">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="text-[var(--off-white)]"
        />
        <NavbarBrand className="ml-2">
          <Link href="/" aria-label="Home" className="flex items-center">
            <SiteLogo />
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop: Logo */}
      <NavbarContent className="hidden sm:flex" justify="start">
        <NavbarBrand>
          <Link
            href="/"
            aria-label="Home"
            className="flex items-center transition-opacity hover:opacity-70"
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
              href={item.href}
              className={`navbar-item ${
                pathname === item.href ? "active" : ""
              }`}
            >
              {item.label}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      {/* Theme Toggle - Right (both mobile and desktop) */}
      <NavbarContent justify="end">
        <NavbarItem>
          <AppearanceSwitch />
        </NavbarItem>
      </NavbarContent>

      {/* Mobile Menu Dropdown */}
      <NavbarMenu className="bg-[var(--near-black)] pt-8 gap-4">
        {navItems.map((item) => (
          <NavbarMenuItem key={item.href}>
            <Link
              href={item.href}
              className={`mobile-menu-item ${
                pathname === item.href ? "active" : ""
              }`}
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
