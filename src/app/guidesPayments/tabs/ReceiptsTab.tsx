"use client";
import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { YearContext } from "@/context/YearContext";
import { getReports, undoReceiptReceived } from "@/db/reportsRequest";
import { AgGridReact } from "ag-grid-react";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

export default function ReceiptsTab() {
  const { selectedYear } = useContext(YearContext);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickFilterText, setQuickFilterText] = useState("");
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    const data = await getReports();
console.log("Status of first report:", data[0]?.status);
console.log("Status inside payment object:", data[0]?.payment?.status);     setReports(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  // סינון וקיבוץ נתונים שהם בסטטוס "התקבלה קבלה" בלבד
  const receiptsData = useMemo(() => {
    // סינון דיווחים שהסטטוס שלהם (או של התשלום המקושר) הוא "התקבלה קבלה"
    const withReceipt = reports.filter(r => (r.status || r.payment?.status) === "RECEIPT_RECEIVED");
    
    const map = new Map();
    withReceipt.forEach(r => {
      if (r.paymentId && !map.has(r.paymentId)) {
        map.set(r.paymentId, { 
          ...r, 
          id: r.paymentId, 
          totalAmount: r.payment?.totalAmount || 0,
          // התיקון: שליפת הקישור לקובץ מתוך אובייקט התשלום
          proofUrl: r.payment?.proofUrl || r.proofUrl || "", 
          receiptDate: r.payment?.receiptDate || r.receiptDate
        });
      }
    });
    return Array.from(map.values());
  }, [reports]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-700">תשלומים שאושרו והועברו להנהח</h2>
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
            סך הכל רשומות: {receiptsData.length}
          </span>
        </div>

        {/* תיבת החיפוש החדשה */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="חיפוש חופשי בטבלה..."
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full p-2 pr-10 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right"
          />
          <span className="absolute left-3 top-2.5 opacity-30">🔍</span>
        </div>
      </div>

      <div className="ag-theme-quartz" style={{ height: 500, width: "100%" }}>
        <AgGridReact
          rowData={isLoading ? undefined : receiptsData}
          enableRtl={true}
          context={{
            handleUndoReceipt: async (paymentId: string) => {
              if (!window.confirm("האם להחזיר את הרשומה ללשונית 'שולם למדריכים'?")) return;
              try {
                await undoReceiptReceived(paymentId); 
                await loadReports(); 
                alert("הרשומה הוחזרה בהצלחה");
              } catch (error: any) {
                alert(`שגיאה: ${error.message}`);
              }
            }
          }}
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
                headerName: "פעולות",
                width: 160,
                cellRenderer: (p: any) => (
                  <div className="flex items-center h-full gap-2">
                    <button 
                      onClick={() => p.context.handleUndoReceipt(p.data.id)}
                      className="bg-orange-50 text-orange-700 px-3 py-1 rounded border border-orange-200 text-[11px] font-bold hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                    >
                      ↩️ בטל אישור
                    </button>
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