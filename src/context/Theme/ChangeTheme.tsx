"use client"
 
import {useCallback, useContext} from "react"

 
import { FiMoon, FiSun } from "react-icons/fi";
import { BsMoonFill } from "react-icons/bs";
import { ThemeContext } from "./Theme";
import { FaSun } from "react-icons/fa6";

export function ModeToggle() {
  const { theme,setTheme } = useContext(ThemeContext)

  const getButtonAction = useCallback(() => {
       if(theme === "dark-theme") {
          setTheme("light-theme")
      }  else {

         setTheme("dark-theme")
        }    
 
   },[setTheme, theme])
  
  const getButton = useCallback(()=>{
         if(theme === "dark-theme") {
          return  <FaSun className=" fill-[#ffffff] w-[37px] h-[37px]"/> 
      }  else {

          return <FiMoon className=" fill-[#ffffff] w-[37px] h-[37px]"/>
        }    
 

    },[theme])


  return (
    <button className="" onClick={getButtonAction}> {getButton()}  </button>
    
  )
}

