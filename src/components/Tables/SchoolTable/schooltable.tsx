"use client";
import {
  useState,
  useRef,
  useCallback,
  useMemo,
  Suspense,
  useContext,
  useEffect,
} from "react";
import { AgGridReact } from "ag-grid-react";
import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css"; 
import Spinner from "react-bootstrap/Spinner";
import { Navbar } from "react-bootstrap";
import { CustomMasterGrid } from "./Components/MasterGrid/CustomMasterGrid";
import { CustomFilter } from "../GeneralFiles/Filters/CustomFilter";
import { CustomSelect } from "../GeneralFiles/Select/CustomSelect";
import { CustomDateCellEditor } from "../GeneralFiles/Date/CustomDateCellEditor/CustomDateCellEditor";
import useColumnHook from "./Hooks/ColumnHooks";
import { useExternalEffect } from "../GeneralFiles/Hooks/ExternalUseEffect";
import useColumnEffects from "./Hooks/ColumnEffects";
import useCustomDateComponents from "./Hooks/CustomDateComponents";
import useErrorValidationComponents from "./Hooks/ErrorValidationComponents";
import useColumnComponent from "./Hooks/ColumnComponent";
import useGridFunctions from "./Hooks/GridInitialize";
import useGridEvents from "./Hooks/GridEvents";
import useToolBarFunctions from "./Hooks/ToolBarFunctions";
import ToolBar from "./Hooks/ToolBarComponent";
import { ThemeContext } from "@/context/Theme/Theme";
import { CellKeyDownEvent, GetRowIdParams, IsFullWidthRowParams, RowHeightParams, SelectionChangedEvent } from "ag-grid-community";
import { Program, School, SchoolsContact, } from "@prisma/client";
import RepresentiveComponent from "../GeneralFiles/GoogleContacts/ContactsRepComponent";
import { useContactComponent } from "@/util/Google/GoogleContacts/ContactComponent";
import { getCacheVersion, getFromStorage, updateStorage } from "@/components/Tables/SchoolTable/Storage/SchoolDataStorage";
import { deleteContactsRows } from "@/db/contactsRequests";

export default function SchoolsTable() {
  const { theme } = useContext(ThemeContext);
  const gridRef = useRef<AgGridReact>(null);
  const [AuthenticateActivate] = useContactComponent();
  const [checkedAmount, setAmount]: any = useState(0);
  const [InTheMiddleOfAddingRows, SetInTheMiddleOfAddingRows] = useState(false);
  const dataRowCount = useRef(0);
  const rowCount = useRef(0);
  const [rowData, setRowData]: any = useState(null);
  const [colDefinition, setColDefs]: any = useState([]);
  const [open, setOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [colState, setColState]: any = useState([])
  const [columnWindowOpen, setColumnWindowOpen] = useState(false);
  const openedProgramWindow = useRef<boolean>(false)
  const [isLoading, setLoading] = useState(false);
  const isEditable = useCallback((params: any) => !params.node.expanded, []);
  const [AllContacts, setAllContacts] = useState<SchoolsContact[]>([])
  const [AllPrograms, setAllPrograms] = useState<Program[]>([])
  const maxIndex = useRef(0)
  const [cacheVersion, setCacheVersion] = useState<number>(0)

  const { updateColStateFromCache, updateColState } = useColumnEffects(gridRef, colState, setColState)
  useExternalEffect(updateColStateFromCache, [colDefinition])
  useExternalEffect(updateColState, [colState])
  const { onColumnMoved, onColumnResized } = useColumnHook(gridRef, colDefinition, setColDefs, setColState, colState)
  const { valueFormatterDate } = useCustomDateComponents()
  const { validateFields, ErrorModule } = useErrorValidationComponents(setOpen, setDialogType, setDialogMessage, open, dialogType, dialogMessage)
  const { WindowManager } = useColumnComponent(columnWindowOpen, setColumnWindowOpen, colDefinition, gridRef, colState, setColState)
  const { onClearFilterButtonClick, onAddRowToolBarClick, onFilterTextBoxChanged, onSaveChangeButtonClick, onCancelChangeButtonClick, onSaveDeletions, onDisplayProgramsClicked } = useToolBarFunctions(gridRef, rowCount, dataRowCount, validateFields, setDialogType, setDialogMessage, setOpen, SetInTheMiddleOfAddingRows,
    setAmount, openedProgramWindow, setLoading, setRowData, AllContacts, setAllContacts, AllPrograms, setAllPrograms, maxIndex)
  const { onGridReady } = useGridFunctions(CustomDateCellEditor, valueFormatterDate, setColDefs, setRowData, rowCount, dataRowCount, setAllContacts, setAllPrograms, maxIndex)
  const { onCellValueChanged, onCellEditingStarted, onRowSelected, onSelectionChange, isRowSelectable } = useGridEvents(gridRef, InTheMiddleOfAddingRows, checkedAmount, setAmount)

  const refreshDataFromStorage = useCallback(async () => {
    try {
      const storageData = await getFromStorage()
      if (storageData.Schools) {
        setRowData(storageData.Schools)
        if (gridRef.current?.api) {
          gridRef.current.api.setGridOption('rowData', storageData.Schools)
          gridRef.current.api.refreshCells({ force: true })
        }
      }
      if (storageData.schoolsContacts) {
        setAllContacts(storageData.schoolsContacts)
        if (gridRef.current?.api) {
          const currentColDefs = gridRef.current.api.getColumnDefs()
          if (currentColDefs) {
             // לוגיקת עדכון עמודות קיימת...
          }
        }
      }
      const newVersion = await getCacheVersion()
      setCacheVersion(newVersion)
    } catch (error) {
      console.error("Error refreshing from storage:", error)
    }
  }, [setRowData, setAllContacts])
  
  useEffect(() => {
    const handleStorageUpdate = (event: any) => {
      console.log("📩 SchoolTable: Received storage update event", event.detail);
      
      if (event.detail?.keys?.includes("Schools") || event.detail?.keys?.includes("schoolsContacts")) {
        console.log("✅ Refreshing data from storage...");
        refreshDataFromStorage();
      }
    };
    
    window.addEventListener("storageUpdated", handleStorageUpdate);
    console.log("🎧 SchoolTable: Storage listener registered");
    
    return () => {
      window.removeEventListener("storageUpdated", handleStorageUpdate);
      console.log("🔌 SchoolTable: Storage listener removed");
    };
  }, [refreshDataFromStorage]);

  const handleSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    if (onSelectionChange) onSelectionChange(event);
    setAmount(event.api.getSelectedRows().length);
  }, [onSelectionChange, setAmount]);

  const checkContactsStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/google-contacts/check-status');
      if (!response.ok) {
        return { isConnected: false };
      }
      return await response.json();
    } catch (error) {
      console.error("Error checking Contacts status:", error);
      return { isConnected: false };
    }
  }, []);

  const onDisconnectContacts = useCallback(async () => {
    try {
      await fetch('/api/google-contacts/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error("Error disconnecting Contacts:", error);
    }
  }, []);

  const LoadingOverlay = useCallback(() => {
    if (!isLoading) return <></>
    return <Spinner animation="border" role="status" className="w-[220px] h-[200px] bg-yellow-500 fill-yellow z-[999]" />;
  }, [isLoading]);

  const components = useMemo(() => ({
      CustomMasterGrid: CustomMasterGrid,
      CustomSelect: CustomSelect,
      CustomFilter: CustomFilter,
      RepresentiveComponent: RepresentiveComponent,
    }), []);

  const getRowId = useCallback((params: GetRowIdParams<School>) => String(params.data.Schoolid), []);
  
  const onCellKeyDown = useCallback((event: CellKeyDownEvent) => {
     // קוד קיים
  }, []);

  const CustomNoRowsOverlay = useCallback(() => {
    return <div className="ag-overlay-no-rows-center text-blue-300"><span> לא זוהו נתונים </span></div>;
  }, [])

  const getRowHeight = useCallback(({ api, data, ...params }: RowHeightParams) => 42, []);
  const isFullWidthRow = useCallback((params: IsFullWidthRowParams) => {
    return !!(params.rowNode.data && params.rowNode?.expanded)
  }, []);

  const UpdateContactComponent = useCallback((Data) => {
    // קוד קיים
  }, [AllContacts])

  const handleDeleteContactFromSubTable = useCallback(async (selectedIds: number[]) => {
    try {
      console.log("🚀 Server & Storage Delete:", selectedIds);
      
      await deleteContactsRows(selectedIds);
      
      const currentStorage = await getFromStorage();
      if (currentStorage && currentStorage.schoolsContacts) {
          const updatedContacts = currentStorage.schoolsContacts.filter(
             (contact) => !selectedIds.includes(contact.Contactid)
          );
          await updateStorage({ ...currentStorage, schoolsContacts: updatedContacts });
          setAllContacts(updatedContacts);
      }
      return true;
    } catch (error: any) {
      console.error("Failed delete:", error);
      alert(`שגיאה במחיקה: ${error.message}`);
      return false;
    }
  }, []);

  const masterGridParams = useMemo(() => ({
    UpdateContactComponent: UpdateContactComponent,
    GoogleFunctions: AuthenticateActivate,
    deleteContact: handleDeleteContactFromSubTable 
  }), [UpdateContactComponent, AuthenticateActivate, handleDeleteContactFromSubTable]);

  return (
    <>
      <Navbar
        id="SchoolNavBar"
        className="bg-[#12242E] fill-[#ffffff] opacity-[1.40e+7%] flex-row-reverse"
        suppressHydrationWarning
      >
        <LoadingOverlay />
        {ToolBar(
          onClearFilterButtonClick, 
          setColumnWindowOpen, 
          onAddRowToolBarClick, 
          onCancelChangeButtonClick, 
          onSaveChangeButtonClick, 
          onSaveDeletions, 
          checkedAmount, 
          onFilterTextBoxChanged, 
          onDisplayProgramsClicked, 
          LoadingOverlay, 
          checkContactsStatus, 
          onDisconnectContacts
        )}
      </Navbar>
      <Suspense>
        <div id="grid-1" className={theme === "dark-theme" ? "ag-theme-quartz-dark w-full flex-grow overflow-x-hidden" : "ag-theme-quartz w-full flex-grow overflow-x-hidden"} style={{ width: "100%", height: "1000px" }}>
          <AgGridReact
            noRowsOverlayComponent={CustomNoRowsOverlay}
            getRowId={getRowId}
            ref={gridRef}
            rowData={rowData}
            columnDefs={colDefinition}
            onCellKeyDown={onCellKeyDown}
            enableRtl={true}
            onGridReady={onGridReady}
            onColumnMoved={onColumnMoved}
            onColumnResized={onColumnResized}
            onCellValueChanged={onCellValueChanged}
            onCellEditingStarted={onCellEditingStarted}
            onRowSelected={onRowSelected}
            onSelectionChanged={handleSelectionChanged}
            isRowSelectable={isRowSelectable}
            singleClickEdit={true}
            loadingOverlayComponent={() => <Spinner animation="border" role="status" className="ml-[50%] mt-[300px] w-[200px] h-[200px]" />}
            components={components}
            pagination={true}
            paginationPageSize={25}
            undoRedoCellEditing={true}
            undoRedoCellEditingLimit={5}
            enableCellChangeFlash={true}
            rowSelection={"multiple"}
            suppressRowClickSelection={true}
            suppressRowTransform={true}
            suppressMenuHide={true}
            fullWidthCellRenderer={CustomMasterGrid}
            fullWidthCellRendererParams={masterGridParams}
            getRowHeight={getRowHeight}
            isFullWidthRow={isFullWidthRow}
            embedFullWidthRows={true}
          />
        </div>
      </Suspense>
      {ErrorModule()}
      {WindowManager()}
    </>
  );
}