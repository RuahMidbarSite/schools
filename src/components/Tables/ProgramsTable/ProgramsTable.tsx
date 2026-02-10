"use client";
import useColumnHook from "../SmallContactsTable/hooks/ColumnHooks";
import useColumnEffects from "../SmallContactsTable/hooks/ColumnEffects"; 
import useColumnComponent from "../SmallContactsTable/hooks/ColumnComponent"; 
import { useExternalEffect } from "../GeneralFiles/Hooks/ExternalUseEffect";

import { SchoolsContact } from "@prisma/client";
import { useState, useRef, useCallback, useMemo, useContext, useEffect, forwardRef, useImperativeHandle } from "react";
import { AgGridReact } from "ag-grid-react";
import Select from "react-select";

import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { ColDef, ColumnResizedEvent } from "ag-grid-community";
import { Button, Navbar } from "react-bootstrap";
import { FcAddColumn, FcAddRow, FcCancel, FcFullTrash } from "react-icons/fc";
import { MdStopCircle } from "react-icons/md";
import { FaExternalLinkAlt } from "react-icons/fa"; 

import { CustomLinkDrive } from "../GeneralFiles/GoogleDrive/CustomLinkDrive";
import useDrivePicker from "@/util/Google/GoogleDrive/Component";

import { deletePrograms, updateProgramsColumn, getAllProgramsData, createProgram, saveNewPrograms } from "@/db/programsRequests";
import { getAllDistricts, getAllGuides, getAllAssignedInstructors, getPayments } from "@/db/generalrequests";

import { ThemeContext } from "@/context/Theme/Theme";
import { YearContext } from "@/context/YearContext";
import { StatusContext } from "@/context/StatusContext";

import { SchoolChoosing } from "./components/SchoolChoosing";
import { RepresentiveComponent } from "./components/CustomRepresentive";
import  AssignedGuidesColumn from "./components/AssignedGuidesColumn";
import CustomSelectCellEditor from "@/components/CustomSelect/CustomSelectCellEditor";
import { MultiSelectCellEditor } from "@/components/CustomSelect/MultiSelectCellEditor";

import YearFilter from "./components/YearFilter";
import StatusFilter from "./components/StatusFilter";
import Redirect from "@/components/Auth/Components/Redirect";
import { GoogleDriveAuthStatus } from "@/components/GoogleDriveAuthStatus";

// --- Styles & Formatters ---

const STYLES = {
    FINANCE_COL: { backgroundColor: '#ecfdf5', textAlign: 'center' as const }, 
    BALANCE_COL: { backgroundColor: '#eff6ff', textAlign: 'center' as const, fontWeight: 'bold' }, 
    GEO_COL: { backgroundColor: '#fff7ed', textAlign: 'center' as const }, 
    CENTER: { textAlign: 'center' as const }
};

const dateFormatter = (params: any) => {
  if (!params.value) return "";
  const date = new Date(params.value);
  return date.toLocaleDateString("he-IL", {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
  });
};

const arrayToStringFormatter = (params: any) => {
    if (Array.isArray(params.value)) {
        return params.value.join(", ");
    }
    return params.value;
};

// --- Custom Renderers & Editors ---

const ProgramLinkRenderer = (params: any) => {
    const name = params.value;
    const link = params.data.ProgramLink;

    if (link && typeof link === 'string' && link.trim() !== "") {
        return (
            <a 
                href={link} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                    color: '#0d6efd', 
                    textDecoration: 'underline', 
                    cursor: 'pointer'
                }}
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                {name}
            </a>
        );
    }
    return <span>{name}</span>;
};

const ProgramDetailsEditor = forwardRef((props: any, ref) => {
    const [name, setName] = useState(props.value || "");
    const [link, setLink] = useState(props.data.ProgramLink || "");
    const [saving, setSaving] = useState(false);

    useImperativeHandle(ref, () => ({
        getValue: () => name,
        isPopup: () => true
    }));

    const handleSave = async () => {
        if (props.data.isNew) {
            props.node.setDataValue("ProgramName", name);
            props.node.setDataValue("ProgramLink", link);
            props.stopEditing();
            return;
        }

        setSaving(true);
        try {
            await Promise.all([
                updateProgramsColumn("ProgramName", name, props.data.Programid),
                updateProgramsColumn("ProgramLink", link, props.data.Programid)
            ]);
            const updatedRow = { 
                ...props.data, 
                ProgramName: name, 
                ProgramLink: link 
            };
            props.node.updateData(updatedRow);
            props.stopEditing();
        } catch (error) {
            console.error("Error saving program details:", error);
            alert("שגיאה בשמירה, נא לנסות שוב.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-3 bg-white border rounded shadow-lg" style={{width: '320px', direction: 'rtl'}}>
            <h6 className="mb-3 border-bottom pb-2">עריכת פרטי תוכנית</h6>
            <label className="form-label text-sm fw-bold">שם התוכנית</label>
            <input className="form-control mb-3" value={name} onChange={e => setName(e.target.value)} autoFocus disabled={saving && !props.data.isNew} />
            <label className="form-label text-sm fw-bold">קישור (Drive/Web)</label>
            <input className="form-control mb-3" value={link} onChange={e => setLink(e.target.value)} placeholder="הדבק קישור כאן..." disabled={saving && !props.data.isNew} />
            <div className="d-flex justify-content-end gap-2">
                 <button className="btn btn-success btn-sm" onClick={handleSave} disabled={saving && !props.data.isNew}>{saving ? "שומר..." : "שמור וסגור"}</button>
            </div>
        </div>
    );
});

const RegionSelectEditor = forwardRef((props: any, ref) => {
    const options = props.values ? props.values.map((v: string) => ({ value: v, label: v })) : [];
    const getInitialValue = () => {
        if (!props.value) return null;
        let cleanValue = props.value;
        if (Array.isArray(cleanValue)) cleanValue = cleanValue[0];
        return options.find((o: any) => o.value === cleanValue) || null;
    };

    const [selectedOption, setSelectedOption] = useState(getInitialValue());
    const valueRef = useRef(getInitialValue());

    useImperativeHandle(ref, () => ({
        getValue: () => valueRef.current ? valueRef.current.value : "",
        isPopup: () => true 
    }));

    const handleChange = (val: any) => {
        setSelectedOption(val);
        valueRef.current = val;
        setTimeout(() => { if (props.stopEditing) props.stopEditing(); }, 0);
    };

    return (
        <div style={{ width: '200px' }}>
            <Select value={selectedOption} onChange={handleChange} options={options} isMulti={false} isRtl={true} placeholder="בחר אזור..." menuPortalTarget={document.body}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }), control: (base) => ({ ...base, borderColor: '#ccc', boxShadow: 'none', minHeight: '30px' }), valueContainer: (base) => ({...base, padding: '2px 8px'}), option: (base) => ({...base, textAlign: 'right'}) }}
                autoFocus menuIsOpen={true} />
        </div>
    );
});


// --- Main Component ---

export default function ProgramsTable({ SchoolIDs }: { SchoolIDs?: number[] }) {
  const AuthenticateActivate = useDrivePicker("Program");
  const gridRef = useRef<AgGridReact>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [rowData, setRowData] = useState<any[]>([]);       
  const [isGridReady, setIsGridReady] = useState(false);   
  const [ignoreContextFilters, setIgnoreContextFilters] = useState(false);
  
  const [hasNewRows, setHasNewRows] = useState(false);

  const [colDefinition, setColDefs] = useState<ColDef[] | any>([]);
  const [colState, setColState] = useState<any>([]);
  const [columnWindowOpen, setColumnWindowOpen] = useState(false);

  const { theme } = useContext(ThemeContext);
  const { selectedYear } = useContext(YearContext);
  const { defaultStatus } = useContext(StatusContext);

  const [AllSchools, setAllSchools] = useState<any[]>([]);
  const [AllContacts, setAllContacts] = useState<SchoolsContact[]>([]);

  const { updateColStateFromCache, updateColState } = useColumnEffects(gridRef, colState, setColState);
  useExternalEffect(updateColStateFromCache, [colDefinition]);
  useExternalEffect(updateColState, [colState]);

  const { onColumnMoved, onColumnResized: hookOnColumnResized } = useColumnHook(gridRef, setColState, "ProgramsPage");

  const { WindowManager } = useColumnComponent(columnWindowOpen, setColumnWindowOpen, colDefinition, gridRef, colState, setColState);

  const handleColumnResized = useCallback((params: ColumnResizedEvent) => {
      if (params.finished) {
          if (hookOnColumnResized) hookOnColumnResized(params);
          if (gridRef.current?.api) {
              const newState = gridRef.current.api.getColumnState();
              setColState(newState);
              localStorage.setItem("grid_column_state_ProgramsPage", JSON.stringify(newState));
          }
      }
  }, [hookOnColumnResized, setColState]);

  useEffect(() => {
    if (isGridReady && colState && colState.length > 0 && gridRef.current?.api) {
        gridRef.current.api.applyColumnState({ state: colState, applyOrder: true });
    }
  }, [colState, isGridReady]);

  const maxIndex = useRef(0);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      flex: 0,
      minWidth: 10,
      resizable: true,
      sortable: true,
      filter: true,
      editable: true
    };
  }, []);

  useEffect(() => {
    if (!isGridReady || !gridRef.current?.api || rowData.length === 0 || ignoreContextFilters) return;
    const filterModel: any = {};
    let hasFilter = false;

    if (selectedYear && selectedYear !== 'All') {
        filterModel['Year'] = { filterType: 'set', values: [selectedYear] };
        hasFilter = true;
    }
    if (defaultStatus && defaultStatus !== 'All') {
        filterModel['Status'] = { filterType: 'set', values: [defaultStatus] };
        hasFilter = true;
    }
    if (hasFilter) gridRef.current.api.setFilterModel(filterModel);
    else gridRef.current.api.setFilterModel(null);

  }, [selectedYear, defaultStatus, isGridReady, rowData, ignoreContextFilters]);

  const clearAllFilters = useCallback(() => {
    gridRef.current?.api.setFilterModel(null);
    gridRef.current?.api.setQuickFilter(null);
    setIgnoreContextFilters(true);
  }, []);

 const onGridReady = useCallback(async (params: any) => {
    setIsGridReady(true);
    setHasNewRows(false); 
    try {
        // טעינת נתוני תשלומים בנוסף לשאר הנתונים
        const [storageData, areasData, guidesData, assignedGuidesData, paymentsData] = await Promise.all([
            getAllProgramsData(), 
            getAllDistricts(),
            getAllGuides(),              
            getAllAssignedInstructors(),
            getPayments() // <--- הוספת פונקציית הטעינה כאן
        ]);        

        if (!storageData) return;

        // יצירת מפה לחישוב מהיר של סך התשלומים לכל תוכנית
       const paymentsMap = new Map();
if (paymentsData) {
    paymentsData.forEach((p: any) => {
        // יצירת מפתח ייחודי המשלב את מספר התוכנית והשנה
        const key = `${p.Programid}_${p.Year}`; 
        const current = paymentsMap.get(key) || 0;
        paymentsMap.set(key, current + (p.Amount || 0));
    });
}

        const rawPrograms = storageData.Programs || [];
        const schools = storageData.Schools || [];
        const areaValues = (areasData || []).map((a: any) => a.AreaName).filter((name: any) => name && typeof name === 'string').sort();

        const schoolAreaMap = new Map();
        schools.forEach((s: any) => {
            const areaName = s.AreaName || s.Area || s.area || s.Region;
            if (areaName) schoolAreaMap.set(s.id || s.Schoolid, areaName);
        });

        // הצמדת סך התשלומים לכל אובייקט תוכנית
       const enrichedPrograms = rawPrograms.map((p: any) => {
    const key = `${p.Programid}_${p.Year}`;
    return {
        ...p,
        totalPaid: paymentsMap.get(key) || 0 // סכימה רק של מה ששולם בשנה הזו
    };
});

        const initialData = (SchoolIDs && SchoolIDs.length > 0) 
            ? enrichedPrograms.filter((p: any) => SchoolIDs.includes(p.Schoolid))
            : enrichedPrograms;

        setRowData(initialData);
        setAllSchools(schools);
        setAllContacts(storageData.schoolsContacts || []);
        maxIndex.current = rawPrograms.length > 0 ? Math.max(...rawPrograms.map((p: any) => p.Programid)) : 0;
// המשך הפונקציה (הגדרת manualColumns) להלן...

        const getUniqueValues = (field: string) => [...new Set(enrichedPrograms.map((p: any) => p[field]).filter(Boolean))];

        // --- עדכון רוחב עמודות וסדר ---
        const manualColumns = [
            { 
                field: "select", 
                headerName: "", 
                checkboxSelection: true, 
                headerCheckboxSelection: true, 
                width: 45,
                pinned: "right",
                lockPosition: true,
                filter: false,
                editable: false,
                suppressMovable: true
            },
            { field: "Programid", header: "מזהה", width: 50, editable: false, cellStyle: STYLES.CENTER },
            // MOVED HERE: Order (הצעה)
            { field: "Year", header: "שנה", width: 75, special: "year" },
            { field: "Status", header: "סטטוס", width: 85, special: "status" },
            { field: "Order", header: "הצעה", width: 65, special: "drive" }, 
            { field: "ProgramName", header: "שם תוכנית", width: 100, special: "link" },
            // MOVED HERE: Date (תאריך)
            { field: "Date", header: "תאריך", width: 95, special: "date" },
            { field: "SchoolName", header: "שם בית ספר", width: 210, special: "school", editable: true },
            { field: "Area", header: "אזור", width: 70, editable: true, cellStyle: STYLES.GEO_COL, cellEditor: RegionSelectEditor, cellEditorParams: { values: areaValues }, singleClickEdit: true, filterParams: { values: areaValues } },
            { field: "CityName", colId: "City", header: "עיר", width: 100, cellStyle: STYLES.GEO_COL, filterParams: { values: getUniqueValues("CityName") } },
            { field: "ChosenDay", header: "יום נבחר", width: 65, special: "days" },
            { field: "SchoolsContact", header: "איש קשר", width: 140, special: "contact" },
            { field: "Assigned_guide", header: "מדריך משובץ", width: 60, special: "guide" },
            { field: "Grade", header: "שכבה", width: 60, cellStyle: STYLES.CENTER },
            { field: "Days", header: "ימים", width: 70, cellStyle: STYLES.CENTER },
            { field: "Weeks", header: "מספר שבועות", width: 60, cellStyle: STYLES.CENTER },
            { 
                field: "LessonsPerDay", // <--- השינוי: L גדולה
                header: "שיעורים ביום", 
                width: 110, 
                editable: true,
                cellEditor: CustomSelectCellEditor, 
                cellEditorParams: { 
                    values: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] 
                },
                cellStyle: STYLES.CENTER
            },
            { field: "Product", header: "מוצר", width: 70 },
            { field: "PricingPerPaidLesson", header: "מחיר לשיעור", width: 70, cellStyle: STYLES.FINANCE_COL },
            { field: "PaidLessonNumbers", header: "שיעורים לתשלום", width: 60, cellStyle: STYLES.FINANCE_COL },
            { field: "AdditionalPayments", header: "תשלומים נוספים", width: 80, cellStyle: STYLES.FINANCE_COL },
            { 
                field: "TotalAmountIncludingTaxes", 
                header: "סה״כ כולל מע״מ", 
                width: 80, 
                cellStyle: STYLES.FINANCE_COL,
                editable: false, 
                valueGetter: (params: any) => {
                    const price = Number(params.data.PricingPerPaidLesson) || 0;
                    const lessons = Number(params.data.PaidLessonNumbers) || 0;
                    const extra = Number(params.data.AdditionalPayments) || 0;
                    return (price * lessons) + extra;
                }
            },
            { field: "FreeLessonNumbers", header: "שיעורי בונוס", width: 60, cellStyle: STYLES.FINANCE_COL },
            { field: "FinalPrice", header: "מחיר לאחר הוצאות", width: 80 },
            { field: "EstimatedExpenses", header: "הוצאות משוערות", width: 80 },
{ 
                field: "PendingMoney", 
                header: "יתרה לגבייה", 
                width: 70, 
                cellStyle: STYLES.BALANCE_COL,
                editable: false,
                valueGetter: (params: any) => {
                    const data = params.data;
                    const price = Number(data.PricingPerPaidLesson) || 0;
                    const lessons = Number(data.PaidLessonNumbers) || 0;
                    const extra = Number(data.AdditionalPayments) || 0;
                    const totalExpected = (price * lessons) + extra;
                    const paid = Number(data.totalPaid) || 0;
                    return totalExpected - paid;
                },
                valueFormatter: (params: any) => {
                    return params.value !== undefined ? params.value.toLocaleString() + ' ₪' : '';
                }
            },          
          
            { field: "Notes", header: "הערות", width: 180 },
            { field: "Details", header: "פרטים נוספים", width: 140, hide: true },
            { field: "EstablishmentNumber", header: "סמל מוסד", width: 60 },
            { field: "Schoolid", header: "מזהה ביס", hide: true }, 
            { field: "EducationStage", header: "שלב חינוך", hide: true }
        ];

        const colDef: ColDef[] = manualColumns.map((col: any) => {
            const base: ColDef = { 
                field: col.field, 
                colId: col.colId || col.field, 
                headerName: col.header || col.headerName, 
                filter: col.filter !== undefined ? col.filter : true, 
                editable: col.editable !== undefined ? col.editable : true, 
                width: col.width, 
                hide: col.hide || false,
                checkboxSelection: col.checkboxSelection,
                headerCheckboxSelection: col.headerCheckboxSelection,
                pinned: col.pinned as any,
                lockPosition: col.lockPosition,
                cellEditor: col.cellEditor, 
                cellEditorParams: col.cellEditorParams, 
                filterParams: col.filterParams,
                singleClickEdit: col.singleClickEdit,
                valueFormatter: col.valueFormatter,
                cellStyle: col.cellStyle,
                valueGetter: col.valueGetter,
                suppressMovable: col.suppressMovable
            };

            if (col.special === "drive") {
                return { 
                    ...base, 
                    cellRenderer: "OrderFileRenderer", 
                    editable: false,
                    cellRendererParams: { 
                        targetEmail: "ruahmidbar.customers@gmail.com",
                        folderPath: (params: any) => {
                            const data = params.data;
                            return ["מחלקת שיווק ומכירות", data.Year, data.Area || "אזור כללי", data.CityName, data.SchoolName];
                        }
                    }
                };
            }
            if (col.special === "link") return { ...base, cellRenderer: ProgramLinkRenderer, cellEditor: ProgramDetailsEditor, cellEditorPopup: true };
            
            if (col.special === "school") return { 
                ...base, 
                cellEditor: SchoolChoosing, 
                cellEditorPopup: false,
                cellEditorParams: { AllSchools: storageData.Schools },
                cellRendererParams: { AllSchools: storageData.Schools },
            };
            
            if (col.special === "contact") return { ...base, cellRenderer: RepresentiveComponent, cellRendererParams: { AllSchools: storageData.Schools, AllContacts: storageData.schoolsContacts } };
            if (col.special === "status") {
                const statusValues = storageData.ProgramsStatuses?.map((v:any) => v.StatusName);
                return { ...base, cellEditor: CustomSelectCellEditor, cellEditorParams: { values: statusValues }, filter: StatusFilter, filterParams: { values: statusValues } };
            }
            if (col.special === "year") {
                const yearValues = storageData.Years?.map((v:any) => v.YearName);
                return { ...base, cellEditor: CustomSelectCellEditor, cellEditorParams: { values: yearValues }, filter: YearFilter, filterParams: { values: yearValues } };
            }
            if (col.special === "days") return { ...base, cellEditor: MultiSelectCellEditor, cellEditorPopup: true, cellEditorParams: { values: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'] }, valueFormatter: arrayToStringFormatter };
if (col.special === "guide") {
    return { 
        ...base, 
        cellRenderer: AssignedGuidesColumn, 
        cellRendererParams: { 
            guides: guidesData || [],               // שימוש במשתנה החדש שהבאנו
            assigned_guides: assignedGuidesData || [] // שימוש במשתנה החדש שהבאנו
        } 
    };
}
            if (col.special === "date") return { ...base, cellEditor: 'agDateCellEditor', valueFormatter: dateFormatter };

            return base;
        });
       // החלף את ה-Log הקודם בזה:
console.log("SANITY CHECK VALUES:", JSON.stringify({ 
    GuidesCount: guidesData?.length, 
    AssignedCount: assignedGuidesData?.length
}));
        setColDefs(colDef);
    } catch (error) { console.error("Failed to load data:", error); }
  }, [SchoolIDs]);

  const handleAddRow = useCallback(() => {
    const nextId = (maxIndex.current || 0) + 1;
    maxIndex.current = nextId; 

    const newRowData = { 
        Programid: nextId, 
        Year: selectedYear || "תשפד", 
        Status: defaultStatus || "חדש",
        CityName: null, 
        Area: null,
        isNew: true 
    };

    gridRef.current?.api.applyTransaction({ 
        add: [newRowData], 
        addIndex: 0 
    });
    
    setHasNewRows(true);

    setTimeout(() => {
        gridRef.current?.api.ensureIndexVisible(0);
        gridRef.current?.api.setFocusedCell(0, 'SchoolName');
        gridRef.current?.api.startEditingCell({
            rowIndex: 0,
            colKey: 'SchoolName'
        });
    }, 100);

  }, [selectedYear, defaultStatus]);

const onSaveChangeButtonClick = useCallback(async () => {
      const newRows: any[] = [];
      gridRef.current?.api.forEachNode((node) => {
          if (node.data.isNew) {
              const cleanRow = { ...node.data };

              // תיקון קריטי: המרת lessonsPerDay ל-LessonsPerDay ומספר
              if (cleanRow.lessonsPerDay !== undefined) {
                  cleanRow.LessonsPerDay = Number(cleanRow.lessonsPerDay);
                  delete cleanRow.lessonsPerDay; 
              }
              if (cleanRow.LessonsPerDay !== undefined && cleanRow.LessonsPerDay !== null) {
                   cleanRow.LessonsPerDay = Number(cleanRow.LessonsPerDay);
              }

              newRows.push(cleanRow);
          }
      });

      if (newRows.length === 0) {
          console.log("No new rows to save.");
          return;
      }
      
      try {
          await saveNewPrograms(newRows);
          alert("נשמר בהצלחה!");
          onGridReady({});
      } catch (error) {
          console.error("Save failed:", error);
          alert("שגיאה בשמירה.");
      }
  }, [onGridReady]);

  const handleAiSubmit = async () => {};
  const onCancelChanges = useCallback(() => { if (gridRef.current) onGridReady({}); }, [onGridReady]);

  const onDeleteRows = useCallback(async () => {
    const selectedData = gridRef.current?.api.getSelectedRows();
    if (selectedData && selectedData.length > 0) {
        if(window.confirm(`האם למחוק ${selectedData.length} תוכניות?`)) {
            try {
                const idsToDelete = selectedData
                    .filter(row => !row.isNew)
                    .map(row => Number(row.Programid))
                    .filter(id => !isNaN(id));
                
                if (idsToDelete.length > 0) {
                    await deletePrograms(idsToDelete);
                }
                
                gridRef.current?.api.applyTransaction({ remove: selectedData });
                setRowData(prev => prev.filter(p => !selectedData.some(s => s.Programid === p.Programid)));
                
                let remainingNew = false;
                gridRef.current?.api.forEachNode(n => { if (n.data.isNew) remainingNew = true; });
                setHasNewRows(remainingNew);

            } catch (error) { alert("שגיאה במחיקה"); }
        }
    } else alert("לא נבחרו שורות למחיקה");
  }, []);

  const onCellValueChanged = useCallback(async (event: any) => {
      const { colDef, data, oldValue, newValue } = event;
      if (oldValue === newValue) return;
      
      if (data.isNew) {
          return;
      }

      if (colDef.field === "ProgramName") return;
      
      try {
          let valueToSave = newValue;

          // תיקון: המרה למספר עבור שדות מספריים
          if (colDef.field === "LessonsPerDay") {
              valueToSave = Number(valueToSave);
          }
          // סוף תיקון

          if (valueToSave instanceof Date) {
              valueToSave = valueToSave.toISOString();
          } 
          else if (typeof valueToSave === 'object' && valueToSave !== null) {
              valueToSave = valueToSave.value || valueToSave.label || "";
          }

          if (valueToSave === undefined || valueToSave === null) valueToSave = "";
          // שינוי קטן: לא להפוך למחרוזת אם זה אמור להיות מספר
          if (Array.isArray(valueToSave)) valueToSave = valueToSave.join(", "); 

          await updateProgramsColumn(colDef.field === "Area" ? "District" : colDef.field, valueToSave, data.Programid);
      } catch (error) { 
          event.node.setDataValue(colDef.field, oldValue); 
          console.error("Update failed:", error);
          alert("שגיאה בעדכון הנתונים. ודא שהערך תקין.");
      }
  }, []);
const checkDriveStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/google-drive/check-status?type=programs');
      if (!response.ok) {
        return { isConnected: false };
      }
      return await response.json();
    } catch (error) {
      console.error("Error checking Drive status:", error);
      return { isConnected: false };
    }
  }, []);

  const onDisconnectDrive = useCallback(async () => {
    try {
      await fetch('/api/google-drive/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'programs' }),
      });
    } catch (error) {
      console.error("Error disconnecting Drive:", error);
    }
  }, []);
  return (
    <>
<Navbar 
  id="ProgramsNavBar" 
  className="flex justify-between items-center p-2 shadow-sm"
  style={{
    background: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    minHeight: '64px',
    borderBottom: '1px solid rgba(203, 213, 225, 0.3)'
  }}
>  
  <div className="flex items-center">
    <div className="bg-blue-100 px-4 py-2 rounded-lg border border-blue-300 shadow-sm">
      <GoogleDriveAuthStatus
        type="Programs"
        checkAuthStatus={checkDriveStatus}
        onDisconnect={onDisconnectDrive}
      />
    </div>
  </div>

  <div className="flex flex-row-reverse items-center gap-2">
    <Redirect type={'Programs'} ScopeType={'Drive'} />
    
    {(!ignoreContextFilters && (selectedYear || defaultStatus)) && (
       <span className="text-yellow-400 text-xs font-bold border border-yellow-400 rounded px-2 py-1 ml-2">
         מסונן: {selectedYear} {defaultStatus}
       </span>
    )}
    
    <button onClick={clearAllFilters} title="נקה את כל הסינונים"><FcCancel className="w-[37px] h-[37px]" /></button>
    <button onClick={onDeleteRows}><FcFullTrash className="w-[37px] h-[37px]" /></button>
    <button onClick={() => setColumnWindowOpen(true)}><FcAddColumn className="w-[37px] h-[37px]" /></button>
    <button onClick={handleAddRow} title="הוסף שורה חדשה"><FcAddRow className="w-[37px] h-[37px]" /></button>
    
    <input 
      className="text-right bg-white text-gray-500 w-[180px] h-[35px] p-2 rounded border-none" 
      type="text" 
      placeholder="חיפוש..." 
      onInput={(e: any) => gridRef.current?.api.setQuickFilter(e.target.value)} 
    />
    
<div className="flex flex-row-reverse items-center gap-2 bg-slate-200 p-1 rounded border border-slate-300 mx-2"><button 
        id="savechangesbutton" 
        onClick={onSaveChangeButtonClick} 
        className={`hover:bg-rose-700 bg-rose-800 rounded px-3 py-1 text-white ${hasNewRows ? '' : 'hidden'}`}
      >
        שמור ({hasNewRows ? 'שינויים' : ''})
      </button>

      <button 
        id="cancelchangesbutton" 
        onClick={onCancelChanges} 
        className="hover:bg-gray-500 bg-gray-600 rounded px-3 py-1 text-white hidden"
      >
        בטול
      </button>
      
      {!aiLoading ? ( 
        <Button variant="info" size="sm" onClick={handleAiSubmit} className="fw-bold">ייצר ✨</Button> 
      ) : ( 
        <button onClick={() => abortControllerRef.current?.abort()} className="bg-transparent border-none p-0">
          <MdStopCircle className="text-danger w-[32px] h-[32px]" />
        </button> 
      )}
      
      <input 
  type="text" 
  className="bg-white text-gray-700 border border-gray-300 text-right outline-none px-2 rounded" 
  placeholder="הזנה חכמה..." 
  value={aiInput} 
  onChange={(e) => setAiInput(e.target.value)} 
  onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()} 
  style={{ direction: 'rtl', width: '660px', fontSize: '14px' }} 
  disabled={aiLoading} 
/>
    </div>
  </div>
</Navbar>
      <div className={theme === "dark-theme" ? "ag-theme-quartz-dark w-full flex-grow" : "ag-theme-quartz w-full flex-grow"} style={{ height: "calc(100vh - 150px)" }}>
        <AgGridReact 
          ref={gridRef} 
          rowData={rowData} 
          columnDefs={colDefinition} 
          defaultColDef={defaultColDef} 
          enableRtl={true} 
          onGridReady={onGridReady} 
          onColumnResized={handleColumnResized}
          onColumnMoved={onColumnMoved}
          onCellValueChanged={onCellValueChanged}
          rowSelection={"multiple"} 
          pagination={true} 
          paginationPageSize={25}
          components={useMemo(() => ({ 
              SchoolChoosing, RepresentiveComponent, AssignedGuidesColumn, ProgramLinkDetailsCellRenderer: ProgramLinkRenderer, ProgramLinkDetailsCellEditor: ProgramDetailsEditor, 
              MultiSelectCellEditor, CustomSelectCellEditor, RegionSelectEditor, 
              OrderFileRenderer: (props: any) => {
                 const { value, data, node } = props;
                 const deleteDriveFile = AuthenticateActivate("delete");

                 const handleDelete = async (e: any) => {
                     e.stopPropagation();
                     
                     if (!window.confirm("האם למחוק את קובץ ההצעה לצמיתות?")) return;
                     
                     if (value && typeof value === 'string' && value.includes('/d/')) {
                         deleteDriveFile({
                             data: value,
                             callbackFunction: async (res: any) => {
                                 if (res.result === "Success" || (res.data && res.data.status === 404)) {
                                     try {
                                         await updateProgramsColumn("Order", null, data.Programid);
                                         node.setDataValue("Order", null); 
                                     } catch (err) {
                                         console.error(err);
                                         alert("שגיאה במחיקת הקישור מהמסד נתונים");
                                     }
                                 } else {
                                     alert("שגיאה במחיקה מגוגל דרייב");
                                 }
                             }
                         });
                     } else {
                         try {
                             await updateProgramsColumn("Order", null, data.Programid);
                             node.setDataValue("Order", null); 
                         } catch (err) {
                             console.error(err);
                             alert("שגיאה במחיקת הקישור");
                         }
                     }
                 };

                 if (value && typeof value === 'string' && value.startsWith('http')) {
                     return (
                         <div className="d-flex justify-content-between align-items-center w-100 px-1">
                             <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-underline" style={{fontSize: '12px'}}>
                                 הצעה <FaExternalLinkAlt size={10} className="ms-1" />
                             </a>
                             <button onClick={handleDelete} className="btn btn-link p-0 text-danger" title="מחק קובץ לצמיתות">
                                 <FcFullTrash size={16} />
                             </button>
                         </div>
                     );
                 }
                 return <CustomLinkDrive {...props} AuthenticateActivate={AuthenticateActivate} type={"Program"} />;
              },

              CustomLinkDrive: (props: any) => <CustomLinkDrive {...props} AuthenticateActivate={AuthenticateActivate} type={"Program"} /> 
          }), [AuthenticateActivate])} 
          getRowId={(p) => p.data.Programid.toString()}
        />
      </div>
      {WindowManager()} 
    </>
  );
}