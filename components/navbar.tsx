"use client"

import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar"
import Image from "next/image"
import Logo from '@/public/plantman Logo (B&W).svg'

export const SiteLogo = () => {
  return <Image src={Logo} alt="Logo" width={30} height={30}/>
}

export function Navbar() {
  return(
    <HeroUINavbar>
      <NavbarBrand>
       <SiteLogo />
      </NavbarBrand>
    </HeroUINavbar>
  )
}
