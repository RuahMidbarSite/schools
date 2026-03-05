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

  // ברגע שקלרק סיים לטעון, בודקים אם צריך לזרוק את המשתמש לדף הדיווח
  useEffect(() => {
    if (isLoaded && user) {
      const isAdmin = checkIsAdmin(user);
      if (!isAdmin) {
        // אם זה לא מנהל, מעבירים מיד לדף דיווחי מדריכים
        router.push('/guidesPayments');
      }
    }
  }, [isLoaded, user, router]);

  // מונע "הבהוב": כל עוד קלרק לא סיים לטעון, או שמדובר במדריך שעומד לעבור דף - אל תצייר כלום
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