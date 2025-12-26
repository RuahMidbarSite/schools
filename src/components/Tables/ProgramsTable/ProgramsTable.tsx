"use client";
import useColumnHook from "../SmallContactsTable/hooks/ColumnHooks";
import { School, Guide, Program, SchoolsContact, Assigned_Guide, Cities, Areas, Years, ProductTypes, Orders, StatusPrograms } from "@prisma/client";
import { useState, useRef, useCallback, Suspense, useMemo, useEffect, useContext } from "react";
import { AgGridReact } from "ag-grid-react";
import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { CellValueChangedEvent, ColDef, IRowNode } from "ag-grid-community";
import { Button, Navbar, OverlayTrigger, Tooltip } from "react-bootstrap";
import { FcAddColumn, FcAddRow, FcCancel, FcFullTrash } from "react-icons/fc";
import { MdStopCircle } from "react-icons/md";

import { CustomLinkDrive } from ".././GeneralFiles/GoogleDrive/CustomLinkDrive";
import useDrivePicker from "@/util/Google/GoogleDrive/Component";
import { addProgramsRows, updateProgramsColumn } from "@/db/programsRequests";
import { getFromStorage, DataType } from "./Storage/ProgramsDataStorage";
import { ThemeContext } from "@/context/Theme/Theme";
import { YearContext } from "@/context/YearContext";
import { StatusContext } from "@/context/StatusContext";

import { SchoolChoosing } from "./components/SchoolChoosing";
import { RepresentiveComponent, ContactRepresentiveRef } from "./components/CustomRepresentive";
import { ProgramLinkDetailsCellRenderer, RefFunctions } from "./components/CustomProgramLinkDetailsCellRenderer";
import { ProgramLinkDetailsCellEditor } from "./components/CustomProgramLinkDetailsCellEditor";
import AssignedGuidesColumn from "./components/AssignedGuidesColumn";
import CustomSelectCellEditor from "@/components/CustomSelect/CustomSelectCellEditor";
import YearFilter from "./components/YearFilter";
import StatusFilter from "./components/StatusFilter";
import Redirect from "@/components/Auth/Components/Redirect";
import { ColumnManagementWindow } from "../../../components/ColumnManagementWindow";

export default function ProgramsTable({ SchoolIDs }: { SchoolIDs?: number[] }) {
  const AuthenticateActivate = useDrivePicker("Program");
  const gridRef = useRef<AgGridReact>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [rowData, setRowData] = useState<any[]>([]);
  const [colDefinition, setColDefs] = useState<ColDef[] | null>(null);
  const [colState, setColState] = useState<any>([]);
  const [columnWindowOpen, setColumnWindowOpen] = useState(false);
  const [InTheMiddleOfAddingRows, SetInTheMiddleOfAddingRows] = useState(false);

  const { theme } = useContext(ThemeContext);
  const { selectedYear } = useContext(YearContext);
  const { defaultStatus } = useContext(StatusContext);

  const [AllSchools, setAllSchools] = useState<any[]>([]);
  const [AllContacts, setAllContacts] = useState<SchoolsContact[]>([]);

  // 1. הגדרת ה-Hook לשמירה
  const { onColumnResized, onColumnMoved } = useColumnHook(gridRef, setColState, "ProgramsPage");

  const maxIndex = useRef(0);
  const dataRowCount = useRef(0);
  const rowCount = useRef(0);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const getFld = (obj: any, keys: string[]) => {
    for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    return "";
  };

  const onGridReady = useCallback(async (params) => {
    getFromStorage().then((data: DataType) => {
      if (data && data.Tablemodel) {
        setRowData(SchoolIDs ? (data.Programs || []).filter(p => SchoolIDs.includes(p.Schoolid)) : (data.Programs || []));
        setAllSchools(data.Schools || []);
        setAllContacts(data.schoolsContacts || []);
        maxIndex.current = (data.Programs || []).length > 0 ? Math.max(...data.Programs.map(p => p.Programid)) : 0;
        rowCount.current = (data.Programs || []).length;
        dataRowCount.current = (data.Programs || []).length;

        // טעינת המצב השמור מה-LocalStorage לפני בניית העמודות
        const savedRaw = localStorage.getItem("grid_column_state_ProgramsPage");
        const savedState = savedRaw ? JSON.parse(savedRaw) : [];
        
        const colDef = data.Tablemodel[0]?.map((value: any, index: number) => {
          if (value === "ProgramLink" || value === "Plan") return null;
          
          // חיפוש האם יש רוחב שמור לעמודה הזו
          const savedCol = savedState.find((s: any) => s.colId === value);
          
          const base: ColDef = { 
            field: value, 
            colId: value, 
            headerName: data.Tablemodel[1][index], 
            filter: "CustomFilter", 
            editable: true, 
            width: savedCol?.width || 145, // הזרקה ישירה של הרוחב השמור!
            hide: savedCol?.hide ?? false
          };

          if (value === "ProgramName") return { ...base, cellRenderer: ProgramLinkDetailsCellRenderer, cellRendererParams: { AllPrograms: data.Programs }, cellEditor: ProgramLinkDetailsCellEditor, width: savedCol?.width || 200 };
          if (value === "SchoolName") return { ...base, editable: false, cellRenderer: SchoolChoosing, cellRendererParams: { AllSchools: data.Schools }, width: savedCol?.width || 180 };
          if (value === "SchoolsContact") return { ...base, editable: false, cellRenderer: RepresentiveComponent, cellRendererParams: { AllSchools: data.Schools, AllContacts: data.schoolsContacts }, width: savedCol?.width || 180 };
          if (value === "Status") return { ...base, cellEditor: CustomSelectCellEditor, cellEditorParams: { values: data.ProgramsStatuses?.map(v => v.StatusName) }, filter: StatusFilter, width: savedCol?.width || 120 };
          if (value === "Year") return { ...base, cellEditor: CustomSelectCellEditor, cellEditorParams: { values: data.Years?.map(v => v.YearName) }, filter: YearFilter, width: savedCol?.width || 110 };
          return base;
        }).filter((c: any) => c !== null);
        
        setColDefs(colDef);

        // וידוא סופי לאחר רנדור
        setTimeout(() => {
          if (gridRef.current?.api && savedState.length > 0) {
            gridRef.current.api.applyColumnState({ state: savedState, applyOrder: true });
          }
        }, 100);
      }
    });
  }, [SchoolIDs]);

  // שאר הפונקציות (handleAiSubmit, onCancelChanges וכו') ללא שינוי...
  const handleAiSubmit = async () => { /* ... קוד קיים ... */ };
  const onCancelChanges = useCallback(() => { /* ... קוד קיים ... */ }, [rowCount.current, dataRowCount.current]);
  const onSaveChangeButtonClick = useCallback(() => { /* ... קוד קיים ... */ }, [rowCount.current, dataRowCount.current]);

  return (
    <>
      <Navbar id="ProgramsNavBar" className="bg-[#12242E] flex flex-row-reverse p-2 gap-2 shadow-sm items-center">
        <Redirect type={'Programs'} ScopeType={'Drive'} />
        <div className="flex flex-row-reverse items-center gap-2">
          <button onClick={() => gridRef.current?.api.setFilterModel(null)}><FcCancel className="w-[37px] h-[37px]" /></button>
          <button onClick={() => setColumnWindowOpen(true)}><FcAddColumn className="w-[37px] h-[37px]" /></button>
          <button onClick={() => gridRef.current?.api.applyTransaction({ add: [{ Programid: maxIndex.current + 1, Year: selectedYear, Status: defaultStatus }], addIndex: 0 })}><FcAddRow className="w-[37px] h-[37px]" /></button>
          <input className="text-right bg-white text-gray-500 w-[180px] h-[35px] p-2 rounded border-none" type="text" placeholder="חיפוש..." onInput={(e: any) => gridRef.current?.api.setQuickFilter(e.target.value)} />
          <div className="flex flex-row-reverse items-center gap-2 bg-[#1b2e3a] p-1 rounded border border-gray-700 mx-2">
            <button id="savechangesbutton" onClick={onSaveChangeButtonClick} className="hover:bg-rose-700 bg-rose-800 rounded px-3 py-1 text-white hidden">שמור</button>
            <button id="cancelchangesbutton" onClick={onCancelChanges} className="hover:bg-gray-500 bg-gray-600 rounded px-3 py-1 text-white hidden">ביטול</button>
            {!aiLoading ? ( <Button variant="info" size="sm" onClick={handleAiSubmit} className="fw-bold">ייצר ✨</Button> ) : ( <button onClick={() => abortControllerRef.current?.abort()} className="bg-transparent border-none p-0"><MdStopCircle className="text-danger w-[32px] h-[32px]" /></button> )}
            <input type="text" className="bg-transparent text-white border-none text-right outline-none px-2" placeholder="הזנה חכמה..." value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()} style={{ direction: 'rtl', width: '660px', fontSize: '14px' }} disabled={aiLoading} />
          </div>
        </div>
      </Navbar>
      <div className={theme === "dark-theme" ? "ag-theme-quartz-dark w-full flex-grow" : "ag-theme-quartz w-full flex-grow"} style={{ height: "calc(100vh - 150px)" }}>
        <AgGridReact 
          ref={gridRef} 
          rowData={rowData} 
          columnDefs={colDefinition} 
          enableRtl={true} 
          onGridReady={onGridReady} 
          onColumnResized={onColumnResized}
          onColumnMoved={onColumnMoved}
          rowSelection={"multiple"} 
          pagination={true} 
          paginationPageSize={25}
          components={useMemo(() => ({ SchoolChoosing, RepresentiveComponent, AssignedGuidesColumn, ProgramLinkDetailsCellRenderer, ProgramLinkDetailsCellEditor, CustomLinkDrive: (props: any) => <CustomLinkDrive {...props} AuthenticateActivate={AuthenticateActivate} type={"Program"} /> }), [AuthenticateActivate])} 
          getRowId={(p) => p.data.Programid.toString()}
        />
      </div>
      <ColumnManagementWindow show={columnWindowOpen} onHide={() => setColumnWindowOpen(false)} columnDefs={colDefinition} gridApi={gridRef.current?.api} colState={colState} setColState={setColState} />
    </>
  );
}