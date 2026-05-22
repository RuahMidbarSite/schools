"use client";
import { useContext, useEffect } from "react";
import { ThemeContext } from "@/context/Theme/Theme";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { checkIsAdmin } from "@/lib/authUtils";

export default function Home() {
  const { theme } = useContext(ThemeContext);
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // ברגע שקלרק סיים לטעון, בודקים לאן לנתב את המשתמש ומדפיסים ללוג לצורך ניתוח ה-404
  useEffect(() => {
    if (isLoaded && user) {
      const role = user.publicMetadata?.role;
      const isAdmin = checkIsAdmin(user);
      
      console.log("=== אבחון ניתוב מערכת ===");
      console.log("האם מנהל (isAdmin):", isAdmin);
      console.log("תפקיד המשתמש מקלרק (role):", role);
      
      if (!isAdmin) {
        if (role === 'assistant') {
          console.log("מנסה לנתב עוזרת לנתיב: /schoolsPage");
          router.push('/schoolsPage'); 
        } else {
          console.log("מנסה לנתב משתמש רגיל לנתיב: /guidesPayments");
          router.push('/guidesPayments');
        }
      }
    }
  }, [isLoaded, user, router]); 

  // מונע "הבהוב": כל עוד קלרק לא סיים לטעון, או שמדובר במשתמש שעומד לעבור דף - אל תצייר כלום
  if (!isLoaded || (user && !checkIsAdmin(user))) {
    return <div className={theme === "dark-theme" ? "bg-[#1f2936] h-screen w-screen" : "bg-white h-screen w-screen"} />;
  }

  // מכאן והלאה - רק מנהל יראה את התוכן של דף הבית
  return (
    <div className={theme === "dark-theme" ? "bg-[#1f2936] h-screen w-screen" : "bg-white h-screen w-screen"}>
      <h1 className={theme === "dark-theme" ? "text-white align-content-center text-center text-bold font-sans text-5xl pt-20" : "text-black align-content-center text-center text-bold font-sans text-5xl pt-20"}>
        תוכנית רוח מדבר
      </h1>
    </div>
  );
}