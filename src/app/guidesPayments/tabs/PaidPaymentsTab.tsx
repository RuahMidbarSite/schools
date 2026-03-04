"use client";
import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { YearContext } from "@/context/YearContext";
import { getReports, updatePaymentProofUrl, deleteInstructorPayment, markReceiptReceived } from "@/db/reportsRequest";
import { AgGridReact } from "ag-grid-react";
import useDrivePicker from "@/util/Google/GoogleDrive/Component";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

export default function PaidPaymentsTab() {
  const { selectedYear } = useContext(YearContext);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ה-Hook של הדרייב מוגדר כאן
  const AuthenticateActivate = useDrivePicker("Guide");

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    const data = await getReports();
    setReports(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  // הגדרת ה-Renderer בתוך ה-components של הטבלה למניעת שגיאות hooks
  // הקוד החדש והמתוקן
  const gridComponents = useMemo(() => ({
    ProofFileRenderer: (params: any) => {
      const { proofUrl, firstName, lastName, id } = params.data;

      const handleUpload = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // בדיקה אם השנה עוברת מה-Context (ניתן לראות ב-F12 Console)
        console.log("DEBUG: selectedYear is:", selectedYear);

        if (!selectedYear || selectedYear === "undefined") {
          alert("שגיאה: שנת הלימודים לא זוהתה. אנא וודא שהשנה נבחרה בסרגל העליון.");
          return;
        }

        if (typeof AuthenticateActivate !== 'function') {
          alert("מערכת גוגל דרייב עדיין בטעינה, אנא נסה שוב בעוד רגע");
          return;
        }

        try {
          const folderName = `${firstName} ${lastName}`;
          const openPicker = AuthenticateActivate("open");

          openPicker({
            showUploadView: true,
            setSelectFolderEnabled: true,
            folderStructure: {
              // שימוש ב-String מפורש מבטיח שלא תיווצר תיקיית New Folder
              parents_folders_by_left_to_right_order: ["תשלומים למדריכים", String(selectedYear), folderName]
            },
            callbackFunction: async (res: any) => {
              if (res.action === "picked" && res.docs && res.docs[0]) {
                const url = res.docs[0].url;
                console.log("DEBUG: URL received from Google:", url);
                await params.context.handleUpdateProofUrl(id, url);
              }
            }
          });
        } catch (err) {
          console.error("Error opening Drive Picker:", err);
          alert("שגיאה בפתיחת גוגל דרייב");
        }
      };

      if (proofUrl) {
        return (
          <div className="flex items-center justify-center h-full">
            <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium underline">
              צפייה 🔗
            </a>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-center h-full">
          <button 
            onClick={handleUpload}
            className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-200 hover:bg-blue-100 font-bold shadow-sm transition-all"
          >
            העלאה ⬆️
          </button>
        </div>
      );
    }
  }), [AuthenticateActivate, selectedYear]);

  // קיבוץ הדיווחים לפי תשלום (PaymentId)
  const paidGroupedData = useMemo(() => {
    const paid = reports.filter(r => r.paymentId);
    const map = new Map();
    paid.forEach(r => {
      if (!map.has(r.paymentId)) {
        map.set(r.paymentId, { 
            ...r, 
            id: r.paymentId, 
            reportsCount: 1, 
            totalAmount: Number(r.dailyRate),
            proofUrl: r.proofUrl || r.payment?.proofUrl || ""
        });
      } else {
        const item = map.get(r.paymentId);
        item.totalAmount += Number(r.dailyRate);
        item.reportsCount += 1;
        if (r.proofUrl) item.proofUrl = r.proofUrl;
      }
    });
    return Array.from(map.values());
  }, [reports]);

  return (
    <div className="animate-in fade-in">
      <div className="ag-theme-quartz" style={{ height: 600, width: "100%" }}>
        <AgGridReact
          rowData={isLoading ? undefined : paidGroupedData}
          enableRtl={true}
          components={gridComponents}
  context={{
            handleUpdateProofUrl: async (paymentId: string, url: string) => {
              try {
                await updatePaymentProofUrl(paymentId, url);
                await loadReports();
                alert("האסמכתא נשמרה בהצלחה במערכת");
              } catch (error: any) {
                console.error("Database update error:", error);
                alert(`שגיאה בעדכון מסד הנתונים: ${error.message}`);
              }
            },
            handleDeletePayment: async (paymentId: string) => {
              if (!window.confirm("האם אתה בטוח שברצונך לבטל את התשלום? הדיווחים יחזרו לסטטוס 'ממתין לתשלום' והאסמכתא תימחק.")) return;
              try {
                await deleteInstructorPayment(paymentId);
                await loadReports();
                alert("התשלום בוטל והדיווחים הוחזרו בהצלחה");
              } catch (error: any) {
                console.error("Delete payment error:", error);
                alert(`שגיאה בביטול התשלום: ${error.message}`);
              }
            },
            // הפונקציה החדשה להעברה ללשונית השלישית
           // הפונקציה המעודכנת עם הזנת תאריך קבלה
            handleMarkAsReceived: async (paymentId: string, selectedDate: string) => {
  // הודעת אישור פשוטה המציגה את התאריך שנבחר בטבלה
  if (!window.confirm(`האם לאשר קבלת קבלה עבור תאריך ${new Date(selectedDate).toLocaleDateString('he-IL')}?`)) return;

  try {
    console.log("Client: Updating status with date from table:", selectedDate);
    
    // שליחת הנתונים לשרת (חייב לקבל את ה-Date מהטבלה)
    const result = await markReceiptReceived(paymentId, selectedDate);
    
    if (result && result.status === "RECEIPT_RECEIVED") {
      alert("הקבלה אושרה בהצלחה והרשומה עברה ללשונית קבלות והנהח");
      await loadReports();
    } else {
      alert("הפעולה הושלמה אך הסטטוס לא השתנה כצפוי.");
    }
  } catch (error: any) {
    console.error("Client: Action failed:", error);
    alert(`שגיאה בעדכון: ${error.message}`);
  }
},
          }}
          onGridReady={(params) => params.api.sizeColumnsToFit()}
          columnDefs={[
            { field: "firstName", headerName: "שם פרטי", flex: 1 },
            { field: "lastName", headerName: "משפחה", flex: 1 },
            { field: "totalAmount", headerName: "סכום כולל", valueFormatter: p => `₪${p.value}`, flex: 1 },
            { field: "reportsCount", headerName: "דיווחים", width: 100 },
            { 
              headerName: "אסמכתא", 
              cellRenderer: "ProofFileRenderer", 
              minWidth: 150 
            },
           {
                headerName: "פעולה",
                width: 260,
                cellRenderer: (p: any) => {
                  const dateInputId = `date-input-${p.data.id}`;
                  const today = new Date().toISOString().split('T')[0];

                  return (
                    <div className="flex gap-2 items-center h-full">
                      <input 
                        type="date" 
                        id={dateInputId}
                        defaultValue={today}
                        className="border border-slate-300 rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none w-32"
                      />
                      <button 
                        onClick={() => {
                          const dateVal = (document.getElementById(dateInputId) as HTMLInputElement).value;
                          p.context.handleMarkAsReceived(p.data.id, dateVal);
                        }}
                        className="bg-green-600 text-white px-2 py-1 rounded shadow-sm hover:bg-green-700 transition-all text-xs font-bold whitespace-nowrap"
                      >
                        אשר קבלה
                      </button>
                      <button 
                        onClick={() => p.context.handleDeletePayment(p.data.id)}
                        className="bg-red-50 text-red-600 px-1 py-1 rounded border border-red-200 text-xs hover:bg-red-100"
                        title="ביטול"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                }
            }
          ]}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
        />
      </div>
    </div>
  );
}