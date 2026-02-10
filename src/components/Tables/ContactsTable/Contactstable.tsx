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
  ICellRendererParams,
} from "ag-grid-community";
import Spinner from "react-bootstrap/Spinner";

// ייבוא פונקציית המחיקה וטעינה מהשרת
import {
  deleteContactsRows,
  getAllContacts,
} from "@/db/contactsRequests";

import { getModelFields, getAllStatuses, getRoles } from "@/db/generalrequests";
import CustomSelectCellEditor from "@/components/CustomSelect/CustomSelectCellEditor";

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
import ToolBar from "@/components/Tables/ContactsTable/hooks/ToolBarComponent";
import useColumnComponent from "./hooks/ColumnComponent";
import { useStorageSync, getCacheVersion, getFromStorage, updateStorage } from "@/components/Tables/Messages/Storage/MessagesDataStorage";
// WhatsApp renderer for FirstName column
// WhatsApp renderer for FirstName column
const FirstNameWhatsAppRenderer = (params: ICellRendererParams) => {
  const [clicked, setClicked] = useState(false);
  
  if (!params.value) return null;
  
  const phoneNumber = params.data?.Cellphone;
  if (!phoneNumber) {
    return <span>{params.value}</span>;
  }
  
  // Clean phone number - remove all non-digit characters
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Add country code if not present (assuming Israel +972)
  const formattedPhone = cleanPhone.startsWith('972') ? cleanPhone : 
                        cleanPhone.startsWith('0') ? '972' + cleanPhone.substring(1) : 
                        '972' + cleanPhone;
  
  // Use whatsapp:// protocol to open desktop app directly
  const whatsappUrl = `whatsapp://send?phone=${formattedPhone}`;
  
  const handleClick = (e) => {
    e.preventDefault();
    setClicked(true);
    window.location.href = whatsappUrl;
  };
  
  return (
    <a 
      href={whatsappUrl}
      onClick={handleClick}
      style={{ 
        color: clicked ? '#800080' : '#0066CC', // Purple after click, blue before
        textDecoration: 'underline', 
        cursor: 'pointer' 
      }}
    >
      {params.value}
    </a>
  );
};
export default function ContactsTable() {
  const gridRef: any = useRef<AgGridReact>(null);

  const [AuthenticateActivate] = useContactComponent();

  const [checkedAmount, setAmount]: any = useState(0);

  const [InTheMiddleOfAddingRows, SetInTheMiddleOfAddingRows] = useState(false);

  const dataRowCount = useRef(0);
  const rowCount = useRef(0);

  const modifiedRowRef = useRef(null);

  const [rowData, setRowData] = useState<SchoolsContact[]>(null);

  const [colDefinition, setColDefs] = useState<any>(null);

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

  // === 🛠️ הגדרת עמודות מעודכנת ===
  const GetDefaultDefinitions = useCallback((model, roles, statuses) => {
    
    // 1. הגדרות Flex - רק הערות מקבלת גמישות
    const columnFlex: { [key: string]: number } = {
        Remarks: 1,         // 🔥 תופס את כל המקום שמתפנה
        default: 0          // כל השאר קבועים
    };

    // 2. הגדרות רוחב קבוע
    const columnFixedWidths: { [key: string]: number } = {
        Contactid: 85,        
        
        // 🔻 שינויים לפי הבקשה האחרונה
        Email: 220,           // ✅ הוגדל כפול (היה 80-110)
        
        IsRepresentative: 50, // ✅ צומצם למינימום
        SchoolId: 60,         // ✅ צומצם דרסטית
        
        FirstName: 80,
        LastName: 80,
        
        Role: 130,            
        
        Cellphone: 95,
        Phone: 95,
        
        GoogleContactLink: 110,
        Status: 70,
        WhatsApp: 50,
    };

    const minWidths: { [key: string]: number } = {
        Remarks: 150,
        Role: 100,
        // ביטול מינימום לעמודות הצרות
        default: 40 
    };

    var coldef: Object[] = model[0].map((value: any, index: any) => {
      
      const headerName = model[1][index];
      
      // חישוב רוחב
      const fixedWidth = columnFixedWidths[value];
      const flexVal = columnFlex[value] !== undefined ? columnFlex[value] : undefined; 
      const minW = minWidths[value] || minWidths["default"];

      let colDef: any = {
        field: value,
        headerName: headerName,
        editable: true,
        filter: "CustomFilter",
        resizable: true,
        suppressSizeToFit: true,
        width: fixedWidth,
        flex: flexVal,
        minWidth: minW,
        singleClickEdit: true
      };

      if (value === "Contactid") {
        colDef.cellEditor = "agTextCellEditor";
        colDef.checkboxSelection = true;
        colDef.headerCheckboxSelection = true;
        colDef.lockVisible = true;
        colDef.pinned = 'right';
        
        colDef.wrapHeaderText = true;
        colDef.autoHeaderHeight = true;
      }
      // הגדרות כותרת לעמודות הצרות
      else if (value === "IsRepresentative" || value === "SchoolId") {
         colDef.wrapHeaderText = true;
         colDef.autoHeaderHeight = true;
      }
    else if (value === "FirstName") {
         colDef.cellEditor = "agTextCellEditor";
         colDef.cellRenderer = "FirstNameWhatsAppRenderer";
      }
      else if (value === "LastName") {
         colDef.cellEditor = "agTextCellEditor";
      }
      else if (value === "Role") {
         colDef.cellEditor = CustomSelectCellEditor;
         colDef.cellEditorParams = { values: roles };
      }
      else if (value === "Status") {
         colDef.cellEditor = CustomSelectCellEditor;
         colDef.cellEditorParams = { values: statuses };
      }
      else if (value === "GoogleContactLink") {
         colDef.cellRenderer = "CustomLinkContact";
         colDef.cellRendererParams = { GoogleFunctions: AuthenticateActivate };
         colDef.editable = false;
      }
      else if (value === "WhatsApp") {
         colDef.field = "WhatsAppField"; 
         colDef.hide = true;
         colDef.headerName = 'וואטסאפ';
         colDef.editable = false;
         colDef.cellRenderer = CustomWhatsAppRenderer;
         colDef.valueGetter = ValueFormatWhatsApp;
      }
     else if (value === "Cellphone") {
         colDef.valueGetter = (params) => {
           const phone = params.data?.Cellphone;
           if (!phone || phone === '' || phone === '0') return '';
           return phone; // Show the phone as-is
         };
      }
      else if (value === "Phone") {
         colDef.valueGetter = (params) => {
           const phone = params.data?.Phone;
           if (!phone || phone === '' || phone === '0') return '';
           return phone; // Show the phone as-is
         };
      }
      
      return colDef;
    });

    return coldef;
  }, [AuthenticateActivate, ValueFormatWhatsApp, valueFormatCellPhone]);


  const onGridReady = async (params) => {
    
    getFromStorage().then(async ({ schoolsContacts, Tablemodel, Role, ContactsStatuses }: any) => {
      
      let contactsData = schoolsContacts || [];
      let modelData = Tablemodel;
      let rolesData = Role || [];
      let statusesData = ContactsStatuses || [];

      if (!contactsData.length || !modelData || !rolesData.length) {
         try {
            const [contacts, model, roles, statuses] = await Promise.all([
                getAllContacts(),
                getModelFields("SchoolsContact"), 
                getRoles(),
                getAllStatuses("Contacts")
            ]);
            
            contactsData = contacts;
            modelData = model;
            rolesData = roles;
            statusesData = statuses;

            updateStorage({ 
                schoolsContacts: contacts, 
                Tablemodel: model, 
                Role: roles,
                ContactsStatuses: statuses
            });

         } catch (e) {
             console.error("Failed to fetch contacts data", e);
         }
      }

      if (contactsData && modelData) {
          const rolesList = rolesData.map((r: any) => r.RoleName);
          const statusList = statusesData.map((s: any) => s.StatusName);

          const colDef = GetDefaultDefinitions(modelData, rolesList, statusList);
          
          if (contactsData.length === 0) {
            params.api.hideOverlay();
          }

          setRowData(contactsData);
          setColDefs(colDef);
          
          rowCount.current = contactsData.length;
          dataRowCount.current = contactsData.length;
          
          if (contactsData.length > 0) {
             const maxId = Math.max(...contactsData.map((c: any) => c.Contactid));
             maxIndex.current = isNaN(maxId) ? 0 : maxId;
          }
      }
    });
  };

  const { onAddRowToolBarClick, onClearFilterButtonClick, onCancelChangeButtonClick, onSaveChangeButtonClick, onFilterTextBoxChanged } = useToolBarFunctions(gridRef, rowCount, dataRowCount, SetInTheMiddleOfAddingRows, validateFields, setDialogType, setDialogMessage, setOpen, setAmount, modifiedRowRef, maxIndex)

  const { onCellValueChanged, onCellEditingStarted, onRowSelected, onSelectionChange, isRowSelectable, getRowStyles, getRowId } = useGridEvents(gridRef, InTheMiddleOfAddingRows, setAmount, checkedAmount, modifiedRowRef)

  const { WindowManager } = useColumnComponent(columnWindowOpen, setColumnWindowOpen, colDefinition, gridRef, colState, setColState)

  const handleDeleteRows = useCallback(async () => {
    if (!gridRef.current || !gridRef.current.api) return;

    const selectedNodes = gridRef.current.api.getSelectedNodes();
    
    const selectedIds = selectedNodes
      .map(node => node.data.Contactid)
      .filter(id => id !== undefined && id !== null); 
    
    if (selectedIds.length === 0) return;

    const isConfirmed = window.confirm(`האם אתה בטוח שברצונך למחוק ${selectedIds.length} אנשי קשר?`);
    if (!isConfirmed) return;

    try {
      await deleteContactsRows(selectedIds);
      const rowsToRemove = selectedNodes.map(node => node.data);
      gridRef.current.api.applyTransaction({ remove: rowsToRemove });
      
      gridRef.current.api.deselectAll();
      setAmount(0);
      
    } catch (error: any) {
      console.error("❌ Failed to delete contacts:", error);
      alert(`שגיאה במחיקה: ${error.message || "נא לבדוק חיבור לרשת"}`);
    }
  }, [setAmount]);

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
  
  useEffect(() => {
    if (!mounted) return
    
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
      FirstNameWhatsAppRenderer: FirstNameWhatsAppRenderer,
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