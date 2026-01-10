"use client";
import { Role, School, SchoolsContact } from "@prisma/client";
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
  getAllSchools,
} from "@/db/schoolrequests";

import {
  CellValueChangedEvent,
  CellEditingStartedEvent,
  RowSelectedEvent,
  SelectionChangedEvent,
  RowClassParams,
  RowStyle,
  GetRowIdParams,
  ColDef,
  CellKeyDownEvent,
} from "ag-grid-community";
import Spinner from "react-bootstrap/Spinner";
import { Button, Navbar, OverlayTrigger } from "react-bootstrap";
import Tooltip from "react-bootstrap/Tooltip";
import { FcAddColumn, FcAddRow, FcCancel } from "react-icons/fc";
import { TableType, getAllCities, getModelFields, getRoles } from "@/db/generalrequests";
import {
  addContactRows,
  deleteContactsRows,
  getAllContacts,
  updateContactColumn,
} from "@/db/contactsRequests";
import CustomWhatsAppRenderer from "../../CellComponents/General/CustomWhatsAppRenderer";
import CustomLink from "../../CellComponents/General/CustomLink";
import { useContactComponent } from "@/util/Google/GoogleContacts/ContactComponent";
import { CustomLinkContact } from "../GeneralFiles/GoogleContacts/CustonLinkContact";
import { CustomMultiSelectCell } from "../GeneralFiles/Select/CustomMultiSelectCellRenderer";
import { CustomFilter } from "../GeneralFiles/Filters/CustomFilter";
import { GoogleAuthStatus } from "@/components/GoogleAuthStatus";

import { columnsDefinition, OtherComponentsObject } from "@/util/cache/cachetypes";
import { ThemeContext } from "@/context/Theme/Theme";
import { getInfo } from "@/db/instructorsrequest";
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

export default function ContactsTable() {
  const gridRef: any = useRef<AgGridReact>(null);

  const [AuthenticateActivate, authRes] = useContactComponent();

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

  const { onAddRowToolBarClick, onClearFilterButtonClick, onCancelChangeButtonClick, onSaveChangeButtonClick, onSaveDeletions, onFilterTextBoxChanged } = useToolBarFunctions(gridRef, rowCount, dataRowCount, SetInTheMiddleOfAddingRows, validateFields, setDialogType, setDialogMessage, setOpen, setAmount, modifiedRowRef, maxIndex)

  const { onCellValueChanged, onCellEditingStarted, onRowSelected, onSelectionChange, isRowSelectable, getRowStyles, getRowId } = useGridEvents(gridRef, InTheMiddleOfAddingRows, setAmount, checkedAmount, modifiedRowRef)

  const { WindowManager } = useColumnComponent(columnWindowOpen, setColumnWindowOpen, colDefinition, gridRef, colState, setColState)

  const handleDisconnectContacts = useCallback(async () => {
    try {
      console.log('🔌 [Contactstable] handleDisconnectContacts called');
      
      const response = await fetch('/api/google/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'contacts' }),
      });

      console.log('📥 [Contactstable] Disconnect response:', response.ok, response.status);

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      console.log('✅ [Contactstable] Disconnected successfully, reloading...');
      window.location.reload();
    } catch (error) {
      console.error('❌ [Contactstable] Error disconnecting from Google Contacts:', error);
      throw error;
    }
  }, []);

  const checkContactsAuthStatus = useCallback(async () => {
    console.log('🎯 [Contactstable] checkContactsAuthStatus called');
    console.log('⏰ [Contactstable] Time:', new Date().toISOString());
    
    try {
      console.log('📤 [Contactstable] Sending request to /api/google/check-status');
      
      const response = await fetch('/api/google/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'contacts' }),
      });

      console.log('📥 [Contactstable] Response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Contactstable] Response not OK:', errorText);
        throw new Error('Failed to check status');
      }

      const data = await response.json();
      console.log('📊 [Contactstable] Response data:', data);
      console.log('✅ [Contactstable] isConnected:', data.isConnected);
      console.log('📧 [Contactstable] email:', data.email);
      
      const result = {
        isConnected: data.isConnected,
        email: data.email,
        debug: data.debug,
      };
      
      console.log('🎁 [Contactstable] Returning:', result);
      
      return result;
    } catch (error) {
      console.error('❌ [Contactstable] Error checking Google Contacts status:', error);
      console.error('❌ [Contactstable] Error details:', {
        message: error.message,
        stack: error.stack,
      });
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
      let prevCell = null
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
        onSaveDeletions, 
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