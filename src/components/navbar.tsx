'use client' // for now, react bootstrap does not support next js server-side .. need to wait for update
import 'bootstrap/dist/css/bootstrap.css'
import { Nav, Navbar, Row } from 'react-bootstrap'
import clsx from 'clsx' // this library is for conditional css
import styles from '@/app/ui/navbar.module.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ModeToggle } from '@/context/Theme/ChangeTheme'
import { SignedIn, UserButton } from '@clerk/nextjs'

/** In regards to the auth: What is inside <SignedIn> will be available only if the user is indeed signed in.
  the same goes to the <SignedOut>
  */

export default function NavBarClient() {

  const Url: string = usePathname()
  const homePage = "בית"
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

  // conditional css, only when we are at the page we want to highlight it
  const stylecheck = (key: string): string => clsx({ [styles.navbarSelectedOption]: (page === key), ['']: !(page === key) })
  const Mapping = Object.entries(names)
    .map(([key, value]) => <Link className="text-gray-400 no-underline margin ml-7 hover:text-gray-200" href={reg(key)} key={key}>   <div className={stylecheck(key)}> {value}</div>  </Link>)

  return (

    <Navbar bg="dark" variant="dark" sticky='top'>

      <Navbar.Collapse  >

        <Nav className="mx-auto d-flex justify-content-center align-items-center flex-row-reverse">

          {Mapping}

        </Nav>
      </Navbar.Collapse>
      <SignedIn>
        <UserButton />
      </SignedIn>
      <Navbar.Brand>{title}</Navbar.Brand>
      <ModeToggle />

    </Navbar>


  )




}


