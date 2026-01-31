"use client"

import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar"
import Image from "next/image"
import Logo from '@/public/plantman Logo (B&W).svg'
import AppearanceSwitch from "./appearance-switch"

export const SiteLogo = () => {
  return <Image src={Logo} alt="Logo" width={30} height={30}/>
}

export function Navbar() {
  return(
    <HeroUINavbar>
      <NavbarBrand>
       <SiteLogo />
      </NavbarBrand>

      <div><a href="/about" className="navbar-item">About</a></div>
      <div><a href="/projects" className="navbar-item">Projects</a></div>
      <div><a href="/certificates" className="navbar-item">Certificates</a></div>

      <AppearanceSwitch/>
  
    </HeroUINavbar>
  )
}
