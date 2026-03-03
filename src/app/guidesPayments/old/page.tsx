"use client";
import CustomFilter from "@/components/Tables/GeneralFiles/Filters/CustomFilter";
import { useState, useEffect, useContext, useRef, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { YearContext } from "@/context/YearContext";
import { saveInstructorReport, getReports, deleteReport, updateInstructorReport } from "@/db/reportsRequest";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { checkIsAdmin } from "@/lib/authUtils";
import { createInstructorPayment } from "@/actions/paymentActions";
import useDrivePicker from "@/util/Google/GoogleDrive/Component";
const ProofFileRenderer = (params: any) => {
  const { proofUrl, firstName, lastName, id } = params.data;
  const { selectedYear, AuthenticateActivate, handleUpdateProofUrl, loadReports } = params.context;

  const handleUpload = async () => {
    try {
      const folderPath = `תשלומים למדריכים/${selectedYear}/${firstName} ${lastName}`;
      
      const pickerResult = await AuthenticateActivate.onApiLoad(folderPath); 
      
      if (pickerResult) {
        await handleUpdateProofUrl(id, pickerResult);
        await loadReports();
      }
    } catch (e) {
      console.error("שגיאה בהעלאת קובץ", e);
    }
  };

  if (proofUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1">
          צפייה 🔗
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <button 
        onClick={handleUpload}
        className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-200 hover:bg-blue-100 transition-all flex items-center gap-1 shadow-sm font-bold"
      >
        העלאה ⬆️
      </button>
    </div>
  );
};
// רכיב קבוע שלא ירצד בחיים, מוגדר מחוץ לקומפוננטה הראשית
const ActionButtonsRenderer = (params: any) => {
  if (!params.data || !params.data.id) return null;
  return (
    <div className="flex gap-3 justify-center items-center h-full">
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()} // מונע מהטבלה לגנוב את הפוקוס
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // הפעלת הפונקציה דרך הצינור של הטבלה
          params.context.handleEdit(params.data);
        }}
        className="hover:scale-125 transition-transform cursor-pointer"
        title="עריכה"
      >
        ✏️
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          params.context.handleDelete(params.data.id);
        }}
        className="hover:scale-125 transition-transform cursor-pointer text-red-500"
        title="מחיקה"
      >
        🗑️
      </button>
    </div>
  );
};
export default function GuidesPaymentsDashboard() {
  const AuthenticateActivate = useDrivePicker("Guide"); // אתחול חיבור לגוגל דרייב
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid" | "accounting">("unpaid");

  const { user } = useUser();
  const gridRef = useRef<AgGridReact>(null);
  const instructorTotalsRef = useRef<Record<string, number>>({});
  const [pinnedTotals, setPinnedTotals] = useState<any[]>([]);
  const { selectedYear } = useContext(YearContext);
  const [reports, setReports] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const assignedSchools = (user?.publicMetadata?.assignedSchools as {name: string, city: string}[]) || [];
  const [selectedSchool, setSelectedSchool] = useState<{name: string, city: string} | null>(null);
  const isAdmin = checkIsAdmin(user);

const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const todayDateString = new Date().toISOString().split('T')[0];

  // 1. פונקציית סינון חופשי ללשונית הדיווחים
  const onFilterTextBoxChanged = useCallback(() => {
    gridRef.current?.api.setGridOption(
      "quickFilterText",
      (document.getElementById("filter-text-box") as HTMLInputElement).value
    );
  }, []);

  // 2. פונקציית סינון חופשי ללשונית התשלומים (הלשונית השנייה)
  const onPaymentFilterChanged = useCallback(() => {
    gridRef.current?.api.setGridOption(
      "quickFilterText",
      (document.getElementById("payment-filter-box") as HTMLInputElement).value
    );
  }, []);

  // 3. מערך עזר לתרגום חודשים - הגדרה אחת בלבד כאן
  const hebrewMonths = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
  ];
  const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const schoolName = e.target.value;
    const school = assignedSchools.find(s => s.name === schoolName);
    setSelectedSchool(school || null);
  };

  const calculateTotals = () => {
    if (!gridRef.current?.api) return;
    let grandTotal = 0;
    const summaryMap: Record<string, number> = {};

    gridRef.current.api.forEachNodeAfterFilter((node: any) => {
      if (node.data) {
        const rate = Number(node.data.dailyRate) || 0;
        grandTotal += rate;
        const fullName = `${node.data.firstName} ${node.data.lastName}`;
        summaryMap[fullName] = (summaryMap[fullName] || 0) + rate;
      }
    });

    instructorTotalsRef.current = summaryMap;
    setPinnedTotals([{ firstName: 'סה"כ כללי (לפי סינון):', dailyRate: grandTotal }]);
    gridRef.current.api.refreshCells({ columns: ['instructorTotal'] });
  };

  // הפונקציות המקוריות שלך בדיוק כפי שהיו
  const handleEdit = (data: any) => {
    setEditingId(data.id);
    setSelectedSchool({ name: data.schoolName, city: data.cityName });
    const form = document.querySelector('form') as HTMLFormElement;
    if (form) {
      const formattedDate = new Date(data.date).toISOString().split('T')[0];
      form.date.value = formattedDate;
      // form.month.value = data.month; <--- למחוק את השורה הזו!
      form.lessons.value = data.lessons;
      form.dailyRate.value = data.dailyRate;
      form.remarks.value = data.remarks || "";
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק לצמיתות את הדיווח הזה?")) {
      try {
        await deleteReport(id); 
        alert("הדיווח נמחק בהצלחה");
        await loadReports(); 
      } catch (error) {
        alert("אירעה שגיאה במחיקה.");
      }
    }
  };

  // עטיפת העמודות ב-useMemo כדי למנוע רינדור מחדש בעת לחיצה
  const colDefs = useMemo(() => [
    {
      headerName: "",
      field: "checkbox",
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      minWidth: 50,
      hide: !isAdmin || activeTab !== "unpaid",
    },
    { field: "firstName", headerName: "שם פרטי", hide: !isAdmin, filter: CustomFilter, width: 100 },
    { field: "lastName", headerName: "משפחה", hide: !isAdmin, filter: CustomFilter, width: 100 },
    { field: "date", headerName: "תאריך", valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString('he-IL') : '', filter: CustomFilter, width: 95, minWidth: 95 },
    { field: "schoolName", headerName: 'ביה"ס', filter: CustomFilter, flex: 1, minWidth: 160 }, // flex: 1 גורם לעמודה להתרחב ולמלא את המקום הנותר במסך
    { field: "month", headerName: "חודש", filter: CustomFilter, width: 90, minWidth: 90 },
    { field: "lessons", headerName: "שיעורים", filter: CustomFilter, width: 95, minWidth: 95 },
    { field: "dailyRate", headerName: "תעריף", valueFormatter: (p: any) => `₪${p.value}`, filter: CustomFilter, width: 95, minWidth: 95 },
    {
      colId: "instructorTotal",
      headerName: 'סה"כ למדריך',
      width: 120,
      minWidth: 120,
      valueGetter: (params: any) => {
        if (!params.data) return null;
        const fullName = `${params.data.firstName} ${params.data.lastName}`;
        return instructorTotalsRef.current[fullName] || 0;
      },
      valueFormatter: (params: any) => {
        if (!params.data || !params.node) return '';
        const currentName = `${params.data.firstName} ${params.data.lastName}`;
        const nextNode = params.api.getDisplayedRowAtIndex(params.node.rowIndex + 1);
        let isLastRow = false;

        if (!nextNode || !nextNode.data) {
          isLastRow = true;
        } else {
          const nextName = `${nextNode.data.firstName} ${nextNode.data.lastName}`;
          if (currentName !== nextName) isLastRow = true;
        }
        return (isLastRow && params.value) ? `₪${params.value}` : '';
      },
      cellStyle: { backgroundColor: '#f0fdf4', fontWeight: 'bold', color: '#0f766e' }
    },
    {
      headerName: "פעולות",
      hide: !isAdmin,
      width: 100,
      minWidth: 100,
      cellRenderer: (params: any) => {
        // הגנה למניעת רנדור בשורות סיכום
        if (!params.data || !params.data.id) return null;

        return (
          <div className="flex gap-3 justify-center items-center h-full z-10">
            <button 
              type="button"
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                handleEdit(params.data); 
              }} 
              className="hover:scale-125 transition-transform p-1 rounded hover:bg-slate-100" 
              title="עריכה"
            >
              ✏️
            </button>
            <button 
              type="button"
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                handleDelete(params.data.id); 
              }} 
              className="hover:scale-125 transition-transform p-1 rounded hover:bg-red-50 text-red-500" 
              title="מחיקה"
            >
              🗑️
            </button>
          </div>
        );
      }
    }
  ], [isAdmin, activeTab, reports, user]); // שומרים על התלויות המורחבות ליציבות מקסימלית

  const onSelectionChanged = () => {
    if (!gridRef.current?.api) return;
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedData = selectedNodes.map(node => node.data);
    setSelectedRows(selectedData);
  };

  const handleCreatePaymentClick = async () => {
    if (selectedRows.length === 0) return;

    const instructorEmails = new Set(selectedRows.map(r => r.email));
    if (instructorEmails.size > 1) {
      alert("שימו לב: ניתן ליצור תשלום מאוגד רק עבור מדריך אחד בכל פעם. אנא ודאו שסימנתם רק דיווחים של אותו מדריך.");
      return;
    }

    const totalAmount = selectedRows.reduce((sum, r) => sum + Number(r.dailyRate), 0);
    const firstRow = selectedRows[0]; 

    // הגדרת נתיב התיקיות המעודכן בגוגל דרייב: תשלומים למדריכים > שנה > שם מדריך
    const folderPath = `תשלומים למדריכים/${selectedYear}/${firstRow.firstName} ${firstRow.lastName}`;
    
    let proofUrl = "";
    if (window.confirm(`האם תרצה להעלות קובץ אסמכתא לדרייב? (יישמר תחת: ${folderPath})`)) {
      try {
        const pickerResult = await AuthenticateActivate.onApiLoad(); 
        if (pickerResult) {
          proofUrl = pickerResult;
        }
      } catch (e) {
        console.error("שגיאה בהעלאת קובץ לדרייב", e);
      }
    } else {
        proofUrl = window.prompt(`אם יש לך קישור חיצוני לקובץ אסמכתא, הדבק אותו כאן (אופציונלי):`) || "";
    }

    if (window.confirm(`לאשר תשלום ("שולם") בסך ${totalAmount} ₪ עבור ${selectedRows.length} דיווחים?`)) {
      const result = await createInstructorPayment({
        reportIds: selectedRows.map(r => r.id),
        totalAmount: totalAmount,
        clerkId: firstRow.clerkId,
        firstName: firstRow.firstName,
        lastName: firstRow.lastName,
        email: firstRow.email,
        proofUrl: proofUrl,
      });

      if (result.success) {
        alert("התשלום עודכן כ'שולם' בהצלחה! הדיווחים עברו ללשונית המתאימה.");
        setSelectedRows([]); 
        await loadReports(); 
      } else {
        alert("שגיאה ביצירת התשלום: " + result.error);
      }
    }
  };

   const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const selectedDate = new Date(data.date as string);
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    selectedDate.setHours(0, 0, 0, 0);

    // ולידציית תאריך עתידי בלבד
    if (selectedDate > today) {
      alert("שגיאה: לא ניתן לדווח על תאריך עתידי. אנא בחר תאריך של היום או תאריך בעבר.");
      return;
    }

    // הזרקה אוטומטית של החודש ושנת הלימודים לנתונים!
    const monthIndex = selectedDate.getMonth();
    data.month = hebrewMonths[monthIndex]; // המערכת קובעת את החודש בעצמה
    data.yearHebrew = selectedYear;

    try {
      if (editingId) {
        await updateInstructorReport(editingId, data);
        alert("הדיווח עודכן בהצלחה!");
        setEditingId(null);
      } else {
        await saveInstructorReport(data);
        alert("הדיווח נשמר בהצלחה!");
      }
      
      e.target.reset();
      await loadReports();
    } catch (error) {
      console.error("Database save error:", error);
      alert("שגיאה בשמירת הדיווח.");
    }
  };
// נעילת המערך של הדיווחים הפתוחים כדי למנוע ריצוד כשהטבלה ריקה
  const unpaidReports = useMemo(() => {
    return reports.filter(r => !r.paymentId);
  }, [reports]);

  // יצירת מערך מקובץ ללשונית "שולם" - רשומה אחת לכל תשלום עם תמיכה באסמכתא
  const paidGroupedData = useMemo(() => {
    const paid = reports.filter(r => r.paymentId);
    const map = new Map();
    
    paid.forEach(r => {
      if (!map.has(r.paymentId)) {
        map.set(r.paymentId, {
          id: r.paymentId,
          firstName: r.firstName,
          lastName: r.lastName,
          months: new Set([r.month]),
          totalAmount: 0,
          reportsCount: 0,
          proofUrl: r.proofUrl || r.payment?.proofUrl || "", // משיכת קישור לאסמכתא מהדיווח או מהתשלום
        });
      }
      const group = map.get(r.paymentId);
      group.totalAmount += Number(r.dailyRate || 0);
      group.reportsCount += 1;
      if (r.month) group.months.add(r.month);
      // אם יש אסמכתא באחת מהרשומות, נשמור אותה לקבוצה
      if (r.proofUrl) group.proofUrl = r.proofUrl;
      else if (r.payment?.proofUrl) group.proofUrl = r.payment.proofUrl;
    });

    return Array.from(map.values()).map(g => ({
      ...g,
      month: Array.from(g.months).join(', '),
    }));
  }, [reports]);

  // פונקציה לאישור קבלת קבלה - מעדכנת את כל הדיווחים של אותו תשלום
  const handleMarkAsReceived = async (paymentId: string) => {
    const receiptNumber = window.prompt("אנא הזן מספר קבלה/חשבונית (אופציונלי):") || "התקבלה";
    
    if (window.confirm("להעביר את התשלום לסטטוס 'סגור - התקבלה קבלה'?")) {
      try {
        // מאתרים את כל הדיווחים ששייכים לתשלום הזה
        const reportsToUpdate = reports.filter(r => r.paymentId === paymentId);
        
        // מעדכנים את כולם במקביל
        await Promise.all(
          reportsToUpdate.map(r => updateInstructorReport(r.id, { remarks: `קבלה: ${receiptNumber}` }))
        );
        
        alert("הסטטוס עודכן בהצלחה!");
        await loadReports();
      } catch (error) {
        alert("שגיאה בעדכון הסטטוס.");
      }
    }
  };

const [isLoading, setIsLoading] = useState(true);
const [hasLoaded, setHasLoaded] = useState(false);
const loadReports = async () => {
    if (user) {
      // התיקון: נכנסים למצב "טעינה שמסתירה נתונים" רק בטעינה הראשונית של הדף
      if (!hasLoaded) {
        setIsLoading(true);
      }
      
      const data = await getReports();
      setReports(data as any[]);
      
      setIsLoading(false);
      setHasLoaded(true);
    }
  };
  useEffect(() => { loadReports(); }, [user]);

  const onGridReady = (params: any) => {};

  // ה-return תמיד חייב להיות בסוף הקומפוננטה
  return (
    <div className="p-8 max-w-7xl mx-auto rtl w-full" dir="rtl">
<div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          {AuthenticateActivate.Component}
        </div>
      </div>
      
      {isAdmin ? (
        <h1 className="text-3xl font-bold text-gray-800 mb-8">ניהול תשלומים למדריכים {selectedYear}</h1>
      ) : (
        <h1 className="text-3xl font-bold text-gray-800 mb-8">דיווח שעות מדריכים/ות ומורים/ות {selectedYear}</h1>
      )}

      {isAdmin && (
        <div className="flex space-x-reverse space-x-2 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("unpaid")}
            className={`py-3 px-6 text-sm font-medium transition-colors duration-200 ${
              activeTab === "unpaid" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            דיווחי מדריכים (טרם שולמו)
          </button>
          <button
            onClick={() => setActiveTab("paid")}
            className={`py-3 px-6 text-sm font-medium transition-colors duration-200 ${
              activeTab === "paid" ? "border-b-2 border-orange-500 text-orange-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            שולם למדריכים (ממתין לקבלה)
          </button>
          <button
            onClick={() => setActiveTab("accounting")}
            className={`py-3 px-6 text-sm font-medium transition-colors duration-200 ${
              activeTab === "accounting" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            קבלות והנה"ח
          </button>
        </div>
      )}

      {activeTab === "unpaid" && (
        <div className="animate-in fade-in duration-300">
          
          {selectedRows.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex justify-between items-center shadow-sm">
              <div>
                <span className="font-bold text-blue-800">סימנת {selectedRows.length} דיווחים. </span>
                <span className="text-blue-600">סך הכל לתשלום: ₪{selectedRows.reduce((sum, r) => sum + Number(r.dailyRate), 0)}</span>
              </div>
              <button 
                onClick={handleCreatePaymentClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md"
              >
                שולם
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" dir="rtl">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 text-right">שם ביה"ס</label>
              <select name="schoolName" required value={selectedSchool?.name || ""} onChange={handleSchoolChange} className="p-3 text-right border rounded-lg bg-slate-50 focus:bg-white transition-colors appearance-none">
                <option value="">בחר מוסד...</option>
                {assignedSchools.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                {editingId && selectedSchool && !assignedSchools.find(s => s.name === selectedSchool.name) && (
                  <option value={selectedSchool.name}>{selectedSchool.name}</option>
                )}
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 text-right">עיר</label>
              <input name="cityName" value={selectedSchool?.city || ""} readOnly required className="p-3 text-right border rounded-lg bg-slate-200 cursor-not-allowed" />
            </div>

           <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 text-right">תאריך</label>
              <input type="date" name="date" required max={todayDateString} className="p-3 text-right border rounded-lg bg-slate-50 focus:bg-white transition-colors" />
            </div>
         
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 text-right">כמות שיעורים</label>
              <select name="lessons" required className="p-3 text-right border rounded-lg bg-slate-50 focus:bg-white transition-colors">
                <option value="">בחר כמות...</option>
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 text-right">תעריף ליום (₪)</label>
              <input type="number" name="dailyRate" step="0.01" required className="p-3 text-right border rounded-lg bg-slate-50 focus:bg-white transition-colors" />
            </div>

            <div className="flex flex-col gap-1 lg:col-span-2">
              <label className="text-xs font-bold text-slate-500 text-right">הערות (אופציונלי)</label>
              <input name="remarks" className="p-3 text-right border rounded-lg bg-slate-50 focus:bg-white transition-colors" />
            </div>

            <div className="lg:col-span-4 flex justify-end mt-4">
              <button type="submit" className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold transition-all shadow-sm text-lg ${editingId ? 'bg-orange-600 text-white' : 'bg-teal-600 text-white'}`}>
                {editingId ? "עדכן דיווח" : "שלח דיווח"}
              </button>
            </div>
          </form>

          <div className="mb-4 flex justify-start">
  <input className="text-right border border-gray-300 rounded-lg w-[250px] p-2 shadow-sm focus:ring-2 focus:ring-teal-500 outline-none" type="text" id="filter-text-box" placeholder="חיפוש חופשי (ביה''ס, חודש...)" onInput={onFilterTextBoxChanged} />
</div>

<div className="ag-theme-quartz" style={{ height: 600, width: '100%' }}>
            <AgGridReact 
              ref={gridRef} 
              // עדכון ה-context כדי שהדרייב יעבוד גם מכאן במידת הצורך
              context={{ 
                handleEdit, 
                handleDelete,
                selectedYear, 
                AuthenticateActivate, 
                loadReports,
                handleUpdateProofUrl: async (paymentId: string, url: string) => {
                  try {
                    const reportsToUpdate = reports.filter(r => r.paymentId === paymentId);
                    await Promise.all(
                      reportsToUpdate.map(r => updateInstructorReport(r.id, { proofUrl: url }))
                    );
                    await loadReports();
                  } catch (error) {
                    console.error("Error updating URL:", error);
                  }
                }
              }} 
              rowData={isLoading ? undefined : unpaidReports} 
              columnDefs={colDefs as any} 
              quickFilterText={""} 
              enableRtl={true}
              onSelectionChanged={onSelectionChanged} 
              onGridReady={(params) => {
                onGridReady(params);
                params.api.sizeColumnsToFit();
              }} 
              onModelUpdated={calculateTotals}
              rowSelection="multiple" 
              suppressRowClickSelection={true} 
              pinnedBottomRowData={pinnedTotals}
              defaultColDef={{ filter: true, sortable: true, resizable: true }}
              localeText={{ 
                noRowsToShow: 'אין דיווחים פתוחים לתשלום',
                loadingOoo: 'טוען נתונים...'
              }} 
            />
          </div>
        </div>
      )}

{activeTab === "paid" && (
  <div className="animate-in fade-in duration-300">
<h2 className="text-xl font-semibold mb-4 text-orange-700">תשלומים הממתינים לקבלת קבלה מהמדריך</h2>

          <div className="mb-4 flex justify-start">
            <input
              className="text-right border border-gray-300 rounded-lg w-[250px] p-2 shadow-sm focus:ring-2 focus:ring-orange-500 outline-none"
              type="text"
              id="payment-filter-box"
              placeholder="חיפוש תשלום (מדריך, חודש...)"
              onInput={onPaymentFilterChanged}
            />
          </div>

          <div className="ag-theme-quartz" style={{ height: 600, width: '100%' }}>
            <AgGridReact
              rowData={isLoading ? undefined : paidGroupedData}
              quickFilterText={""}
              enableRtl={true}
              // הוספת ה-context הכרחית כדי שהכפתור ידע לשמור נתונים ב-DB
              context={{ 
                selectedYear, 
                AuthenticateActivate, 
                loadReports,
                handleUpdateProofUrl: async (paymentId: string, url: string) => {
                  try {
                    // מוצא את כל הדיווחים ששייכים לתשלום הספציפי ומעדכן אותם
                    const reportsToUpdate = reports.filter(r => r.paymentId === paymentId);
                    await Promise.all(
                      reportsToUpdate.map(r => updateInstructorReport(r.id, { proofUrl: url }))
                    );
                    await loadReports(); // מרענן את הטבלה כדי להציג "צפייה"
                    alert("האסמכתא נשמרה בהצלחה במערכת");
                  } catch (error) {
                    console.error("Error saving proof URL:", error);
                    alert("שגיאה בשמירת הקישור במסד הנתונים");
                  }
                }
              }}
              onGridReady={(params) => params.api.sizeColumnsToFit()}
              onFirstDataRendered={(params) => params.api.sizeColumnsToFit()}
              localeText={{
                noRowsToShow: 'אין תשלומים שממתינים לקבלה',
                loadingOoo: 'טוען נתונים...'
              }}
              columnDefs={[
                { field: "firstName", headerName: "שם פרטי", flex: 1, minWidth: 80 },
                { field: "lastName", headerName: "משפחה", flex: 1, minWidth: 80 },
                { field: "month", headerName: "חודשי פעילות", flex: 2, minWidth: 110 },
                { field: "reportsCount", headerName: "כמות דיווחים", flex: 1, minWidth: 90 },
                { field: "totalAmount", headerName: "סכום כולל", flex: 1, minWidth: 80, valueFormatter: (p: any) => `₪${p.value}` },
                {
                  headerName: "אסמכתא",
                  flex: 1,
                  minWidth: 100,
                  cellRenderer: ProofFileRenderer,
                  // התיקון: הזרקת פונקציות הדרייב והעדכון ישירות לתוך העמודה
                  cellRendererParams: {
                    selectedYear: selectedYear,
                    AuthenticateActivate: AuthenticateActivate,
                    loadReports: loadReports,
                    handleUpdateProofUrl: async (paymentId: string, url: string) => {
                      try {
                        const reportsToUpdate = reports.filter(r => r.paymentId === paymentId);
                        await Promise.all(
                          reportsToUpdate.map(r => updateInstructorReport(r.id, { proofUrl: url }))
                        );
                        await loadReports();
                        alert("האסמכתא נשמרה בהצלחה במערכת");
                      } catch (error) {
                        console.error("Error saving proof URL:", error);
                        alert("שגיאה בשמירת הקישור במסד הנתונים");
                      }
                    }
                  }
                },
                {
                  headerName: "פעולה", flex: 1, minWidth: 130,
                  cellRenderer: (p: any) => (
                    <button
                      onClick={() => handleMarkAsReceived(p.data.id)}
                      className="bg-orange-100 text-orange-700 px-3 py-1 rounded border border-orange-200 hover:bg-orange-200 transition-colors shadow-sm"
                    >
                      התקבלה קבלה ✔️
                    </button>
                  )
                }
              ]}
             defaultColDef={{ filter: true, sortable: true, resizable: true }}
            />
          </div>
        </div>
      )}

      {/* טאב הנהלת חשבונות */}
      {activeTab === "accounting" && (
        <div className="p-10 text-center text-gray-500">
          לשונית קבלות והנה"ח בקרוב.
        </div>
      )}
    </div>
  );
}