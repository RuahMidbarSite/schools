"use client";

import {
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  IRowNode,
  IsExternalFilterPresentParams,
  RowDoubleClickedEvent,
  RowDragEndEvent,
  RowNode,
  SelectionChangedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Suspense, useCallback, useEffect, useRef, useState, useMemo, useContext } from "react";
import { Button, Container, Row, Spinner, Col, Alert, Badge, Card } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
import { getAllCandidates, getAllColorCandidates, getAllColors, removedAssignCandidate, setAssignCandidate, setColorCandidate, getAllDistances } from "@/db/instructorsrequest";
import {
  getAllAssignedInstructors,
  getAllCities,
  getAllDistricts,
  getAllGuides,
  getAllProfessions,
  getAllProfessionTypes,
  getAllStatuses,
  getAllYears,
  getModelFields,
} from "@/db/generalrequests";
import { Areas, Assigned_Guide, Guide, Guides_ToAssign, Profession, Colors, Program, School, SchoolsContact, ColorCandidate, Years, Distances, Cities, StatusGuides } from "@prisma/client";
import { SiGooglemaps } from "react-icons/si";
import CustomFilter from "../GeneralFiles/Filters/CustomFilter";
import ColorPicker from "../PlacementTable/components/ColorPicker";
import { SimpleLink } from "./components/SimpleLink";
import CustomFilterProf from "../PlacementTable/components/CustomFilterProf"
import { ProgramModule } from "../PlacementTable/components/ProgramModule";
import { ThemeContext } from "@/context/Theme/Theme";
import CustomWhatsAppRenderer from "../GuidesTable/components/CustomWhatsAppRenderer";
import { ChooseProfessions } from "../GuidesTable/components/CustomChooseProfessions";
import CustomFilterAreas from "../PlacementTable/components/CustomFilterAreas";

import { getPrograms } from "@/db/programsRequests";
import { getAllSchools } from "@/db/schoolrequests";
import { getAllContacts } from "@/db/contactsRequests";
import { DistanceComponent } from "./components/DistanceComponent";
import { getFromStorage, PlacementFilter, updateStorage } from "./Storage/PlacementDataStorage";
import { DataType } from "./Storage/PlacementDataStorage";
import useColumnEffects from "./hooks/ColumnEffects";
import { useExternalEffect } from "../GeneralFiles/Hooks/ExternalUseEffect";
import useColumnHook from "../ContactsTable/hooks/ColumnHooks";

// --- Imports for Menus ---
import CustomSelectNoComp from "../PlacementTable/components/CustomSelectNoComp";
import YearSelect from "@/components/Tables/PlacementTable/components/YearSelect";
import StatusSelect from "@/components/Tables/PlacementTable/components/StatusSelect";
import { useYear } from "@/context/YearContext";
import { useStatus } from "@/context/StatusContext";

const rightDefaultCol: any = [
  { field: "Guideid", headerName: "מספר מדריך", rowDrag: true },
  { field: "FirstName", headerName: "שם פרטי" },
  { field: "LastName", headerName: "שם משפחה" },
  { field: "CellPhone", headerName: "טלפון" },
  { field: "CV", headerName: "קורות חיים" },
  { field: "City", headerName: "עיר" },
  { field: "Area", headerName: "אזור" },
  { field: "ReligiousSector", headerName: "מגזר דתי" },
  { field: "PriceRequirement", headerName: "מחיר שעתי" },
  { field: "Status", headerName: "סטטוס" },
  { field: "Notes", headerName: "הערות" },
  { field: "Documents", headerName: "מסמכים" },
  { field: "PoliceApproval", headerName: "אישור משטרה" },
  { field: "Aggrement", headerName: "הסכם" },
  { field: "Insurance", headerName: "ביטוח" },
];
const leftDefaultCol: any = rightDefaultCol

const releventFieldsRight: string[] = ["WhatsApp", "LastName", "CV", "City", "Area", "ReligiousSector", "Professions", "Notes"];
const releventFieldsLeft: string[] = releventFieldsRight;

// 🎨 פונקציה דינמית ליצירת צבע ייחודי לכל מקצוע
const getProfessionColor = (profession: string) => {
  // יצירת hash מהמחרוזת
  let hash = 0;
  for (let i = 0; i < profession.length; i++) {
    hash = profession.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // פלטת צבעים נעימה ועדינה
  const colors = [
    { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },  // כחול
    { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },  // סגול-כחול
    { bg: '#fce7f3', text: '#831843', border: '#f9a8d4' },  // ורוד
    { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },  // ירוק
    { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },  // צהוב
    { bg: '#f3e8ff', text: '#581c87', border: '#d8b4fe' },  // סגול
    { bg: '#fed7aa', text: '#7c2d12', border: '#fdba74' },  // כתום
    { bg: '#fecaca', text: '#991b1b', border: '#fca5a5' },  // אדום בהיר
    { bg: '#ccfbf1', text: '#134e4a', border: '#5eead4' },  // טורקיז
    { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' },  // תכלת
  ];
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function PlacementTable() {
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  console.log("PlacementTable Loaded");

  const [leftApi, setLeftApi] = useState<GridApi | null>(null);
  const [rightApi, setRightApi] = useState<GridApi | null>(null);

  const [LoadedDropZone, setLoadedDropZone] = useState(false)

  const latestIndex = useRef(null);


  const [leftColDef, setLeftColDef]: [any, any] = useState([]);
  const [rightColDef, setRightColDef]: [any, any] = useState([]);

  // left is placed instructors, right is instructors
  const [leftRowData, setLeftRowData] = useState(null);
  const [rightRowData, setRightRowData] = useState(null);
  const LeftgridRef = useRef<AgGridReact>(null);
  const RightgridRef = useRef<AgGridReact>(null);


  // Global States related to data
  const [CurrentProgram, setCurrentProgram]: [{ label: string, value: number }, any] = useState({ label: '', value: -1 })

  // --- Search & AI States ---
  const [leftSearchText, setLeftSearchText] = useState("");
  const [rightSearchText, setRightSearchText] = useState("");
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiRadius, setAiRadius] = useState(10);
  const [aiCount, setAiCount] = useState(1);
  
  // --- AI Consultation States (for left button) ---
  const [leftAiLoading, setLeftAiLoading] = useState(false);
  const [leftAiResponse, setLeftAiResponse] = useState<any>(null);
  const [leftAiError, setLeftAiError] = useState<string | null>(null);
  const [showLeftAiModal, setShowLeftAiModal] = useState(false);

  // --- Context States ---
  const selectedYear = useYear().selectedYear
  const defaultStatus = useStatus().defaultStatus

  const [FilterYear, setFilterYear] = useState<{ label: string, value: any }>({ label: selectedYear ? selectedYear : "הכל", value: selectedYear ? selectedYear : undefined })
  const [FilterStatus, setFilterStatus] = useState<{ label: string, value: any }>({ label: defaultStatus ? defaultStatus : "הכל", value: defaultStatus ? defaultStatus : undefined })

  const ProgramID = useRef(-1)
  
  // Ensure ProgramID ref is always synced with state
  useEffect(() => {
      ProgramID.current = CurrentProgram.value;
  }, [CurrentProgram.value]);

  const [FilterProf, setFilterProf]: [{ eng_value: string, value: string, active: boolean }[], any] = useState([])
  const [FilterAreas, setFilterAreas]: [{ eng_value: string, value: string, active: boolean }[], any] = useState([])
  const [AllFilters, setAllFilters] = useState<PlacementFilter[]>([])

  const [Professions, setProfessions] = useState<Profession[]>([])
  const [ProfessionTypesList, setProfessionTypesList] = useState<any[]>([])
  const [Areas, setAreas] = useState<Areas[]>([])

  const [SelectedRows, setSelectedRows] = useState<Guide[]>()

  const { theme } = useContext(ThemeContext)

  const [AllGuides, setAllGuides] = useState<Guide[]>()

  const [All_Assigned_Guides, setAllAssignedGuides] = useState<Assigned_Guide[]>()
  const [All_Assigned_Guides_Details, setAllAssignedGuides_Details] = useState<Guide[]>()

  const [AllCandidates, setAllCandidates] = useState<Guides_ToAssign[]>()
  const [AllCandidates_Details, setAllCandidates_Details] = useState<Guide[]>()

  const [AllPrograms, setAllPrograms] = useState<Program[]>()
  const [AllSchools, setAllSchools] = useState<School[]>()

  const [AllContacts, setAllContacts] = useState<SchoolsContact[]>()

  const [AllYears, setAllYears] = useState<Years[]>()

  const [AllStatuses, setAllStatuses] = useState<StatusGuides[]>()

  const [AllDistances, setAllDistances] = useState<Distances[]>()

  const [AllCities, setAllCities] = useState<Cities[]>()

  // this is for color 
  const [Colors, setColors] = useState<Colors[]>()
  const [AllColorCandidates, setAllColorCandidates] = useState<ColorCandidate[]>()

  // save columns sate  
  const [colState, setColState]: any = useState([])

  const { updateColStateFromCache, updateColState } = useColumnEffects(RightgridRef, colState, setColState, rightColDef, LeftgridRef, leftColDef)

  useExternalEffect(updateColStateFromCache, [rightColDef, leftColDef])
  useExternalEffect(updateColState, [colState])

  const { onColumnMoved, onColumnResized } = useColumnHook(RightgridRef, rightColDef, setRightColDef, setColState, colState)

  const ValueFormatWhatsApp = useCallback((params) => {
    const { FirstName } = params.data;
    return `${FirstName}`;
  }, []);


  /** we put draggable only if not assigned IN THE CURRENT PROGRAM */
  const rowDragCheck = useCallback((params: ICellRendererParams<Guide>, side?: string) => {
    const p = params as any
    
    if (side) {
      if (All_Assigned_Guides && All_Assigned_Guides.length > 0 && CurrentProgram.value !== -1) {
        // 🔥 תיקון: בדוק רק משובצים **בתוכנית הנוכחית**
        const currentProgramAssignedIds = All_Assigned_Guides
          .filter((val) => val.Programid === CurrentProgram.value)
          .map((val) => val.Guideid);
        
        if (currentProgramAssignedIds.includes(params.data.Guideid)) {
          p.node.isDraggable = false;
          return false;
        }
      }
    }
    
    if (CurrentProgram.value === -1) {
      p.node.isDraggable = false;
      return false;
    }
    
    p.node.isDraggable = true;
    return true;

  }, [All_Assigned_Guides, CurrentProgram])


  // Manual Color Change
  const handleManualColorChange = useCallback((guideId: number, programId: number, newHexColor: string) => {
      setAllColorCandidates(prevColors => {
          const safePrev = prevColors || [];
          const exists = safePrev.find(c => c.Guideid === guideId && c.Programid === programId);
          
          let newList;
          if (exists) {
              newList = safePrev.map(c => {
                  if (c.Guideid === guideId && c.Programid === programId) {
                      return { ...c, ColorHexCode: newHexColor };
                  }
                  return c;
              });
          } else {
              newList = [...safePrev, { Guideid: guideId, Programid: programId, ColorHexCode: newHexColor, id: -1 }];
          }
          
          updateStorage({ ColorCandidates: newList });
          return newList;
      });
  }, []);


  const GetDefaultDefinitionsLeft = useCallback((model, colors, colorcandidates): ColDef<Guide>[] => {
    var coldef = releventFieldsLeft.map((fieldKey) => {
      const indexInModel = model[0].indexOf(fieldKey);
      const headerName = indexInModel !== -1 ? model[1][indexInModel] : fieldKey;

      const baseDef: ColDef = { field: fieldKey, headerName: headerName, editable: false, filter: CustomFilter, suppressSizeToFit: true };

      if (fieldKey === "WhatsApp") return { ...baseDef, headerName: "פרטי", width: 90, cellRenderer: "CustomWhatsAppRenderer", valueGetter: (params) => params.data.FirstName || "" };
      if (fieldKey === "LastName") return { ...baseDef, headerName: "משפחה", width: 110 };
      if (fieldKey === "CV") return { ...baseDef, headerName: "קו''ח", width: 70, cellRenderer: (p) => p.value ? <a href={p.value} target="_blank" rel="noreferrer" style={{color: 'blue'}}>קוח</a> : "" };
      if (fieldKey === "City") return { ...baseDef, headerName: "יישוב", width: 90 };
      if (fieldKey === "Area") return { ...baseDef, headerName: "אזור", width: 90 };
      if (fieldKey === "ReligiousSector") return { ...baseDef, headerName: "מגזר", width: 80 };
      if (fieldKey === "Professions") return { ...baseDef, headerName: "מקצועות", width: 140, cellEditor: "CustomChooseProfessions", cellRenderer: "ProfCellRenderer" };
      if (fieldKey === "Notes") return { ...baseDef, headerName: "הערות", width: 160 };
      return baseDef;
    });

    const color_col = { field: 'color', headerName: "צבע", width: 60, suppressSizeToFit: true, cellRenderer: "ColorPicker", cellRendererParams: { currentProgram: CurrentProgram, Colors: colors, AllColorCandidates: colorcandidates, onColorChange: handleManualColorChange, canClear: false }, checkboxSelection: true, headerCheckboxSelection: true, rowDrag: (p) => rowDragCheck(p, "Left"), filter: CustomFilter };
    const distance_col = { field: 'distance', headerName: "מרחק", width: 80, suppressSizeToFit: true, cellRenderer: "DistanceComponent", cellRendererParams: { currentProgram: CurrentProgram, Distances: AllDistances, Cities: AllCities, Programs: AllPrograms }, filter: CustomFilter };
    
    return [color_col, distance_col, ...coldef];
  }, [CurrentProgram, rowDragCheck, AllDistances, AllCities, AllPrograms, handleManualColorChange]);

 const GetDefaultDefinitionsRight = useCallback((model, colors, colorcandidates): ColDef<Guide>[] => {
    var coldef = releventFieldsRight.map((fieldKey) => {
      const indexInModel = model[0].indexOf(fieldKey);
      const headerName = indexInModel !== -1 ? model[1][indexInModel] : fieldKey;

      const baseDef: ColDef = { field: fieldKey, headerName: headerName, editable: false, filter: CustomFilter, suppressSizeToFit: true };

      if (fieldKey === "WhatsApp") return { ...baseDef, headerName: "פרטי", width: 90, cellRenderer: "CustomWhatsAppRenderer", valueGetter: (params) => params.data.FirstName || "" };
      if (fieldKey === "LastName") return { ...baseDef, headerName: "משפחה", width: 110 };
      if (fieldKey === "CV") return { ...baseDef, headerName: "קו''ח", width: 70, cellRenderer: (p) => p.value ? <a href={p.value} target="_blank" rel="noreferrer" style={{color: 'blue'}}>קוח</a> : "" };
      if (fieldKey === "City") return { ...baseDef, headerName: "יישוב", width: 90 };
      if (fieldKey === "Area") return { ...baseDef, headerName: "אזור", width: 90 };
      if (fieldKey === "ReligiousSector") return { ...baseDef, headerName: "מגזר", width: 80 };
      if (fieldKey === "Professions") return { ...baseDef, headerName: "מקצועות", width: 140, cellEditor: "CustomChooseProfessions", cellRenderer: "ProfCellRenderer" };
      if (fieldKey === "Notes") return { ...baseDef, headerName: "הערות", width: 160 };
      return baseDef;
    });

    const color_col = { field: 'color', headerName: "צבע", width: 60, suppressSizeToFit: true, cellRenderer: "ColorPicker", cellRendererParams: { currentProgram: CurrentProgram, Colors: colors, AllColorCandidates: colorcandidates, onColorChange: handleManualColorChange, canClear: true }, rowDrag: rowDragCheck, filter: CustomFilter };
    const distance_col = { field: 'distance', headerName: "מרחק", width: 80, suppressSizeToFit: true, cellRenderer: "DistanceComponent", cellRendererParams: { currentProgram: CurrentProgram, Distances: AllDistances, Cities: AllCities, Programs: AllPrograms }, filter: CustomFilter };
    
    return [color_col, distance_col, ...coldef];
  }, [CurrentProgram, rowDragCheck, AllDistances, AllCities, AllPrograms, handleManualColorChange]);
  // --- onGridReady ---
  const onGridReady = useCallback(async (
    side: string,
    params: GridReadyEvent<any, any>
  ) => {
    if (side === "Left") {
      setLeftApi(params.api);
      setLeftRowData([])
      params.api.hideOverlay();

    } else {
      setRightApi(params.api);

      getFromStorage().then(({ Professions, Schools, ProgramsStatuses, Programs, AssignedGuides, Candidates, Tablemodel, Colors, ColorCandidates, schoolsContacts, Years, Distances, Guides, Cities, Filters, Areas }: Required<DataType>) => {
        
        // 1. טעינה ראשונית מהזיכרון (כדי שהמשתמש לא יחכה)
        if (Professions && Schools && ProgramsStatuses && Programs && AssignedGuides && Candidates && Tablemodel && Colors && ColorCandidates && schoolsContacts && Years && Distances && Guides && Cities && Filters && Areas) {
          const coldef: ColDef<Guide>[] = GetDefaultDefinitionsRight(Tablemodel, Colors, ColorCandidates)
          const coldefleft: ColDef<Guide>[] = GetDefaultDefinitionsLeft(Tablemodel, Colors, ColorCandidates)
          
          setLeftColDef(coldefleft !== null ? coldefleft : [])
          
          const uniqueGuides = Guides.filter((guide, index, self) => 
            index === self.findIndex((t) => t.Guideid === guide.Guideid)
          );
          setAllGuides(uniqueGuides != null ? uniqueGuides : [])
          setRightColDef(coldef)
          setProfessions(Professions)
          setAllPrograms(Programs) 
          setAllSchools(Schools)
          setAllYears(Years)
          setAllDistances(Distances)
          setAllStatuses(ProgramsStatuses)
          setAllCities(Cities)
          setAllContacts(schoolsContacts)
          setColors(Colors)
          setAllColorCandidates(ColorCandidates)
          setAllCandidates(Candidates)
          setAllAssignedGuides(AssignedGuides)
          setAllFilters(Filters)
          setAreas(Areas)

          const candidates_ids = Candidates.map((res) => res.Guideid)
          const assigned_ids = AssignedGuides.map((res) => res.Guideid)
          const assigned_details = Guides.filter((res) => assigned_ids.includes(res.Guideid))
          const candidates_details = Guides.filter((res) => candidates_ids.includes(res.Guideid))
          setAllCandidates_Details(candidates_details)
          setAllAssignedGuides_Details(assigned_details)
          setRightRowData(uniqueGuides != null ? uniqueGuides : [])
        }

       // 2. 🔥 תמיד למשוך נתונים עדכניים מהשרת (Background Refresh) 🔥
       Promise.all([getAllProfessions(), getAllGuides(), getPrograms(), getAllCandidates(), getAllAssignedInstructors(), getModelFields("Guide"), getAllColors(), getAllSchools(), getAllContacts(), getAllColorCandidates(), getAllYears(), getAllStatuses("Programs"), getAllDistances(), getAllCities(), getAllDistricts(), getAllProfessionTypes()])
  .then(([professions, guides, programs, candidates, assigned_guides, model, colors, schools, contacts, color_candidates, years, statuses, distances, cities, areas, professionTypes]) => {
            const sortedYears = (years || []).sort((a: any, b: any) => (a.YearName > b.YearName ? -1 : 1));
            setAllYears(sortedYears);
            
            const coldef: ColDef<Guide>[] = GetDefaultDefinitionsRight(model, colors, color_candidates);
            const coldefleft: ColDef<Guide>[] = GetDefaultDefinitionsLeft(model, colors, color_candidates);
            setLeftColDef(coldefleft);
            
            const uniqueGuides = (guides || []).filter((guide, index, self) => 
               index === self.findIndex((t) => t.Guideid === guide.Guideid)
            );

            // --- כאן נמצא השינוי המבוקש לעדכון המקצועות ---
if (professions && Array.isArray(professions)) {
  // סינון כפילויות לפי שם המקצוע כדי למנוע כפתורים כפולים בפילטר
  const uniqueProfessions = professions.filter((v, i, a) => 
    a.findIndex(t => t.ProfessionName === v.ProfessionName) === i
  );
  setProfessions(uniqueProfessions);
} else {
  setProfessions([]);
}            // ----------------------------------------------

            setAllGuides(uniqueGuides);
            setRightColDef(coldef);
            setAllPrograms(programs); 
            setAllSchools(schools);
            setAllDistances(distances);
            setAllStatuses(statuses);
            setAllCities(cities);
            setAllContacts(contacts);
            setColors(colors);
            setAllColorCandidates(color_candidates);
            setAllCandidates(candidates);
            setAllAssignedGuides(assigned_guides); 
            setAreas(areas);

            const candidates_ids = (candidates || []).map((res) => res.Guideid);
            const assigned_ids = (assigned_guides || []).map((res) => res.Guideid);
            
            setAllCandidates_Details((guides || []).filter((res) => candidates_ids.includes(res.Guideid)));
            setAllAssignedGuides_Details((guides || []).filter((res) => assigned_ids.includes(res.Guideid)));

            setRightRowData(uniqueGuides);
            
            updateStorage({
              Professions: professions, Schools: schools,
              Programs: programs, Candidates: candidates, AssignedGuides: assigned_guides,
              Tablemodel: model, Colors: colors, schoolsContacts: contacts, ColorCandidates: color_candidates, Years: sortedYears,
              ProgramsStatuses: statuses, Distances: distances, Cities: cities, Guides: guides, Filters: [], Areas: areas
            });
            
console.log("✅ Data & Professions synced with DB");
if (professionTypes && professionTypes.length > 0) {
  setProfessionTypesList(professionTypes);
}          })
      })
    }
  }, [GetDefaultDefinitionsLeft, GetDefaultDefinitionsRight]);

  // --- Helper Functions ---

  // Handle Right -> Left (Assign)
  const handleAssignCandidate = useCallback((data: Guide) => {
      const GRAY_HEX = "#D3D3D3";

      // *** בדיקת תקינות ראשונית ***
      if (!data || !data.Guideid) return;

      if (AllCandidates && AllCandidates.some(c => c.Guideid === data.Guideid && c.Programid === ProgramID.current)) {
          return; 
      }

      setAllColorCandidates(prevColors => {
        const safePrev = prevColors || [];
        const cleanList = safePrev.filter(c => !(c.Guideid === data.Guideid && c.Programid === ProgramID.current));
        
        const newEntry = { Guideid: data.Guideid, Programid: ProgramID.current, ColorHexCode: GRAY_HEX, id: -1 };
        const newList = [...cleanList, newEntry];
        
        updateStorage({ ColorCandidates: newList });
        return newList;
      });

      const new_candidate_to_assign: Partial<Guides_ToAssign> = { Guideid: data.Guideid, Programid: ProgramID.current };
      const updated_candidates = AllCandidates ? [...AllCandidates, new_candidate_to_assign as Guides_ToAssign] : [new_candidate_to_assign as Guides_ToAssign];
      
      const new_candidate_detail = AllGuides.find((guide) => guide.Guideid === data.Guideid);
      
      // *** התיקון הנוסף: הגנה מפני מועמדים לא קיימים ***
      if (!new_candidate_detail) return; 
      // *************************************************

      const updated_details = AllCandidates_Details ? [...AllCandidates_Details, new_candidate_detail] : [new_candidate_detail];

      setAllCandidates(updated_candidates);
      setAllCandidates_Details(updated_details);
      updateStorage({ Candidates: updated_candidates });

      setAssignCandidate(data.Guideid, ProgramID.current);
      setColorCandidate(data.Guideid, ProgramID.current, GRAY_HEX);

  }, [AllCandidates, AllGuides, AllCandidates_Details]);


  // Handle Left -> Right (Unassign)
  const handleUnassignCandidate = useCallback((data: Guide) => {
      const RED_HEX = "#FF0000";

      setAllColorCandidates(prevColors => {
        const safePrev = prevColors || [];
        const cleanList = safePrev.filter(c => !(c.Guideid === data.Guideid && c.Programid === ProgramID.current));
        
        const newEntry = { Guideid: data.Guideid, Programid: ProgramID.current, ColorHexCode: RED_HEX, id: -1 };
        const newList = [...cleanList, newEntry];
        
        updateStorage({ ColorCandidates: newList });
        return newList;
      });

      const updated_candidates = AllCandidates ? AllCandidates.filter(c => !(c.Guideid === data.Guideid && c.Programid === ProgramID.current)) : [];
      const updated_details = AllCandidates_Details ? AllCandidates_Details.filter(g => g.Guideid !== data.Guideid) : [];

      setAllCandidates(updated_candidates);
      setAllCandidates_Details(updated_details);
      updateStorage({ Candidates: updated_candidates });

      removedAssignCandidate(data.Guideid, ProgramID.current);
      setColorCandidate(data.Guideid, ProgramID.current, RED_HEX);

  }, [AllCandidates, AllCandidates_Details]);

  // --- AI Search (Fixed) ---
  const handleAISearch = async () => {
    if (CurrentProgram.value === -1) {
        alert("⚠️ אנא בחר תוכנית מהרשימה לפני הפעלת ה-AI");
        return;
    }
    
    const prog = AllPrograms.find(p => p.Programid === CurrentProgram.value);
    if (!prog?.CityName || !prog?.ProgramName) {
        alert("⚠️ לתוכנית שנבחרה חסר שם עיר או שם תוכנית. לא ניתן לבצע התאמה.");
        return;
    }

    if (!AllGuides || AllGuides.length === 0) {
        alert("לא נטענו מדריכים למערכת");
        return;
    }

    setIsAiLoading(true);
    
    const cleanProfession = prog.ProgramName.split('-')[0].trim();
    const progCityName = prog.CityName;
    const progCityObj = AllCities.find(c => c.CityName === progCityName);

    let potentialCandidates = AllGuides.filter(g => 
      !AllCandidates?.some(c => c.Guideid === g.Guideid && c.Programid === CurrentProgram.value)
    ).map(guide => {
        let distance = -1; 
        
        if (guide.City === progCityName) {
            distance = 0; 
        } else if (progCityObj) {
            const guideCityObj = AllCities.find(c => c.CityName === guide.City);
            if (guideCityObj) {
                const distRecord = AllDistances.find(d => 
                    (d.city1id === progCityObj.Cityid && d.city2id === guideCityObj.Cityid) ||
                    (d.city1id === guideCityObj.Cityid && d.city2id === progCityObj.Cityid)
                );
                if (distRecord) distance = distRecord.distance;
            }
        }
        
        return {
            id: guide.Guideid,
            name: `${guide.FirstName} ${guide.LastName}`,
            city: guide.City || "לא צוין",
            area: guide.Area || "לא צוין",
            professions: guide.Professions,
            hasCV: !!guide.CV,
            dbDistance: distance
        };
    });

    if (aiRadius > 0) {
       potentialCandidates = potentialCandidates.filter(c => {
          if (c.dbDistance === -1) return false; 
          return c.dbDistance <= aiRadius;
       });
    }

    potentialCandidates.sort((a, b) => {
        if (a.dbDistance === -1) return 1;
        if (b.dbDistance === -1) return -1;
        return a.dbDistance - b.dbDistance;
    });

    if (potentialCandidates.length === 0) {
        alert(`לא נמצאו מועמדים בטווח של ${aiRadius} ק"מ העונים לקריטריונים.`);
        setIsAiLoading(false);
        return;
    }

    const finalPayload = potentialCandidates.slice(0, 60);

    try {
        const aiPrompt = `
        תפקידך לשמש כעוזר לשיבוץ מדריכים.
        עליך לבחור את ${aiCount} המועמדים המתאימים ביותר.

        פרטי התוכנית הדורשת שיבוץ:
        - עיר: ${progCityName}
        - תחום: ${cleanProfession}
        - אזור: ${prog?.District || "לא צוין"}

        רשימת המועמדים לבחירה (JSON):
        ${JSON.stringify(finalPayload)}

        הנחיות להחזרת תשובה:
        החזר אך ורק תשובת JSON (ללא טקסט נוסף) במבנה הבא:
        {
            "matches": [
                { "id": "מזהה המדריך", "explanation": "הסבר קצר בעברית למה הוא נבחר" }
            ]
        }
        `;

      const response = await fetch("/api/route-placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt 
        }),
      });

      if (!response.ok) {
          throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.matches && Array.isArray(data.matches) && data.matches.length > 0) {
         let addedCount = 0;
         let names = [];

         data.matches.forEach(match => {
             const guide = AllGuides.find(g => g.Guideid === Number(match.id));
             if (guide) {
                 handleAssignCandidate(guide);
                 rightApi?.applyTransaction({ remove: [guide] });
                 
                 // FIX: Assign Unique ID for Grid (Prevent Crash)
                 const guideWithId = { ...guide, uiUniqueId: `${guide.Guideid}_${CurrentProgram.value}` };
                 leftApi?.applyTransaction({ add: [guideWithId] });
                 
                 names.push(guide.FirstName + " " + guide.LastName);
                 addedCount++;
             }
         });

         if (addedCount > 0) {
             alert(`✅ ה-AI שיבץ ${addedCount} מועמדים:\n${names.join(", ")}\n\nהסבר: ${data.matches[0].explanation}`);
         } else {
             alert("ה-AI מצא התאמה, אך המדריכים לא נמצאו בטבלה.");
         }

      } else {
        alert("ה-AI לא מצא התאמה מתאימה בטווח ובנתונים שנשלחו.");
      }

    } catch (e) {
        console.error("❌ [AI Error]:", e);
        alert(`שגיאה בתקשורת עם השרת: ${e.message}`);
    } finally { 
        setIsAiLoading(false); 
    }
  };

  // 🔥 פונקציית התייעצות AI לכפתור השמאלי
  const handleLeftAiConsultation = useCallback(async () => {
    setLeftAiLoading(true);
    setLeftAiResponse(null);
    setLeftAiError(null);
    setShowLeftAiModal(true);

    try {
      if (!CurrentProgram?.label || CurrentProgram.value === -1) {
        throw new Error("חסרים נתוני תוכנית לביצוע הבדיקה");
      }

      // שליפת פרטי התוכנית
      const currentProgramData = AllPrograms?.find(p => p.Programid === CurrentProgram.value);
      if (!currentProgramData) {
        throw new Error("לא נמצאה תוכנית");
      }

      const currentSchool = AllSchools?.find(s => s.Schoolid === currentProgramData.Schoolid);

      // שליפת 10 המועמדים מהטבלה השמאלית
      const topCandidates: any[] = [];
      if (leftApi) {
        let count = 0;
        leftApi.forEachNodeAfterFilterAndSort((node) => {
          if (count < 10 && node.data) {
            const { FirstName, LastName, City, Gender, Guideid } = node.data;
            topCandidates.push({
              id: Guideid,
              Name: `${FirstName} ${LastName}`,
              City: City || "לא צוין",
              Gender: Gender || "לא צוין",
            });
            count++;
          }
        });
      }

      if (topCandidates.length === 0) {
        throw new Error("לא נמצאו מועמדים בטבלה. אנא וודא שיש מועמדים מוצגים.");
      }

      const candidatesText = topCandidates.map(c => 
        `- שם: ${c.Name}, עיר: ${c.City}, מגדר: ${c.Gender}`
      ).join('\n');

      const promptData = `
        אני זקוק לעזרה בשיבוץ מדריך לתוכנית חינוכית.
        
        פרטי המוסד והתוכנית:
        - שם בית ספר: ${currentSchool?.SchoolName || "לא צוין"}
        - עיר: ${currentProgramData.CityName || "לא צוין"}
        - אזור: ${currentProgramData.District || "לא צוין"}
        - שכבה: ${currentProgramData.Grade || "לא צוין"}
        - שם התוכנית: ${CurrentProgram.label}
        - פרטים נוספים: ${currentProgramData.Details || "אין פרטים נוספים"}
        
        רשימת 10 המועמדים המובילים (לפי סינון קיים):
        ${candidatesText}
        
        בבקשה ספק המלצה מקצועית:
        1. דרג את המועמדים לפי התאמה (ציון 0-100)
        2. הסבר את הסיבות לדירוג
        3. תן המלצה ברורה למי לשבץ
        
        החזר תשובה בפורמט JSON הבא בלבד:
        {
          "recommendations": [
            {
              "name": "שם המדריך",
              "score": 95,
              "reason": "הסבר מפורט למה הוא מתאים"
            }
          ],
          "summary": "סיכום קצר של ההמלצה הכללית"
        }
      `;

      const response = await fetch("/api/route-placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptData }),
      });

      if (!response.ok) {
        throw new Error(`שגיאת שרת: ${response.status}`);
      }

      const data = await response.json();
      setLeftAiResponse(data);

    } catch (error: any) {
      console.error("שגיאה בהתייעצות AI:", error);
      setLeftAiError(error.message || "שגיאה לא ידועה");
    } finally {
      setLeftAiLoading(false);
    }
  }, [CurrentProgram, AllPrograms, AllSchools, leftApi]);

  // 🔥 לוגיקת גרירה לחלון הצף של ה-AI השמאלי
  useEffect(() => {
    if (!showLeftAiModal) return;

    const timer = setTimeout(() => {
      const floatingWindow = document.querySelector('.left-ai-floating-window') as HTMLElement;
      const header = document.querySelector('.left-ai-window-header') as HTMLElement;
      
      if (!floatingWindow || !header) return;

      let isDragging = false;
      let offsetX = 0;
      let offsetY = 0;

      const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        offsetX = e.clientX - floatingWindow.offsetLeft;
        offsetY = e.clientY - floatingWindow.offsetTop;
        header.style.cursor = 'grabbing';
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        
        floatingWindow.style.left = `${e.clientX - offsetX}px`;
        floatingWindow.style.top = `${e.clientY - offsetY}px`;
        floatingWindow.style.transform = 'none';
      };

      const onMouseUp = () => {
        isDragging = false;
        header.style.cursor = 'move';
      };

      header.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      return () => {
        header.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [showLeftAiModal]);


  // --- onDragStop (Fixed with Unique ID) ---
  const onDragStop = useCallback(
    (params: RowDragEndEvent, side: string, AllCandidates, AllColorCandidates) => {
      if (ProgramID.current !== -1 && AllCandidates && AllColorCandidates) {

        const data: Guide = params.node.data
        const api: GridApi = side === "Right" ? rightApi : leftApi

        var transaction = {
          remove: [data],
        };

        api!.applyTransaction(transaction)

        if (side === "Right") {
          /** When we move from right to left (Assign). */
          handleAssignCandidate(data);
          
          // FIX: Add Unique ID to prevent crash
          const dataWithId = { ...data, uiUniqueId: `${data.Guideid}_${ProgramID.current}` };
          leftApi!.applyTransaction({ add: [dataWithId] })
          
        } else {
          /** Moving from left to right (Unassign): */
          handleUnassignCandidate(data);
          rightApi!.applyTransaction({ add: [data] })
        }

      }
    },

    [ProgramID, leftApi, rightApi, handleAssignCandidate, handleUnassignCandidate]
  );


  const addGridDropZone = useCallback(
    (side: string, api: GridApi) => {
      const dropApi = side === "Left" ? rightApi : leftApi;
      const dropZoneParams = dropApi!.getRowDropZoneParams({
        onDragStop: (params) => onDragStop(params, side, AllCandidates, AllColorCandidates)
      });
      api.removeRowDropZone(dropZoneParams);
      api.addRowDropZone(dropZoneParams);
    },
    [rightApi, leftApi, onDragStop, AllCandidates, AllColorCandidates]
  );


  useEffect(() => {
    if (rightApi && leftApi) {
      addGridDropZone("Right", rightApi);
      addGridDropZone("Left", leftApi);
      setLoadedDropZone(true)
    }
  }, [addGridDropZone, leftApi, rightApi, CurrentProgram]);


  // Set the left data when program is changed.
  useEffect(() => {

    const updateDragAndColor = (): [any, any] => {
      const Right_Coldef: ColDef<any>[] = rightColDef
      const Left_Coldef: ColDef<any>[] = leftColDef
      
      const color_col_left = { 
          field: 'color', 
          headerName: "צבע", 
          cellRenderer: "ColorPicker", 
          cellRendererParams: { 
              currentProgram: CurrentProgram, 
              Colors: Colors, 
              AllColorCandidates: AllColorCandidates,
              onColorChange: handleManualColorChange,
              canClear: false 
          }, 
          checkboxSelection: (params) => rowDragCheck(params, "Left"), 
          headerCheckboxSelection: true, 
          rowDrag: (params) => rowDragCheck(params, "Left"), 
          filter: CustomFilter,
          width: 105, 
          minWidth: 105, 
          maxWidth: 105, 
          suppressSizeToFit: true, 
          resizable: false
      }
      const color_col_right = { 
          field: 'color', 
          headerName: "צבע", 
          cellRenderer: "ColorPicker", 
          cellRendererParams: { 
              currentProgram: CurrentProgram, 
              Colors: Colors, 
              AllColorCandidates: AllColorCandidates,
              onColorChange: handleManualColorChange,
              canClear: true 
          }, 
          rowDrag: true, 
          filter: CustomFilter 
      }
      var LeftCol_withoutcolor = Left_Coldef.filter((colDef) => colDef.field !== "color")
      var updated_left_coldef = [color_col_left, ...LeftCol_withoutcolor]

      var RightCol_withoutcolor = Right_Coldef.filter((colDef) => colDef.field !== "color")
      var updated_right_coldef = [color_col_right, ...RightCol_withoutcolor]

      return [updated_left_coldef, updated_right_coldef]
    }


    const updateDistances = (left, right) => {
      if (CurrentProgram && CurrentProgram.value !== -1) {
        const Right_Coldef: ColDef<any>[] = right
        const Left_Coldef: ColDef<any>[] = left
        
        const distance_col_left = { field: 'distance', headerName: "מרחק", editable: false, cellRenderer: "DistanceComponent", cellRendererParams: { currentProgram: CurrentProgram, Distances: AllDistances, Cities: AllCities, Programs: AllPrograms }, filter: CustomFilter }
        const distance_col_right = { field: 'distance', headerName: "מרחק", editable: false, cellRenderer: "DistanceComponent", cellRendererParams: { currentProgram: CurrentProgram, Distances: AllDistances, Cities: AllCities, Programs: AllPrograms }, filter: CustomFilter }
        
        var LeftCol = Left_Coldef.map((coldef) => {
          if (coldef.field === "distance") return distance_col_left
          return coldef
        })
        var RightCol = Right_Coldef.map((coldef) => {
          if (coldef.field === "distance") return distance_col_right
          return coldef
        })
        setLeftColDef(LeftCol)
        setRightColDef(RightCol)
      }
    }

    // החלף את הפונקציה updateLeftTable בשורה 460 בקוד שלך
// עם הקוד הזה:

// תיקון לבעיית כפילויות ברשימת מועמדים
// הבעיה: מדריכים משובצים מופיעים פעמיים ברשימת המועמדים

// החלף את הפונקציה updateLeftTable (שורה 892-935) בקוד המתוקן הזה:

const updateLeftTable = () => {
  if (AllCandidates && AllCandidates_Details && CurrentProgram && CurrentProgram.value !== -1) {
    
    // 🔥 תיקון 1: השתמש ב-Set למניעת כפילויות ב-IDs
    const program_guides = AllCandidates.filter((res) => res.Programid === CurrentProgram.value);
    const uniqueIds = [...new Set(program_guides.map((res) => res.Guideid))];
    
    // 🔥 תיקון 2: סנן כפילויות מ-AllCandidates_Details
    const uniqueCandidatesDetails = AllCandidates_Details.filter((guide, index, self) => 
      index === self.findIndex((t) => t.Guideid === guide.Guideid)
    );
    
    // 🔥 תיקון 3: **קבל רשימת משובצים לתוכנית הנוכחית**
    const all_assigned_ids = All_Assigned_Guides
      .filter((g) => g.Programid === CurrentProgram.value)
      .map((val) => val.Guideid);
    
    // 🔥 תיקון 4: **סנן משובצים גם מרשימת המועמדים!**
    const candidateIdsNotAssigned = uniqueIds.filter((id) => !all_assigned_ids.includes(id));
    
    // רק מועמדים שלא משובצים
    const guides = uniqueCandidatesDetails.filter((res) => candidateIdsNotAssigned.includes(res.Guideid));
    
    // 🔥 תיקון 5: סנן כפילויות מ-AllGuides לפני שימוש
    const uniqueAllGuides = AllGuides.filter((guide, index, self) => 
      index === self.findIndex((t) => t.Guideid === guide.Guideid)
    );
    
    // המדריכים שלא מועמדים ולא משובצים - לטבלה הימנית
    let rest_of_guides = uniqueAllGuides.filter((res) => 
      !uniqueIds.includes(res.Guideid) && !all_assigned_ids.includes(res.Guideid)
    );
    
    // 🔥 תיקון 6: סנן כפילויות מ-guides לפני יצירת uniqueGuides
    const uniqueGuidesBeforeMapping = guides.filter((guide, index, self) => 
      index === self.findIndex((t) => t.Guideid === guide.Guideid)
    );
    
    const uniqueGuides = uniqueGuidesBeforeMapping.map(guide => ({
      ...guide,
      uiUniqueId: `${guide.Guideid}_${CurrentProgram.value}` 
    }));

    setLeftRowData(uniqueGuides);
    setRightRowData(rest_of_guides);
    const [left, right] = updateDragAndColor();
    updateDistances(left, right);
    ProgramID.current = CurrentProgram.value;
  }
}

// הסבר על התיקון:
// ===================
// הבעיה הייתה שהקוד הישן סינן משובצים רק מ-rest_of_guides (הטבלה הימנית),
// אבל לא סינן אותם מ-guides (הטבלה השמאלית - רשימת המועמדים).
//
// התיקון:
// 1. קודם מוצאים את כל המשובצים לתוכנית הנוכחית (all_assigned_ids)
// 2. אז מסננים את המועמדים כך שלא יכללו משובצים (candidateIdsNotAssigned)
// 3. זה מבטיח שמדריך משובץ לא יופיע ברשימת המועמדים בצד שמאל
// 4. גם סינון הטבלה הימנית מתחשב במשובצים כדי שלא יופיעו שם
//
// התוצאה:
// ✅ מדריך משובץ לא יופיע ברשימת המועמדים
// ✅ מדריך שבוטל שיבוצו יחזור לרשימת המועמדים
// ✅ אין כפילויות
    updateLeftTable()

  }, [AllCandidates, AllCandidates_Details, CurrentProgram, rowDragCheck, AllColorCandidates, All_Assigned_Guides, handleManualColorChange])



  const getRowId = useCallback(
    (side: string, params: GetRowIdParams<Guide>): string => {
      // Left Side (Assignments) - Uses Unique ID to prevent crash
      if (side === "Left") {
        if ((params.data as any).uiUniqueId) {
            return (params.data as any).uiUniqueId;
        }
        if (CurrentProgram && CurrentProgram.value !== -1) {
            return `${params.data.Guideid}_${CurrentProgram.value}`;
        }
        return params.data.Guideid.toString();
      } else {
        // Right Side (List) - Uses GuideID
        return params.data.Guideid.toString();
      }
    },
    [CurrentProgram]
  );

  const getToolBar = useCallback(() => {
    return (
      <Container fluid={true} className="p-2"> 
        <div className="max-w-[33%] float-right flex flex-col p-2" > 
          <Row>
<CustomFilterProf RightApi={rightApi} Professions={ProfessionTypesList.length > 0 ? ProfessionTypesList : Professions} setProfession={setProfessions} setFilter={setFilterProf} CurrentProgram={CurrentProgram} AllFilters={AllFilters} setAllFilters={setAllFilters} FilterProf={FilterProf} FilterAreas={FilterAreas} />          </Row>
<div className="mt-4">
              <CustomFilterAreas RightApi={rightApi} Areas={Areas} setAreas={setAreas} setFilter={setFilterAreas} CurrentProgram={CurrentProgram} AllFilters={AllFilters} setAllFilters={setAllFilters} FilterProf={FilterProf} FilterAreas={FilterAreas} />
          </div>

          {/* שינוי ה-Layout של התפריטים להסרת ה-Margin השלילי ויישור נכון */}
<div className="d-flex gap-2 flex-wrap" style={{ marginTop: '10px', direction: 'rtl', justifyContent: 'flex-start' }}>
  <div style={{ width: '120px', position: 'relative', zIndex: 10 }}>
     <YearSelect placeholder={"בחר שנה"} AllYears={AllYears} setFilterYear={setFilterYear} />
  </div>

  <div style={{ width: '130px', position: 'relative', zIndex: 10 }}>
     <StatusSelect placeholder={"בחר סטטוס"} AllStatuses={AllStatuses} setFilterStatus={setFilterStatus} />
  </div>
  
  <div style={{ width: '180px', position: 'relative', zIndex: 10 }}>
     <CustomSelectNoComp 
        placeholder={"בחר תוכנית"} 
        setProgram={setCurrentProgram} 
        rightApi={rightApi} 
        AllPrograms={AllPrograms} 
        FilterYear={FilterYear} 
        FilterStatus={FilterStatus} 
     />
  </div>
</div>

        </div>

        <div className=""> 
        <ProgramModule
          setCurrentProgram={setCurrentProgram} CurrentProgram={CurrentProgram} LeftGridApi={leftApi}
          RightGridApi={rightApi} SelectedRows={SelectedRows} setAssigned_guides={setAllAssignedGuides}
          AllPrograms={AllPrograms} AllCandidates={AllCandidates} AllCandidates_Details={AllCandidates_Details}
          AllSchools={AllSchools} AllContacts={AllContacts} All_Assigned_Guides={All_Assigned_Guides}
          All_Assigned_Guides_Details={All_Assigned_Guides_Details} setAllAssignedGuides={setAllAssignedGuides}
          setAllAssignedGuides_Details={setAllAssignedGuides_Details} AllYears={AllYears} AllStatuses={AllStatuses} setAllCandidates={setAllCandidates} setAllCandidates_Details={setAllCandidates_Details}
          AllColorCandidates={AllColorCandidates}
          setAllColorCandidates={setAllColorCandidates}
          onAIConsultation={handleAISearch}
        />
        </div>
      </Container>
    )
}, [rightApi, Professions, ProfessionTypesList, CurrentProgram, FilterProf, AllFilters, Areas, FilterAreas, leftApi, SelectedRows, AllPrograms, AllCandidates, AllCandidates_Details, AllSchools, AllContacts, All_Assigned_Guides, All_Assigned_Guides_Details, AllYears, AllStatuses, FilterYear, FilterStatus, AllColorCandidates]);
  const isExternalFilterPresent = useCallback((params: IsExternalFilterPresentParams<any, any>): boolean => {
    return true
  }, [])

  const doesExternalFilterPassRight = useCallback((node: IRowNode<Guide>): boolean => {
    if (!node.data) return true;

    const activeProfFilters = FilterProf.filter(f => f.active).map(f => f.value);
    const activeAreaFilters = FilterAreas.filter(f => f.active).map(f => f.value);

    const rowProfessions = node.data.Professions 
      ? node.data.Professions.split(",").map(p => p.trim()) 
      : [];
    const rowArea = node.data.Area;

    let profPass = true;
    if (activeProfFilters.length > 0) {
       profPass = rowProfessions.some(p => activeProfFilters.includes(p));
    }

    let areaPass = true;
    if (activeAreaFilters.length > 0) {
      areaPass = activeAreaFilters.includes(rowArea);
    }

    return profPass && areaPass;

  }, [FilterProf, FilterAreas])

  const ProfCellRenderer = useCallback((props: ICellRendererParams<Guide>) => {
    const professionsText = props.data.Professions || '';
    
    // אם אין מקצועות, לא להציג כלום
    if (!professionsText.trim()) {
      return <div></div>;
    }
    
    // פיצול המקצועות לפי פסיקים
    const professions = professionsText
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    return (
      <div className="flex flex-wrap gap-1 py-1" style={{ maxWidth: '150px' }}>
        {professions.map((profession, index) => {
          const colors = getProfessionColor(profession);
          return (
            <span
              key={index}
              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
              }}
            >
              {profession}
            </span>
          );
        })}
      </div>
    );
  }, [])

  const doesExternalFilterPassLeft = useCallback((node: IRowNode<Guide>): boolean => {
    return true
  }, [])

  const components = useMemo(
    () => ({
      ColorPicker: ColorPicker,
      SimpleLink: SimpleLink,
      CustomWhatsAppRenderer: CustomWhatsAppRenderer,
      CustomChooseProfessions: ChooseProfessions,
      ProfCellRenderer: ProfCellRenderer,
      DistanceComponent: DistanceComponent
    }),
    [ProfCellRenderer]
  );
  const name_1 = useMemo(() => "מועמדים לשיבוצים", [])
  const name_2 = useMemo(() => "רשימת מדריכים", [])

  const onRowDoubleClick = useCallback((event: RowDoubleClickedEvent<Guide, any>, side: string): void => {
    if (ProgramID.current !== -1 && AllCandidates && AllColorCandidates) {
      if (typeof (event.node as any).isDraggable !== "undefined" && !(event.node as any).isDraggable) {
        return
      }
      const data = event.node.data
      const api: GridApi = side === "Right" ? rightApi : leftApi

      var transaction = {
        remove: [data],
      };

      api!.applyTransaction(transaction)
      
      if (side === "Right") {
        handleAssignCandidate(data);
        
        // FIX: Add Unique ID to prevent crash
        const dataWithId = { ...data, uiUniqueId: `${data.Guideid}_${ProgramID.current}` };
        leftApi!.applyTransaction({ add: [dataWithId] })
        
      } else {
        handleUnassignCandidate(data);
        rightApi!.applyTransaction({ add: [data] })
      }

    }

  }, [AllCandidates, AllColorCandidates, leftApi, rightApi, AllCandidates_Details, AllGuides, handleAssignCandidate, handleUnassignCandidate])


  const onSelectionChanged = useCallback((event: SelectionChangedEvent<Guide>): void => {
    setSelectedRows(event.api.getSelectedRows())
  }, [])
  const isRowSelectable = (node: RowNode<Guide>) => {
    return true

  }
  const CustomNoRowsOverlay = useCallback(() => {
    const Name = "לא זוהו נתונים"
    return (
      <div className="ag-overlay-no-rows-center text-blue-300">
        <span> {Name} </span>
      </div>
    );
  }, [])

  const getInnerGridCol = (side: string) => (

    <div className="inner-col">
      <div
        id="grid-2"
        className={theme === "dark-theme" ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
        style={{ width: "100%", height: "1000px" }}

      >

        <AgGridReact
          noRowsOverlayComponent={CustomNoRowsOverlay}
          ref={side === "Left" ? LeftgridRef : RightgridRef}
          onGridReady={(params) => onGridReady(side, params)}
          singleClickEdit={false}
          rowData={side === "Left" ? leftRowData : rightRowData}
          loadingOverlayComponent={() => (
            <Spinner
              animation="border"
              role="status"
              className="ml-[50%] mt-[300px] w-[200px] h-[200px]"
            />
          )}

          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={5}
          columnDefs={side === "Left" ? leftColDef : rightColDef}
          defaultColDef={side === "Left" ? leftDefaultCol : rightDefaultCol}
          rowDragManaged={true}
          suppressMoveWhenRowDragging={true}
          enableRtl={true}
          getRowId={(params) => getRowId(side, params)}
          autoSizeStrategy={{ type: "none" }}
          isExternalFilterPresent={side === "Right" ? isExternalFilterPresent : isExternalFilterPresent}
          doesExternalFilterPass={side === "Right" ? doesExternalFilterPassRight : doesExternalFilterPassLeft}
          components={side === "Left" ? components : components}
          suppressRowTransform={true}
          rowSelection={"multiple"}
          onSelectionChanged={onSelectionChanged}
          suppressRowClickSelection={true}
          onRowDoubleClicked={(event) => onRowDoubleClick(event, side)}
          isRowSelectable={side === "Left" ? isRowSelectable : undefined}
          onColumnMoved={side === "Left" ? onColumnMoved : onColumnMoved}
          onColumnResized={side === "Left" ? onColumnResized : onColumnResized}
          pagination={true}
          paginationPageSize={25}
        />
      </div>
    </div>
  );

  const onRightSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRightSearchText(value);
    if (rightApi) {
      rightApi.setGridOption('quickFilterText', value);
    }
  };

  const onLeftSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLeftSearchText(value);
    if (leftApi) {
      leftApi.setGridOption('quickFilterText', value);
    }
  };
if (!isMounted) return null;
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)',
      padding: '0',
    }}>
    <Suspense fallback={<div>טוען...</div>}>
      <div className="toolbar">{getToolBar()}</div>
      <div className="flex gap-2">

        {/* --- צד שמאל: מועמדים --- */}
        <div className="w-1/2 flex flex-col"> 
          
          <div className="d-flex justify-content-end align-items-center p-2 border-bottom gap-3">
  
  <Button 
    variant="primary" 
    size="sm"
    onClick={() => {
      console.log("🖱️ [Client] Assign Button Clicked");

      if (CurrentProgram.value === -1) {
        alert("⚠️ אנא בחר תוכנית מהרשימה לפני השיבוץ");
        return;
      }
      if (!SelectedRows || SelectedRows.length === 0) {
        alert("⚠️ אנא בחר לפחות מדריך אחד לשיבוץ");
        return;
      }
      
      const guidesToAssign = [...SelectedRows];
      console.log(`📋 [Client] Selected ${guidesToAssign.length} guides to assign`); 

      import("@/db/instructorsrequest").then(({ addAssignedInstructors }) => {
          
          guidesToAssign.forEach(guide => {
            console.log(`🔄 [Client] Processing Guide ${guide.Guideid}: Setting as Candidate...`);
            handleAssignCandidate(guide);
            
            rightApi?.applyTransaction({ remove: [guide] });
            const guideWithId = { ...guide, uiUniqueId: `${guide.Guideid}_${CurrentProgram.value}` };
            leftApi?.applyTransaction({ add: [guideWithId] });

            console.log(`💾 [Client] Saving Guide ${guide.Guideid} to Assigned_Guide DB table...`);
            const new_assigned_guide = { Guideid: guide.Guideid, Programid: CurrentProgram.value };
            
            addAssignedInstructors(CurrentProgram.value, guide.Guideid, new_assigned_guide)
                .then(() => console.log(`✅ [Client] Guide ${guide.Guideid} Saved to DB successfully!`))
                .catch((err) => console.error(`❌ [Client] Failed to save Guide ${guide.Guideid} to DB:`, err));
          });

      });
      
      setTimeout(() => {
        const updatedCandidates = [...(AllCandidates || [])];
        const updatedDetails = [...(AllCandidates_Details || [])];
        const updatedAssigned = [...(All_Assigned_Guides || [])];
        const updatedAssignedDetails = [...(All_Assigned_Guides_Details || [])];
        
        guidesToAssign.forEach(guide => {
          const exists = updatedCandidates.some(c => c.Guideid === guide.Guideid && c.Programid === CurrentProgram.value);
          if (!exists) {
            updatedCandidates.push({ Guideid: guide.Guideid, Programid: CurrentProgram.value, id: -1 });
            updatedDetails.push(guide);
          }
          
          const assignedExists = updatedAssigned.some(a => a.Guideid === guide.Guideid && a.Programid === CurrentProgram.value);
          if (!assignedExists) {
            updatedAssigned.push({ Guideid: guide.Guideid, Programid: CurrentProgram.value, id: -1 });
            
            const detailExists = updatedAssignedDetails.some(d => d.Guideid === guide.Guideid);
            if (!detailExists) {
              updatedAssignedDetails.push(guide);
            }
          }
        });
        
        setAllCandidates(updatedCandidates);
        setAllCandidates_Details(updatedDetails);
        setAllAssignedGuides(updatedAssigned);
        setAllAssignedGuides_Details(updatedAssignedDetails);
        updateStorage({ Candidates: updatedCandidates }); // <--- הבעיה הייתה כאן: עדכנו רק מועמדים
        
        alert(`✅ שובצו בהצלחה ${guidesToAssign.length} מדריכים`);
      }, 100);
    }}
>
    שיבוץ
</Button>

  {/* 🔥 כפתור התייעצות AI חדש */}
  <Button 
      variant="info" 
      size="sm"
      onClick={handleLeftAiConsultation}
      disabled={leftAiLoading}
      className="d-flex align-items-center gap-2"
      style={{ 
        minWidth: '180px',
        background: 'white',
        color: '#3b82f6',
        border: '2px solid #3b82f6',
        fontWeight: '600'
      }}
  >
      {leftAiLoading ? (
        <>
          <Spinner as="span" animation="border" size="sm" />
          <span>מעבד...</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: '18px' }}>✨</span>
          התייעצות AI לשיבוץ
        </>
      )}
  </Button>

  <input
    type="text"
    className="form-control"
    placeholder="סינון..."
    value={leftSearchText}
    onChange={onLeftSearchChange}
    style={{ direction: 'rtl', width: '200px', height: '35px' }}
  />
  
  <h1 className="text-right m-0 text-xl font-bold"> {name_1}</h1>
</div>

          {getInnerGridCol("Left")}
        </div>

        {/* --- צד ימין: מדריכים --- */}
        <div className="w-1/2 flex flex-col"> 
          
          <div className="d-flex justify-content-end align-items-center p-2 border-bottom gap-3">
            
            <select
                className="form-select form-select-sm"
                style={{ width: '100px', direction: 'rtl' }}
                value={aiRadius}
                onChange={(e) => setAiRadius(Number(e.target.value))}
                disabled={isAiLoading}
                title="טווח סינון בקילומטרים"
            >
                <option value={10}>10 ק"מ</option>
                <option value={20}>20 ק"מ</option>
                <option value={30}>30 ק"מ</option>
                <option value={40}>40 ק"מ</option>
                <option value={50}>50 ק"מ</option>
                <option value={0}>ללא הגבלה</option>
            </select>

            <select
                className="form-select form-select-sm"
                style={{ width: '70px', direction: 'rtl' }}
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                disabled={isAiLoading}
                title="מספר מועמדים לשיבוץ"
            >
                {[...Array(10)].map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1}</option>
                ))}
            </select>

            <Button 
                variant="success" 
                size="sm" 
                onClick={handleAISearch}
                disabled={isAiLoading}
                className="d-flex align-items-center gap-1 shadow-sm"
                title="שיבוץ אוטומטי עפ'י נתוני התוכנית"
                style={{ zIndex: 1, position: 'relative' }} 
            >
                {isAiLoading ? <Spinner size="sm" animation="border" /> : <span>✨ AI</span>}
            </Button>

            <input
              type="text"
              className="form-control"
              placeholder="סינון..."
              value={rightSearchText}
              onChange={onRightSearchChange}
              style={{ direction: 'rtl', width: '200px', height: '35px' }}
            />

            <h1 className="text-right m-0 text-xl font-bold"> {name_2} </h1>
          </div>

          {getInnerGridCol("Right")}
        </div>
      </div>

      {/* 🔥 חלון צף להתייעצות AI - צד שמאלי */}
      {showLeftAiModal && (
        <>
          {/* רקע שקוף */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 1040,
            }}
            onClick={() => setShowLeftAiModal(false)}
          />
          
          {/* החלון הצף */}
          <div 
            className="left-ai-floating-window"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '80vh',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              zIndex: 1050,
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* כותרת - ניתנת לגרירה */}
            <div 
              className="left-ai-window-header"
              style={{
                padding: '20px',
                borderBottom: '2px solid #e2e8f0',
                cursor: 'move',
                userSelect: 'none',
                background: '#f8f9fa',
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#2d3748' }}>
                ✨ התייעצות AI לשיבוץ מדריכים
              </h3>
              <button
                onClick={() => setShowLeftAiModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#718096',
                  padding: '0 10px',
                }}
              >
                ×
              </button>
            </div>

            {/* תוכן */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {leftAiLoading && (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3" style={{ color: '#718096' }}>מעבד את הבקשה...</p>
                </div>
              )}

              {leftAiError && (
                <Alert variant="danger" style={{ fontSize: '0.95rem' }}>
                  {leftAiError}
                </Alert>
              )}

              {leftAiResponse && !leftAiLoading && (
                <div>
                  <div className="mb-4 p-3 bg-light rounded border">
                    <div className="text-primary font-bold mb-2" style={{ fontSize: '1.1rem' }}>
                      💡 סיכום המערכת:
                    </div>
                    <div style={{ fontSize: '1rem', color: '#555', lineHeight: '1.7' }}>
                      {leftAiResponse.summary}
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-3">
                    {leftAiResponse.recommendations?.map((rec: any, index: number) => (
                      <Card key={index} className="border-0 shadow-sm" 
                        style={{ background: index === 0 ? '#f0f9ff' : 'white' }}>
                        <Card.Body className="p-3">
                          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <span className="text-secondary" style={{ fontSize: '20px' }}>👤</span>
                              <span className="font-bold text-dark" style={{ fontSize: '1.1rem' }}>
                                {rec.name}
                              </span>
                            </div>
                            <Badge bg={rec.score > 90 ? "success" : rec.score > 80 ? "info" : "warning"} 
                              pill style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                              התאמה: {rec.score}%
                            </Badge>
                          </div>
                          <div className="d-flex align-items-start gap-2">
                            <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
                            <span style={{ fontSize: '1rem', color: '#444', lineHeight: '1.6' }}>
                              {rec.reason}
                            </span>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

   </Suspense>
    </div>
  );
} // סגירת הפונקציה PlacementTable