"use client";
import { Role, School, SchoolsContact } from "@prisma/client"; // look at this type to know the fields in the table.
import {
  useState,
  useRef,
  useCallback,
  useMemo,
  Suspense,
  useContext,
  Ref,
} from "react";
import { AgGridReact } from "ag-grid-react";


import {
  GridApi,
  ColDef,
  CellKeyDownEvent,
} from "ag-grid-community";
import Spinner from "react-bootstrap/Spinner";
import { Button, Navbar, OverlayTrigger } from "react-bootstrap";
import Tooltip from "react-bootstrap/Tooltip";
import { FcAddColumn, FcAddRow, FcCancel } from "react-icons/fc";
import { TableType, getAllCities, getModelFields, getRoles } from "@/db/generalrequests";

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
// I rew@/util/cache/cachetypes small - this is for organizing because it gets messy real fast.
// ContactID indicates what contact number in contact's table he is from.
const SmallContactsTable = ({ SchoolID, SchoolApi, setAllSchoolContacts }: { SchoolID: number, SchoolApi: Ref<GridApi<School>>, setAllSchoolContacts: any }) => {



  const gridRef = useRef<AgGridReact>(null);

  const [rowData, setRowData] = useState<SchoolsContact[]>(null);
  const [colDefinition, setColumnDefs] = useState<ColDef[]>(null);

  const [AuthenticateActivate, authRes] = useContactComponent();

  const [InTheMiddleOfAddingRows, SetInTheMiddleOfAddingRows] = useState(false);




  // this is used for adding new rows. using ref to prevent re-render.
  // dataRowCount is the current amount of rows in the database, rowCount is how many rows in the grid right now.
  const allContactsCount = useRef(0)
  const dataRowCount = useRef(0);
  const rowCount = useRef(0);
  // // rowCountcontacts is how much are currently being added.
  // const rowCountContacts = useCallback(()=>  rowCount.current - dataRowCount.current,[])

  const [AllContacts, setAllContacts] = useState<SchoolsContact[]>()

  // validation part
  const [open, setOpen] = useState(false);
  const [dialogType, setDialogType] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");

  // saving column state part.
  const [colState, setColState]: any = useState([])
  const [columnWindowOpen, setColumnWindowOpen] = useState(false);

  const [checkedAmount, setAmount] = useState<number>(0);

  const { theme } = useContext(ThemeContext)

  const { updateColState, updateColStateFromCache } = useColumnEffects(gridRef, colState, setColState, SchoolID)


  const { validateFields, ErrorModule } = useErrorValidationComponents(setOpen, setDialogType, setDialogMessage, open, dialogType, dialogMessage)


  // so 
  const [isLoading, setLoading] = useState(false);

  useExternalEffect(updateColStateFromCache, [colDefinition])
  useExternalEffect(updateColState, [colState])

  // this is for adding new rows. This is because we previously used ID for everything, this is a way
 // to still keep deletion fast.
 const maxIndex = useRef<number>(0)

  const { ValueFormatSchool, ValueFormatWhatsApp, valueFormatCellPhone } = useExternalUpdate(AuthenticateActivate)

  const { onGridReady } = useGridFunctions(valueFormatCellPhone, AuthenticateActivate, ValueFormatSchool, valueFormatCellPhone, setRowData, setColumnDefs, dataRowCount, rowCount, SchoolID, setAllContacts, allContactsCount,maxIndex)

  const { onColumnResized, onColumnMoved } = useColumnHook(gridRef, setColState)

  const { WindowManager } = useColumnComponent(columnWindowOpen, setColumnWindowOpen, colDefinition, gridRef, colState, setColState)

  const { onAddRowToolBarClick, onClearFilterButtonClick, onCancelChangeButtonClick, onSaveChangeButtonClick, onSaveDeletions, onFilterTextBoxChanged, DeleteCheckedAmountText } = useToolBarFunctions(gridRef, rowCount, dataRowCount, SetInTheMiddleOfAddingRows, validateFields, setDialogType, setDialogMessage, setOpen, setAmount, SchoolID, checkedAmount, AllContacts, setRowData, setAllContacts, allContactsCount, SchoolApi, setAllSchoolContacts,setLoading,rowData,maxIndex)

  const { onCellValueChanged, onRowSelected, onSelectionChange, isRowSelectable, getRowId } = useGridEvents(gridRef, InTheMiddleOfAddingRows, setAmount, checkedAmount, SchoolApi, SchoolID, setAllContacts, AllContacts, setAllSchoolContacts, setRowData, rowData)



  //   had to register it through the components of ag grid to use a string in cellrenderer option so that the JSON parsing would also include
  //  and render this component.
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

   const LoadingOverlay = () => {
    if (!isLoading) {
      return <></>
    } else {
      return (

        <Spinner

          animation="border"
          role="status"
          className="w-[220px] h-[200px] bg-yellow-500 fill-yellow  z-[999] "
        />

      );
    }

  };
  return (
    <>

      {ToolBar(onClearFilterButtonClick, setColumnWindowOpen, onAddRowToolBarClick, onCancelChangeButtonClick, onSaveChangeButtonClick, onSaveDeletions, checkedAmount, onFilterTextBoxChanged, DeleteCheckedAmountText, SchoolID,isLoading,LoadingOverlay)}
      <Suspense>
        <div
          className={theme === "dark-theme" ? "ag-theme-quartz-dark w-screen right-[100%]" : "ag-theme-quartz w-screen right-[100%]"}
          style={{
            height: "450px",
          }}
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
            onRowSelected={onRowSelected}
            onSelectionChanged={onSelectionChange}
            isRowSelectable={isRowSelectable}
            loadingOverlayComponent={() => (
              <Spinner
                animation="border"
                role="status"
                className=" w-[200px] h-[200px]"
              />
            )}
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



export default SmallContactsTable