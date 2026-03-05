"use client";
import { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { YearContext } from "@/context/YearContext";
import { saveInstructorReport, getReports, deleteReport, updateInstructorReport, createInstructorPayment } from "@/db/reportsRequest";
import { AgGridReact } from "ag-grid-react";
import { CustomFilter } from "@/components/Tables/GeneralFiles/Filters/CustomFilter";
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
const defaultColDef = useMemo(() => ({
    filter: "CustomFilter",
    sortable: true,
    resizable: true,
    suppressHeaderMenuButton: false,
  }), []);
  const [reports, setReports] = useState<any[]>([]);
const uniqueInstructors = useMemo(() => {
    const instructorsMap = new Map();
    reports.forEach(r => {
      if (r.firstName && r.lastName) {
        const key = `${r.firstName} ${r.lastName}`;
        if (!instructorsMap.has(key)) {
          instructorsMap.set(key, {
            firstName: r.firstName,
            lastName: r.lastName,
            email: r.email,
            schools: [] as {name: string, city: string}[]
          });
        }
        const inst = instructorsMap.get(key);
        // מוסיף את ביה"ס והעיר לרשימה של המדריך אם הם עוד לא שם
        if (!inst.schools.some((s: any) => s.name === r.schoolName)) {
          inst.schools.push({ name: r.schoolName, city: r.cityName });
        }
      }
    });
    return Array.from(instructorsMap.values());
  }, [reports]);

  // State חדש כדי לדעת איזה מדריך בחרת בטופס
  const [adminSelectedInstructor, setAdminSelectedInstructor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<{name: string, city: string} | null>(null);
  const [quickFilterText, setQuickFilterText] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(""); // State חדש לחודש

  // לוגיקת הסינון המקצועית
  const filteredReports = useMemo(() => {
    if (!selectedMonth) return reports;
    return reports.filter(r => {
      const reportDate = new Date(r.date);
      return (reportDate.getMonth() + 1).toString() === selectedMonth;
    });
  }, [reports, selectedMonth]);
  const assignedSchools = useMemo(() => 
    (user?.publicMetadata?.assignedSchools as {name: string, city: string}[]) || [], 
  [user]);
const components = useMemo(() => ({
    CustomFilter: CustomFilter
  }), []);
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    const data = await getReports();
    
 // ניקוי והשוואה בטוחה של אימיילים
    const userEmail = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
    
    const filtered = isAdmin 
      ? data 
      : data.filter((r: any) => {
          const reportEmail = r.email?.trim().toLowerCase();
          // רק אם יש אימייל בשני הצדדים והם זהים לחלוטין
          return userEmail && reportEmail && reportEmail === userEmail;
        });

    // מיון: אלו ללא paymentId (טרם שולמו) יהיו ראשונים
    const sorted = [...filtered].sort((a, b) => {
      if (!!a.paymentId === !!b.paymentId) return 0;
      return a.paymentId ? 1 : -1;
    });

    setReports(sorted);
    setIsLoading(false);
  }, [isAdmin, user?.primaryEmailAddress?.emailAddress, selectedYear]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

  // 1. עדיפות למידע ידני מה-State (מוסד ועיר) עבור מנהל
    if (isAdmin && selectedSchool?.name) {
      data.schoolName = selectedSchool.name;
      data.cityName = selectedSchool.city || (data.cityName as string) || "";
    }
    
    // 2. חישוב תאריך וחודש
    const selectedDate = new Date(data.date as string);
    const hebrewMonths = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    data.month = hebrewMonths[selectedDate.getMonth()];
    data.yearHebrew = selectedYear;

    // 3. מניעת שגיאת "מדריך אחד בכל פעם": זיהוי אימייל קיים לפי שם המדריך
    const existingInst = isAdmin ? uniqueInstructors.find(i => i.firstName === data.firstName && i.lastName === data.lastName) : null;
    
    if (isAdmin) {
      // אם לא הוזן אימייל, ננסה קודם לקחת את האימייל הקיים שלו מההיסטוריה (מפתח קריטי לביצוע תשלום!)
      data.email = data.email || existingInst?.email || `${(data.firstName as string).trim()}@no-email.com`;
      data.clerkId = ""; // אדמין מדווח ללא שיוך אישי שלו
    } else {
      data.email = user?.primaryEmailAddress?.emailAddress || "";
      data.clerkId = user?.id || "";
    }
    
    data.firstName = data.firstName || user?.firstName || "";
    data.lastName = data.lastName || user?.lastName || "";

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
      setSelectedSchool(null); // איפוס המוסד הנבחר
      setAdminSelectedInstructor(null); // איפוס המדריך הנבחר
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

    // סנכרון המדריך כדי שרשימת בתי הספר שלו תופיע ב-Select בעת עריכה
    const instructor = uniqueInstructors.find(i => i.email === data.email);
    setAdminSelectedInstructor(instructor || null);
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
const handleMakePayment = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    const selectedData = selectedNodes?.map(node => node.data) || [];

    if (selectedData.length === 0) {
      alert("אנא בחר לפחות דיווח אחד לביצוע תשלום");
      return;
    }

    // בדיקה שכל הדיווחים שייכים לאותו מדריך
    const emails = new Set(selectedData.map(d => d.email));
    if (emails.size > 1) {
      alert("שגיאה: ניתן לבצע תשלום מרוכז רק עבור מדריך אחד בכל פעם");
      return;
    }

    const totalAmount = selectedData.reduce((sum, r) => sum + r.dailyRate, 0);
    const firstReport = selectedData[0];

    if (window.confirm(`בוצע תשלום על סך ₪${totalAmount} עבור ${firstReport.firstName} ${firstReport.lastName}?`)) {
      try {
        await createInstructorPayment(
          selectedData.map(r => r.id),
          totalAmount,
          {
            clerkId: firstReport.clerkId,
            firstName: firstReport.firstName,
            lastName: firstReport.lastName,
            email: firstReport.email
          }
        );
        alert("התשלום בוצע והדיווחים הועברו ללשונית 'שולמו'");
        loadReports();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };
  return (
   <div className="space-y-8">
  
  {/* שורת דיבאג זמנית לבדיקת הבעיה בורסל */}
  <div className="bg-red-500 text-white p-4 font-bold text-center rounded-lg mb-4">
    מצב פיתוח: האם אדמין? {isAdmin ? "כן" : "לא"} | אימייל שזוהה: {user?.primaryEmailAddress?.emailAddress || "לא זוהה"}
  </div>

  {/* טופס הדיווח - זמין תמיד להזנה */}
  <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
    <h3 className="text-lg font-bold mb-4 text-slate-700">
      {editingId ? "עריכת דיווח (Admin)" : "דיווח שעות חדש"}
    </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isAdmin && (
            <div className="flex flex-col gap-1 lg:col-span-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-2">
              <h4 className="text-sm font-bold text-yellow-800 mb-2">דיווח עבור מדריך אחר (Admin)</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">בחר מדריך קיים</label>
                  <select 
                    className="p-3 border rounded-lg bg-white"
                    onChange={(e) => {
                      const inst = uniqueInstructors.find(i => i.email === e.target.value);
                      setAdminSelectedInstructor(inst || null);
                      setSelectedSchool(null); // איפוס המוסד בשינוי מדריך
                      const form = e.target.form;
                      if (form && inst) {
                        form.firstName.value = inst.firstName;
                        form.lastName.value = inst.lastName;
                        form.email.value = inst.email;
                      }
                    }}
                  >
                    <option value="">-- בחר מדריך --</option>
                    {uniqueInstructors.map(i => (
                      <option key={i.email} value={i.email}>{i.firstName} {i.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">שם פרטי</label>
                  <input name="firstName" required className="p-3 border rounded-lg bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">שם משפחה</label>
                  <input name="lastName" required className="p-3 border rounded-lg bg-white" />
                </div>
                <div className="flex flex-col gap-1">
  <label className="text-xs font-bold text-slate-500">אימייל (אופציונלי)</label>
  <input name="email" type="email" className="p-3 border rounded-lg bg-white" placeholder="ניתן להשאיר ריק" />
</div>
              </div>
            </div>
          )}
        {/* שדה שם ביה"ס עם אפשרות בחירה או הקלדה לאדמין */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500">שם ביה"ס</label>
            <div className="flex gap-1">
              <select 
  name="schoolName" 
  // השדה חובה רק אם אתה לא אדמין, או אם אתה אדמין ועדיין לא הקלדת שם בתיבה הידנית
  required={!isAdmin && !selectedSchool?.name}
  value={selectedSchool?.name || ""}
                onChange={(e) => {
                  const schoolName = e.target.value;
                  const schoolList = (isAdmin && adminSelectedInstructor) ? adminSelectedInstructor.schools : assignedSchools;
                  const school = schoolList?.find((s: any) => s.name === schoolName);
                  setSelectedSchool(school || { name: schoolName, city: "" });
                }}
                className="p-3 border rounded-lg bg-slate-50 focus:bg-white transition-colors flex-1"
              >
                <option value="">בחר מוסד...</option>
                {(isAdmin && adminSelectedInstructor ? adminSelectedInstructor.schools : assignedSchools)?.map((s: any) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
              {isAdmin && (
                <input 
                  placeholder="או הקלד שם חדש..."
                  className="p-3 border rounded-lg bg-white w-1/3 text-xs border-dashed"
                 onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val) {
                      setSelectedSchool({ 
                        name: val, 
                        city: selectedSchool?.city || "" 
                      });
                    }
                  }}
                />
              )}
            </div>
          </div>
          
          {/* שדה עיר - מתמלא אוטומטית או ניתן להזנה ידנית לאדמין */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500">עיר</label>
            <input 
              name="cityName" 
              value={selectedSchool?.city || ""} 
              readOnly={!isAdmin} 
              onChange={(e) => isAdmin && setSelectedSchool(prev => ({ ...prev!, city: e.target.value }))}
              placeholder={isAdmin ? "הזן עיר..." : ""}
              className={`p-3 border rounded-lg ${!isAdmin ? 'bg-slate-200 cursor-not-allowed' : 'bg-white shadow-inner'}`} 
            />
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
            <label className="text-xs font-bold text-slate-500">תשלום ליום הדרכה/הוראה (₪)</label>
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

      {/* שורת פעולות: הכל מוצמד לימין בתוך מיכל ממורכז */}
      <div className="flex flex-col md:flex-row items-center justify-start gap-4 mb-4 mx-auto" style={{ maxWidth: '1000px' }}>
        
        {/* כפתור תשלום - ראשון מימין */}
        {isAdmin && reports.length > 0 && (
          <button 
            onClick={handleMakePayment}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            בוצע תשלום לדיווחים שנבחרו 💳
          </button>
        )}

        {/* בחירת חודש - שני מימין */}
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

        {/* חיפוש חופשי - שלישי מימין, אייקון בשמאל */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="חיפוש חופשי..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full p-2 pl-10 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right"
          />
          <span className="absolute left-3 top-2.5 opacity-30">🔍</span>
        </div>
      </div>
<section 
        className="ag-theme-quartz mx-auto" 
        style={{ 
          height: 450, 
          width: "100%",
          // במחשב (מעל 768 פיקסלים) נגביל ל-1000 פיקסלים, בנייד 100%
          maxWidth: typeof window !== 'undefined' && window.innerWidth > 768 ? '1000px' : '100%'
        }}
      >
        <AgGridReact
  ref={gridRef}
  rowData={filteredReports}
  quickFilterText={quickFilterText}
  defaultColDef={defaultColDef}
  components={components}
  onGridReady={(params) => {
    if (window.innerWidth < 768) params.api.sizeColumnsToFit();
  }}
  onGridSizeChanged={(params) => {
    if (window.innerWidth < 768) params.api.sizeColumnsToFit();
  }}
  getRowStyle={(params) => {
    if (params.data?.paymentId) {
      return { backgroundColor: '#fee2e2', color: '#991b1b' };
    }
    return undefined;
  }}
  enableRtl={true}
  context={{ handleEdit, handleDelete, isAdmin }}
  rowSelection="multiple"
  isRowSelectable={(rowNode) => !rowNode.data.paymentId}
  suppressRowClickSelection={true}
  columnDefs={[
    { 
      field: "firstName", 
      headerName: "שם", 
      hide: !isAdmin,
      checkboxSelection: isAdmin,
      headerCheckboxSelection: isAdmin,
      width: 150
    },
    { 
  field: "date", 
  headerName: "תאריך", 
  minWidth: 120, 
  filter: 'agDateColumnFilter', // שומר על לוח שנה
  filterParams: {
    buttons: ['reset', 'apply'],
    closeOnApply: true
  },
  valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('he-IL') : '' 
},
    { field: "schoolName", headerName: 'ביה"ס', minWidth: 150, flex: 1 },
    { field: "lessons", headerName: "שיעורים", width: 90 },
    { field: "dailyRate", headerName: "תעריף", valueFormatter: p => `₪${p.value}`, width: 100 },
    { field: "remarks", headerName: "הערות", minWidth: 200, flex: 2 },
    { 
      headerName: "פעולות", 
      cellRenderer: ActionButtonsRenderer, 
      width: 100,
      hide: !isAdmin 
    }
  ]}
/>
      </section>
    </div>
  );
}