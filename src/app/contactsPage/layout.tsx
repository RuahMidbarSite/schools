
import Script from "next/script"

import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
       {/* You can't use 'beforeInteractive' on non root layout. */}
      <Script src="https://apis.google.com/js/api.js" strategy='afterInteractive' />
      <Script src="https://accounts.google.com/gsi/client" strategy='afterInteractive' />
      <section className="h-full overflow-hidden flex flex-col">
        {children}
      </section>
    </>
  )
}