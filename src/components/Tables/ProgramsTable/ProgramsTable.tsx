"use client";
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
  const [colDefinition, setColDefs] = useState<any>(null);
  const [colState, setColState] = useState<any>([]);
  const [columnWindowOpen, setColumnWindowOpen] = useState(false);
  const [InTheMiddleOfAddingRows, SetInTheMiddleOfAddingRows] = useState(false);

  const { theme } = useContext(ThemeContext);
  const { selectedYear } = useContext(YearContext);
  const { defaultStatus } = useContext(StatusContext);

  const [AllSchools, setAllSchools] = useState<any[]>([]);
  const [AllContacts, setAllContacts] = useState<SchoolsContact[]>([]);

  const maxIndex = useRef(0);
  const dataRowCount = useRef(0);
  const rowCount = useRef(0);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const getFld = (obj: any, keys: string[]) => {
    for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    return "";
  };

  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/ai-match', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiInput }),
        signal: abortControllerRef.current.signal 
      });

      const data = await res.json();
      const schoolPart = (data.RawSchoolName || "").trim();
      const cityPart = (data.City || "").trim();
      
      // פונקציית נירמול להשוואת אזורים חכמה
      const normalizeRegion = (text: any) => String(text || "").replace(/^אזור\s+/, "").trim();
      const aiDistrict = normalizeRegion(data.District);

      let matchedSchool = AllSchools.find(s => {
        const name = String(getFld(s, ["SchoolName", "שם בית ספר"])).trim();
        const city = String(getFld(s, ["CityName", "City", "עיר"])).trim();
        const schoolDistrict = normalizeRegion(getFld(s, ["AreaName", "District", "אזור"]));
        
        // השוואה חכמה שכוללת שם, עיר ואזור (אם קיים מה-AI)
        const isNameMatch = name.includes(schoolPart);
        const isCityMatch = city.includes(cityPart);
        const isDistrictMatch = aiDistrict ? schoolDistrict.includes(aiDistrict) : true;

        return isNameMatch && isCityMatch && isDistrictMatch;
      });

      if (!matchedSchool && schoolPart) {
        const suggestions = AllSchools.filter(s => String(getFld(s, ["SchoolName", "שם בית ספר"])).includes(schoolPart)).slice(0, 5);
        if (suggestions.length > 0) {
          const suggestionsText = suggestions.map((s, i) => `${i + 1}. ${getFld(s, ["SchoolName", "שם בית ספר"])}-${getFld(s, ["CityName", "City", "עיר"])}`).join("\n");
          const userChoice = prompt(`לא נמצאה הצלבה אוטומטית. האם התכוונת ל:\n\n${suggestionsText}`, "1");
          if (userChoice) matchedSchool = suggestions[parseInt(userChoice) - 1];
        }
      }

      const contact = matchedSchool ? AllContacts.find(c => c.Schoolid === matchedSchool.Schoolid && c.IsRepresentive) : null;
      const newId = ++maxIndex.current;
      
      const sName = matchedSchool ? getFld(matchedSchool, ["SchoolName", "שם בית ספר"]) : schoolPart;
      const sCity = matchedSchool ? getFld(matchedSchool, ["CityName", "City", "עיר"]) : cityPart;
      const finalSchoolName = matchedSchool ? sName : (sCity ? `${sName}-${sCity}` : sName);

      const newRow = { 
        Programid: newId, 
        ProgramName: data.ProgramName || "חדש", 
        SchoolName: finalSchoolName, 
        Schoolid: matchedSchool ? matchedSchool.Schoolid : null, 
        SchoolsContact: contact ? contact.ContactName : "",
        CityName: sCity,
        District: matchedSchool ? getFld(matchedSchool, ["AreaName", "District", "אזור"]) : data.District,
        Date: data.Date || null,
        Weeks: Number(data.Weeks) || 0,
        LessonsPerDay: Number(data.LessonsPerDay) || 0,
        PricingPerPaidLesson: Number(data.PricingPerPaidLesson) || 0,
        Year: selectedYear !== "הכל" ? selectedYear : new Date().getFullYear().toString(), 
        Status: defaultStatus !== "הכל" ? defaultStatus : "טיוטה"
      };

      gridRef.current?.api.applyTransaction({ add: [newRow], addIndex: 0 });
      
      setTimeout(() => {
        const node = gridRef.current?.api.getRowNode(newId.toString());
        if (node) {
          node.setDataValue("CityName", newRow.CityName);
          node.setDataValue("District", newRow.District);
          node.setDataValue("LessonsPerDay", newRow.LessonsPerDay);
          node.setDataValue("Date", newRow.Date);
          node.setDataValue("Weeks", newRow.Weeks);
          node.setDataValue("SchoolsContact", newRow.SchoolsContact);
        }
      }, 100);

      rowCount.current++;
      SetInTheMiddleOfAddingRows(true);
      document.getElementById("savechangesbutton")!.style.display = "block";
      document.getElementById("cancelchangesbutton")!.style.display = "block";
    } catch (e) { alert("שגיאה בעיבוד הנתונים"); } finally { setAiLoading(false); }
  };

  const onCancelChanges = useCallback(() => {
    const newlyAdded: any[] = [];
    gridRef.current?.api.forEachNode((node, index) => { if (index < (rowCount.current - dataRowCount.current)) newlyAdded.push(node.data); });
    gridRef.current?.api.applyTransaction({ remove: newlyAdded });
    rowCount.current = dataRowCount.current;
    SetInTheMiddleOfAddingRows(false);
    setAiInput(""); 
    document.getElementById("savechangesbutton")!.style.display = "none";
    document.getElementById("cancelchangesbutton")!.style.display = "none";
  }, [rowCount.current, dataRowCount.current]);

  const onSaveChangeButtonClick = useCallback(() => {
    const newly_added: any[] = [];
    gridRef.current?.api.forEachNode((node, index) => { if (index < rowCount.current - dataRowCount.current) newly_added.push(node.data); });
    addProgramsRows(newly_added);
    dataRowCount.current = rowCount.current;
    SetInTheMiddleOfAddingRows(false);
    setAiInput("");
    document.getElementById("savechangesbutton")!.style.display = "none";
    document.getElementById("cancelchangesbutton")!.style.display = "none";
  }, [rowCount.current, dataRowCount.current]);

  const onGridReady = useCallback(async (params) => {
    getFromStorage().then((data: DataType) => {
      if (data && data.Tablemodel) {
        setRowData(SchoolIDs ? (data.Programs || []).filter(p => SchoolIDs.includes(p.Schoolid)) : (data.Programs || []));
        setAllSchools(data.Schools || []);
        setAllContacts(data.schoolsContacts || []);
        maxIndex.current = (data.Programs || []).length > 0 ? Math.max(...data.Programs.map(p => p.Programid)) : 0;
        rowCount.current = (data.Programs || []).length;
        dataRowCount.current = (data.Programs || []).length;
        
        const colDef = data.Tablemodel[0]?.map((value: any, index: number) => {
          if (value === "ProgramLink" || value === "Plan") return null;
          const base: ColDef = { field: value, headerName: data.Tablemodel[1][index], filter: "CustomFilter", editable: true, width: 145 };
          if (value === "ProgramName") return { ...base, cellRenderer: ProgramLinkDetailsCellRenderer, cellRendererParams: { AllPrograms: data.Programs }, cellEditor: ProgramLinkDetailsCellEditor, width: 200 };
          if (value === "SchoolName") return { ...base, editable: false, cellRenderer: SchoolChoosing, cellRendererParams: { AllSchools: data.Schools }, width: 180 };
          if (value === "SchoolsContact") return { ...base, editable: false, cellRenderer: RepresentiveComponent, cellRendererParams: { AllSchools: data.Schools, AllContacts: data.schoolsContacts }, width: 180 };
          if (value === "Status") return { ...base, cellEditor: CustomSelectCellEditor, cellEditorParams: { values: data.ProgramsStatuses?.map(v => v.StatusName) }, filter: StatusFilter, width: 120 };
          if (value === "Year") return { ...base, cellEditor: CustomSelectCellEditor, cellEditorParams: { values: data.Years?.map(v => v.YearName) }, filter: YearFilter, width: 110 };
          return base;
        }).filter((c: any) => c !== null);
        setColDefs(colDef);
      }
    });
  }, [SchoolIDs]);

  return (
    <>
      <Navbar id="ProgramsNavBar" className="bg-[#12242E] flex flex-row-reverse p-2 gap-2 shadow-sm items-center">
        <Redirect type={'Programs'} ScopeType={'Drive'} />
        <div className="flex flex-row-reverse items-center gap-2">
          <button onClick={() => gridRef.current?.api.setFilterModel(null)}><FcCancel className="w-[37px] h-[37px]" /></button>
          <button onClick={() => setColumnWindowOpen(true)}><FcAddColumn className="w-[37px] h-[37px]" /></button>
          <button onClick={() => gridRef.current?.api.applyTransaction({ add: [{ Programid: maxIndex.current + 1, Year: selectedYear, Status: defaultStatus }], addIndex: 0 })}><FcAddRow className="w-[37px] h-[37px]" /></button>
          
          <input className="text-right bg-white text-gray-500 w-[180px] h-[35px] p-2 rounded border-none"
            type="text" placeholder="חיפוש..." onInput={(e: any) => gridRef.current?.api.setQuickFilter(e.target.value)}
          />

          <div className="flex flex-row-reverse items-center gap-2 bg-[#1b2e3a] p-1 rounded border border-gray-700 mx-2">
            <button id="savechangesbutton" onClick={onSaveChangeButtonClick} className="hover:bg-rose-700 bg-rose-800 rounded px-3 py-1 text-white hidden">שמור</button>
            <button id="cancelchangesbutton" onClick={onCancelChanges} className="hover:bg-gray-500 bg-gray-600 rounded px-3 py-1 text-white hidden">ביטול</button>
            
            {!aiLoading ? (
              <Button variant="info" size="sm" onClick={handleAiSubmit} className="fw-bold">ייצר ✨</Button>
            ) : (
              <button onClick={() => abortControllerRef.current?.abort()} className="bg-transparent border-none p-0"><MdStopCircle className="text-danger w-[32px] h-[32px]" /></button>
            )}
            
            <input type="text" className="bg-transparent text-white border-none text-right outline-none px-2" 
              placeholder="הזנה חכמה..." value={aiInput} onChange={(e) => setAiInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()} 
              style={{ direction: 'rtl', width: '660px', fontSize: '14px' }} disabled={aiLoading}
            />
          </div>
        </div>
      </Navbar>
      <div className={theme === "dark-theme" ? "ag-theme-quartz-dark w-full flex-grow" : "ag-theme-quartz w-full flex-grow"} style={{ height: "calc(100vh - 150px)" }}>
        <AgGridReact ref={gridRef} rowData={rowData} columnDefs={colDefinition} enableRtl={true} onGridReady={onGridReady} rowSelection={"multiple"} pagination={true} paginationPageSize={25}
          components={useMemo(() => ({ SchoolChoosing, RepresentiveComponent, AssignedGuidesColumn, ProgramLinkDetailsCellRenderer, ProgramLinkDetailsCellEditor, CustomLinkDrive: (props) => <CustomLinkDrive {...props} AuthenticateActivate={AuthenticateActivate} type={"Program"} /> }), [AuthenticateActivate])} 
          getRowId={(p) => p.data.Programid.toString()}
        />
      </div>
      <ColumnManagementWindow show={columnWindowOpen} onHide={() => setColumnWindowOpen(false)} columnDefs={colDefinition} gridApi={gridRef.current?.api} colState={colState} setColState={setColState} />
    </>
  );
}