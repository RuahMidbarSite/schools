
import Script from "next/script"

import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
export default function PlanspageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>

      <section className="h-full overflow-hidden flex flex-col">
        {children}
      </section>
    </>
  )
}