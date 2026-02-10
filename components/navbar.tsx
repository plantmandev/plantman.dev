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

const HamburgerButton = ({ onClick }: { onClick: () => void }) => (
  <button
    aria-label="Open menu"
    className="hamburger-button"
    onClick={onClick}
  >
    <span />
    <span />
    <span />
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