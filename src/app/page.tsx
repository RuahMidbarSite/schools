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

  // ברגע שקלרק סיים לטעון, בודקים לאן לנתב את המשתמש
  useEffect(() => {
    if (isLoaded && user) {
      const role = user.publicMetadata?.role;
      const isAdmin = checkIsAdmin(user);
      
      if (!isAdmin) {
        if (role === 'assistant') {
           // ניתוב לדף בתי הספר עבור העוזרת
           router.push('/Schools'); 
        } else {
           // ניתוב לדף המדריכים עבור משתמש רגיל (מדריך)
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