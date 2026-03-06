"use client";

import React, { useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { SignedIn, UserButton, useUser } from '@clerk/nextjs';
import { Nav, Navbar } from 'react-bootstrap';
import clsx from 'clsx';
import 'bootstrap/dist/css/bootstrap.css';

// ייבוא קבצים פנימיים שלך
import styles from '@/app/ui/navbar.module.css';
import QrCodeComponent from '@/components/whatsapp/QrcodeComponent';
import { ModeToggle } from '@/context/Theme/ChangeTheme';
import { checkIsAdmin } from '@/lib/authUtils';

export default function NavBarClient() {
  const qrCodeRef = useRef(null);
  const Url = usePathname();
  
  // משיכת המשתמש מקלרק ובדיקה אם הוא מנהל
  const { user, isLoaded } = useUser();
  const isAdmin = checkIsAdmin(user);
  
// דפי המנהל
  const adminPages = {
    schoolsPage: "בתי ספר",
    messagesForm: "שליחת הודעות",
    plansPage: "תוכניות",
    placementsPage: "שיבוץ מדריכים",
    GuidesPage: "ניהול מדריכים",
    guidesPayments: "תשלומי מדריכים", // <--- זו השורה החדשה שהוספנו!
    paymentsPage: "הכנסות",
    contactsPage: "אנשי קשר",
    settingsPage: "הגדרות",
  };

  // הדף שפתוח לכולם
  const publicPages = {
   //instructorReporting: "דיווח מדריכים",
  };

  // הרכבת התפריט הסופי
  const names = isAdmin ? { ...adminPages, ...publicPages } : publicPages;
  
  const title = "רוח מדבר בחינוך";
  const page = Url ? Url.substring(1) : "";
  const reg = (key: string) => "/" + key;
  const stylecheck = (key: string): string => clsx({ [styles.navbarSelectedOption]: (page === key), ['']: !(page === key) });
  
  const Mapping = Object.entries(names)
    .map(([key, value]) => (
      <Link 
        className="text-white/90 no-underline mx-1 hover:text-white transition-all duration-300 relative group" 
        href={reg(key)} 
        key={key}
      >
        <div className={clsx(
          stylecheck(key),
          "whitespace-nowrap px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-300 text-base",
          page === key && "bg-white/20 font-semibold"
        )}>
          {value}
        </div>
      </Link>
    ));

  return (
    <Navbar 
      variant="dark" 
      sticky="top" 
      className="px-4 shadow-2xl border-b border-white/10 backdrop-blur-sm"
      style={{ 
        background: 'linear-gradient(135deg, #334155 0%, #475569 100%)',
        minHeight: '70px'
      }}
    >
    <Navbar.Collapse>
        <Nav className="mx-auto d-flex justify-content-center align-items-center flex-row-reverse gap-1">
          {/* מציג את התפריט רק אחרי שקלרק סיים לבדוק מי המשתמש */}
          {isLoaded ? Mapping : null}
        </Nav>
      </Navbar.Collapse>

      {/* WhatsApp Indicator - מוצג רק למנהלים */}
      {isAdmin && (
        <div className="mx-3 d-flex align-items-center">
          <QrCodeComponent ref={qrCodeRef} />
        </div>
      )}

      <div className="d-flex align-items-center gap-3">
        <SignedIn>
  <div className="d-flex align-items-center gap-3">
    {/* הצגת שם המשתמש משמאל לעיגול הפרופיל */}
    {user && (
      <span className="text-white/90 text-sm font-medium hidden md:block border-l border-white/20 pl-3">
        {user.firstName} {user.lastName}
      </span>
    )}
    <div className="hover:scale-110 transition-transform duration-300">
      <UserButton />
    </div>
  </div>
</SignedIn>
        <Navbar.Brand className="ms-2 text-white font-bold text-lg tracking-wide">
          {title}
        </Navbar.Brand>
        <ModeToggle />
      </div>
    </Navbar>
  );
}