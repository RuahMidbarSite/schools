"use client";
import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { YearContext } from "@/context/YearContext";
import { getReports, updatePaymentProofUrl, deleteInstructorPayment, markReceiptReceived } from "@/db/reportsRequest";
import { getAllGuides } from "@/db/generalrequests";
import { AgGridReact } from "ag-grid-react";
import useDrivePicker from "@/util/Google/GoogleDrive/Component";
import { CustomFilter } from "@/components/Tables/GeneralFiles/Filters/CustomFilter";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";


export default function PaidPaymentsTab() {
  const { selectedYear } = useContext(YearContext);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickFilterText, setQuickFilterText] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(""); // State חדש לחודש
  // ה-Hook של הדרייב מוגדר כאן
  const AuthenticateActivate = useDrivePicker("Guide");

  const [guidesData, setGuidesData] = useState<any[]>([]);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    const [data, guides] = await Promise.all([
      getReports(),
      getAllGuides()
    ]);
    setReports(data || []);
    setGuidesData(guides || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  // הגדרת ה-Renderer בתוך ה-components של הטבלה למניעת שגיאות hooks
  // הקוד החדש והמתוקן
 // הגדרת ה-Renderer בתוך ה-components של הטבלה למניעת שגיאות hooks
  // הקוד החדש והמתוקן
  const gridComponents = useMemo(() => ({
    CustomFilter: CustomFilter, // הוספת הרכיב כאן
    RemarksCellRenderer: (params: any) => {
      const text = params.value || '';
      if (!text) return null;
      return (
        <div title={text} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', cursor: 'default' }}>
          {text}
        </div>
      );
    },
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

  // קיבוץ הדיווחים לפי תשלום (PaymentId) עם סינון חודש פעיל
  const paidGroupedData = useMemo(() => {
    const paid = reports.filter(r => {
      const isPaid = r.paymentId && r.payment?.status === "PAID";
      if (!selectedMonth) return isPaid;
      
      const reportDate = new Date(r.date);
      const matchesMonth = (reportDate.getMonth() + 1).toString() === selectedMonth;
      return isPaid && matchesMonth;
    });

    const map = new Map();
    paid.forEach(r => {
      // חילוץ תאריך הדיווח וחיבור שלו להערה
      const formattedDate = r.date ? new Date(r.date).toLocaleDateString('he-IL') : '';
      const remarkWithDate = r.remarks ? `${formattedDate}: ${r.remarks}` : null;

      if (!map.has(r.paymentId)) {
        map.set(r.paymentId, { 
            ...r, 
            id: r.paymentId, 
            reportsCount: 1, 
            totalAmount: Number(r.dailyRate),
            proofUrl: r.proofUrl || r.payment?.proofUrl || "",
            allRemarks: remarkWithDate ? [remarkWithDate] : [] // מאתחל מערך להערות עם תאריך
        });
      } else {
        const item = map.get(r.paymentId);
        item.totalAmount += Number(r.dailyRate);
        item.reportsCount += 1;
        if (r.proofUrl) item.proofUrl = r.proofUrl;
        if (remarkWithDate) item.allRemarks.push(remarkWithDate); // מוסיף הערה משולבת תאריך
      }
    });
    return Array.from(map.values());
  }, [reports, selectedMonth]);
// חישוב המדריכים שטרם העבירו קבלה (ומשיכת מספרי הטלפון שלהם)
  const waitingForReceiptInstructors = useMemo(() => {
    const uniqueInstructorsMap = new Map();

    paidGroupedData.forEach(payment => {
      const key = `${payment.firstName} ${payment.lastName}`;
      // כדי שלא יופיעו פעמיים אם יש להם כמה תשלומים שונים
      if (!uniqueInstructorsMap.has(key)) {
        // מציאת המדריך מתוך רשימת כל המדריכים כדי לקבל את מספר הטלפון
        const guide = guidesData.find(g => 
          g.FirstName?.trim() === payment.firstName?.trim() && 
          g.LastName?.trim() === payment.lastName?.trim()
        );
        
        uniqueInstructorsMap.set(key, {
          id: payment.id,
          firstName: payment.firstName,
          lastName: payment.lastName,
          phone: guide?.CellPhone || ""
        });
      }
    });

    return Array.from(uniqueInstructorsMap.values());
  }, [paidGroupedData, guidesData]);
  return (
    <div className="animate-in fade-in">
  {/* שורת סינון ממורכזת: חיפוש (מימין) וחודש (משמאלו) */}
      <div className="mb-4 flex flex-col md:flex-row items-center justify-start gap-4 mx-auto" style={{ maxWidth: '1000px' }}>
        
        {/* 1. שדה החיפוש החופשי - ראשון מימין */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="חיפוש חופשי..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full p-2 pl-10 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right"
          />
          <span className="absolute left-3 top-2.5 opacity-30">🔍</span>
        </div>

        {/* 2. תפריט בחירת חודש - צמוד משמאל לשדה החיפוש */}
        <select 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="p-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-medium text-slate-700 cursor-pointer"
        >
          <option value="">כל החודשים</option>
          <option value="1">ינואר</option>
          <option value="2">פברואר</option>
          <option value="3">מרץ</option>
          <option value="4">אפריל</option>
          <option value="5">מאי</option>
          <option value="6">יוני</option>
          <option value="7">יולי</option>
          <option value="8">אוגוסט</option>
          <option value="9">ספטמבר</option>
          <option value="10">אוקטובר</option>
          <option value="11">נובמבר</option>
          <option value="12">דצמבר</option>
        </select>
      </div>
      {/* תצוגת מדריכים שטרם העבירו קבלה עם כפתורי ווצאפ */}
      {waitingForReceiptInstructors.length > 0 && (
        <div className="mx-auto mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm" style={{ maxWidth: '1000px' }}>
          <h4 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
            <span>⚠️</span> ממתינים לשליחת קבלה ({waitingForReceiptInstructors.length}):
          </h4>
          <div className="flex flex-wrap gap-2">
            {waitingForReceiptInstructors.map(inst => {
              const phone = inst.phone ? inst.phone.replace(/\D/g, '') : '';
              const waPhone = phone.startsWith('0') ? '972' + phone.substring(1) : phone;
              // פתיחה בדסקטופ והודעה מותאמת
              const message = encodeURIComponent(`היי ${inst.firstName}, התשלום עבורך בוצע! אשמח אם תוכלי לשלוח למערכת קבלה/חשבונית מס קבלה בהקדם. תודה!`);
              const waLink = `whatsapp://send?phone=${waPhone}&text=${message}`;

              return (
                <a 
                  key={inst.id} 
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-white hover:bg-[#dcf8c6] border border-orange-300 hover:border-green-500 text-orange-700 hover:text-green-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all"
                  title="בקש קבלה בווצאפ"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-green-500">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  {inst.firstName} {inst.lastName}
                </a>
              );
            })}
          </div>
        </div>
      )}
      <div 
        className="ag-theme-quartz mx-auto shadow-sm border border-slate-200 rounded-lg" 
        style={{ 
          height: 600, 
          width: "100%", 
          maxWidth: '1000px' // הגבלת רוחב כדי למנוע הימרחות במחשב
        }}
      >
        <AgGridReact
          rowData={isLoading ? undefined : paidGroupedData}
          quickFilterText={quickFilterText}
          enableRtl={true}
          components={gridComponents} // השורה הזו מקשרת הכל
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
          onGridSizeChanged={(params) => params.api.sizeColumnsToFit()}
          columnDefs={[
            { field: "firstName", headerName: "שם פרטי", flex: 1 },
            { field: "lastName", headerName: "משפחה", flex: 1 },
            { field: "totalAmount", headerName: "סכום כולל", valueFormatter: p => `₪${p.value}`, flex: 1 },
            { field: "reportsCount", headerName: "דיווחים", width: 90 },
            { 
              headerName: "הערות", 
              minWidth: 150,
              flex: 1,
              cellRenderer: "RemarksCellRenderer",
              valueGetter: (p: any) => {
                if (Array.isArray(p.data.allRemarks) && p.data.allRemarks.length > 0) {
                  return Array.from(new Set(p.data.allRemarks.filter(Boolean))).join(" | ");
                }
                return "";
              },
              tooltipValueGetter: (p: any) => p.value 
            },
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
          defaultColDef={{ 
            sortable: true, 
            filter: "CustomFilter", 
            resizable: true,
            suppressHeaderMenuButton: false 
          }}
        />
      </div>
    </div>
  );
}