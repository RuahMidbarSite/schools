"use client";
import type { SchoolsContact } from "@prisma/client";
import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  Suspense,
  useContext,
} from "react";
import { AgGridReact } from "ag-grid-react";

import {
  CellKeyDownEvent,
} from "ag-grid-community";
import Spinner from "react-bootstrap/Spinner";

// ייבוא פונקציית המחיקה מהשרת
import {
  deleteContactsRows,
} from "@/db/contactsRequests";

import CustomWhatsAppRenderer from "../../CellComponents/General/CustomWhatsAppRenderer";
import CustomLink from "../../CellComponents/General/CustomLink";
import { useContactComponent } from "@/util/Google/GoogleContacts/ContactComponent";
import { CustomLinkContact } from "../GeneralFiles/GoogleContacts/CustonLinkContact";
import { CustomMultiSelectCell } from "../GeneralFiles/Select/CustomMultiSelectCellRenderer";
import { CustomFilter } from "../GeneralFiles/Filters/CustomFilter";
import { GoogleAuthStatus } from "@/components/GoogleAuthStatus";

import { columnsDefinition } from "@/util/cache/cachetypes";
import { ThemeContext } from "@/context/Theme/Theme";
import { useExternalEffect } from "../GeneralFiles/Hooks/ExternalUseEffect";
import useColumnEffects from "./hooks/ColumnEffects";
import useAuthEffect from "./hooks/AuthEffect";
import useColumnHooks from "./hooks/ColumnHooks";
import useErrorValidationComponents from "./hooks/ErrorValidationComponents";
import useExternalUpdate from "./hooks/ExternalUpdateAgGridComponents";
import useToolBarFunctions from "./hooks/ToolBarFunctions";
import useGridEvents from "./hooks/GridEvents";
import useGridFunctions from "./hooks/GridInitialize";
import ToolBar from "@/components/Tables/ContactsTable/hooks/ToolBarComponent";
import useColumnComponent from "./hooks/ColumnComponent";
import { useStorageSync, getCacheVersion, getFromStorage } from "@/components/Tables/Messages/Storage/MessagesDataStorage";

export default function ContactsTable() {
  const gridRef: any = useRef<AgGridReact>(null);

  const [AuthenticateActivate] = useContactComponent();

  const [checkedAmount, setAmount]: any = useState(0);

  const [InTheMiddleOfAddingRows, SetInTheMiddleOfAddingRows] = useState(false);

  const dataRowCount = useRef(0);
  const rowCount = useRef(0);

  const modifiedRowRef = useRef(null);

  const [rowData, setRowData] = useState<SchoolsContact[]>(null);

  const [colDefinition, setColDefs] = useState<columnsDefinition>(null);

  const [open, setOpen] = useState(false);
  const [dialogType, setDialogType] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [colState, setColState]: any = useState([])
  const [columnWindowOpen, setColumnWindowOpen] = useState(false);

  const { theme } = useContext(ThemeContext)

  const [mounted, setMounted] = useState(false)

  const { updateColState, updateColStateFromCache } = useColumnEffects(gridRef, colState, setColState)

  const { authEffect } = useAuthEffect(AuthenticateActivate)

  useExternalEffect(authEffect, [AuthenticateActivate])

  useExternalEffect(updateColStateFromCache, [colDefinition])
  useExternalEffect(updateColState, [colState])

  const { onColumnResized, onColumnMoved } = useColumnHooks(gridRef, colState, setColDefs, setColState, colState)

  const { validateFields, ErrorModule } = useErrorValidationComponents(setOpen, setDialogType, setDialogMessage, open, dialogType, dialogMessage)

  const { ValueFormatSchool, ValueFormatWhatsApp, valueFormatCellPhone } = useExternalUpdate(AuthenticateActivate)

  const maxIndex = useRef<number>(0)

  const { onGridReady } = useGridFunctions(valueFormatCellPhone, AuthenticateActivate, ValueFormatSchool, ValueFormatWhatsApp, setRowData, setColDefs, dataRowCount, rowCount, maxIndex)

  const { onAddRowToolBarClick, onClearFilterButtonClick, onCancelChangeButtonClick, onSaveChangeButtonClick, onFilterTextBoxChanged } = useToolBarFunctions(gridRef, rowCount, dataRowCount, SetInTheMiddleOfAddingRows, validateFields, setDialogType, setDialogMessage, setOpen, setAmount, modifiedRowRef, maxIndex)

  const { onCellValueChanged, onCellEditingStarted, onRowSelected, onSelectionChange, isRowSelectable, getRowStyles, getRowId } = useGridEvents(gridRef, InTheMiddleOfAddingRows, setAmount, checkedAmount, modifiedRowRef)

  const { WindowManager } = useColumnComponent(columnWindowOpen, setColumnWindowOpen, colDefinition, gridRef, colState, setColState)

  // 🛠️ פונקציה מתוקנת למחיקה: שולחת רק מזהים (IDs) ולא אובייקטים
  const handleDeleteRows = useCallback(async () => {
    if (!gridRef.current || !gridRef.current.api) return;

    const selectedNodes = gridRef.current.api.getSelectedNodes();
    
    // ✅ התיקון הקריטי: חילוץ ה-Contactid בלבד
    const selectedIds = selectedNodes
      .map(node => node.data.Contactid)
      .filter(id => id !== undefined && id !== null); // סינון ערכים לא תקינים
    
    if (selectedIds.length === 0) return;

    const isConfirmed = window.confirm(`האם אתה בטוח שברצונך למחוק ${selectedIds.length} אנשי קשר?`);
    if (!isConfirmed) return;

    try {
      console.log("🚀 Sending delete request for IDs:", selectedIds);
      
      // שליחת מערך של מספרים בלבד לשרת
      await deleteContactsRows(selectedIds);

      console.log("✅ Server delete success");

      // עדכון ה-UI: הסרת השורות מהטבלה ללא רענון עמוד
      const rowsToRemove = selectedNodes.map(node => node.data);
      gridRef.current.api.applyTransaction({ remove: rowsToRemove });
      
      // איפוס בחירה
      gridRef.current.api.deselectAll();
      setAmount(0);
      
    } catch (error: any) {
      console.error("❌ Failed to delete contacts:", error);
      alert(`שגיאה במחיקה: ${error.message || "נא לבדוק חיבור לרשת"}`);
    }
  }, [setAmount]);

  // פונקציה לרענון נתונים מה-Storage (ללא רענון עמוד)
  const refreshContactsFromStorage = useCallback(async () => {
    try {
      const storageData = await getFromStorage()
      if (storageData && storageData.schoolsContacts) {
        setRowData(storageData.schoolsContacts)
        if (gridRef.current?.api) {
          gridRef.current.api.setGridOption('rowData', storageData.schoolsContacts)
          gridRef.current.api.refreshCells({ force: true })
        }
      }
    } catch (error) {
      console.error("Error refreshing contacts:", error)
    }
  }, [setRowData])
  
  // האזנה לשינויים ב-Storage
  useEffect(() => {
    if (!mounted) return
    
    // בדיקה ש-Hook קיים כדי למנוע שגיאות
    if (typeof useStorageSync !== 'function') return;

    const cleanup = useStorageSync((updatedKeys, version) => {
      const shouldRefresh = updatedKeys.includes('schoolsContacts') || updatedKeys.includes('ALL')
      if (shouldRefresh) {
        refreshContactsFromStorage()
      }
    })
    return cleanup
  }, [mounted, refreshContactsFromStorage])
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDisconnectContacts = useCallback(async () => {
    try {
      const response = await fetch('/api/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contacts' }),
      });

      if (!response.ok) throw new Error('Failed to disconnect');
      
      console.log("Disconnected successfully");
      // הסרנו את ה-reload כדי למנוע לופים
      alert("התנתקת בהצלחה. אנא רענן את הדף ידנית במידת הצורך.");
      
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }, []);

  const checkContactsAuthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/google/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contacts' }),
      });

      if (!response.ok) {
          return { isConnected: false };
      }

      const data = await response.json();
      return {
        isConnected: data.isConnected,
        email: data.email,
        debug: data.debug,
      };
    } catch (error) {
      console.error('❌ Error checking status:', error);
      return { isConnected: false };
    }
  }, []);

  const components = useMemo(
    () => ({
      CustomLink: CustomLink,
      CustomWhatsAppRenderer: CustomWhatsAppRenderer,
      CustomLinkContact: CustomLinkContact,
      CustomMultiSelectCellRenderer: CustomMultiSelectCell,
      CustomFilter: CustomFilter,
    }),
    []
  );

  const onCellKeyDown = useCallback((event: CellKeyDownEvent) => {
    const keyboardEvent = event.event as unknown as KeyboardEvent;
    keyboardEvent.stopPropagation()
    if (keyboardEvent.key === "Tab" || keyboardEvent.key === "Enter" || keyboardEvent.key === "ArrowLeft" || keyboardEvent.key === "ArrowRight") {
      const currentNode = event.api.getDisplayedRowAtIndex(event.rowIndex);

      const currentColumnIndex = event.api.getAllDisplayedColumns().findIndex(
        col => col?.getColId() === event.column?.getColId()
      );

      let nextCell = null;
      const displayedColumns = event.api.getAllDisplayedColumns();

      const isColumnEditable = (colDef, node) => {
        if (typeof colDef.editable === 'function') {
          return colDef.editable(node);
        }
        return !!colDef.editable;
      };

      const triggerCellRenderer = (params, column) => {
        const renderer = column.getColDef().cellRenderer;
        if (renderer) {
          params.api.refreshCells({
            columns: [column],
            force: true,
          });
        }
      };

      for (let i = currentColumnIndex + 1; i < displayedColumns.length; i++) {
        const colDef = displayedColumns[i].getColDef();
        if (isColumnEditable(colDef, currentNode) || colDef.cellRenderer) {
          nextCell = { rowIndex: event.rowIndex, column: displayedColumns[i] };
          break;
        }
      }

      if (!nextCell && event.rowIndex + 1 < event.api.getDisplayedRowCount()) {
        for (let i = 0; i < displayedColumns.length; i++) {
          const colDef = displayedColumns[i].getColDef();
          if (isColumnEditable(colDef, event.api.getDisplayedRowAtIndex(event.rowIndex + 1)) || colDef.cellRenderer) {
            nextCell = { rowIndex: event.rowIndex + 1, column: displayedColumns[i] };
            break;
          }
        }
      }

      if (nextCell && keyboardEvent.key !== "ArrowRight") {
        event.api.stopEditing();
        event.api.setFocusedCell(nextCell.rowIndex, nextCell.column);

        const nextCellDef = nextCell.column.getColDef();
        if (nextCellDef.cellRenderer) {
          triggerCellRenderer(event, nextCell.column);
        } else {
          event.api.startEditingCell({
            rowIndex: nextCell.rowIndex,
            colKey: nextCell.column.getColId(),
          });
        }
      } else {
        event.api.stopEditing();
        const displayedColumns = event.api.getAllDisplayedColumns();
        const prevCol = displayedColumns[currentColumnIndex - 1]
        event.api.setFocusedCell(event.rowIndex, prevCol.getColId());

        const prevCellDef = prevCol.getColDef();
        if (prevCellDef.cellRenderer) {
          triggerCellRenderer(event, prevCell.column);
        } else {
          event.api.startEditingCell({
            rowIndex: event.rowIndex,
            colKey: prevCol.getColId(),
          });
        }
      }
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

  const googleAuthComponent = useMemo(() => (
    <GoogleAuthStatus
      type="Contacts"
      onDisconnect={handleDisconnectContacts}
      checkAuthStatus={checkContactsAuthStatus}
    />
  ), [handleDisconnectContacts, checkContactsAuthStatus]);

  return (
    <>
      {ToolBar(
        onClearFilterButtonClick, 
        setColumnWindowOpen, 
        onAddRowToolBarClick, 
        onCancelChangeButtonClick, 
        onSaveChangeButtonClick, 
        handleDeleteRows, 
        checkedAmount, 
        onFilterTextBoxChanged,
        googleAuthComponent
      )}

      <Suspense>
        <div
          id="grid-1"
          className={theme === "dark-theme" ? "ag-theme-quartz-dark w-screen h-screen" : "ag-theme-quartz w-screen h-screen"}
          style={{}}
        >
          <AgGridReact
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
            onCellEditingStarted={onCellEditingStarted}
            onRowSelected={onRowSelected}
            onSelectionChanged={onSelectionChange}
            isRowSelectable={isRowSelectable}
            loadingOverlayComponent={() => (
              <Spinner
                animation="border"
                role="status"
                className="ml-[50%] mt-[300px] w-[200px] h-[200px]"
              />
            )}
            undoRedoCellEditing={true}
            undoRedoCellEditingLimit={5}
            enableCellChangeFlash={true}
            rowSelection={"multiple"}
            suppressRowClickSelection={true}
            getRowStyle={getRowStyles}
            getRowId={getRowId}
            suppressRowTransform={true}
            suppressMenuHide={true}
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