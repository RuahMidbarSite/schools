"use client";
import { SchoolsContact, School } from "@prisma/client";
import { useState, useRef, useCallback, useMemo, Suspense, useContext, Ref, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { GridApi, ColDef, CellKeyDownEvent, GetRowIdParams } from "ag-grid-community";
import Spinner from "react-bootstrap/Spinner";
import { TableType } from "@/db/generalrequests";
import CustomWhatsAppRenderer from "../../CellComponents/General/CustomWhatsAppRenderer";
import CustomLink from "../../CellComponents/General/CustomLink";
import { useContactComponent } from "@/util/Google/GoogleContacts/ContactComponent";
import { CustomLinkContact } from "../GeneralFiles/GoogleContacts/CustonLinkContact";
import { CustomMultiSelectCell } from "../GeneralFiles/Select/CustomMultiSelectCellRenderer";
import { CustomFilter } from "../GeneralFiles/Filters/CustomFilter";
import { ThemeContext } from "@/context/Theme/Theme";
import useColumnEffects from "./hooks/ColumnEffects";
import { useExternalEffect } from "../GeneralFiles/Hooks/ExternalUseEffect";
import useColumnHook from "./hooks/ColumnHooks";
import useErrorValidationComponents from "./hooks/ErrorValidationComponents";
import useExternalUpdate from "./hooks/ExternalUpdateAgGridComponents";
import useGridFunctions from "./hooks/GridInitialize";
import useColumnComponent from "./hooks/ColumnComponent";
import useToolBarFunctions from "./hooks/ToolBarFunctions";
import ToolBar from "./hooks/ToolBarComponent";
import useGridEvents from "./hooks/GridEvents";
// ✅ ייבוא המנגנון לסנכרון נתונים
import { getFromStorage } from "@/components/Tables/SmallContactsTable/Storage/SmallContactsDataStorage";

interface SmallContactsTableProps {
  SchoolID: number;
  SchoolApi: Ref<GridApi<School>>;
  setAllSchoolContacts: any;
  deleteContact?: (ids: number[]) => Promise<boolean>;
  GoogleFunctions?: any;
}

const SmallContactsTable = ({ SchoolID, SchoolApi, setAllSchoolContacts, deleteContact }: SmallContactsTableProps) => {

  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<SchoolsContact[]>(null);
  const [colDefinition, setColumnDefs] = useState<ColDef[]>(null);
  const [AuthenticateActivate, authRes] = useContactComponent();
  const [InTheMiddleOfAddingRows, SetInTheMiddleOfAddingRows] = useState(false);
  const allContactsCount = useRef(0)
  const dataRowCount = useRef(0);
  const rowCount = useRef(0);
  const [AllContacts, setAllContacts] = useState<SchoolsContact[]>()
  const [open, setOpen] = useState(false);
  const [dialogType, setDialogType] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [colState, setColState]: any = useState([])
  const [columnWindowOpen, setColumnWindowOpen] = useState(false);
  const [checkedAmount, setAmount] = useState<number>(0);
  const { theme } = useContext(ThemeContext)
  const { updateColState, updateColStateFromCache } = useColumnEffects(gridRef, colState, setColState, SchoolID)
  const { validateFields, ErrorModule } = useErrorValidationComponents(setOpen, setDialogType, setDialogMessage, open, dialogType, dialogMessage)
  const [isLoading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useExternalEffect(updateColStateFromCache, [colDefinition])
  useExternalEffect(updateColState, [colState])

  // === 🟢 תוספת: האזנה לשינויים בסטורג' ורענון הטבלה הקטנה ===
 const refreshLocalData = useCallback(async () => {
    // ✅ אם בדיוק ביצענו מחיקה מקומית, מדלגים על הרענון הזה
    if (skipNextStorageRefresh.current) {
      skipNextStorageRefresh.current = false;
      console.log("⏭️ SmallContactsTable: skipping storage refresh after local delete");
      return;
    }
    try {
      const data = await getFromStorage();
      if (data && data.schoolsContacts) {
        const currentSchoolContacts = data.schoolsContacts.filter(
          (c: SchoolsContact) => c.SchoolId === SchoolID || c.Schoolid === SchoolID
        );
        setRowData(currentSchoolContacts);
        if (gridRef.current?.api) {
          gridRef.current.api.setGridOption('rowData', currentSchoolContacts);
          gridRef.current.api.refreshCells({ force: true });
        }
      }
    } catch (e) {
      console.error("Failed to refresh small table:", e);
    }
  }, [SchoolID]);

  // השימוש ב-hook שמאזין לאירוע גלובלי
  useEffect(() => {
    if (!mounted) return;
    
    const handleStorageUpdate = (event: any) => {
        // אם עודכנו אנשי קשר, נרענן את הטבלה
        if (event.detail?.keys?.includes("schoolsContacts") || event.detail?.keys?.includes("ALL")) {
            refreshLocalData();
        }
    };

    window.addEventListener("storageUpdated", handleStorageUpdate);
    return () => {
        window.removeEventListener("storageUpdated", handleStorageUpdate);
    };
  }, [mounted, refreshLocalData]);
  // ==============================================================

  const maxIndex = useRef<number>(0)
  const skipNextStorageRefresh = useRef(false) // ✅ מניעת דריסת מחיקה מקומית
  const { ValueFormatSchool, ValueFormatWhatsApp, valueFormatCellPhone } = useExternalUpdate(AuthenticateActivate)
  const { onGridReady } = useGridFunctions(valueFormatCellPhone, AuthenticateActivate, ValueFormatSchool, valueFormatCellPhone, setRowData, setColumnDefs, dataRowCount, rowCount, SchoolID, setAllContacts, allContactsCount, maxIndex)
  const { onColumnResized, onColumnMoved } = useColumnHook(gridRef, setColState, "SmallContacts")
  const { WindowManager } = useColumnComponent(columnWindowOpen, setColumnWindowOpen, colDefinition, gridRef, colState, setColState)
  const { onAddRowToolBarClick, onClearFilterButtonClick, onCancelChangeButtonClick, onSaveChangeButtonClick, onSaveDeletions, onFilterTextBoxChanged, DeleteCheckedAmountText } = useToolBarFunctions(gridRef, rowCount, dataRowCount, SetInTheMiddleOfAddingRows, validateFields, setDialogType, setDialogMessage, setOpen, setAmount, SchoolID, checkedAmount, AllContacts, setRowData, setAllContacts, allContactsCount, SchoolApi, setAllSchoolContacts, setLoading, rowData, maxIndex)
  const { onCellValueChanged, onRowSelected, onSelectionChange, isRowSelectable } = useGridEvents(gridRef, InTheMiddleOfAddingRows, setAmount, checkedAmount, SchoolApi, SchoolID, setAllContacts, AllContacts, setAllSchoolContacts, setRowData, rowData)

  const getRowId = useCallback((params: GetRowIdParams<SchoolsContact>) => {
    return String(params.data.Contactid);
  }, []);

const handleDeleteRows = useCallback(async () => {
    if (!gridRef.current || !gridRef.current.api) return;

    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedData = selectedNodes.map(node => node.data);
    const selectedIds = selectedData.map(d => d.Contactid).filter(id => typeof id === 'number');

    if (selectedIds.length === 0) return;

    if (deleteContact) {
      if (!window.confirm(`האם למחוק ${selectedIds.length} אנשי קשר?`)) return;
      console.log("🗑️ Deleting IDs:", selectedIds);
      // ✅ מסמנים שאנחנו מטפלים במחיקה מקומית - refreshLocalData ידלג פעם אחת
      skipNextStorageRefresh.current = true;
      const success = await deleteContact(selectedIds);
      console.log("🗑️ Delete success:", success);
if (success) {
        console.log("✅ Applying transaction remove...");
        if (gridRef.current?.api && !gridRef.current.api.isDestroyed()) {
          gridRef.current.api.applyTransaction({ remove: selectedData });
          gridRef.current.api.deselectAll();
        }
        setAmount(0);
        setRowData(prev => {
          const updated = prev ? prev.filter(row => !selectedIds.includes(row.Contactid)) : [];
          console.log("✅ New rowData length:", updated.length);
          return updated;
        });
      } else {
        // ✅ אם המחיקה נכשלה, מבטלים את הדגל
        skipNextStorageRefresh.current = false;
        console.log("❌ Delete failed!");
      }
    } else {
      onSaveDeletions();
    }
  }, [deleteContact, onSaveDeletions]);

  const components = useMemo(() => ({
      CustomLink: CustomLink,
      CustomWhatsAppRenderer: CustomWhatsAppRenderer,
      CustomLinkContact: CustomLinkContact,
      CustomMultiSelectCellRenderer: CustomMultiSelectCell,
      CustomFilter: CustomFilter,
    }), []);

  const onCellKeyDown = useCallback((event: CellKeyDownEvent) => {
    const keyboardEvent = event.event as unknown as KeyboardEvent;
    keyboardEvent.stopPropagation();
  }, []);

  const CustomNoRowsOverlay = useCallback(() => <div className="ag-overlay-no-rows-center text-blue-300"><span> לא זוהו נתונים </span></div>, [])
  const LoadingOverlay = () => !isLoading ? <></> : <Spinner animation="border" role="status" className="w-[220px] h-[200px] bg-yellow-500 fill-yellow z-[999]" />;

  return (
    <>
      {ToolBar(onClearFilterButtonClick, setColumnWindowOpen, onAddRowToolBarClick, onCancelChangeButtonClick, onSaveChangeButtonClick, handleDeleteRows, checkedAmount, onFilterTextBoxChanged, DeleteCheckedAmountText, SchoolID, isLoading, LoadingOverlay)}
      <Suspense>
        <div className={theme === "dark-theme" ? "ag-theme-quartz-dark w-screen right-[100%]" : "ag-theme-quartz w-screen right-[100%]"} style={{ height: "450px" }}>
          <AgGridReact
            autoHeaderHeight={true}
            defaultColDef={{ wrapHeaderText: true, resizable: true }}
            noRowsOverlayComponent={CustomNoRowsOverlay}
            ref={gridRef}
            onGridReady={onGridReady}
            rowData={rowData}
            columnDefs={colDefinition}
            onCellKeyDown={onCellKeyDown}
            enableRtl={true}
            components={components}
            onColumnMoved={onColumnMoved}
            onColumnResized={onColumnResized}
            onCellValueChanged={onCellValueChanged}
            onRowSelected={onRowSelected}
            onSelectionChanged={onSelectionChange}
            isRowSelectable={isRowSelectable}
            loadingOverlayComponent={() => <Spinner animation="border" role="status" className="w-[200px] h-[200px]" />}
            undoRedoCellEditing={true}
            undoRedoCellEditingLimit={5}
            enableCellChangeFlash={true}
            rowSelection={"multiple"}
            getRowId={getRowId}
            suppressRowTransform={true}
            suppressMenuHide={true}
            suppressRowClickSelection={true}
            pagination={true}
            paginationPageSize={25}
          />
        </div>
      </Suspense>
      {ErrorModule()}
      {WindowManager()}
    </>
  );
}

export default SmallContactsTable;