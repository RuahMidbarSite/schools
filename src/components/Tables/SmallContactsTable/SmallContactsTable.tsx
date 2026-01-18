"use client";
import { SchoolsContact, School } from "@prisma/client";
import { useState, useRef, useCallback, useMemo, Suspense, useContext, Ref } from "react";
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

interface SmallContactsTableProps {
  SchoolID: number;
  SchoolApi: Ref<GridApi<School>>;
  setAllSchoolContacts: any;
  deleteContact?: (ids: number[]) => Promise<boolean>; // מעודכן לקבלת בוליאני
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

  useExternalEffect(updateColStateFromCache, [colDefinition])
  useExternalEffect(updateColState, [colState])

  const maxIndex = useRef<number>(0)
  const { ValueFormatSchool, ValueFormatWhatsApp, valueFormatCellPhone } = useExternalUpdate(AuthenticateActivate)
  const { onGridReady } = useGridFunctions(valueFormatCellPhone, AuthenticateActivate, ValueFormatSchool, valueFormatCellPhone, setRowData, setColumnDefs, dataRowCount, rowCount, SchoolID, setAllContacts, allContactsCount, maxIndex)
  const { onColumnResized, onColumnMoved } = useColumnHook(gridRef, setColState, "SmallContacts")
  const { WindowManager } = useColumnComponent(columnWindowOpen, setColumnWindowOpen, colDefinition, gridRef, colState, setColState)
  const { onAddRowToolBarClick, onClearFilterButtonClick, onCancelChangeButtonClick, onSaveChangeButtonClick, onSaveDeletions, onFilterTextBoxChanged, DeleteCheckedAmountText } = useToolBarFunctions(gridRef, rowCount, dataRowCount, SetInTheMiddleOfAddingRows, validateFields, setDialogType, setDialogMessage, setOpen, setAmount, SchoolID, checkedAmount, AllContacts, setRowData, setAllContacts, allContactsCount, SchoolApi, setAllSchoolContacts, setLoading, rowData, maxIndex)
  const { onCellValueChanged, onRowSelected, onSelectionChange, isRowSelectable } = useGridEvents(gridRef, InTheMiddleOfAddingRows, setAmount, checkedAmount, SchoolApi, SchoolID, setAllContacts, AllContacts, setAllSchoolContacts, setRowData, rowData)

  // 🔑 מזהה שורה תקין קריטי למחיקה ויזואלית
  const getRowId = useCallback((params: GetRowIdParams<SchoolsContact>) => {
    return String(params.data.Contactid);
  }, []);

  const handleDeleteRows = useCallback(async () => {
    if (!gridRef.current || !gridRef.current.api) return;

    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedData = selectedNodes.map(node => node.data);
    
    // שליחת רק ה-IDs לאבא
    const selectedIds = selectedData.map(d => d.Contactid).filter(id => typeof id === 'number');

    if (selectedIds.length === 0) return;

    // אם קיבלנו פונקציית מחיקה מהאבא
    if (deleteContact) {
      // 1. מבקשים אישור מהמשתמש כאן (בילד)
      if (!window.confirm(`האם למחוק ${selectedIds.length} אנשי קשר?`)) return;

      // 2. קוראים לאבא למחוק (שרת + Storage) ומחכים לתשובה
      const success = await deleteContact(selectedIds);
      
      if (success) {
        // 3. אם הצליח -> מוחקים ויזואלית מהטבלה הזו
        gridRef.current.api.applyTransaction({ remove: selectedData });
        gridRef.current.api.deselectAll();
        setAmount(0);

        // 4. עדכון ה-State המקומי (כדי שלא יחזור אם הרכיב ירוענן)
        setRowData(prev => prev ? prev.filter(row => !selectedIds.includes(row.Contactid)) : []);
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
    // ... (אותו קוד ניווט ארוך נשאר כפי שהיה)
    const keyboardEvent = event.event as unknown as KeyboardEvent;
    keyboardEvent.stopPropagation();
    // ... שאר הלוגיקה שלך ...
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
            getRowId={getRowId} // ✅ קריטי
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