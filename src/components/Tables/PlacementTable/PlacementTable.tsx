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
import { Button, Container, Row, Spinner, Col } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
import { getAllCandidates, getAllColorCandidates, getAllColors, removedAssignCandidate, setAssignCandidate, setColorCandidate } from "@/db/instructorsrequest";
import {
  getAllAssignedInstructors,
  getAllCities,
  getAllDistricts,
  getAllGuides,
  getAllProfessions,
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

// --- תוספות חדשות עבור התפריטים שהועברו ---
import CustomSelectNoComp from "../PlacementTable/components/CustomSelectNoComp";
import YearSelect from "@/components/Tables/PlacementTable/components/YearSelect";
import StatusSelect from "@/components/Tables/PlacementTable/components/StatusSelect";
import { useYear } from "@/context/YearContext";
import { useStatus } from "@/context/StatusContext";
// ------------------------------------------

const rightDefaultCol: any = [
  {
    field: "Guideid",
    headerName: "מספר מדריך",
    rowDrag: true,
  },
  {
    field: "FirstName",
    headerName: "שם פרטי",
  },
  {
    field: "LastName",
    headerName: "שם משפחה",
  },
  {
    field: "CellPhone",
    headerName: "טלפון",
  },
  {
    field: "CV",
    headerName: "קורות חיים",
  },
  {
    field: "City",
    headerName: "עיר",
  },
  {
    field: "Area",
    headerName: "אזור",
  },
  {
    field: "ReligiousSector",
    headerName: "מגזר דתי",
  },
  {
    field: "PriceRequirement",
    headerName: "מחיר שעתי",
  },
  {
    field: "Status",
    headerName: "סטטוס",
  },
  {
    field: "Notes",
    headerName: "הערות",
  },
  {
    field: "Documents",
    headerName: "מסמכים",
  },
  {
    field: "PoliceApproval",
    headerName: "אישור משטרה",
  },
  {
    field: "Aggrement",
    headerName: "הסכם",
  },
  {
    field: "Insurance",
    headerName: "ביטוח",
  },
];
const leftDefaultCol: any = rightDefaultCol

const releventFieldsRight: string[] = ["Guideid", "FirstName", "CV", "City", "Area", "ReligiousSector", "Notes", "WhatsApp", "isAssigned", "Professions"]
const releventFieldsLeft: string[] = ["Guideid", "FirstName", , "CV", "City", "Area", "ReligiousSector", "Notes", "WhatsApp", "isAssigned", "Professions"]

export default function PlacementTable() {
  console.log("PlacementTable");

  const [leftApi, setLeftApi] = useState<GridApi | null>(null);
  const [rightApi, setRightApi] = useState<GridApi | null>(null);

  const [LoadedDropZone, setLoadedDropZone] = useState(false)

  const latestIndex = useRef(null);


  const [leftColDef, setLeftColDef]: [any, any] = useState([]);
  const [rightColDef, setRightColDef]: [any, any] = useState([]);

  // left is placed instructors, right is instructors
  // using null as first value will show the loading circle inside the table.
  const [leftRowData, setLeftRowData] = useState(null);
  const [rightRowData, setRightRowData] = useState(null);
  const LeftgridRef = useRef<AgGridReact>(null);
  const RightgridRef = useRef<AgGridReact>(null);


  // Global States related to data
  const [CurrentProgram, setCurrentProgram]: [{ label: string, value: number }, any] = useState({ label: '', value: -1 })

  // --- States שהועברו מ-ProgramModule ---
  const selectedYear = useYear().selectedYear
  const defaultStatus = useStatus().defaultStatus

  const [FilterYear, setFilterYear] = useState<{ label: string, value: any }>({ label: selectedYear ? selectedYear : "הכל", value: selectedYear ? selectedYear : undefined })
  const [FilterStatus, setFilterStatus] = useState<{ label: string, value: any }>({ label: defaultStatus ? defaultStatus : "הכל", value: defaultStatus ? defaultStatus : undefined })
  // --------------------------------------

  // this is a lazy hack for onDragStop not detecting changes. Later will fix it probably.
  const ProgramID = useRef(-1)

  // these are used for filters...
  const [FilterProf, setFilterProf]: [{ eng_value: string, value: string, active: boolean }[], any] = useState([])

  const [FilterAreas, setFilterAreas]: [{ eng_value: string, value: string, active: boolean }[], any] = useState([])

  const [AllFilters, setAllFilters] = useState<PlacementFilter[]>([])



  const [Professions, setProfessions] = useState<Profession[]>([])
  const [Areas, setAreas] = useState<Areas[]>([])

  const [SelectedRows, setSelectedRows] = useState<Guide[]>()

  const { theme } = useContext(ThemeContext)


  const [AllGuides, setAllGuides] = useState<Guide[]>()


  // the one below are for the tool bar
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





  /** we put draggable only if not assigned 	*/
  const rowDragCheck = useCallback((params: ICellRendererParams<Guide>, side?: string) => {
    const p = params as any
    if (side) {
      if (All_Assigned_Guides && All_Assigned_Guides.length > 0) {
        const ids = [...All_Assigned_Guides.map((val) => val.Guideid)]
        if (ids.includes(params.data.Guideid)) {
          p.node.isDraggable = false
          return false

        }

      }

    }
    if (CurrentProgram.value === -1) {
      return false
      p.node.isDraggable = true
    }
    p.node.isDraggable = true
    return true




  }, [All_Assigned_Guides, CurrentProgram])




  const GetDefaultDefinitionsLeft = useCallback((model, colors, colorcandidates): ColDef<Guide>[] => {
    var coldef = model[0].map((value: any, index: any) => {
      if (!releventFieldsLeft.includes(value)) {
        return { field: value, hide: true }
      }
      if (value == "Guideid") {
        return {
          field: value,
          hide: true,
          headerName: model[1][index],
          cellEditor: "agTextCellEditor",
          editable: false,
          filter: CustomFilter

        };
      }
      if (value === "FirstName") {
        return {
          field: value,
          hide: true,
          editable: false,
          headerName: model[1][index],
          cellEditor: "agTextCellEditor",
          filter: CustomFilter
        };
      }
      if (value === "Professions") {
        return {
          field: "Professions",
          headerName: "מקצועות",
          editable: false,
          singleClickEdit: true,
          cellEditor: "CustomChooseProfessions",
          cellRenderer: "ProfCellRenderer",
          filter: CustomFilter

        }
      }
      if (value === "WhatsApp") {
        return {
          field: "WhatsAppField",
          headerName: "שם פרטי", // fast solution 
          editable: false,
          cellRenderer: "CustomWhatsAppRenderer",
          valueGetter: ValueFormatWhatsApp,
          filter: CustomFilter
        }

      }
      if (value === "isAssigned") {
        return {
          hide: true,
          field: value,
          headername: model[1][index],
          editable: false,
          filter: CustomFilter

        }
      }
      if (value === "CV") {
        return {
          field: value,
          headerName: model[1][index],
          cellRenderer: "SimpleLink",
          editable: false,
          filter: CustomFilter
        }
      }
      return {
        field: value,
        editable: false,
        headerName: model[1][index],
        cellEditor: "agTextCellEditor",
        filter: CustomFilter
      };
    });

    // 💡 תיקון 4: שינוי רוחב ל-110px
    const color_col = { 
        field: 'color', 
        filter: CustomFilter, 
        headerName: "צבע", 
        cellRenderer: "ColorPicker", 
        cellRendererParams: { currentProgram: CurrentProgram, Colors: colors, AllColorCandidates: colorcandidates }, 
        checkboxSelection: true, 
        headerCheckboxSelection: true, 
        rowDrag: rowDragCheck,
        width: 110, // **הערך שונה ל-110**
        maxWidth: 110 // **הערך שונה ל-110**
    }
    const distance_col = { field: 'distance', headerName: "מרחק", filter: CustomFilter, editable: false, cellRenderer: "DistanceComponent", cellRendererParams: { currentProgram: CurrentProgram, Distances: AllDistances, Cities: AllCities, Programs: AllPrograms } }
    coldef = [color_col, distance_col, ...coldef]
    return coldef
  }, [CurrentProgram, rowDragCheck, AllDistances, AllCities, AllPrograms, ValueFormatWhatsApp])

  const GetDefaultDefinitionsRight = useCallback((model, colors, colorcandidates): ColDef<Guide>[] => {
    var coldef = model[0].map((value: any, index: any) => {
      if (!releventFieldsRight.includes(value)) {
        return { field: value, hide: true }
      }
      if (value === "CV") {
        return {
          field: value,
          headerName: model[1][index],
          cellRenderer: "SimpleLink",
          editable: false,
          filter: CustomFilter
        }
      }
      if (value === "FirstName") {
        return {
          field: value,
          hide: true,
          editable: false,
          headerName: model[1][index],
          cellEditor: "agTextCellEditor",
          filter: CustomFilter
        }
      }
      if (value === "Professions") {
        return {
          field: "Professions",
          headerName: "מקצועות",
          editable: false,
          singleClickEdit: true,
          cellEditor: "CustomChooseProfessions",
          cellRenderer: "ProfCellRenderer",
          filter: CustomFilter
        }
      }
      if (value === "WhatsApp") {
        return {
          field: "WhatsAppField",
          headerName: "פרטי",
          editable: false,
          cellRenderer: "CustomWhatsAppRenderer",
          valueGetter: ValueFormatWhatsApp,
          filter: CustomFilter
        }

      }
      if (value == "Guideid") {
        return {
          field: value,
          hide: true,
          headerName: model[1][index],
          cellEditor: "agTextCellEditor",
          rowDrag: false,
          editable: false,
          filter: CustomFilter
        };
      }
      if (value === "isAssigned") {
        return {
          hide: true,
          field: value,
          headername: model[1][index],
          editable: false,
          filter: CustomFilter

        }
      }
      return {
        field: value,
        headerName: model[1][index],
        cellEditor: "agTextCellEditor",
        editable: false,
        filter: CustomFilter
      };
    });
    // 💡 תיקון 4: שינוי רוחב ל-110px
    const color_col = { 
        field: 'color', 
        headerName: "צבע", 
        cellRenderer: "ColorPicker", 
        cellRendererParams: { currentProgram: CurrentProgram, Colors: colors, AllColorCandidates: colorcandidates }, 
        rowDrag: rowDragCheck, 
        filter: CustomFilter,
        width: 110, // **הערך שונה ל-110**
        maxWidth: 110 // **הערך שונה ל-110**
    }
    const distance_col = { field: 'distance', headerName: "מרחק", editable: false, cellRenderer: "DistanceComponent", cellRendererParams: { currentProgram: CurrentProgram, Distances: AllDistances, Cities: AllCities, Programs: AllPrograms }, filter: CustomFilter }
    coldef = [color_col, distance_col, ...coldef]
    return coldef

  }, [CurrentProgram, rowDragCheck, AllDistances, AllCities, AllPrograms, ValueFormatWhatsApp])


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
        if (Professions && Schools && ProgramsStatuses && Programs && AssignedGuides && Candidates && Tablemodel && Colors && ColorCandidates && schoolsContacts && Years && Distances && Guides && Cities && Filters && Areas) {
          const coldef: ColDef<Guide>[] = GetDefaultDefinitionsRight(Tablemodel, Colors, ColorCandidates)
          const coldefleft: ColDef<Guide>[] = GetDefaultDefinitionsLeft(Tablemodel, Colors, ColorCandidates)
          setLeftColDef(coldefleft !== null ? coldefleft : [])
          setAllGuides(Guides != null ? Guides : [])

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
          // find the details of all candidates and assigned candidates and save them.
          const candidates_ids = Candidates.map((res) => res.Guideid)
          const assigned_ids = AssignedGuides.map((res) => res.Guideid)
          const assigned_details = Guides.filter((res) => assigned_ids.includes(res.Guideid))
          const candidates_details = Guides.filter((res) => candidates_ids.includes(res.Guideid))
          setAllCandidates_Details(candidates_details)
          setAllAssignedGuides_Details(assigned_details)

          setAreas(Areas)

          setRightRowData(Guides != null ? Guides : [])
        } else {

          Promise.all([getAllProfessions(), getAllGuides(), getPrograms(), getAllCandidates(), getAllAssignedInstructors(), getModelFields("Guide"), getAllColors(), getAllSchools(), getAllContacts(), getAllColorCandidates(), getAllYears(), getAllStatuses("Programs"), getAllDistances(), getAllCities(), getAllDistricts()])
            .then(([professions, guides, programs, candidates, assigned_guides, model, colors, schools, contacts, color_candidates, years, statuses, distances, cities, areas]) => {
              const coldef: ColDef<Guide>[] = GetDefaultDefinitionsRight(model, colors, color_candidates)
              const coldefleft: ColDef<Guide>[] = GetDefaultDefinitionsLeft(model, colors, color_candidates)
              setLeftColDef(coldefleft)
              setAllGuides(guides != null ? guides : [])
              setRightColDef(coldef)
              setProfessions(professions)
              setAllPrograms(programs)
              setAllSchools(schools)
              setAllYears(years)
              setAllDistances(distances)
              setAllStatuses(statuses)
              setAllCities(cities)
              setAllContacts(contacts)
              setColors(colors)
              setAllColorCandidates(color_candidates)
              setAllCandidates(candidates)
              setAllAssignedGuides(assigned_guides)
              setAreas(areas)
              // find the details of all candidates and assigned candidates and save them.
              const candidates_ids = candidates.map((res) => res.Guideid)
              const assigned_ids = assigned_guides.map((res) => res.Guideid)
              const assigned_details = guides.filter((res) => assigned_ids.includes(res.Guideid))
              const candidates_details = guides.filter((res) => candidates_ids.includes(res.Guideid))
              setAllCandidates_Details(candidates_details)
              setAllAssignedGuides_Details(assigned_details)


              setRightRowData(guides != null ? guides : [])
              updateStorage({
                Professions: professions, Schools: schools,
                Programs: programs, Candidates: candidates, AssignedGuides: assigned_guides,
                Tablemodel: model, Colors: colors, schoolsContacts: contacts, ColorCandidates: color_candidates, Years: years,
                ProgramsStatuses: statuses, Distances: distances, Cities: cities, Guides: guides, Filters: [], Areas: areas
              })
            })

        }

      })
    }
  }, [GetDefaultDefinitionsLeft, GetDefaultDefinitionsRight]);
  // This activates when dragging between tables.
  /** We don't use the states but give them as arguments since this function will detect every state as undefined. */
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
          /** When we move from right to left.
             1. We add to candidates.
             2. we update the allcandidates and candidate details
             if the detail already exists, of course we don't add it.
             3. we update storage
     
             */

          setAssignCandidate(data.Guideid, ProgramID.current).then((new_candidate: Guides_ToAssign) => {
            const new_candidate_detail = AllGuides.find((guide) => guide.Guideid === new_candidate.Guideid)
            const test_candidate_detail = AllCandidates_Details.find((guide) => guide.Guideid === new_candidate.Guideid)
            const updated_candidates = [...AllCandidates, new_candidate]

            const updated_details = test_candidate_detail ? AllCandidates_Details : [...AllCandidates_Details, new_candidate_detail]

            setAllCandidates(updated_candidates)
            setAllCandidates_Details(updated_details)
            updateStorage({ Candidates: updated_candidates })

          })
        } else {
          /**
             Moving from left to right:
             1. Delete candidate
             2. Make color of candidate red. (In color candidates)
             2. update allcandidates and candidate details.
             3. we update storage
             */
          removedAssignCandidate(data.Guideid, ProgramID.current).then((_) => {
            // 2
            let candidate = setColorCandidate(params.node.data.Guideid, ProgramID.current, "#FF0000")
            setAllColorCandidates((colorCandidates) => {
              let new_colors = []
              let found_flag = false
              for (const color of colorCandidates) {
                if (color.Guideid === params.node.data.Guideid && color.Programid === ProgramID.current) {
                  const new_color: ColorCandidate = { ...color, ColorHexCode: "#FF0000" }
                  new_colors.push(new_color)
                  found_flag = true
                } else {
                  new_colors.push(color)
                }

              }
              new_colors = found_flag ? new_colors : [...new_colors, candidate]
              return new_colors
            })


            //3 
            let updated_candidates: Guides_ToAssign[] = []
            for (const candidate of (AllCandidates as Guides_ToAssign[])) {
              if (candidate.Guideid === data.Guideid && candidate.Programid === ProgramID.current) {
                continue
              }
              updated_candidates.push(candidate)

            }
            let updated_candidate_details: Guide[] = []
            const candidate_count = AllCandidates.filter((guide) => guide.Guideid === data.Guideid)
            const filtered_candidate_details = AllCandidates_Details.filter((res) => res.Guideid !== data.Guideid)
            if (candidate_count.length != 1) {
              updated_candidate_details = [...AllCandidates_Details]
            } else {
              updated_candidate_details = [...filtered_candidate_details]
            }
            setAllCandidates(updated_candidates)
            setAllCandidates_Details(filtered_candidate_details)
            // 4
            let new_colors: ColorCandidate[] = AllColorCandidates?.map((res) => {
              if (res.Guideid === data.Guideid && res.Programid === ProgramID.current) {
                return { ...res, ColorHexCode: "#FF0000" }
              }
              return res
            })
            updateStorage({ Candidates: updated_candidates, ColorCandidates: new_colors })
          })

        }

      }
    },

    [ProgramID, leftApi, rightApi, AllGuides, AllCandidates_Details]
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


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addGridDropZone, leftApi, rightApi, CurrentProgram]);

  // Set the left data when program is changed.
  useEffect(() => {

    const updateDragAndColor = (): [any, any] => {

      const Right_Coldef: ColDef<any>[] = rightColDef
      const Left_Coldef: ColDef<any>[] = leftColDef
      // we want to re-render the color component for both the cell renderer, the program and the drag which needs to be activated again.
      // 💡 תיקון 4: שינוי רוחב ל-110px בפונקציית העדכון
      const color_col_left = { 
          field: 'color', 
          headerName: "צבע", 
          cellRenderer: "ColorPicker", 
          cellRendererParams: { currentProgram: CurrentProgram, Colors: Colors, AllColorCandidates: AllColorCandidates }, 
          checkboxSelection: (params) => rowDragCheck(params, "Left"), 
          headerCheckboxSelection: true, 
          rowDrag: (params) => rowDragCheck(params, "Left"), 
          filter: CustomFilter,
          width: 110, // **הערך שונה ל-110**
          maxWidth: 110 // **הערך שונה ל-110**
      }
      const color_col_right = { 
          field: 'color', 
          headerName: "צבע", 
          cellRenderer: "ColorPicker", 
          cellRendererParams: { currentProgram: CurrentProgram, Colors: Colors, AllColorCandidates: AllColorCandidates }, 
          rowDrag: true, 
          filter: CustomFilter,
          width: 110, // **הערך שונה ל-110**
          maxWidth: 110 // **הערך שונה ל-110**
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
        // we want to re-render the color component for both the cell renderer, the program and the drag which needs to be activated again.
        const distance_col_left = { field: 'distance', headerName: "מרחק", editable: false, cellRenderer: "DistanceComponent", cellRendererParams: { currentProgram: CurrentProgram, Distances: AllDistances, Cities: AllCities, Programs: AllPrograms }, filter: CustomFilter }
        const distance_col_right = { field: 'distance', headerName: "מרחק", editable: false, cellRenderer: "DistanceComponent", cellRendererParams: { currentProgram: CurrentProgram, Distances: AllDistances, Cities: AllCities, Programs: AllPrograms }, filter: CustomFilter }
        var LeftCol = Left_Coldef.map((coldef) => {
          if (coldef.field === "distance") {
            return distance_col_left
          }
          return coldef

        })
        var RightCol = Right_Coldef.map((coldef) => {
          if (coldef.field === "distance") {
            return distance_col_right
          }
          return coldef

        })
        setLeftColDef(LeftCol)
        setRightColDef(RightCol)

      }


    }
    const updateLeftTable = () => {
      if (AllCandidates && AllCandidates_Details && CurrentProgram && CurrentProgram.value !== -1) {
        const program_guides = AllCandidates.filter((res) => res.Programid === CurrentProgram.value)
        const ids = program_guides.map((res) => res.Guideid)
        const guides = AllCandidates_Details.filter((res) => ids.includes(res.Guideid))
        let rest_of_guides = AllGuides.filter((res) => !ids.includes(res.Guideid))

        const all_assigned_ids = All_Assigned_Guides.filter((g) => g.Programid === CurrentProgram.value).map((val) => val.Guideid)
        rest_of_guides = rest_of_guides.filter((g) => !!!all_assigned_ids.includes(g.Guideid))
        // now we filter from right table the guides that we are going to update to the left.


        setLeftRowData(guides)
        setRightRowData(rest_of_guides)
        const [left, right] = updateDragAndColor()
        updateDistances(left, right)
        ProgramID.current = CurrentProgram.value




      }

    }

    updateLeftTable()


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AllCandidates, AllCandidates_Details, CurrentProgram, rowDragCheck, AllColorCandidates, All_Assigned_Guides])



  const getRowId = useCallback(
    (side: string, params: GetRowIdParams<Guide>): string => {
      // Instructor assign
      if (side === "Left") {
        return params.data.Guideid.toString();
      } else {
        return params.data.Guideid.toString();
      }
    },
    []
  );

  // ************ CHANGED HERE FOR DEBUGGING BORDERS ************
  const getToolBar = useCallback(() => {


    return (

      // 	<div className="flex justify-between">

      // <Button variant="primary">
      // 	<SiGooglemaps />
      // </Button> 

      <Container fluid={true} className="border-4 border-red-600 p-2"> {/* RED: Main Container */}
        
        {/* שינינו כאן את הקונטיינר ל-flex flex-col כדי שנוכל לערום את האלמנטים אחד מתחת לשני */}
        <div className="max-w-[50%] float-right border-4 border-blue-600 flex flex-col p-2" > {/* BLUE: Filters (Right side) */}
          
          {/* 1. כפתורי מקצועות */}
          <Row>
            <CustomFilterProf RightApi={rightApi} Professions={Professions} setProfession={setProfessions} setFilter={setFilterProf} CurrentProgram={CurrentProgram} AllFilters={AllFilters} setAllFilters={setAllFilters} FilterProf={FilterProf} FilterAreas={FilterAreas} />
          </Row>

          {/* 2. כפתורי אזורים - הוספנו מרווח עליון */}
          <div className="mt-4">
            <CustomFilterAreas RightApi={rightApi} Areas={Areas} setAreas={setAreas} setFilter={setFilterAreas} CurrentProgram={CurrentProgram} AllFilters={AllFilters} setAllFilters={setAllFilters} FilterProf={FilterProf} FilterAreas={FilterAreas} />
          </div>

          {/* 3. שלושת התפריטים (תוכנית, סטטוס, שנה) - בשורה חדשה עם מרווח */}
          <Row className="mt-4 rtl d-flex justify-content-between">
            <Col>
              <CustomSelectNoComp placeholder={"בחר תוכנית"} setProgram={setCurrentProgram} rightApi={rightApi} AllPrograms={AllPrograms} FilterYear={FilterYear} FilterStatus={FilterStatus} />
            </Col>

            <Col>
              <StatusSelect placeholder={"בחר סטטוס"} AllStatuses={AllStatuses} setFilterStatus={setFilterStatus} />
            </Col>
            
            <Col>
              <YearSelect placeholder={"בחר שנה"} AllYears={AllYears} setFilterYear={setFilterYear} />
            </Col>
          </Row>

        </div>

        <div className="border-4 border-green-600"> {/* GREEN: Program Module (Left side) */}
        <ProgramModule
          setCurrentProgram={setCurrentProgram} CurrentProgram={CurrentProgram} LeftGridApi={leftApi}
          RightGridApi={rightApi} SelectedRows={SelectedRows} setAssigned_guides={setAllAssignedGuides}
          AllPrograms={AllPrograms} AllCandidates={AllCandidates} AllCandidates_Details={AllCandidates_Details}
          AllSchools={AllSchools} AllContacts={AllContacts} All_Assigned_Guides={All_Assigned_Guides}
          All_Assigned_Guides_Details={All_Assigned_Guides_Details} setAllAssignedGuides={setAllAssignedGuides}
          setAllAssignedGuides_Details={setAllAssignedGuides_Details} AllYears={AllYears} AllStatuses={AllStatuses} setAllCandidates={setAllCandidates} setAllCandidates_Details={setAllCandidates_Details} />
        </div>
      </Container>
    )
  }, [rightApi, Professions, CurrentProgram, FilterProf, AllFilters, Areas, FilterAreas, leftApi, SelectedRows, AllPrograms, AllCandidates, AllCandidates_Details, AllSchools, AllContacts, All_Assigned_Guides, All_Assigned_Guides_Details, AllYears, AllStatuses, FilterYear, FilterStatus]);

  const isExternalFilterPresent = useCallback((params: IsExternalFilterPresentParams<any, any>): boolean => {
    return true
  }, [])

  // THIS IS THE UPDATED FUNCTION
  const doesExternalFilterPassRight = useCallback((node: IRowNode<Guide>): boolean => {
    if (!node.data) return true;

    // 1. קבלת הפילטרים הפעילים
    const activeProfFilters = FilterProf.filter(f => f.active).map(f => f.value);
    const activeAreaFilters = FilterAreas.filter(f => f.active).map(f => f.value);

    // נכין את הנתונים מהשורה
    const rowProfessions = node.data.Professions 
      ? node.data.Professions.split(",").map(p => p.trim()) 
      : [];
    const rowArea = node.data.Area;

    // 2. לוגיקה למקצועות:
    // אם אין פילטרים פעילים למקצוע - מעבירים הכל (true).
    // אם יש - בודקים האם למדריך יש אחד מהמקצועות שנבחרו.
    let profPass = true;
    if (activeProfFilters.length > 0) {
       profPass = rowProfessions.some(p => activeProfFilters.includes(p));
    }

    // 3. לוגיקה לאזורים:
    // אם אין פילטרים פעילים לאזור - מעבירים הכל (true).
    // אם יש - בודקים האם המדריך שייך לאחד האזורים שנבחרו.
    let areaPass = true;
    if (activeAreaFilters.length > 0) {
      areaPass = activeAreaFilters.includes(rowArea);
    }

    // 4. החזרה סופית: גם מקצוע וגם אזור צריכים לעבור (AND)
    // הערה: אם קטגוריה מסוימת לא סוננה, היא תחזיר true ולכן לא תשפיע לרעה.
    return profPass && areaPass;

  }, [FilterProf, FilterAreas])

  const ProfCellRenderer = useCallback((props: ICellRendererParams<Guide>) =>

    <div className="max-w-[150px] max-h-[50px] overflow-y-hidden whitespace-nowrap text-ellipsis hover:text-clip truncate 	hover:overflow-x-auto hover:whitespace-nowra">
      {props.data.Professions}

    </div>, [])

  const doesExternalFilterPassLeft = useCallback((node: IRowNode<Guide>): boolean => {
    if (node.data) {
      return true

    }
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
      // we add the draggable in 	rowDragCheck of ag grid.
      if (typeof (event.node as any).isDraggable !== "undefined" && !(event.node as any).isDraggable) {
        return
      }
      const data = event.node.data
      const api: GridApi = side === "Right" ? rightApi : leftApi

      var transaction = {
        remove: [data],
      };

      api!.applyTransaction(transaction)
      // if added to assign
      if (side === "Right") {
        setAssignCandidate(data.Guideid, ProgramID.current).then((new_candidate: Guides_ToAssign) => {
          const new_candidate_detail = AllGuides.find((guide) => guide.Guideid === new_candidate.Guideid)
          const test_candidate_detail = AllCandidates_Details.find((guide) => guide.Guideid === new_candidate.Guideid)
          const updated_candidates = [...AllCandidates, new_candidate]

          const updated_details = test_candidate_detail ? AllCandidates_Details : [...AllCandidates_Details, new_candidate_detail]

          setAllCandidates(updated_candidates)
          setAllCandidates_Details(updated_details)
          updateStorage({ Candidates: updated_candidates })


        })
        leftApi!.applyTransaction({ add: [data] })
      } else {
        /**
         Moving from left to right:
         1. Delete candidate
         2. Make color of candidate red. (In color candidates)
         2. update allcandidates and candidate details.
         3. we update storage
         */
        removedAssignCandidate(data.Guideid, ProgramID.current).then((_) => {
          // 2
          let candidate = setColorCandidate(data.Guideid, ProgramID.current, "#FF0000")
          setAllColorCandidates((colorCandidates) => {
            let new_colors = []
            let found_flag = false
            for (const color of colorCandidates) {
              if (color.Guideid === data.Guideid && color.Programid === ProgramID.current) {
                const new_color: ColorCandidate = { ...color, ColorHexCode: "#FF0000" }
                new_colors.push(new_color)
                found_flag = true
              } else {
                new_colors.push(color)
              }

            }
            new_colors = found_flag ? new_colors : [...new_colors, candidate]
            return new_colors
          })


          //3 
          let updated_candidates: Guides_ToAssign[] = []
          for (const candidate of (AllCandidates as Guides_ToAssign[])) {
            if (candidate.Guideid === data.Guideid && candidate.Programid === ProgramID.current) {
              continue
            }
            updated_candidates.push(candidate)

          }
          let updated_candidate_details: Guide[] = []
          const candidate_count = AllCandidates.filter((guide) => guide.Guideid === data.Guideid)
          const filtered_candidate_details = AllCandidates_Details.filter((res) => res.Guideid !== data.Guideid)
          if (candidate_count.length != 1) {
            updated_candidate_details = [...AllCandidates_Details]
          } else {
            updated_candidate_details = [...filtered_candidate_details]
          }
          setAllCandidates(updated_candidates)
          setAllCandidates_Details(filtered_candidate_details)
          // 4
          let new_colors: ColorCandidate[] = AllColorCandidates?.map((res) => {
            if (res.Guideid === data.Guideid && res.Programid === ProgramID.current) {
              return { ...res, ColorHexCode: "#FF0000" }
            }
            return res
          })
          updateStorage({ Candidates: updated_candidates, ColorCandidates: new_colors })
        })

        rightApi!.applyTransaction({ add: [data] })
      }

    }







  }, [AllCandidates, AllColorCandidates, leftApi, rightApi, AllCandidates_Details, AllGuides])


  const onSelectionChanged = useCallback((event: SelectionChangedEvent<Guide>): void => {
    setSelectedRows(event.api.getSelectedRows())
  }, [])
  // this is now always true since a guide can be assigned to multiple programs.
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
          autoSizeStrategy={{ type: "fitGridWidth" }}
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


  return (
    <Suspense >
      <div className="toolbar ">{getToolBar()}</div>
      <div className="flex">

        <div className="w-1/2 border-4 border-orange-500"> {/* ORANGE: Left Table Column */}
          <h1 className="text-right"> {name_1}</h1>

          {getInnerGridCol("Left")}


        </div>

        <div className="w-1/2 border-4 border-purple-500"> {/* PURPLE: Right Table Column */}
          <h1 className="text-right"> {name_2} </h1>

          {getInnerGridCol("Right")}

        </div>
      </div>
    </Suspense>
  );
}