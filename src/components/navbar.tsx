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

// ייבוא רכיב ה-WhatsApp
import QrCodeComponent from '@/components/whatsapp/QrcodeComponent'

export default function NavBarClient() {
  // הגדרת ה-Ref לתקשורת עם רכיב ה-WhatsApp
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
  const reg = (key: string) => { return "/" + key }

  const stylecheck = (key: string): string => clsx({ [styles.navbarSelectedOption]: (page === key), ['']: !(page === key) } )
  const Mapping = Object.entries(names)
    .map(([key, value]) => <Link className="text-gray-400 no-underline margin ml-7 hover:text-gray-200" href={reg(key)} key={key}>   <div className={stylecheck(key)}> {value}</div>  </Link>)

  return (
    <Navbar bg="dark" variant="dark" sticky='top' className="px-3">
      <Navbar.Collapse>
        <Nav className="mx-auto d-flex justify-content-center align-items-center flex-row-reverse">
          {Mapping}
        </Nav>
      </Navbar.Collapse>

      {/* --- אינדיקטור WhatsApp (המקום שסימנת בחץ) --- */}
      <div className="mx-3 d-flex align-items-center">
        <QrCodeComponent ref={qrCodeRef} />
      </div>
      {/* ------------------------------------------ */}

      <div className="d-flex align-items-center gap-2">
        <SignedIn>
          <UserButton />
        </SignedIn>
        <Navbar.Brand className="ms-2">{title}</Navbar.Brand>
        <ModeToggle />
      </div>
    </Navbar>
  )
}