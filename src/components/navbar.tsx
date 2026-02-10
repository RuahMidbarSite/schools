'use client'
import 'bootstrap/dist/css/bootstrap.css'
import { Nav, Navbar } from 'react-bootstrap'
import clsx from 'clsx'
import styles from '@/app/ui/navbar.module.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ModeToggle } from '@/context/Theme/ChangeTheme'
import { SignedIn, UserButton } from '@clerk/nextjs'
import { useRef } from 'react'
import QrCodeComponent from '@/components/whatsapp/QrcodeComponent'

export default function NavBarClient() {
  const qrCodeRef = useRef(null);
  const Url: string = usePathname()
  
  const names = {
    schoolsPage: "בתי ספר",
    messagesForm: "שליחת הודעות",
    plansPage: "תוכניות",
    placementsPage: "שיבוץ מדריכים",
    GuidesPage: "ניהול מדריכים",
    paymentsPage: "הכנסות",
    contactsPage: "אנשי קשר",
    settingsPage: "הגדרות",
  }
  
  const title = "רוח מדבר בחינוך"
  const page = Url.substring(1)
  const reg = (key: string) => "/" + key
  const stylecheck = (key: string): string => clsx({ [styles.navbarSelectedOption]: (page === key), ['']: !(page === key) })
  
  const Mapping = Object.entries(names)
    .map(([key, value]) => (
      <Link 
        className="text-white/90 no-underline mx-2 hover:text-white transition-all duration-300 relative group" 
        href={reg(key)} 
        key={key}
      >
        <div className={clsx(
          stylecheck(key),
          "px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-300",
          page === key && "bg-white/20 font-semibold"
        )}>
          {value}
          {page === key && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-white rounded-full" />
          )}
        </div>
      </Link>
    ))

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
          {Mapping}
        </Nav>
      </Navbar.Collapse>

      {/* WhatsApp Indicator */}
      <div className="mx-3 d-flex align-items-center">
        <QrCodeComponent ref={qrCodeRef} />
      </div>

      <div className="d-flex align-items-center gap-3">
        <SignedIn>
          <div className="hover:scale-110 transition-transform duration-300">
            <UserButton />
          </div>
        </SignedIn>
        <Navbar.Brand className="ms-2 text-white font-bold text-lg tracking-wide">
          {title}
        </Navbar.Brand>
        <ModeToggle />
      </div>
    </Navbar>
  )
}