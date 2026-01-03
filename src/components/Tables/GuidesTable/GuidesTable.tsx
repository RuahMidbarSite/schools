"use client";
import { Guide, Guides_ToAssign, Assigned_Guide, ColorCandidate } from "@prisma/client";
import {
  useState,
  useRef,
  useCallback,
  Suspense,
  useMemo,
  useEffect,
  useContext,
} from "react";
import { createPortal } from "react-dom"; 
import { AgGridReact } from "ag-grid-react";
import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import {
  CellValueChangedEvent,
  CellEditingStoppedEvent,
  RowSelectedEvent,
  SelectionChangedEvent,
  ICellRendererParams,
  ColDef,
  CellKeyDownEvent,
} from "ag-grid-community";

import Spinner from "react-bootstrap/Spinner";
import { Button, OverlayTrigger } from "react-bootstrap";
import Tooltip from "react-bootstrap/Tooltip";

import { FcAddColumn, FcAddRow, FcCancel } from "react-icons/fc";
import {
  addInstructorsRows,
  deleteGuidesCascading,
  updateInstructorsColumn,
} from "@/db/instructorsrequest";
import { CustomLinkDrive } from "../GeneralFiles/GoogleDrive/CustomLinkDrive";
import useDrivePicker from "@/util/Google/GoogleDrive/Component";
import {
  TableType,
  getModelFields,
  getAllProfessions,
  getAllDistricts,
  getAllStatuses,
  getAllGuides,
  getAllReligionSectors,
  getAllCities,
  getAllAssignedInstructors,
  getAllCandidates,
  getAllColorCandidates
} from "@/db/generalrequests";
import { CustomMultiSelectCell } from "../GeneralFiles/Select/CustomMultiSelectCellRenderer";
import { CustomMultiSelectCellEdit } from "../GeneralFiles/Select/CustomMultiSelect";
import { CustomFilter } from "../GeneralFiles/Filters/CustomFilter";
import { ChooseProfessions } from "../GuidesTable/components/CustomChooseProfessions";
import { ColumnManagementWindow } from "../../ColumnManagementWindow"
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { ThemeContext } from "@/context/Theme/Theme";
import { DataType, getFromStorage, updateStorage } from "./Storage/GuidesDataStorage";
import { getFromStorage as getColumnStorage, GuidesStoreColumns, updateStorage as updateColumnsStorage } from "./Storage/GuidesColumnsStorage";
import CustomSelectCellEditor from "@/components/CustomSelect/CustomSelectCellEditor";
import Redirect from "@/components/Auth/Components/Redirect";
import CustomWhatsAppRenderer from "./components/CustomWhatsAppRenderer";
import { NamePhoneCellEditor } from "./components/NamePhoneCellEditor";
import { NamePhoneCellRenderer } from "./components/NamePhoneCellRenderer";

export default function GuidesTable({
  height,
  width,
  type,
  id,
  smallTable,
}: {
  height?: number;
  width?: number;
  type?: TableType;
  id?: number;
  smallTable?: boolean;
}) {

  const AuthenticateActivate = useDrivePicker("Guide");
  const gridRef = useRef<AgGridReact>(null);
  const [checkedAmount, setAmount] = useState<number>(0);
  const [InTheMiddleOfAddingRows, SetInTheMiddleOfAddingRows] = useState(false);
  const dataRowCount = useRef(0);
  const rowCount = useRef(0);
  const [rowData, setRowData] = useState<Guide[]>(null);
  const [colDefinition, setColDefs] = useState<ColDef[]>(null);
  const [colState, setColState]: any = useState([])
  const [columnWindowOpen, setColumnWindowOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [dialogType, setDialogType] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const modifiedRowRef = useRef(null);
  const { theme } = useContext(ThemeContext)
  const [isLoading, setLoading] = useState(false);
  const [AllGuides, setAllGuides] = useState<Guide[]>([])
  const [AllAssigncandidates, setAllAssigncandidates] = useState<Guides_ToAssign[]>([])
  const [AllAssigned, setAllAssigned] = useState<Assigned_Guide[]>([])
  const [AllColorCandidates, setAllColorCandidates] = useState<ColorCandidate[]>([])
  const maxIndex = useRef<number>(0)
  
  // --- תיקון: שימוש ב-state כדי להבטיח שהאלמנט קיים ב-DOM ---
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // התיקון העיקרי: שינוי ה-ID ל-navbar-actions כדי שיתאים לקובץ navbar.tsx
    const target = document.getElementById("navbar-actions");
    if (target) {
        setPortalTarget(target);
    }
  }, []);
  // -----------------------------------------------------------

  useEffect(() => {
    if (!(gridRef.current && gridRef.current.api)) { return }
    getColumnStorage().then(({ colState }: GuidesStoreColumns) => {
      if (colState) { setColState(colState) }
      else {
        colState = gridRef.current.api.getColumnState();
        setColState(colState)
      }
    })
  }, [colDefinition]);

  useEffect(() => {
    if (colState.length > 0 && gridRef.current && gridRef.current.api) {
        gridRef.current.api.applyColumnState({ state: colState, applyOrder: true });
        colState.forEach(column => {
          if (column.width) { gridRef.current.api.setColumnWidth(column.colId, column.width); }
        });
        updateColumnsStorage({ colState: colState })
    }
  }, [colState])

  const onColumnResized = useCallback((event) => {
    if (event.finished && gridRef.current && gridRef.current.api) {
        const newColState = gridRef.current.api.getColumnState();
        setColState((prevColState) => {
          if (JSON.stringify(prevColState) !== JSON.stringify(newColState)) { return newColState; }
          return prevColState;
        });
    }
  }, []);

  const onColumnMoved = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      const colState = gridRef.current.api.getColumnState();
      setColState(colState);
    }
  }, []);

  const onClearFilterButtonClick = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setFilterModel(null);
      gridRef.current.api.setGridOption("quickFilterText", "")
    }
    const filterInput = document.getElementById("filter-text-box") as HTMLInputElement;
    if (filterInput) { filterInput.value = ""; }
  }, []);

  const onAddRowToolBarClick = useCallback(() => {
    onClearFilterButtonClick();
    gridRef.current?.api.applyColumnState({ state: [{ colId: 'Guideid', sort: 'desc' }], defaultState: { sort: null } });

    const newId = maxIndex.current + 1;
    gridRef.current?.api.applyTransaction({
      add: [{
          Guideid: newId,
          ReligiousSector: "יהודי",
          Documents: "",
          PoliceApproval: "",
          Aggrement: "",
        }],
      addIndex: 0
    });
    maxIndex.current = newId;
    rowCount.current++
    SetInTheMiddleOfAddingRows(true);
    
    const element: any = document.getElementById("savechangesbutton");
    if (element) element.style.display = "block";
    
    const element_2: any = document.getElementById("cancelchangesbutton");
    if (element_2) element_2.style.display = "block";

    setTimeout(() => {
       gridRef.current?.api.paginationGoToFirstPage();
       gridRef.current?.api.ensureIndexVisible(0);
    }, 100);

  }, [onClearFilterButtonClick]);

  const ValueFormatWhatsApp = useCallback((params) => params.data.FirstName, []);
  const ValueFormatAssigned = useCallback((params) => params?.data?.isAssigned, []);
  const ValueGetterAssigned = useCallback((params) => params?.data?.isAssigned ? "נציג" : "לא נציג", []);

  const ProfCellRenderer = useCallback((props: ICellRendererParams<Guide>) =>
    <div className="max-w-[150px] max-h-[50px] overflow-y-hidden whitespace-nowrap text-ellipsis hover:text-clip truncate hover:overflow-x-auto hover:whitespace-nowra">
      {props.data.Professions}
    </div>, [])

  const valueFormatCellPhone = useCallback((params) => {
    const { CellPhone }: { CellPhone: string } = params.data
    return CellPhone?.replace('+972', '').replace(/[-\s]/g, '').replace(/^0/, '');
  }, [])

  const GetDefaultDefinitions = useCallback((model, cities, religions, professions, professions_model, instructors, areas, status) => {
    var coldef: Object[] = model[0].map((value: any, index: any) => {
      if (value === "Guideid") {
        return {
          field: value, headerName: model[1][index], cellEditor: "agTextCellEditor", rowDrag: false, checkboxSelection: true, headerCheckboxSelection: true, headerCheckboxSelectionFilteredOnly: true, headerCheckboxSelectionCurrentPageOnly: true, lockVisible: true,
        };
      }
      if (value === "FirstName") {
        return {
          field: value, headerName: model[1][index], editable: true, cellEditor: NamePhoneCellEditor, cellEditorParams: { AllGuides: instructors }, cellRenderer: NamePhoneCellRenderer, cellRendererParams: { AllGuides: instructors }, filter: "CustomFilter", singleClickEdit: true
        }
      }
      if (value === "Status" || value === "City" || value === "Area" || value === "ReligiousSector") {
        let valuesList = [];
        if (value === "Status") valuesList = status;
        if (value === "City") valuesList = cities;
        if (value === "Area") valuesList = areas;
        if (value === "ReligiousSector") valuesList = religions;

        return {
          field: value, headerName: model[1][index], editable: true, cellEditor: CustomSelectCellEditor, cellEditorParams: { values: valuesList, valueListMaxWidth: 120 }, filter: "CustomFilter", singleClickEdit: true
        };
      }
      if (["Documents", "PoliceApproval", "Insurance", "Aggrement", "CV", "Other_Documents"].includes(value)) {
        return {
          field: value, headerName: model[1][index], editable: true, cellRenderer: "CustomLinkDrive", cellRendererParams: { GoogleFunctions: AuthenticateActivate }, cellEditor: "agTextCellEditor",
        };
      }
      if (value === "Professions") {
        return { field: "Professions", headerName: "מקצועות", editable: true, singleClickEdit: true, cellEditor: ChooseProfessions, cellRenderer: ProfCellRenderer }
      }
      if (value === "WhatsApp") {
        return { field: "WhatsAppField", hide: true, headerName: 'וואטסאפ', editable: false, cellRenderer: CustomWhatsAppRenderer, valueGetter: ValueFormatWhatsApp, filter: "CustomFilter" }
      }
      if (value === "CellPhone") {
        return { field: value, headerName: model[1][index], editable: true, cellEditor: "agTextCellEditor", filter: "CustomFilter", valueGetter: valueFormatCellPhone, singleClickEdit: true };
      }
      if (value === "isAssigned") {
        return { field: value, headerName: model[1][index], editable: false, cellEditor: "agTextCellEditor", filter: "CustomFilter", valueFormatter: ValueFormatAssigned };
      }
      return { field: value, headerName: model[1][index], editable: true, cellEditor: "agTextCellEditor", filter: "CustomFilter", singleClickEdit: true };
    });
    return coldef
  }, [AuthenticateActivate, ProfCellRenderer, ValueFormatAssigned, ValueFormatWhatsApp, valueFormatCellPhone])
  
  const onGridReady = async (params) => {
    getFromStorage().then(async ({ Guides, Cities, Areas, Religion, Professions, ProfessionsTablemodel, Tablemodel, GuidesStatuses, ColorCandidates, Candidates, AssignedGuides }: Required<DataType>) => {
      let currentCities = Cities;
      try {
        const freshCities = await getAllCities();
        if (freshCities && freshCities.length > 0) {
            currentCities = freshCities;
            updateStorage({ Cities: freshCities });
        }
      } catch (e) { console.warn("Could not fetch fresh cities", e); }

      if (Guides && currentCities && Areas && Religion && Professions && ProfessionsTablemodel && Tablemodel && GuidesStatuses && ColorCandidates && Candidates && AssignedGuides) {
        const colDef = GetDefaultDefinitions(Tablemodel, currentCities.map((val) => val.CityName), Religion.map((val) => val.ReligionName), Professions, ProfessionsTablemodel, Guides, Areas.map((val) => val.AreaName), GuidesStatuses.map((val) => val.StatusName))
        if (Guides.length == 0) { params.api.hideOverlay(); }
        setRowData(Guides);
        setColDefs(colDef);
        rowCount.current = Guides.length;
        dataRowCount.current = Guides.length;
        setAllGuides(Guides); setAllAssigncandidates(Candidates); setAllAssigned(AssignedGuides); setAllColorCandidates(ColorCandidates);
        maxIndex.current = Guides.length > 0 ? Math.max(...Guides.map((guide) => guide.Guideid)):0
      } else {
        Promise.all([
          getAllGuides(), getAllCities(), getAllReligionSectors(), getAllProfessions(), getModelFields("Profession"), getModelFields("Guide"), getAllDistricts(), getAllStatuses("Guides"), getAllCandidates(), getAllAssignedInstructors(), getAllColorCandidates(),
        ]).then(([guides, cities, religions, professions, professions_model, model, areas, statuses, candidates, assigned, colorcandidates]) => {
          var coldef = GetDefaultDefinitions(model, cities.map((val) => val.CityName), religions.map((val) => val.ReligionName), professions, professions_model, guides, areas.map((val) => val.AreaName), statuses.map((val) => val.StatusName))
          setRowData(guides); setColDefs(coldef);
          rowCount.current = guides.length; dataRowCount.current = guides.length;
          setAllGuides(guides); setAllAssigncandidates(candidates); setAllAssigned(assigned); setAllColorCandidates(colorcandidates);
          maxIndex.current = guides.length > 0 ? Math.max(...guides.map((guide)=>guide.Guideid)):0
          updateStorage({ Guides: guides, Cities: cities, Religion: religions, Professions: professions, ProfessionsTablemodel: professions_model, Areas: areas, GuidesStatuses: statuses, Tablemodel: model })
        });
      }
    })
  };

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    modifiedRowRef.current = event.data
    if (event.oldValue === event.newValue) return;
    if (!InTheMiddleOfAddingRows) {
      updateInstructorsColumn(event.column.getColId(), event.newValue, event.data.Guideid).then(() => {
        if (typeof window !== "undefined") {
          const future_data: Guide[] = [];
          gridRef.current.api.forEachNode((node: any) => { future_data.push(node.data); });
          updateStorage({ Guides: future_data })
        }
      })
    }
  }, [InTheMiddleOfAddingRows]);

  const onCellEditingStopped = (event: CellEditingStoppedEvent) => { };

  const onFilterTextBoxChanged = useCallback(() => {
    gridRef.current?.api.setGridOption("quickFilterText", (document.getElementById("filter-text-box") as HTMLInputElement).value);
  }, []);

  const handleClose = () => { setOpen(false); setDialogType(""); setDialogMessage(""); };

  const onSaveChangeButtonClick = useCallback(() => {
    gridRef.current.api.stopEditing();
    var future_data: Guide[] = [];
    var newly_added: Guide[] = [];
    var count = 0;

    gridRef.current.api.forEachNode((node: any) => {
      future_data.push(node.data);
      if (count < rowCount.current - dataRowCount.current) { newly_added.push(node.data); }
      count++;
    });

    future_data = future_data.sort((arg1, arg2) => arg1.Guideid - arg2.Guideid)
    maxIndex.current = future_data.length > 0 ? Math.max(...future_data.map((guide) => guide.Guideid)):0

    setDialogType("success");
    setDialogMessage("מדריכים נוספו בהצלחה");
    setOpen(true);
    
    newly_added = newly_added.map((res) => { delete res['WhatsAppField']; return res }).sort((arg1, arg2) => arg1.Guideid - arg2.Guideid)
    setRowData((data) => [...data, ...newly_added])
    addInstructorsRows(newly_added).then((professions) => {
      updateStorage({ Guides: future_data, Professions: professions })
    })
    
    dataRowCount.current = rowCount.current;
    
    const element: any = document.getElementById("savechangesbutton");
    if (element) element.style.display = "none";
    const element_2: any = document.getElementById("cancelchangesbutton");
    if (element_2) element_2.style.display = "none";
    
    SetInTheMiddleOfAddingRows(false);
    gridRef.current.api.deselectAll()
    setAmount(0)
  }, []);

  const onCancelChangeButtonClick = useCallback(() => {
    const prev_data: Guide[] = [];
    var count = 0
    gridRef.current.api.forEachNode((node: any) => {
      if (count >= rowCount.current - dataRowCount.current) { prev_data.push(node.data); }
      count++;
    });
    maxIndex.current = prev_data.length > 0 ? Math.max(...prev_data.map((guide) => guide.Guideid)):0
    
    setRowData(prev_data)
    rowCount.current = dataRowCount.current;

    const element: any = document.getElementById("savechangesbutton");
    if (element) element.style.display = "none";
    const element_2: any = document.getElementById("cancelchangesbutton");
    if (element_2) element_2.style.display = "none";

    SetInTheMiddleOfAddingRows(false);
    gridRef.current.api.deselectAll()
    setAmount(0)
  }, []);

  const onSaveDeletions = useCallback(() => {
    const ids: number[] = gridRef.current.api.getSelectedRows().map((val: Guide) => val.Guideid);
    const updated_data: Guide[] = [];
    let id_range: number[] = []
    for (let index = 1; index <= dataRowCount.current; index++) {
      if (ids.includes(index)) { continue }
      id_range.push(index)
    }
    
    gridRef.current.api.forEachNode((node: any) => {
      if (!ids.includes(node.data.Guideid)) { updated_data.push(node.data); }
    });
    maxIndex.current = updated_data.length > 0 ? Math.max(...updated_data.map((guide) => guide.Guideid)):0
    setRowData(updated_data)
    setLoading(true)
    const remaining_assigned = AllAssigned.filter((guide) => !!!ids.includes(guide.Guideid))
    const remaining_Colorcandidates = AllColorCandidates.filter((guide) => !!!ids.includes(guide.Guideid))
    const remaining_AssignCandidates = AllAssigncandidates.filter((guide) => !!!ids.includes(guide.Guideid))
    Promise.all([updateStorage({ Guides: updated_data, Candidates: remaining_AssignCandidates, AssignedGuides: remaining_assigned, ColorCandidates: remaining_Colorcandidates }), deleteGuidesCascading(ids, id_range).then((_) => {
      setLoading(false)
    })])

    dataRowCount.current -= ids.length;
    rowCount.current -= ids.length;
    setAmount(0);
    gridRef.current.api.deselectAll()
    
    const element: any = document.getElementById("savedeletions");
    if (element) element.style.display = "none";
  }, [AllAssigncandidates, AllAssigned, AllColorCandidates]);

  const onRowSelected = useCallback((event: RowSelectedEvent) => { return }, []);

  const onSelectionChange = useCallback((event: SelectionChangedEvent) => {
      const selectedRowsAmount: number = event.api.getSelectedRows().length
      setAmount(selectedRowsAmount)
      const element: any = document.getElementById("savedeletions");
      if (element !== null) {
        event.api.getSelectedRows().length > 0 && !InTheMiddleOfAddingRows
          ? (element.style.display = "block")
          : (element.style.display = "none");
      }
    }, [InTheMiddleOfAddingRows]);

  const isRowSelectable = (rowNode: any) => !InTheMiddleOfAddingRows;

  const components = useMemo(() => ({
      CustomLinkDrive: (props) => <CustomLinkDrive {...props} AuthenticateActivate={AuthenticateActivate} type={"Guide"} />,
      CustomMultiSelectCellRenderer: CustomMultiSelectCell,
      CustomMultiSelect: CustomMultiSelectCellEdit,
      CustomFilter: CustomFilter,
      CustomChooseProfessions: ChooseProfessions,
      whatsAppRenderer: CustomWhatsAppRenderer,
      ProfCellRenderer: ProfCellRenderer
    }), [AuthenticateActivate, ProfCellRenderer]);

  const CustomNoRowsOverlay = useCallback(() => {
    return (<div className="ag-overlay-no-rows-center text-blue-300"><span> לא זוהו נתונים </span></div>);
  }, [])
  
  const onCellKeyDown = useCallback((event: CellKeyDownEvent) => {
    const keyboardEvent = event.event as unknown as KeyboardEvent;
    if (["Tab", "Enter", "ArrowLeft", "ArrowRight"].includes(keyboardEvent.key)) { keyboardEvent.stopPropagation(); }
  }, []);

  const LoadingOverlay = () => {
    if (!isLoading) return <></>;
    return (<Spinner animation="border" role="status" className="w-[220px] h-[200px] bg-yellow-500 fill-yellow z-[999] " />);
  };

  const portalContent = (
    <div className="d-flex align-items-center gap-2">
      <input
        className={theme === "dark-theme" ? "text-right bg-gray-900 text-white border-solid w-[200px] h-[35px] p-2 rounded" : "text-right bg-white text-gray-500 border-solid w-[200px] h-[35px] p-2 rounded"}
        type="text"
        id="filter-text-box"
        placeholder="חיפוש"
        onInput={onFilterTextBoxChanged}
      />
      <OverlayTrigger placement={"top"} overlay={<Tooltip className="absolute">בטל סינון</Tooltip>}>
        <button className="hover:bg-[#253d37] rounded p-1" onClick={onClearFilterButtonClick}>
          <FcCancel className="w-[30px] h-[30px]" />
        </button>
      </OverlayTrigger>

      <OverlayTrigger placement={"top"} overlay={<Tooltip className="absolute">ניהול עמודות</Tooltip>}>
        <button className="hover:bg-[#253d37] rounded p-1" onClick={() => setColumnWindowOpen(true)}>
          <FcAddColumn className="w-[30px] h-[30px]" />
        </button>
      </OverlayTrigger>

      <OverlayTrigger placement={"top"} overlay={<Tooltip className="absolute">הוסף שורה</Tooltip>}>
        <button className="hover:bg-[#253d37] rounded p-1" onClick={onAddRowToolBarClick}>
          <FcAddRow className="w-[30px] h-[30px]" />
        </button>
      </OverlayTrigger>
       
      <button id="cancelchangesbutton" onClick={onCancelChangeButtonClick} className="hover:bg-slate-500 bg-slate-600 rounded px-2 py-1 text-white border-solid hidden text-sm">
        בטל
      </button>

      <button id="savechangesbutton" onClick={onSaveChangeButtonClick} className="hover:bg-rose-700 bg-rose-800 rounded px-2 py-1 text-white border-solid hidden text-sm">
        שמור
      </button>

      <button id="savedeletions" onClick={onSaveDeletions} className="hover:bg-green-700 bg-green-800 rounded px-2 py-1 text-white border-solid hidden text-sm">
        מחק ({checkedAmount})
      </button>

      <Redirect type={'Guides'} ScopeType={'Drive'} />
      <LoadingOverlay />
    </div>
  );

  return (
    <>
      {portalTarget && createPortal(portalContent, portalTarget)}
      
      <Suspense>
        <div
          id="grid-1"
          className={theme === "dark-theme" ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
          style={{ width: "100%", height: "calc(100vh - 80px)" }}
        >
          <AgGridReact
            noRowsOverlayComponent={CustomNoRowsOverlay}
            ref={gridRef}
            rowData={rowData}
            columnDefs={colDefinition}
            enableRtl={true}
            onGridReady={onGridReady}
            onCellValueChanged={onCellValueChanged}
            onRowSelected={onRowSelected}
            onSelectionChanged={onSelectionChange}
            isRowSelectable={isRowSelectable}
            loadingOverlayComponent={() => (<Spinner animation="border" role="status" className="ml-[50%] mt-[300px] w-[200px] h-[200px]" />)}
            undoRedoCellEditing={true}
            undoRedoCellEditingLimit={5}
            enableCellChangeFlash={true}
            rowSelection={"multiple"}
            suppressRowClickSelection={true}
            components={components}
            suppressRowTransform={true}
            onColumnResized={onColumnResized}
            onColumnMoved={onColumnMoved}
            suppressMenuHide={true}
            onCellEditingStopped={onCellEditingStopped}
            pagination={true}
            paginationPageSize={25}
          />
        </div>
      </Suspense>
      
      <Dialog open={open} onClose={handleClose}>
        {dialogType === "validationError" && (
          <>
            <DialogTitle>{"Input Error"}</DialogTitle>
            <DialogContent><DialogContentText>{dialogMessage}</DialogContentText></DialogContent>
            <DialogActions><Button onClick={handleClose}>Close</Button></DialogActions>
          </>
        )}
        {dialogType === "success" && (
          <>
            <DialogTitle>{"Success"}</DialogTitle>
            <DialogContent><DialogContentText>{dialogMessage}</DialogContentText></DialogContent>
            <DialogActions><Button onClick={handleClose}>Close</Button></DialogActions>
          </>
        )}
      </Dialog>
      <ColumnManagementWindow
        show={columnWindowOpen}
        onHide={() => setColumnWindowOpen(false)}
        columnDefs={colDefinition}
        gridApi={gridRef.current?.api}
        colState={colState}
        setColState={setColState} />
    </>
  );
}