
import PaymentsTable from "@/components/Tables/PaymentsTable/PaymentsTable"
import { Suspense } from "react"

export default function PaymentsPage() {
   console.log("Payments Page")
  
return (
   <Suspense>
   <PaymentsTable/>
  </Suspense>

)

}


