"use client";
import { School, Guide, Program, SchoolsContact, Assigned_Guide, Profession, Cities, Areas, Years, ProductTypes, Orders, StatusPrograms, Guides_ToAssign, ColorCandidate } from "@prisma/client";
import { useState, useRef, useCallback, Suspense, useMemo, useEffect, useContext } from "react";
import { AgGridReact, getInstance } from "ag-grid-react";
import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import {
  CellValueChangedEvent,
  CellEditingStartedEvent,
  RowSelectedEvent,
  SelectionChangedEvent,
  SizeColumnsToContentStrategy,
  ICellRendererParams,
  CellEditingStoppedEvent,
  GetRowIdParams,
  ColDef,
  CellKeyDownEvent,
  IRowNode,
} from "ag-grid-community";

import Spinner from "react-bootstrap/Spinner";
import { Button, Navbar, OverlayTrigger } from "react-bootstrap";
import Tooltip from "react-bootstrap/Tooltip";

import Select from "react-select";

import { FcAddColumn, FcAddRow, FcCancel } from "react-icons/fc";
import { CustomMasterGrid } from ".././SchoolTable/Components/MasterGrid/CustomMasterGrid";
import { CustomLinkDrive } from ".././GeneralFiles/GoogleDrive/CustomLinkDrive";
import useDrivePicker from "@/util/Google/GoogleDrive/Component";
import { getAllAssignedInstructors, getModelFields, getAllGuides, getAllProfessions, getAllCities, getAllDistricts, getYears, getProductTypes, getOrders, getAllStatuses } from "@/db/generalrequests";
import { addProgramsRows, deleteProgramsCascading, deleteProgramsRows, getAssignedInstructores, getPrograms, updateProgramsColumn, } from "@/db/programsRequests";
import { CustomMultiSelectCell } from ".././GeneralFiles/Select/CustomMultiSelectCellRenderer";
import { CustomFilter } from ".././GeneralFiles/Filters/CustomFilter";
import { getAllSchools } from "@/db/schoolrequests";
import { CustomSelect } from ".././GeneralFiles/Select/CustomSelect";
import { CustomDateCellEditor } from ".././GeneralFiles/Date/CustomDateCellEditor/CustomDateCellEditor";
import { SchoolChoosing } from "../ProgramsTable/components/SchoolChoosing";
import { ContactRepresentiveRef, RepresentiveComponent } from "../ProgramsTable/components/CustomRepresentive";
import { ProgramLinkDetailsCellEditor } from "../ProgramsTable/components/CustomProgramLinkDetailsCellEditor";
import { ProgramLinkDetailsCellRenderer, RefFunctions } from "../ProgramsTable/components/CustomProgramLinkDetailsCellRenderer";
import { DayChooseEditor } from "../ProgramsTable/components/CustomDayChooseEditor";
import { DayPlacementEditor } from "../ProgramsTable/components/CustomDayPlacementEditor";
import { OtherComponentsObject } from "@/util/cache/cachetypes";
import { ColumnManagementWindow } from "../../../components/ColumnManagementWindow"
import { YearContext } from "@/context/YearContext";
import { getAllContacts } from "@/db/contactsRequests";
import AssignedGuidesColumn from "../ProgramsTable/components/AssignedGuidesColumn";
import { getAllCandidates, getAllColorCandidates, getInfo } from "@/db/instructorsrequest";
import { ThemeContext } from "@/context/Theme/Theme";
import { DataType, getFromStorage, updateStorage } from "./Storage/ProgramsDataStorage";
import { AuthDriveStore } from "@/components/Auth/Storage/AuthDrivePrograms";

import { getFromStorage as getFromStageAuth } from "@/components/Auth/Storage/AuthDrivePrograms";
import { ProgramsStoreColumns } from "./Storage/ProgramsColumnsStorage";
import { getFromStorage as getColumnStorage, updateStorage as updateColumnsStorage } from "./Storage/ProgramsColumnsStorage";
import YearFilter, { FilterType } from "./components/YearFilter";
import { StatusContext } from "@/context/StatusContext";
import CustomSelectCellEditor from "@/components/CustomSelect/CustomSelectCellEditor";
import Redirect from "@/components/Auth/Components/Redirect";
import Programs from "@/app/plansPage/page";
import StatusFilter, { FilterTypeStatus } from "./components/StatusFilter";

interface ProgramsTableProps {
  SchoolIDs?: number[];
}
export default function ProgramsTable({ SchoolIDs }: ProgramsTableProps) {
  const AuthenticateActivate = useDrivePicker("Program");

  const [FilterSchoolIDS, setFilterSchoolIDS] = useState(SchoolIDs)

  const gridRef = useRef<AgGridReact>(null)
  const [checkedAmount, setAmount]: any = useState(0);

  const [InTheMiddleOfAddingRows, SetInTheMiddleOfAddingRows] = useState(false);

  // this is used for adding new rows. using ref to prevent re-render.
  // dataRowCount is the current amount of rows in the database, rowCount is how many rows in the grid right now.
  const dataRowCount = useRef(0);
  const rowCount = useRef(0);

  // Row Data: The data to be displayed.
  const [rowData, setRowData]: any = useState("");

  // Column Definitions: Defines & controls grid columns.
  const [colDefinition, setColDefs]: any = useState(null);
  const [colState, setColState]: any = useState([])
  const [columnWindowOpen, setColumnWindowOpen] = useState(false);
  const { theme } = useContext(ThemeContext)


  const { selectedYear, changeYear } = useContext(YearContext)
  // Optionally, log the selected year when it changes


  const { defaultStatus, changeStatus } = useContext(StatusContext)

  // this is used to update the column for schoolscontact.
  const [AllSchools, setAllSchools] = useState<School[]>([])
  const [AllContacts, setAllContacts] = useState<SchoolsContact[]>([])

  // this is used to update the program details
  const [AllPrograms, setAllPrograms] = useState<Program[]>()
  // so 
  const [isLoading, setLoading] = useState(false);
  // this is used in deletions 
  const [AllCandidates, setAllCandidates] = useState<Guides_ToAssign[]>([])
  const [AllColorCandidates, setAllColorCandidates] = useState<ColorCandidate[]>([])
  const [AllAssigned, setAllAssigned] = useState<Assigned_Guide[]>([])


  // this is for adding new rows. This is because we previously used ID for everything, this is a way
  // to still keep deletion fast.
  const maxIndex = useRef<number>(0)

  useEffect(() => {
    if (!(gridRef.current && gridRef.current.api)) { return }
    getColumnStorage().then(({ colState }: ProgramsStoreColumns) => {
      if (colState) {
        setColState(colState)

      }
      else {
        colState = gridRef.current.api.getColumnState();
        setColState(colState)
      }

    })
  }, [colDefinition]);

  useEffect(() => {
    if (colState.length > 0) {
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.applyColumnState({
          state: colState,
          applyOrder: true,
        });
        colState.forEach(column => {
          if (column.width) {
            gridRef.current.api.setColumnWidth(column.colId, column.width);
          }
        });
        updateColumnsStorage({ colState: colState })
      }
    }
  }, [colState])

  const UpdateDefaultFilters = useCallback(() => {
    if (gridRef && gridRef.current) {
      if (selectedYear && selectedYear !== "הכל") {
        gridRef.current.api.getColumnFilterInstance('Year').then((filterInstance) => {
          let filter: FilterType = filterInstance as unknown as FilterType
          let current_values = filter.getModel()?.values ?? undefined
          if (current_values && !current_values.includes(selectedYear)) {
            filter.setDefaultYear(selectedYear)
            filter.setModel({ values: [...current_values, selectedYear] })
          } else {
            filter.setDefaultYear(selectedYear)
            filter.setModel({ values: [selectedYear] })
            filter.refresh()

          }
          gridRef.current.api.onFilterChanged();
        })
      } if (defaultStatus) {
        gridRef.current.api.getColumnFilterInstance('Status').then(filterInstance => {
          let filter_status: FilterTypeStatus = filterInstance as unknown as FilterTypeStatus
          let current_values = filter_status.getModel()?.values ?? undefined
          if (current_values && !current_values.includes(defaultStatus)) {
            filter_status.setDefaultStatus(defaultStatus)
            filter_status.setModel({ values: [...current_values, defaultStatus] })
          } else {
            filter_status.setDefaultStatus(defaultStatus)
            filter_status.setModel({ values: [defaultStatus] })
            filter_status.refresh()

          }
          gridRef.current.api.onFilterChanged();
        })
      }


    }


  }, [defaultStatus, selectedYear])




  useEffect(() => {

    if (gridRef && gridRef.current && colDefinition) {
      UpdateDefaultFilters()

    }
  }, [gridRef, colDefinition, UpdateDefaultFilters, rowData, selectedYear, defaultStatus])

  const onColumnResized = useCallback((event) => {
    if (event.finished) {
      if (gridRef.current && gridRef.current.api) {
        const newColState = gridRef.current.api.getColumnState();
        setColState((prevColState) => {
          if (JSON.stringify(prevColState) !== JSON.stringify(newColState)) {
            return newColState;
          }
          return prevColState;
        });
      }
    }
  }, []);

  const onColumnMoved = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      const colState = gridRef.current.api.getColumnState();
      setColState(colState);
    }
  }, []);

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

  const onClearFilterButtonClick = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setFilterModel(null);
      gridRef.current.api.setQuickFilter("");
    }
    const filterInput = document.getElementById("filter-text-box") as HTMLInputElement;
    if (filterInput) {
      filterInput.value = "";
    }
  }, []);

  const valueFormatterDate = useCallback((params) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, [])




  const TotalValueGetter = useCallback((params) => params.data.FreeLessonNumbers + params.data.PaidLessonNumbers, [])
  const FinalValueGetter = useCallback((params) => (params.data.PaidLessonNumbers * params.data.PricingPerPaidLesson) + params.data.AdditionalPayments, [])
  const GetDefaultDefinitions = useCallback((model: any, Schools: any, cities: any, status: any, districts: any, years: any, contacts: any, assigned_guides: any, guides: any, products: any, orders: any, Programs: any) => {

    var coldef = model[0]?.map((value: any, index: any) => {
      if (value === "SchoolName") {
        return {
          field: "SchoolName",
          headerName: "בית ספר",
          // we are editing through cell renderer.
          editable: false,
          cellStyle: { padding: 0 }, // Remove padding in cell
          cellRenderer: "SchoolChoosing",
          cellRendererParams: {
            AllSchools: Schools,
          },
          filter: "CustomFilter",
        };
      }
      if (value === "EducationStage") {
        return {
          field: value,
          headerName: model[1][index],
          editable: false,
          cellEditor: "agTextCellEditor",
          filter: "CustomFilter",
        };
      }
      if (value === "Date") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: "CustomDateCellEditor",
          valueFormatter: valueFormatterDate,
          filter: "CustomFilter",
          // Removed cellDataType: 'date' to prevent conflicts
          editable: true,
          singleClickEdit: true,
          // Robust Value Setter
          valueSetter: (params) => {
            // --- FIX: Added check for params.newValue === null
            if (params.newValue || params.newValue === null) {
                // Ensure value is set
                params.data[value] = params.newValue;
                return true;
            }
            return false;
          }
        }
      }

      if (value === "Programid") {
        return {
          field: value,
          headerName: model[1][index],
          editable: false,
          rowDrag: false,
          checkboxSelection: true,
          headerCheckboxSelection: true,
          headerCheckboxSelectionFilteredOnly: true,
          headerCheckboxSelectionCurrentPageOnly: true,
          cellEditor: "agNumberCellEditor",
          lockVisible: true,

        };
      }
      if (value === "Status") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: status // I am speed running... fix this later
          },
          editable: true,
          filter: StatusFilter,
          singleClickEdit: true
        };
      }
      if (value === "Proposal") {
        return {
          field: value,
          headerName: model[1][index],
          cellRenderer: "CustomLinkDrive",
          cellRendererParams: "AuthenticateActivate",
          cellEditor: "agTextCellEditor",
          editable: true,
          singleClickEdit: false,
        };
      }
      if (value === "CityName") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: cities // I am speed running... fix this later
          },
          filter: "CustomFilter",
          editable: false,
        };
      }
      if (value === "District") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: districts
          },
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true

        };
      }
      if (value === "Days") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: "CustomDayChooseEditor",
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true
        };
      }
      if (value === "ChosenDay") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: "CustomDayPlacementEditor",
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true
        };

      }
      if (value === "Schoolid") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: "agNumberCellEditor",
          filter: "CustomFilter",
          editable: false,
        };
      }
      if (value === "FreeLessonNumbers") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: "agNumberCellEditor",
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true
        };
      }

      if (value === "PaidLessonNumbers") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: "agNumberCellEditor",
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true
        };
      }

      if (value === "LessonsPerDay") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
          },
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true
        };
      }

      if (value === "PricingPerPaidLesson") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: "agNumberCellEditor",
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true
        };
      }
      if (value === "AdditionalPayments") {
        return {
          field: value,
          headerName: "תשלומים נוספים",
          cellEditor: "agNumberCellEditor",
          cellDataType: 'number',
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true
        };
      }
      if (value === "SchoolsContact") {
        return {
          field: value,
          headerName: model[1][index],
          editable: false,
          cellRenderer: RepresentiveComponent,
          cellRendererParams: {
            AllSchools: Schools,
            AllContacts: contacts

          },
          filter: "CustomFilter",
        };
      }
      if (value === "TotalLessonNumbers") {
        return {
          headerName: "כמות שיעורים",
          valueGetter: "TotalValueGetter",
          editable: false,
        }
      }
      if (value === "FinalPrice") {
        return {
          field: "FinalPrice",
          headerName: "סהכ",
          valueGetter: "FinalValueGetter",
          editable: false,
        }
      }
      
      if (value === "Plan") {
        return {
          field: value,
          headerName: model[1][index],
          cellRenderer: ProgramLinkDetailsCellRenderer,
          cellRendererParams: {
            AllPrograms: Programs,
          },
          cellEditor: ProgramLinkDetailsCellEditor,
          // הוספת הפרמטר המאפשר לינק ריק לעורך התא
          cellEditorParams: {
            allowEmptyLink: true
          },
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true

        };
      }
      
      if (value === "Year") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: years
          },
          filter: YearFilter,
          editable: true,
          singleClickEdit: true
        };
      }

      if (value === "Order") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: orders
          },
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true
        }
      }

      if (value === "Product") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: products
          },
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true
        };
      }

      if (value === "Details") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: "agTextCellEditor",
          filter: "CustomFilter",
          editable: true,
          singleClickEdit: true
        };
      }

      return {
        field: value,
        headerName: model[1][index] ? model[1][index] : '',
        hide: model[1][index] ? false : true,
        cellEditor: "agTextCellEditor",
        filter: "CustomFilter",
        editable: true,
        singleClickEdit: true
      };
    });

    var TotalLessonNumbers = {
      field: "TotalLessonNumbers",
      headerName: "כמות שיעורים",
      valueGetter: TotalValueGetter,
      editable: false,
    }

    var FinalPrice = {
      field: "FinalPrice",
      headerName: "סהכ",
      valueGetter: FinalValueGetter,
      editable: false,
    }

    // the field AssignedToProgram not actually exists.
    var ProgramGuides =
    {
      field: "AssignedToProgram",
      headerName: "מדריכים",
      hide: false,
      editable: false,
      cellRenderer: "AssignedGuidesColumn",
      cellRendererParams: {
        assigned_guides: assigned_guides,
        guides: guides
      },
      cellEditor: "agTextCellEditor",
      filter: "CustomFilter",
    };

    coldef.splice(22, 0, TotalLessonNumbers)
    coldef.splice(24, 0, FinalPrice)
    coldef.splice(25, 0, ProgramGuides)

    return coldef

  }, [FinalValueGetter, TotalValueGetter, valueFormatterDate])

  // not edit cell editor or renderer - ag grid does not support this for some reason.
  const other_components: any = useMemo(
    () => ({
      valueFormatterDate: valueFormatterDate,
      AuthenticateActivate: { AuthenticateActivate: AuthenticateActivate, type: "Program" },
      cellEditor: { AggridFieldName: "cellEditor", ApplyArrOrString: ["Date"], Func: CustomDateCellEditor },
      TotalValueGetter: TotalValueGetter,
      FinalValueGetter: FinalValueGetter,

    }),
    [AuthenticateActivate, FinalValueGetter, TotalValueGetter, valueFormatterDate]
  );


  const onGridReady = useCallback(async (params) => {
    getFromStorage().then(({ Programs, Schools, Tablemodel, Cities, ProgramsStatuses, Areas, Years, schoolsContacts, ProductTypes, AssignedGuides, Guides, Orders, Candidates, ColorCandidates }: DataType) => {

      if (Programs && Schools && Tablemodel && Cities && ProgramsStatuses && Areas && Years && schoolsContacts && ProductTypes && Candidates && ColorCandidates) {
        let colDef = GetDefaultDefinitions(Tablemodel, Schools, Cities.map((val) => val.CityName),
          ProgramsStatuses.map((val) => val.StatusName), Areas.map((val) => val.AreaName),
          Years.map((val) => val.YearName), schoolsContacts, AssignedGuides, Guides, ProductTypes.map((val) => val.ProductName), Orders.map((val) => val.OrderName), Programs)
        if (SchoolIDs) {
          let filtered_programs = Programs.filter((program) => SchoolIDs.includes(program.Schoolid))
          setRowData(filtered_programs)
        } else {
          setRowData(Programs)

        }

        setColDefs(colDef)
        setAllSchools(Schools)
        setAllContacts(schoolsContacts)
        setAllPrograms(Programs)
        setAllAssigned(AssignedGuides)

        params.api.hideOverlay();
        maxIndex.current = Programs.length > 0 ? Math.max(...Programs.map((program) => program.Programid)) : 0

        rowCount.current = Programs.length;
        dataRowCount.current = Programs.length;
      }
      else {

        Promise.all([getPrograms(), getAllSchools(), getAllCities(), getAllStatuses("Programs"), getAllDistricts(), getYears(), getAllContacts(), getProductTypes(), getAllAssignedInstructors(), getAllGuides(), getOrders(), getModelFields("Program"), getAllCandidates(), getAllColorCandidates()])
          .then(([programs, schools, cities, statuses, districts, years, contacts, products, assigned_guides, guide_details, orders, model, candidates, colorcandidates]: [Program[], School[], Cities[], StatusPrograms[], Areas[], Years[], SchoolsContact[], ProductTypes[], Assigned_Guide[], Guide[], Orders[], any, any, any]) => {
            let colDefs = GetDefaultDefinitions(model, schools, cities.map((val) => val.CityName), statuses.map((val) => val.StatusName), districts.map((val) => val.AreaName),
              years.map((val) => val.YearName), contacts, assigned_guides, guide_details, products.map((val) => val.ProductName), orders.map((val) => val.OrderName), Programs)


            rowCount.current = programs.length;
            dataRowCount.current = programs.length;
            if (SchoolIDs) {
              let filtered_programs = programs.filter((program) => SchoolIDs.includes(program.Schoolid))
              setRowData(filtered_programs)
            } else {
              setRowData(programs)
            }

            params.api.hideOverlay();

            setColDefs(colDefs);
            setAllSchools(schools)
            setAllContacts(contacts)
            setAllPrograms(programs)
            setAllCandidates(candidates)
            setAllColorCandidates(colorcandidates)
            setAllAssigned(assigned_guides)
            maxIndex.current = programs.length > 0 ? Math.max(...programs.map((program) => program.Programid)) : 0
            updateStorage({ Programs: programs, Schools: schools, Tablemodel: model, Cities: cities, ProgramsStatuses: statuses, Areas: districts, Years: years, schoolsContacts: contacts, AssignedGuides: assigned_guides, Guides: guide_details, ProductTypes: products, Orders: orders, Candidates: candidates, ColorCandidates: colorcandidates })

          })


      }




    })

  }, [GetDefaultDefinitions, SchoolIDs]);

  const onAddRowToolBarClick = useCallback(() => {
    gridRef.current?.api.applyTransaction({
      add: [
        {
          Programid: maxIndex.current + 1,
          Year: selectedYear,
          Product: "תלמידים",
          FreeLessonNumbers: 0,
          PaidLessonNumbers: 0,
          PricingPerPaidLesson: 0,
          AdditionalPayments: 0
        },
      ],
      addIndex: 0,
    });
    maxIndex.current = maxIndex.current + 1
    rowCount.current++;
    SetInTheMiddleOfAddingRows(true);
    // activate( and therfore show) the update button and cancel button
    const element: any = document.getElementById("savechangesbutton");
    if (element !== null) {
      element.style.display = "block";
    }
    const element_2: any = document.getElementById("cancelchangesbutton");
    if (element_2 !== null) {
      element_2.style.display = "block";
    }
  }, [selectedYear]);



  const onSaveChangeButtonClick = useCallback(() => {





    var future_data: Program[] = [];
    var newly_added: Program[] = [];
    var count = 0;
    let bad_request_flag = false
    gridRef.current.api.forEachNode((node: IRowNode<Program>) => {
      future_data.push(node.data);
      // only if it is a new row that is not in the database look at it.
      if (count < rowCount.current - dataRowCount.current) {
        if (typeof node.data?.District === 'undefined' || node.data.District === null || node.data.District === "") {
          bad_request_flag = true
        }
        newly_added.push(node.data);
      }

      count++;
    });


    if (bad_request_flag) {
      alert('חסר אזור')
      return
    }


    gridRef.current.api.stopEditing();


    addProgramsRows(newly_added);
    setRowData(future_data.sort((arg1, arg2) => arg1.Programid - arg2.Programid))
    dataRowCount.current = rowCount.current;
    const element: any = document.getElementById("savechangesbutton");
    if (element !== null) {
      element.style.display = "none";
    }
    const element_2: any = document.getElementById("cancelchangesbutton");
    if (element_2 !== null) {
      element_2.style.display = "none";
    }

    SetInTheMiddleOfAddingRows(false);

    maxIndex.current = future_data.length > 0 ? Math.max(...future_data.map((program) => program.Programid)) : 0
    updateStorage({ Programs: future_data.sort((arg1, arg2) => arg1.Programid - arg2.Programid) })
    gridRef.current.api.deselectAll()
  }, []);

  const onCancelChangeButtonClick = useCallback(() => {
    const prev_data: Program[] = [];
    var count = 0;
    gridRef.current.api.forEachNode((node: any) => {
      // Right now, a new row is added at the top and forEachNode goes through the order that appears in the table.
      if (count >= rowCount.current - dataRowCount.current) {
        prev_data.push(node.data);
      }
      count++;
    });
    maxIndex.current = prev_data.length > 0 ? Math.max(...prev_data.map((program) => program.Programid)) : 0
    gridRef.current.api.setGridOption("rowData", prev_data)

    // update so that there is no more rows unaccounted for in the database.
    rowCount.current = dataRowCount.current;

    // hide the buttons.
    const element: any = document.getElementById("savechangesbutton");
    if (element !== null) {
      element.style.display = "none";
    }
    const element_2: any = document.getElementById("cancelchangesbutton");
    if (element_2 !== null) {
      element_2.style.display = "none";
    }

    SetInTheMiddleOfAddingRows(false);
  }, []);


  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    if (event.oldValue === event.newValue || InTheMiddleOfAddingRows) {
      return;
    }

    if (event.colDef.field === "Schoolid" && event.oldValue !== event.newValue) {

      const RowNode = event.api.getDisplayedRowAtIndex(event.node.rowIndex);
      const params = { columns: ['SchoolsContact'], rowNodes: [RowNode] };
      const instances = event.api.getCellRendererInstances(params);
      const cellRendererInstance: ContactRepresentiveRef = instances[0] as ContactRepresentiveRef
      const school = AllSchools.find((school) => school.Schoolid == event.newValue)
      const school_contact: SchoolsContact = AllContacts.find((contact) => contact.Schoolid === school?.Schoolid && contact.IsRepresentive)
      if (school_contact) {
        // example - get cell renderer for first row and column 'gold'

        cellRendererInstance.updateValue(school_contact)
      } else {
        cellRendererInstance.updateValue(undefined)
      }

    }

    updateProgramsColumn(
      event.column.getColId(),
      event.newValue as string,
      event.data.Programid
    );

    if (typeof window !== "undefined") {
      const future_data: Program[] = [];
      gridRef.current.api.forEachNode((node: any) => {
        future_data.push(node.data);
      });
      updateStorage({ Programs: future_data })

    }
  }, [InTheMiddleOfAddingRows, AllSchools, AllContacts]);

  const onCellEditingStarted = (event: CellEditingStartedEvent) => { };

  // --- התיקון העיקרי: טיפול בעמודה מורכבת "Plan" ---
  const onCellEditingStopped =
    useCallback((event: CellEditingStoppedEvent) => {
      
      if (event.oldValue === event.newValue || InTheMiddleOfAddingRows) {
        // אם הערך המוצג ב-AG Grid לא השתנה, או אם אנו באמצע הוספת שורה חדשה, יציאה
        return;
      }

      if (event.column.getColId() === "Plan") {
        // טיפול מיוחד עבור עמודת "Plan" המעדכנת שני שדות (ProgramName ו-ProgramLink)
        
        // ה-Cell Editor המותאם אישית (CustomProgramLinkDetailsCellEditor) כבר עדכן
        // את ProgramName ו-ProgramLink ישירות בתוך event.data
        const newProgramName = event.data.ProgramName;
        const newProgramLink = event.data.ProgramLink;
        const programId = event.data.Programid;

        // 1. עדכון שני השדות ב-Database
        updateProgramsColumn("ProgramName", newProgramName, programId);
        updateProgramsColumn("ProgramLink", newProgramLink, programId);
        
        // 2. רענון ה-Renderer של התא כדי להציג את הערך החדש מיד
        const cellRendererInstances = event.api.getCellRendererInstances({
          rowNodes: [event.node],
          columns: [event.column.getColId()],
        });

        if (cellRendererInstances.length > 0) {
          const cellRendererInstance: RefFunctions = cellRendererInstances[0] as unknown as RefFunctions;
          // קוראים לפונקציית עדכון ב-Renderer
          cellRendererInstance.updateProgram(event.data)
        }

      } else {
          // טיפול רגיל עבור כל שאר העמודות המעדכנות שדה יחיד
          updateProgramsColumn(
            event.column.getColId(),
            event.newValue,
            event.data.Programid
          );
      }


      if (typeof window !== "undefined") {
        const future_data: Program[] = [];
        gridRef.current.api.forEachNode((node: any) => {
          future_data.push(node.data);
        });
        updateStorage({ Programs: future_data })
      }

    }, [InTheMiddleOfAddingRows]);
    // --- סוף התיקון העיקרי ---


  const onFilterTextBoxChanged = useCallback(() => {
    gridRef.current?.api.setGridOption(
      "quickFilterText",
      (document.getElementById("filter-text-box") as HTMLInputElement).value
    );
  }, []);

  const onSaveDeletions = useCallback(() => {
    const ids: number[] = gridRef.current.api
      .getSelectedRows()
      .map((val: Program) => val.Programid);

    const updated_data: Program[] = [];

    // this is to know which ids to update in the database and in which order.
    const id_range: number[] = [];
    for (let index = 1; index <= dataRowCount.current; index++) {
      if (ids.includes(index)) {
        continue
      }
      id_range.push(index)
    }
    let index = 0
    gridRef.current.api.forEachNode((node: any) => {
      if (!ids.includes(node.data.Programid)) {
        updated_data.push(node.data);
        index++
      }
    });

    let sorted_updated = updated_data.sort((arg1, arg2) => arg1.Programid - arg2.Programid)
    maxIndex.current = sorted_updated.length > 0 ? Math.max(...sorted_updated.map((program) => program.Programid)) : 0
    updateStorage({ Programs: sorted_updated })
    // this will show loading
    setRowData(sorted_updated)

    // update the amount of rows
    dataRowCount.current -= ids.length;
    rowCount.current -= ids.length;
    // update the checked amount.
    setAmount(0);
    SetInTheMiddleOfAddingRows(false)
    // hide delete button.
    const element: any = document.getElementById("savedeletions");
    if (element !== null) {
      element.style.display = "none";
    }

    setLoading(true)
    const after_candidates = AllCandidates.filter((candidate) => !ids.includes(candidate.Programid))
    const after_assign = AllAssigned.filter((candidate) => !ids.includes(candidate.Programid))
    const after_color_candidates = AllColorCandidates.filter((candidate) => !ids.includes(candidate.Programid))
    setAllAssigned(after_assign)
    setAllCandidates(after_candidates)
    setAllColorCandidates(after_color_candidates)
    Promise.all([updateStorage({ Programs: sorted_updated, Candidates: after_candidates, AssignedGuides: after_assign, ColorCandidates: after_color_candidates }),
    deleteProgramsCascading(ids, updated_data, id_range)]).then((_) => {
      setLoading(false)

    })


    gridRef.current.api.deselectAll()

  }, [AllAssigned, AllCandidates, AllColorCandidates]);

  const onRowSelected = useCallback((event: RowSelectedEvent) => {
    return
  }, []);

  const onSelectionChange = useCallback(
    (event: SelectionChangedEvent) => {
      // hide or show the delete button
      const selectedRowsAmount: number = event.api.getSelectedRows().length
      setAmount(selectedRowsAmount)
      const element: any = document.getElementById("savedeletions");
      if (element !== null) {
        event.api.getSelectedRows().length > 0 && !InTheMiddleOfAddingRows
          ? (element.style.display = "block")
          : (element.style.display = "none");
      }
    },
    [InTheMiddleOfAddingRows]
  );

  const isRowSelectable = useCallback((rowNode: any) => !InTheMiddleOfAddingRows, [InTheMiddleOfAddingRows]);



  const components = useMemo(
    () => ({
      CustomLinkDrive: (props) => <CustomLinkDrive {...props} AuthenticateActivate={AuthenticateActivate} type={"Program"} />,
      CustomMasterGrid: CustomMasterGrid,
      CustomMultiSelectCellRenderer: CustomMultiSelectCell,
      CustomFilter: CustomFilter,
      CustomSelect: CustomSelect,
      SchoolChoosing: SchoolChoosing,
      RepresentiveComponent: RepresentiveComponent,
      CustomProgramLinkDetailsCellEditor: ProgramLinkDetailsCellEditor,
      CustomProgramLinkDetailsCellRenderer: ProgramLinkDetailsCellRenderer,
      CustomDayChooseEditor: DayChooseEditor,
      CustomDayPlacementEditor: DayPlacementEditor,
      CustomDateCellEditor: CustomDateCellEditor,
      AssignedGuidesColumn: AssignedGuidesColumn
    }),
    [AuthenticateActivate]
  );
  const getRowId: any = useCallback(
    (params: GetRowIdParams<Program>) => params.data.Programid,
    []
  );

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
      <Navbar
        id="ProgramsNavBar"
        className="bg-[#12242E] fill-[#ffffff] opacity-[1.40e+7%] flex-row-reverse"
      >
        <LoadingOverlay />
        <Redirect type={'Programs'} ScopeType={'Drive'} />
        <OverlayTrigger
          placement={"top"}
          overlay={<Tooltip className="absolute">בטל סינון</Tooltip>}
        >
          <button
            className="hover:bg-[#253d37] rounded mr-1 ml-1"
            onClick={onClearFilterButtonClick}
          >
            <FcCancel className="w-[37px] h-[37px]" />
          </button>
        </OverlayTrigger>

        <OverlayTrigger
          placement={"top"}
          overlay={<Tooltip className="absolute">ניהול עמודות</Tooltip>}
        >
          <button
            className="hover:bg-[#253d37] rounded mr-1 ml-1"
            onClick={() => setColumnWindowOpen(true)}
          >
            <FcAddColumn className="w-[37px] h-[37px]" />
          </button>
        </OverlayTrigger>

        <OverlayTrigger
          placement={"top"}
          overlay={<Tooltip className="absolute">הוסף שורה</Tooltip>}
        >
          <button
            className="hover:bg-[#253d37] rounded"
            onClick={onAddRowToolBarClick}
          >
            <FcAddRow className="w-[37px] h-[37px]" />
          </button>
        </OverlayTrigger>

        <button
          id="cancelchangesbutton"
          onClick={onCancelChangeButtonClick}
          className="hover:bg-slate-500 bg-slate-600 rounded mr-[100px] text-white border-solid hidden"
        >
          בטל שינויים
        </button>

        <button
          id="savechangesbutton"
          onClick={onSaveChangeButtonClick}
          className="hover:bg-rose-700 bg-rose-800 rounded mr-[50px] text-white border-solid hidden"
        >
          שמור שינויים
        </button>

        <button
          id="savedeletions"
          onClick={onSaveDeletions}
          className="hover:bg-green-700 bg-green-800 rounded mr-[50px] text-white border-solid hidden"
        >
          מחק {checkedAmount} שורות
        </button>

        <input
          className={theme === "dark-theme" ? "text-right  bg-gray-900 text-white  border-solid w-[200px] h-[40px] p-2 mr-1" :
            "text-right  bg-white text-gray-500  border-solid w-[200px] h-[40px] p-2 mr-1"}
          type="text"
          id="filter-text-box"
          placeholder="חיפוש"
          onInput={onFilterTextBoxChanged}
        />
      </Navbar>

      <Suspense>
        <div
          id="grid-1"
          className={theme === "dark-theme" ? "ag-theme-quartz-dark w-full flex-grow" : "ag-theme-quartz w-full flex-grow"}
        >

          <AgGridReact

            noRowsOverlayComponent={CustomNoRowsOverlay}
            ref={gridRef}
            rowData={rowData}
            columnDefs={colDefinition}
            onCellKeyDown={onCellKeyDown}
            enableRtl={true}
            onGridReady={onGridReady}
            onColumnResized={onColumnResized}
            onCellValueChanged={onCellValueChanged}
            onCellEditingStarted={onCellEditingStarted}
            onCellEditingStopped={onCellEditingStopped}
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
            components={components}
            getRowId={getRowId}
            suppressRowTransform={true}
            onColumnMoved={onColumnMoved}
            suppressMenuHide={true}
            stopEditingWhenCellsLoseFocus={false} 
              pagination={true}
            paginationPageSize={25}

          />
        </div>
      </Suspense>
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