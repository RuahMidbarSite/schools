"use client";
import CustomFilter from "@/components/Tables/GeneralFiles/Filters/CustomFilter";
import { useState, useEffect, useContext, useRef } from "react"; // איחוד כל הייבואים לשורה אחת
import { useUser } from "@clerk/nextjs";
import { YearContext } from "@/context/YearContext";
// 1. הוספנו את updateInstructorReport לייבוא
import { saveInstructorReport, getReports, deleteReport, updateInstructorReport } from "@/db/reportsRequest";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { checkIsAdmin } from "@/lib/authUtils";

export default function ReportingPage() {
  const { user } = useUser();
  const gridRef = useRef<AgGridReact>(null);
  const instructorTotalsRef = useRef<Record<string, number>>({});
  const [pinnedTotals, setPinnedTotals] = useState<any[]>([]);

  const calculateTotals = () => {
    if (!gridRef.current?.api) return;

    let grandTotal = 0;
    const summaryMap: Record<string, number> = {};

    // 1. מעבר על כל השורות ששרדו את הסינון (למשל, כל השורות של פברואר)
    gridRef.current.api.forEachNodeAfterFilter((node: any) => {
      if (node.data) {
        const rate = Number(node.data.dailyRate) || 0;
        grandTotal += rate; // סכימה לסך הכל הכללי

        // סכימה פרטנית לכל מדריך
        const fullName = `${node.data.firstName} ${node.data.lastName}`;
        summaryMap[fullName] = (summaryMap[fullName] || 0) + rate;
      }
    });

    // 2. שמירת הסכומים של המדריכים בזיכרון
    instructorTotalsRef.current = summaryMap;

    // 3. עדכון שורת הסך-הכל בתחתית הטבלה
    setPinnedTotals([{ 
      firstName: 'סה"כ כללי (לפי סינון):', 
      dailyRate: grandTotal 
    }]);

    // 4. רענון העמודה החכמה כדי שתציג את הסכומים המעודכנים
    gridRef.current.api.refreshCells({ columns: ['instructorTotal'] });
  };
  const { selectedYear } = useContext(YearContext);
  const [reports, setReports] = useState([]);
  
  // 2. State חדש ששומר את ה-ID של השורה שאנחנו עורכים כרגע
  const [editingId, setEditingId] = useState<string | null>(null);

  const assignedSchools = (user?.publicMetadata?.assignedSchools as {name: string, city: string}[]) || [];
  const [selectedSchool, setSelectedSchool] = useState<{name: string, city: string} | null>(null);
  const isAdmin = checkIsAdmin(user);

  const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const schoolName = e.target.value;
    const school = assignedSchools.find(s => s.name === schoolName);
    setSelectedSchool(school || null);
  };

  const colDefs = [
    { 
      field: "firstName", 
      headerName: "שם פרטי", 
      hide: !isAdmin, 
      filter: CustomFilter, // שימוש ברכיב המיובא
    },
    { 
      field: "lastName", 
      headerName: "משפחה", 
      hide: !isAdmin, 
      filter: CustomFilter 
    },
    { 
      field: "date", 
      headerName: "תאריך", 
      valueFormatter: (p: any) => new Date(p.value).toLocaleDateString('he-IL'),
      filter: CustomFilter,
    },
   { 
      field: "schoolName", 
      headerName: "ביה\"ס", 
      filter: CustomFilter,
      width: 220,     // מרחיב את העמודה ספציפית
      minWidth: 220   // מוודא שהיא לא תצטמצם בחזרה
    },
    { 
      field: "month", 
      headerName: "חודש", 
      filter: CustomFilter 
    },
    { 
      field: "lessons", 
      headerName: "שיעורים", 
      filter: CustomFilter 
    },
 { 
      field: "dailyRate", 
      headerName: "תעריף", 
      valueFormatter: (p: any) => `₪${p.value}`, 
      filter: CustomFilter,
      width: 100,
      minWidth: 100
    },
    {
      colId: "instructorTotal",
      headerName: 'סה"כ למדריך',
      width: 130,
      minWidth: 130,
      valueGetter: (params: any) => {
        if (!params.data) return null;
        const fullName = `${params.data.firstName} ${params.data.lastName}`;
        return instructorTotalsRef.current[fullName] || 0;
      },
      valueFormatter: (params: any) => {
        if (!params.data || !params.node) return '';

        // 1. זיהוי המדריך בשורה הנוכחית
        const currentName = `${params.data.firstName} ${params.data.lastName}`;
        
        // 2. בדיקה מי המדריך בשורה הבאה
        const nextNode = params.api.getDisplayedRowAtIndex(params.node.rowIndex + 1);
        let isLastRow = false;

        if (!nextNode || !nextNode.data) {
          isLastRow = true; // אין שורה הבאה, לכן זו השורה האחרונה בטבלה
        } else {
          const nextName = `${nextNode.data.firstName} ${nextNode.data.lastName}`;
          if (currentName !== nextName) {
            isLastRow = true; // השורה הבאה שייכת למדריך אחר
          }
        }

        // 3. הצגת הסכום רק אם הגענו לשורה האחרונה של המדריך הזה
        return (isLastRow && params.value) ? `₪${params.value}` : '';
      },
      cellStyle: { backgroundColor: '#f0fdf4', fontWeight: 'bold', color: '#0f766e' }
    },
   {
      headerName: "פעולות",
      hide: !isAdmin,
      // פשוט הסרנו את ה-pinned כדי שהעמודה תזרום באופן טבעי ליד "תעריף"
      cellRenderer: (params: any) => (
        <div className="flex gap-3 justify-center items-center h-full">
          <button 
            onClick={() => handleEdit(params.data)} 
            className="hover:scale-125 transition-transform"
            title="עריכה"
          >
            ✏️
          </button>
          <button 
            onClick={() => handleDelete(params.data.id)} 
            className="hover:scale-125 transition-transform"
            title="מחיקה"
          >
            🗑️
          </button>
        </div>
      )
    }
  ];

  // 3. פונקציית העריכה החדשה שטוענת את הנתונים לטופס
const handleEdit = (data: any) => {
  setEditingId(data.id);
  
  // עדכון ה-State של המוסד
  // אנחנו לוקחים את השם והעיר ישירות מהשורה בטבלה
  setSelectedSchool({
    name: data.schoolName,
    city: data.cityName
  });

  // מילוי שאר השדות שלא מנוהלים ב-State
  const form = document.querySelector('form') as HTMLFormElement;
  if (form) {
    // ה-date צריך פורמט YYYY-MM-DD
    const formattedDate = new Date(data.date).toISOString().split('T')[0];
    form.date.value = formattedDate;
    
    form.month.value = data.month;
    form.lessons.value = data.lessons;
    form.dailyRate.value = data.dailyRate;
    form.remarks.value = data.remarks || "";
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      data.yearHebrew = selectedYear;

      // 4. לוגיקה שבודקת אם לעדכן קיים או לשמור חדש
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
      alert("שגיאה בשמירת הדיווח.");
    }
  };

  const loadReports = async () => {
    if (user) {
      const data = await getReports();
      setReports(data as any);
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

  useEffect(() => { loadReports(); }, [user]);
const onGridReady = (params: any) => {
  };
  return (
    <div className="p-8 dir-rtl text-right">
      <h1 className="text-2xl font-bold mb-6">דיווח שעות מדריך - {selectedYear}</h1>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
        {/* שדות הטופס נשארים אותו דבר */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 text-right">שם ביה"ס</label>
         <select 
  name="schoolName" 
  required 
  value={selectedSchool?.name || ""} // מצמיד את התצוגה ל-State
  onChange={handleSchoolChange}
  className="p-3 text-right border rounded-lg bg-slate-50 focus:bg-white transition-colors appearance-none"
>
  <option value="">בחר מוסד...</option>
  {assignedSchools.map(s => (
    <option key={s.name} value={s.name}>{s.name}</option>
  ))}
  
  {/* הגנה: אם ביה"ס מהעריכה לא ברשימת המדריך, נוסיף אותו זמנית כדי שיוצג בטופס */}
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
          <input type="date" name="date" required className="p-3 text-right border rounded-lg bg-slate-50 focus:bg-white transition-colors" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 text-right">חודש פעילות</label>
          <select name="month" required className="p-3 text-right border rounded-lg bg-slate-50 focus:bg-white transition-colors">
            <option value="">בחר חודש...</option>
            {["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
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
          <button type="submit" className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold transition-all shadow-sm text-lg ${editingId ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}>
            {/* 5. שינוי הטקסט והצבע של הכפתור במצב עריכה */}
            {editingId ? "עדכן דיווח" : "שלח דיווח"}
          </button>
        </div>
      </form>

    <div className="ag-theme-quartz mt-8" style={{ height: 500, width: '100%' }}>
        <AgGridReact 
          ref={gridRef}
          rowData={reports} 
          columnDefs={colDefs as any} 
          enableRtl={true} 
          animateRows={true}
          onGridReady={onGridReady}
          suppressMenuHide={true}
          onModelUpdated={calculateTotals} // מחשב מחדש בכל פעם שאתה מסנן
          pinnedBottomRowData={pinnedTotals} // תוקע את שורת הסך הכל בתחתית
          defaultColDef={{
            filter: true,
            sortable: true,
            resizable: true,
            floatingFilter: false,
            width: 120, // רוחב צר לכל העמודות
            flex: 0     // מונע מתיחה על כל המסך
          }}
        />
      </div>
    </div>
  );
}