"use client"
import { DefaultDataStore } from "@/offlineStorage/defaultsStorage";
import React, { useEffect, createContext, useState, useMemo } from "react";
type themeOption = "dark-theme" | "light-theme"



//const getTheme = () => {

  //const theme: themeOption = localStorage.getItem("theme") as themeOption;
  //if (!theme) {
    // Default theme is taken as dark-theme
 //   localStorage.setItem("theme", "light-theme");
   // return "light-theme";
  //} else {
//    return theme;
//  }
//};


interface CustomTheme {
  theme: themeOption,
  setTheme?: React.Dispatch<React.SetStateAction<themeOption>>,
  toggleTheme?: any

}
const default_value: CustomTheme = { theme: "light-theme", setTheme: null, toggleTheme: null }
const ThemeContext = createContext(default_value);

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState<themeOption>("light-theme");

  function toggleTheme() {
    if (theme === "dark-theme") {
      setTheme("light-theme");
    } else {
      setTheme("dark-theme");

    }
  };
   useEffect(() => {
    DefaultDataStore.getItem('theme').then((res)=> {
     setTheme(res as themeOption ?? "light-theme")
 })

  }, [])

  useEffect(()=>{
   DefaultDataStore.setItem('theme',theme)

 },[theme])



  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export { ThemeContext, ThemeProvider };

