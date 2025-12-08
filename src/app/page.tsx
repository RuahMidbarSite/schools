"use client";
import { useContext, useEffect, useState } from "react";
import { ThemeContext } from "@/context/Theme/Theme";
export default function Home() {
  const { theme } = useContext(ThemeContext)
  return (

    <div className={theme === "dark-theme" ? "bg-[#1f2936] h-screen w-screen" : "bg-white h-screen w-screen"}>
      <h1 className={theme === "dark-theme" ? "text-white align-content-center text-center text-bold font-sans text-5xl" : "text-black align-content-center text-center text-bold font-sans text-5xl"}>  תוכנית רוח מדבר</h1>
     
    </div>


  )
}
