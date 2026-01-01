"use client";
// ייבוא ה-Hook הקיים אצלך
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

import { CustomLinkDrive } from ".././GeneralFiles/GoogleDrive/CustomLinkDrive";
import useDrivePicker from "@/util/Google/GoogleDrive/Component";
import { deletePrograms, updateProgramsColumn, getAllProgramsData } from "@/db/programsRequests";
import { getAllDistricts } from "@/db/generalrequests"; 

import { ThemeContext } from "@/context/Theme/Theme";
import { YearContext } from "@/context/YearContext";
import { StatusContext } from "@/context/StatusContext";

import { SchoolChoosing } from "./components/SchoolChoosing";
import { RepresentiveComponent } from "./components/CustomRepresentive";
import { AssignedGuidesColumn } from "./components/AssignedGuidesColumn";
import CustomSelectCellEditor from "@/components/CustomSelect/CustomSelectCellEditor";
import { MultiSelectCellEditor } from "@/components/CustomSelect/MultiSelectCellEditor";

import YearFilter from "./components/YearFilter";
import StatusFilter from "./components/StatusFilter";
import Redirect from "@/components/Auth/Components/Redirect";

// === סגנונות צבע לעמודות (מעודכן עם צבעי פסטל) ===
const STYLES = {
    FINANCE_COL: { backgroundColor: '#ecfdf5', textAlign: 'center' as const }, // ירוק מנטה פסטלי בהיר
    BALANCE_COL: { backgroundColor: '#eff6ff', textAlign: 'center' as const, fontWeight: 'bold' }, // תכלת פסטלי שונה
    CENTER: { textAlign: 'center' as const }
};

// === פורמט תאריך עם שנה מקוצרת ===
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

// --- רכיב תצוגה (Renderer): מציג את הקישור אם קיים ---
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

// --- רכיב עריכה (Editor): שומר שם וקישור ---
const ProgramDetailsEditor = forwardRef((props: any, ref) => {
    const [name, setName] = useState(props.value || "");
    const [link, setLink] = useState(props.data.ProgramLink || "");
    const [saving, setSaving] = useState(false);

    useImperativeHandle(ref, () => ({
        getValue: () => name,
        isPopup: () => true
    }));

    const handleSave = async () => {
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
            <input className="form-control mb-3" value={name} onChange={e => setName(e.target.value)} autoFocus disabled={saving} />
            <label className="form-label text-sm fw-bold">קישור (Drive/Web)</label>
            <input className="form-control mb-3" value={link} onChange={e => setLink(e.target.value)} placeholder="הדבק קישור כאן..." disabled={saving} />
            <div className="d-flex justify-content-end gap-2">
                 <button className="btn btn-success btn-sm" onClick={handleSave} disabled={saving}>{saving ? "שומר..." : "שמור וסגור"}</button>
            </div>
        </div>
    );
});

// --- רכיב עריכה לאזורים ---
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
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }), control: (base) => ({ ...base, borderColor: '#ccc', boxShadow: 'none', minHeight: '30px' }), valueContainer: (base) => ({...base, padding: '2px 8px'}) }}
                autoFocus menuIsOpen={true} />
        </div>
    );
});


export default function ProgramsTable({ SchoolIDs }: { SchoolIDs?: number[] }) {
  const AuthenticateActivate = useDrivePicker("Program");
  const gridRef = useRef<AgGridReact>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [rowData, setRowData] = useState<any[]>([]);       
  const [isGridReady, setIsGridReady] = useState(false);   
  const [ignoreContextFilters, setIgnoreContextFilters] = useState(false);

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
    try {
        const [storageData, areasData] = await Promise.all([ getAllProgramsData(), getAllDistricts() ]);
        if (!storageData) return;

        const rawPrograms = storageData.Programs || [];
        const schools = storageData.Schools || [];
        const areaValues = (areasData || []).map((a: any) => a.AreaName).filter((name: any) => name && typeof name === 'string').sort();

        const schoolAreaMap = new Map();
        schools.forEach((s: any) => {
            const areaName = s.AreaName || s.Area || s.area || s.Region;
            if (areaName) schoolAreaMap.set(s.id || s.Schoolid, areaName);
        });

        const enrichedPrograms = rawPrograms.map((p: any) => ({
            ...p,
            Area: p.District || p.Area || schoolAreaMap.get(p.Schoolid) || ""
        }));

        const initialData = (SchoolIDs && SchoolIDs.length > 0) 
            ? enrichedPrograms.filter((p: any) => SchoolIDs.includes(p.Schoolid))
            : enrichedPrograms;

        setRowData(initialData);
        setAllSchools(schools);
        setAllContacts(storageData.schoolsContacts || []);
        maxIndex.current = rawPrograms.length > 0 ? Math.max(...rawPrograms.map((p: any) => p.Programid)) : 0;

        const getUniqueValues = (field: string) => [...new Set(enrichedPrograms.map((p: any) => p[field]).filter(Boolean))];

        const manualColumns = [
            { 
                field: "select", 
                headerName: "", // א' - כותרת ריקה
                checkboxSelection: true, 
                headerCheckboxSelection: true, 
                width: 50, 
                pinned: "right",
                lockPosition: true,
                filter: false,
                editable: false,
                suppressMovable: true
            },
            { field: "Programid", header: "מזהה", width: 90, editable: false, cellStyle: STYLES.CENTER },
            { field: "ProgramName", header: "שם תוכנית", width: 200, special: "link" },
            { field: "SchoolName", header: "שם בית ספר", width: 180, special: "school" },
            { field: "Area", header: "אזור", width: 160, editable: true, cellEditor: RegionSelectEditor, cellEditorParams: { values: areaValues }, singleClickEdit: true, filterParams: { values: areaValues } },
            { field: "CityName", colId: "City", header: "עיר", width: 120, filterParams: { values: getUniqueValues("CityName") } },
            { field: "Year", header: "שנה", width: 110, special: "year" },
            { field: "ChosenDay", header: "יום נבחר", width: 150, special: "days" },
            { field: "Status", header: "סטטוס", width: 130, special: "status" },
            { field: "SchoolsContact", header: "איש קשר", width: 180, special: "contact" },
            { field: "Assigned_guide", header: "מדריך משובץ", width: 160, special: "guide" },
            { field: "Grade", header: "שכבה", width: 100, cellStyle: STYLES.CENTER },
            { field: "Days", header: "ימים", width: 120, cellStyle: STYLES.CENTER },
            { field: "Weeks", header: "מספר שבועות", width: 110, cellStyle: STYLES.CENTER },
            { field: "Product", header: "מוצר", width: 150 },
            
            // ב' - צבעי פסטל לעמודות מחיר ושיעורים
            { field: "PricingPerPaidLesson", header: "מחיר לשיעור", width: 130, cellStyle: STYLES.FINANCE_COL },
            { field: "PaidLessonNumbers", header: "שיעורים לתשלום", width: 150, cellStyle: STYLES.FINANCE_COL },
            { 
                field: "TotalAmountIncludingTaxes", 
                header: "סה״כ כולל מע״מ", 
                width: 150, 
                cellStyle: STYLES.FINANCE_COL,
                editable: false, 
                valueGetter: (params: any) => {
                    const price = Number(params.data.PricingPerPaidLesson) || 0;
                    const lessons = Number(params.data.PaidLessonNumbers) || 0;
                    const extra = Number(params.data.AdditionalPayments) || 0;
                    return (price * lessons) + extra;
                }
            },
            { field: "FinalPrice", header: "מחיר לאחר הוצאות", width: 150 },
            { field: "EstimatedExpenses", header: "הוצאות משוערות", width: 130 },
            
            // ב' - יתרה לגבייה בצבע מאותה משפחה אך בולט
            { field: "PendingMoney", header: "יתרה לגבייה", width: 130, cellStyle: STYLES.BALANCE_COL },
            
            { field: "FreeLessonNumbers", header: "שיעורי בונוס", width: 130, cellStyle: STYLES.FINANCE_COL },
            { field: "AdditionalPayments", header: "תשלומים נוספים", width: 130, cellStyle: STYLES.FINANCE_COL },

            { field: "Notes", header: "הערות", width: 200 },
            { field: "Details", header: "פרטים נוספים", width: 150, hide: true },
            { field: "Order", header: "הצעה", width: 120, special: "drive" },
            { field: "EstablishmentNumber", header: "סמל מוסד", width: 100 },
            { field: "Date", header: "תאריך", width: 120, special: "date" },
            { field: "Schoolid", header: "מזהה ביס", hide: true }, 
            { field: "EducationStage", header: "שלב חינוך", hide: true }
        ];

        const colDef: ColDef[] = manualColumns.map((col: any) => {
            const base: ColDef = { 
                field: col.field, 
                colId: col.colId || col.field, 
                headerName: col.header || col.headerName, 
                filter: "CustomFilter", 
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
                return { ...base, cellRenderer: "CustomLinkDrive", editable: false, 
                    cellRendererParams: { targetEmail: "ruahmidbar.customers@gmail.com",
                        folderPath: (params: any) => {
                            const data = params.data;
                            return ["מחלקת שיווק ומכירות", data.Year, data.Area || "אזור כללי", data.CityName, data.SchoolName];
                        }
                    }
                };
            }
            if (col.special === "link") return { ...base, cellRenderer: ProgramLinkRenderer, cellEditor: ProgramDetailsEditor, cellEditorPopup: true };
            if (col.special === "school") return { ...base, cellRenderer: SchoolChoosing, cellRendererParams: { AllSchools: storageData.Schools } };
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
            if (col.special === "guide") return { ...base, cellRenderer: AssignedGuidesColumn, cellRendererParams: { guides: storageData.Guides || [], assigned_guides: storageData.AssignedGuides || [] } };
            if (col.special === "date") return { ...base, cellEditor: 'agDateCellEditor', valueFormatter: dateFormatter };

            return base;
        });
        setColDefs(colDef);
    } catch (error) { console.error("Failed to load data:", error); }
  }, [SchoolIDs]);

  const handleAiSubmit = async () => {};
  const onCancelChanges = useCallback(() => { if (gridRef.current) onGridReady({}); }, [onGridReady]);
  const onSaveChangeButtonClick = useCallback(() => { console.log("Saving changes..."); }, []);

  const onDeleteRows = useCallback(async () => {
    const selectedData = gridRef.current?.api.getSelectedRows();
    if (selectedData && selectedData.length > 0) {
        if(window.confirm(`האם למחוק ${selectedData.length} תוכניות?`)) {
            try {
                const idsToDelete = selectedData.map(row => Number(row.Programid)).filter(id => !isNaN(id));
                await deletePrograms(idsToDelete);
                gridRef.current?.api.applyTransaction({ remove: selectedData });
                setRowData(prev => prev.filter(p => !idsToDelete.includes(p.Programid)));
            } catch (error) { alert("שגיאה במחיקה"); }
        }
    } else alert("לא נבחרו שורות למחיקה");
  }, []);

  const onCellValueChanged = useCallback(async (event: any) => {
      const { colDef, data, oldValue, newValue } = event;
      if (oldValue === newValue) return;
      if (colDef.field === "ProgramName") return;
      try {
          let valueToSave = newValue;
          if (valueToSave === undefined || valueToSave === null) valueToSave = "";
          if (Array.isArray(valueToSave)) valueToSave = valueToSave.join(", "); 
          if (typeof valueToSave === 'object' && valueToSave !== null) valueToSave = valueToSave.value || valueToSave.label || "";
          await updateProgramsColumn(colDef.field === "Area" ? "District" : colDef.field, valueToSave, data.Programid);
      } catch (error) { event.node.setDataValue(colDef.field, oldValue); }
  }, []);

  return (
    <>
      <Navbar id="ProgramsNavBar" className="bg-[#12242E] flex flex-row-reverse p-2 gap-2 shadow-sm items-center">
        <Redirect type={'Programs'} ScopeType={'Drive'} />
        <div className="flex flex-row-reverse items-center gap-2">
          {(!ignoreContextFilters && (selectedYear || defaultStatus)) && (
             <span className="text-yellow-400 text-xs font-bold border border-yellow-400 rounded px-2 py-1 ml-2">
               מסונן: {selectedYear} {defaultStatus}
             </span>
          )}
          <button onClick={clearAllFilters} title="נקה את כל הסינונים"><FcCancel className="w-[37px] h-[37px]" /></button>
          <button onClick={onDeleteRows}><FcFullTrash className="w-[37px] h-[37px]" /></button>
          <button onClick={() => setColumnWindowOpen(true)}><FcAddColumn className="w-[37px] h-[37px]" /></button>
          <button onClick={() => gridRef.current?.api.applyTransaction({ add: [{ Programid: maxIndex.current + 1, Year: selectedYear, Status: defaultStatus }], addIndex: 0 })}><FcAddRow className="w-[37px] h-[37px]" /></button>
          <input className="text-right bg-white text-gray-500 w-[180px] h-[35px] p-2 rounded border-none" type="text" placeholder="חיפוש..." onInput={(e: any) => gridRef.current?.api.setQuickFilter(e.target.value)} />
          <div className="flex flex-row-reverse items-center gap-2 bg-[#1b2e3a] p-1 rounded border border-gray-700 mx-2">
            <button id="savechangesbutton" onClick={onSaveChangeButtonClick} className="hover:bg-rose-700 bg-rose-800 rounded px-3 py-1 text-white hidden">שמור</button>
            <button id="cancelchangesbutton" onClick={onCancelChanges} className="hover:bg-gray-500 bg-gray-600 rounded px-3 py-1 text-white hidden">ביטול</button>
            {!aiLoading ? ( <Button variant="info" size="sm" onClick={handleAiSubmit} className="fw-bold">ייצר ✨</Button> ) : ( 
                <button onClick={() => abortControllerRef.current?.abort()} className="bg-transparent border-none p-0"><MdStopCircle className="text-danger w-[32px] h-[32px]" /></button> 
            )}
            <input type="text" className="bg-transparent text-white border-none text-right outline-none px-2" placeholder="הזנה חכמה..." value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()} style={{ direction: 'rtl', width: '660px', fontSize: '14px' }} disabled={aiLoading} />
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
              CustomLinkDrive: (props: any) => <CustomLinkDrive {...props} AuthenticateActivate={AuthenticateActivate} type={"Program"} /> 
          }), [AuthenticateActivate])} 
          getRowId={(p) => p.data.Programid.toString()}
        />
      </div>
      {WindowManager()} 
    </>
  );
}