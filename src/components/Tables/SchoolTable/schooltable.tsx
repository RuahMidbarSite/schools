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
import { createPortal } from "react-dom"; 
import { AgGridReact } from "ag-grid-react";
import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css"; 
import Spinner from "react-bootstrap/Spinner";
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
import { useStorageSync, getCacheVersion, getFromStorage } from "@/components/Tables/Messages/Storage/MessagesDataStorage";

export default function SchoolsTable() {
  // קריטי: useContext חייב להיות בהתחלה לפני כל ה-hooks!
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
  const [mounted, setMounted] = useState(false); 

  // 🆕 state למעקב אחר גרסת ה-cache
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

  // 🆕 פונקציה לרענון נתונים מה-Storage
  const refreshDataFromStorage = useCallback(async () => {
    console.log("🔄 [SchoolsTable] Refreshing data from storage...")
    
    try {
      const storageData = await getFromStorage()
      
      // עדכון בתי ספר
      if (storageData.Schools) {
        console.log(`✅ [SchoolsTable] Updating ${storageData.Schools.length} schools from storage`)
        setRowData(storageData.Schools)
        
        // עדכן גם את AgGrid אם הוא קיים
        if (gridRef.current?.api) {
          gridRef.current.api.setGridOption('rowData', storageData.Schools)
          gridRef.current.api.refreshCells({ force: true })
        }
      }
      
      // עדכון אנשי קשר
      if (storageData.schoolsContacts) {
        console.log(`✅ [SchoolsTable] Updating ${storageData.schoolsContacts.length} contacts from storage`)
        setAllContacts(storageData.schoolsContacts)
        
        // עדכן את ה-cellRenderer של הנציג
        if (gridRef.current?.api) {
          const currentColDefs = gridRef.current.api.getColumnDefs()
          if (currentColDefs) {
            const updatedColDefs = currentColDefs.map((column: any) => {
              if (column["field"] === "Representive") {
                return { 
                  ...column, 
                  cellRenderer: RepresentiveComponent, 
                  cellRendererParams: { 
                    AllContacts: [...storageData.schoolsContacts] 
                  } 
                }
              }
              return column
            })
            gridRef.current.api.setGridOption('columnDefs', updatedColDefs)
          }
        }
      }
      
      // עדכן את מספר הגרסה
      const newVersion = await getCacheVersion()
      setCacheVersion(newVersion)
      console.log(`✅ [SchoolsTable] Refresh complete, version: ${newVersion}`)
      
    } catch (error) {
      console.error("❌ [SchoolsTable] Error refreshing from storage:", error)
    }
  }, [setRowData, setAllContacts])
  
  // 🆕 Hook להאזנה לעדכוני Storage
  // 🔍 בדיקה פשוטה: האם האירוע מגיע בכלל?
useEffect(() => {
  if (!mounted) return
  
  console.log("👂 [SchoolsTable] Setting up SIMPLE listener test...");
  console.log("🕐 Current time:", new Date().toISOString());
  
  const handleStorageUpdate = (event: any) => {
    console.log("🎉🎉🎉 [SchoolsTable] EVENT RECEIVED!!! 🎉🎉🎉");
    console.log("🕐 Time received:", new Date().toISOString());
    console.log("📦 Event detail:", event.detail);
    console.log("📋 Keys updated:", event.detail?.keys);
    console.log("🔢 Version:", event.detail?.version);
    
    // עכשיו ננסה לרענן את הנתונים
    if (event.detail?.keys?.includes("Schools") || event.detail?.keys?.includes("schoolsContacts")) {
      console.log("🔄 Calling refreshDataFromStorage...");
      refreshDataFromStorage();
    }
  };

  window.addEventListener("storageUpdated", handleStorageUpdate);

  // בדיקה: האם המאזין באמת רשום?
  console.log("✅ [SchoolsTable] Listener registered successfully!");

  return () => {
    console.log("🔇 [SchoolsTable] Removing listener");
    window.removeEventListener("storageUpdated", handleStorageUpdate);
  };
}, [mounted, refreshDataFromStorage]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    if (onSelectionChange) {
       onSelectionChange(event);
    }
    const selectedRowsCount = event.api.getSelectedRows().length;
    setAmount(selectedRowsCount);
  }, [onSelectionChange, setAmount]);

  // פונקציות לניהול סטטוס Google Contacts
  const checkContactsStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/google/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'contacts' }),
      });
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
      await fetch('/api/google/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'contacts' }),
      });
    } catch (error) {
      console.error("Error disconnecting Contacts:", error);
    }
  }, []);

  const LoadingOverlay = useCallback(() => {
    if (!isLoading) {
      return <></>
    } else {
      return (
        <Spinner
          id="1"
          animation="border"
          role="status"
          className="w-[220px] h-[200px] bg-yellow-500 fill-yellow z-[999]"
        />
      );
    }
  }, [isLoading]);

  const components = useMemo(
    () => ({
      CustomMasterGrid: CustomMasterGrid,
      CustomSelect: CustomSelect,
      CustomFilter: CustomFilter,
      RepresentiveComponent: RepresentiveComponent,
    }),
    []
  );

  const getRowId = useCallback(
    (params: GetRowIdParams<School>) => String(params.data.Schoolid),
    [],
  );

  const onCellKeyDown = useCallback((event: CellKeyDownEvent) => {
      const keyboardEvent = event.event as unknown as KeyboardEvent;
      keyboardEvent.stopPropagation()
      if (keyboardEvent.key === "Tab" || keyboardEvent.key === "Enter" || keyboardEvent.key === "ArrowLeft" || keyboardEvent.key === "ArrowRight") {
        event.event.preventDefault();
      }
  }, []);

  const CustomNoRowsOverlay = useCallback(() => {
    const Name = "לא זוהו נתונים"
    return (
      <div className="ag-overlay-no-rows-center text-blue-300">
        <span> {Name} </span>
      </div>
    );
  }, [])

  const getRowHeight = useCallback(({ api, data, ...params }: RowHeightParams) => {
    return 42
  }, []);
  
  const isFullWidthRow = useCallback((params: IsFullWidthRowParams) => {
    if (params.rowNode.data && params.rowNode?.expanded) {
      return true
    }
    return false
  }, []);

  const UpdateContactComponent = useCallback((Data) => {
    if (Data.length > 0) {
      if (gridRef && gridRef.current?.api) {
        // בדיקה אם באמת השתנה משהו לפני עדכון
        const currentContacts = AllContacts.length;
        if (currentContacts === Data.length) return;
        
        setAllContacts(Data);
        
        const coldefs = gridRef.current.api.getColumnDefs().map((column) => {
          if (column["field"] === "Representive") {
            return { ...column, cellRenderer: RepresentiveComponent, cellRendererParams: { AllContacts: [...Data] } }
          }
          return column
        })
        setColDefs(coldefs)
      }
    }
  }, [AllContacts])

  const masterGridParams = useMemo(() => ({
    UpdateContactComponent: UpdateContactComponent,
    GoogleFunctions: AuthenticateActivate
  }), [UpdateContactComponent, AuthenticateActivate]);

  // ✅ תיקון: הגדרת ה-Toolbar כאן למעלה (מחוץ ל-return)
  // זה מבטיח שהפונקציות הפנימיות ירוצו תמיד ולא יקרסו בגלל תנאים
  const toolbarContent = ToolBar(
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
  );

  return (
    <>
      {/* כאן אנחנו רק מציגים את המשתנה שהכנו למעלה */}
      {mounted && document.getElementById("navbar-actions") 
        ? createPortal(toolbarContent, document.getElementById("navbar-actions") as HTMLElement)
        : null
      }

      <Suspense>
        <div
          id="grid-1"
          className={theme === "dark-theme" ? "ag-theme-quartz-dark w-full flex-grow overflow-x-hidden" : "ag-theme-quartz w-full flex-grow overflow-x-hidden"}
          style={{ width: "100%", height: "1000px" }}
        >
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
            loadingOverlayComponent={() => (
              <Spinner
                animation="border"
                role="status"
                className="ml-[50%] mt-[300px] w-[200px] h-[200px]"
              />
            )}
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