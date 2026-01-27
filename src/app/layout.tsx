
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

import { ClerkProvider } from '@clerk/nextjs'
import NavBarClient from '@/components/navbar'
import { YearProvider } from '@/context/YearContext'
import QrCode from '@/components/whatsapp/QrcodeComponent'
import { ThemeContext, ThemeProvider } from '../context/Theme/Theme'
import { StatusProvider } from '@/context/StatusContext'
import { heIL } from '@clerk/localizations'




const inter = Inter({ subsets: ['latin'] })
export const metadata: Metadata = {
  title: 'Ruahmidbar App',
  description: 'This is the web application for ruahmidbar',


}
// Everything inside Signedout is only shown to people who are signed out, else shown what is inside signed in.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (

    <ClerkProvider localization={heIL}>

      <html lang="he">
        <body className={`${inter.className} flex flex-col h-screen`}>

          <ThemeProvider>
            <YearProvider>
              <StatusProvider>

                <NavBarClient />


                {children}

              </StatusProvider>
            </YearProvider>
          </ThemeProvider>

        </body>
      </html>

    </ClerkProvider>

  )
}


