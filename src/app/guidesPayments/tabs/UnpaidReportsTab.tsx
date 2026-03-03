"use client";
import { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { YearContext } from "@/context/YearContext";
import { saveInstructorReport, getReports, deleteReport, updateInstructorReport } from "@/db/reportsRequest";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Renderer המעודכן שבודק הרשאת אדמין בלבד
const ActionButtonsRenderer = (params: any) => {
  if (!params.data || !params.data.id) return null;
  
  // רק אדמין מקבל את הכפתורים (לפי ה-isAdmin שהעברנו ב-context)
  if (!params.context.isAdmin) return null;

  return (
    <div className="flex gap-3 justify-center items-center h-full">
      <button
        onClick={(e) => {
          e.stopPropagation();
          params.context.handleEdit(params.data);
        }}
        className="hover:scale-125 transition-transform cursor-pointer"
        title="עריכה"
      >
        ✏️
      </button>
      <button
        onClick={(e) => {
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

export default function UnpaidReportsTab({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useUser();
  const { selectedYear } = useContext(YearContext);
  const gridRef = useRef<AgGridReact>(null);
  
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<{name: string, city: string} | null>(null);

  const assignedSchools = useMemo(() => 
    (user?.publicMetadata?.assignedSchools as {name: string, city: string}[]) || [], 
  [user]);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    const data = await getReports();
    // סינון: אדמין רואה הכל, מדריך רואה רק את הדיווחים ששייכים למייל שלו
    const filtered = isAdmin 
      ? data.filter((r: any) => !r.paymentId)
      : data.filter((r: any) => !r.paymentId && r.email === user?.primaryEmailAddress?.emailAddress);
    setReports(filtered);
    setIsLoading(false);
  }, [isAdmin, user, selectedYear]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // הזרקת נתונים אוטומטית
    const selectedDate = new Date(data.date as string);
    const hebrewMonths = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    
    data.month = hebrewMonths[selectedDate.getMonth()];
    data.yearHebrew = selectedYear;
    data.email = user?.primaryEmailAddress?.emailAddress || "";
    data.firstName = user?.firstName || "";
    data.lastName = user?.lastName || "";
    data.clerkId = user?.id || "";

    try {
      if (editingId && isAdmin) {
        await updateInstructorReport(editingId, data);
        alert("הדיווח עודכן בהצלחה!");
        setEditingId(null);
      } else {
        await saveInstructorReport(data);
        alert("הדיווח נשלח בהצלחה!");
      }
      e.target.reset();
      loadReports();
    } catch (error) {
      alert("שגיאה בשמירת הדיווח.");
    }
  };

  const handleEdit = (data: any) => {
    if (!isAdmin) return;
    setEditingId(data.id);
    
    // עדכון הסטייט בצורה מפורשת עם הערכים מהשורה בטבלה
    setSelectedSchool({ 
      name: data.schoolName, 
      city: data.cityName 
    });

    const form = document.querySelector('form') as HTMLFormElement;
    if (form) {
      // עדכון שדות הטופס הסטנדרטיים
      form.date.value = new Date(data.date).toISOString().split('T')[0];
      form.lessons.value = data.lessons;
      form.dailyRate.value = data.dailyRate;
      form.remarks.value = data.remarks || "";
      
      // כפיית הערך על שדה ה-select דרך ה-DOM ליתר ביטחון
      if (form.schoolName) {
        form.schoolName.value = data.schoolName;
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm("למחוק דיווח זה לצמיתות?")) {
      await deleteReport(id);
      loadReports();
    }
  };

  return (
    <div className="space-y-8">
      {/* טופס הדיווח - זמין תמיד להזנה */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold mb-4 text-slate-700">
          {editingId ? "עריכת דיווח (Admin)" : "דיווח שעות חדש"}
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500">שם ביה"ס</label>
          <select 
  name="schoolName" 
  required 
  // הוספת ה-value מקשרת את השדה לסטייט ומכריחה אותו להציג את השם בעריכה
  value={selectedSchool?.name || ""} 
  onChange={(e) => {
    const school = assignedSchools.find(s => s.name === e.target.value);
    // אם ביה"ס לא ברשימה (למשל בעריכה של אדמין), שומרים את השם הגולמי
    setSelectedSchool(school || { name: e.target.value, city: "" });
  }}
  className="p-3 border rounded-lg bg-slate-50 focus:bg-white transition-colors"
>
  <option value="">בחר מוסד...</option>
  {assignedSchools.map(s => (
    <option key={s.name} value={s.name}>
      {s.name}
    </option>
  ))}
  {/* פתרון למקרה שביה"ס של הדיווח לא קיים ב-Metadata של המדריך הנוכחי */}
  {editingId && selectedSchool && !assignedSchools.find(s => s.name === selectedSchool.name) && (
    <option value={selectedSchool.name}>{selectedSchool.name}</option>
  )}
</select>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500">עיר</label>
            <input name="cityName" value={selectedSchool?.city || ""} readOnly className="p-3 border rounded-lg bg-slate-200 cursor-not-allowed" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500">תאריך</label>
            <input type="date" name="date" required max={new Date().toISOString().split('T')[0]} className="p-3 border rounded-lg bg-slate-50" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500">כמות שיעורים</label>
            <select name="lessons" required className="p-3 border rounded-lg bg-slate-50">
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500">תעריף (₪)</label>
            <input type="number" name="dailyRate" step="0.01" required className="p-3 border rounded-lg bg-slate-50" />
          </div>

          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-xs font-bold text-slate-500">הערות</label>
            <input name="remarks" className="p-3 border rounded-lg bg-slate-50" />
          </div>

          <div className="lg:col-span-4 flex justify-end">
            <button type="submit" className={`px-8 py-3 rounded-xl font-bold text-white shadow-md transition-all ${editingId ? 'bg-orange-600' : 'bg-teal-600'}`}>
              {editingId ? "שמור שינויים" : "שלח דיווח"}
            </button>
          </div>
        </form>
      </section>

      {/* טבלת הדיווחים */}
      <section className="ag-theme-quartz" style={{ height: 450, width: "100%" }}>
        <AgGridReact
          ref={gridRef}
          rowData={reports}
          enableRtl={true}
          context={{ handleEdit, handleDelete, isAdmin }}
          columnDefs={[
            { field: "firstName", headerName: "שם", hide: !isAdmin },
            { field: "date", headerName: "תאריך", valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('he-IL') : '' },
            { field: "schoolName", headerName: 'ביה"ס', flex: 1 },
            { field: "lessons", headerName: "שיעורים", width: 90 },
            { field: "dailyRate", headerName: "תעריף", valueFormatter: p => `₪${p.value}`, width: 100 },
            { 
              headerName: "פעולות", 
              cellRenderer: ActionButtonsRenderer, 
              width: 100,
              hide: !isAdmin // הסתרה מוחלטת של העמודה אם המשתמש אינו אדמין
            }
          ]}
        />
      </section>
    </div>
  );
}