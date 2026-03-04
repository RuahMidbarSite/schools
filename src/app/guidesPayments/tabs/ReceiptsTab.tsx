"use client";
import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { YearContext } from "@/context/YearContext";
import { getReports } from "@/db/reportsRequest";
import { AgGridReact } from "ag-grid-react";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

export default function ReceiptsTab() {
  const { selectedYear } = useContext(YearContext);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    const data = await getReports();
console.log("Status of first report:", data[0]?.status);
console.log("Status inside payment object:", data[0]?.payment?.status);    setReports(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  // סינון וקיבוץ נתונים שהם בסטטוס "התקבלה קבלה" בלבד
  const receiptsData = useMemo(() => {
    // סינון דיווחים: בודקים את הסטטוס גם בדיווח עצמו וגם באובייקט התשלום המקושר
    const withReceipt = reports.filter(r => {
      const status = r.status || r.payment?.status;
      return status === "RECEIPT_RECEIVED";
    });
    
    const map = new Map();
    withReceipt.forEach(r => {
      // נשתמש ב-paymentId כעוגן, ואם אין אז ב-id של הרשומה
      const id = r.paymentId || r.id;
      
      if (!map.has(id)) {
        map.set(id, { 
            ...r, 
            id: id, 
            // וידוא שליפת סכום ותאריך מהמקור הנכון
            totalAmount: r.payment?.totalAmount || r.dailyRate || 0,
            proofUrl: r.payment?.proofUrl || r.proofUrl || "",
            receiptDate: r.payment?.receiptDate || r.receiptDate
        });
      }
    });
    return Array.from(map.values());
  }, [reports]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-700">תשלומים שאושרו והועברו להנהח</h2>
        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
          סך הכל רשומות: {receiptsData.length}
        </span>
      </div>

      <div className="ag-theme-quartz" style={{ height: 500, width: "100%" }}>
        <AgGridReact
          rowData={isLoading ? undefined : receiptsData}
          enableRtl={true}
          columnDefs={[
            { field: "firstName", headerName: "שם פרטי", width: 120 },
            { field: "lastName", headerName: "משפחה", width: 120 },
            { 
              field: "totalAmount", 
              headerName: "סכום ששולם", 
              valueFormatter: p => `₪${p.value}`, 
              width: 130,
              cellClass: "font-bold text-green-700"
            },
            { 
              field: "receiptDate", 
              headerName: "תאריך קבלת קבלה", 
              valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('he-IL') : 'אין תאריך',
              flex: 1
            },
            { 
              headerName: "אסמכתא תשלום", 
              cellRenderer: (p: any) => p.data.proofUrl ? (
                <a 
                  href={p.data.proofUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium underline gap-1"
                >
                  📄 צפייה בקובץ
                </a>
              ) : <span className="text-slate-400 italic text-xs">לא הועלתה</span>,
              width: 150
            },
            {
                headerName: "סטטוס סופי",
                width: 140,
                cellRenderer: () => (
                  <div className="flex items-center h-full">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 text-[10px] font-extrabold uppercase tracking-wider">
                      Archived / הנהח
                    </span>
                  </div>
                )
            }
          ]}
          defaultColDef={{ 
            sortable: true, 
            filter: true, 
            resizable: true 
          }}
          overlayLoadingTemplate={'<span class="ag-overlay-loading-center">טוען נתונים מהנהלת חשבונות...</span>'}
        />
      </div>
    </div>
  );
}