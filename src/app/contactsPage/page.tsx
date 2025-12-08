import ContactsTable from '@/components/Tables/ContactsTable/Contactstable'
import { Suspense } from 'react'


export default async function ContactsPage() {
  console.log("renders ContactsPage")

    

      return (
         <Suspense>
         <ContactsTable  />
        </Suspense>
      )
}