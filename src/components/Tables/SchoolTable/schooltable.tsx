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
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
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
import { CellKeyDownEvent, GetRowIdParams, IsFullWidthRowParams, RowHeightParams, RowNode } from "ag-grid-community";
import { Program, School, SchoolsContact, } from "@prisma/client";
import RepresentiveComponent from "../GeneralFiles/GoogleContacts/ContactsRepComponent";
export default function SchoolsTable() {


  const gridRef = useRef<AgGridReact>(null);
  const [checkedAmount, setAmount]: any = useState(0);

  const [InTheMiddleOfAddingRows, SetInTheMiddleOfAddingRows] = useState(false);

  // this is used for adding new rows. using ref to prevent re-render.
  // dataRowCount is the current amount of rows in the database, rowCount is how many rows in the grid right now.
  const dataRowCount = useRef(0);
  const rowCount = useRef(0);

  // Starting with null so that it will show loading while fetching the data.
  const [rowData, setRowData]: any = useState(null);
  // the coll definition
  const [colDefinition, setColDefs]: any = useState([]);

  const [open, setOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');

  const [colState, setColState]: any = useState([])
  const [columnWindowOpen, setColumnWindowOpen] = useState(false);
  // this is to know if to open the window on deload.
  const openedProgramWindow = useRef<boolean>(false)

  const [isLoading, setLoading] = useState(false);
  const isEditable = useCallback((params: any) => !params.node.expanded, []);


  // this for storage
  const [AllContacts, setAllContacts] = useState<SchoolsContact[]>([])
  const [AllPrograms, setAllPrograms] = useState<Program[]>([])

  // this is for adding new rows. This is because we previoused used schoolID for everything, this is a way
  // to still keep deletion fast.
  const maxIndex = useRef(0)

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


  const { theme } = useContext(ThemeContext)


  const LoadingOverlay = () => {
    if (!isLoading) {
      return <></>
    } else {
      return (

        <Spinner
          id="1"
          animation="border"
          role="status"
          className="w-[220px] h-[200px] bg-yellow-500 fill-yellow  z-[999] "
        />

      );
    }

  };


  //   had to register it through the components of ag grid to use a string in cellrenderer option so that the JSON parsing would also include
  //  and render this component.
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
        const coldefs = gridRef.current.api.getColumnDefs().map((column) => {
          if (column["field"] === "Representive") {
            return { ...column, cellRenderer: RepresentiveComponent, cellRendererParams: { AllContacts: [...Data] } }
          }

          return column
        })
        setColDefs(coldefs)
      }

    }

  }, [])


  return (
    <>
      {/* The navbar portion is the toolbar*/}
      {ToolBar(onClearFilterButtonClick, setColumnWindowOpen, onAddRowToolBarClick, onCancelChangeButtonClick, onSaveChangeButtonClick, onSaveDeletions, checkedAmount, onFilterTextBoxChanged, onDisplayProgramsClicked, LoadingOverlay)}
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
            onSelectionChanged={onSelectionChange}
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
            fullWidthCellRendererParams={{ UpdateContactComponent: UpdateContactComponent }}
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