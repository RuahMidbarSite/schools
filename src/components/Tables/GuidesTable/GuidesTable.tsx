"use client";
import { School, Guide, Assigned_Guide, Profession, Areas, ReligionSector, StatusGuides, Guides_ToAssign, ColorCandidate } from "@prisma/client"; // look at this type to know the fields in the table.
import {
  useState,
  useRef,
  useCallback,
  Suspense,
  useMemo,
  useEffect,
  useContext,
} from "react";
import { AgGridReact } from "ag-grid-react";
import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme

import {
  CellValueChangedEvent,
  CellEditingStartedEvent,
  RowSelectedEvent,
  SelectionChangedEvent,
  SizeColumnsToContentStrategy,
  GetRowIdParams,
  ICellRendererParams,
  ColDef,
  RowNode,
  GridApi,
  CellMouseOutEvent,
  CellKeyDownEvent,
  Column,
  IRowNode,
  CellEditingStoppedEvent,
} from "ag-grid-community";

import Spinner from "react-bootstrap/Spinner";
import { Button, Navbar, OverlayTrigger } from "react-bootstrap";
import Tooltip from "react-bootstrap/Tooltip";

import Select from "react-select"; // later will probably add it...

import { FcAddColumn, FcAddRow, FcCancel } from "react-icons/fc";
import { CustomMasterGrid } from "../SchoolTable/Components/MasterGrid/CustomMasterGrid";
import {
  addInstructorsRows,
  deleteGuidesCascading,
  deleteInstructorsRows,
  getAllCandidates,
  getAllColorCandidates,
  getColorCandidate,
  getInfo,
  getInstructors,
  updateInstructorsColumn,
} from "@/db/instructorsrequest";
import { CustomLinkDrive } from "../GeneralFiles/GoogleDrive/CustomLinkDrive";
import useDrivePicker from "@/util/Google/GoogleDrive/Component";
import {
  TableType,
  getModelFields,
  getAllProfessions,
  getAllDistricts,
  getAllStatuses,
  getAllGuides,
  getAllReligionSectors,
  getAllCities,
  getAllAssignedInstructors,
} from "@/db/generalrequests";
import { CustomMultiSelectCell } from "../GeneralFiles/Select/CustomMultiSelectCellRenderer";
import { CustomMultiSelectCellEdit } from "../GeneralFiles/Select/CustomMultiSelect";
import { CustomFilter } from "../GeneralFiles/Filters/CustomFilter";
import { ChooseProfessions } from "../GuidesTable/components/CustomChooseProfessions";
import { ColumnManagementWindow } from "../../ColumnManagementWindow"
import { columnsDefinition } from "@/util/cache/cachetypes";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { ThemeContext } from "@/context/Theme/Theme";
import { DataType, getFromStorage, updateStorage } from "./Storage/GuidesDataStorage";
import { AuthDriveStore, getFromStorage as getFromStageGuidesAuth } from "@/components/Auth/Storage/AuthDriveGuides";
import { getFromStorage as getColumnStorage, GuidesStoreColumns, updateStorage as updateColumnsStorage } from "./Storage/GuidesColumnsStorage";
import CustomSelectCellEditor from "@/components/CustomSelect/CustomSelectCellEditor";
import Redirect from "@/components/Auth/Components/Redirect";
import CustomWhatsAppRenderer from "./components/CustomWhatsAppRenderer";
import { NamePhoneCellEditor } from "./components/NamePhoneCellEditor";
import { NamePhoneCellRenderer } from "./components/NamePhoneCellRenderer";
import { getAssignedInstructores } from "@/db/programsRequests";

export default function GuidesTable({
  height,
  width,
  type,
  id,
  smallTable,
}: {
  height?: number;
  width?: number;
  type?: TableType;
  id?: number;
  smallTable?: boolean;
}) {


  const AuthenticateActivate = useDrivePicker("Guide");


  const gridRef = useRef<AgGridReact>(null);
  const [checkedAmount, setAmount] = useState<number>(0);

  const [InTheMiddleOfAddingRows, SetInTheMiddleOfAddingRows] = useState(false);

  // this is used for adding new rows. using ref to prevent re-render.
  // dataRowCount is the current amount of rows in the database, rowCount is how many rows in the grid right now.
  const dataRowCount = useRef(0);
  const rowCount = useRef(0);

  // Row Data: The data to be displayed.
  const [rowData, setRowData] = useState<Guide[]>(null);

  // Column Definitions: Defines & controls grid columns.
  const [colDefinition, setColDefs] = useState<ColDef[]>(null);
  const [colState, setColState]: any = useState([])
  const [columnWindowOpen, setColumnWindowOpen] = useState(false);

  const [open, setOpen] = useState(false);
  const [dialogType, setDialogType] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const modifiedRowRef = useRef(null);

  const { theme } = useContext(ThemeContext)

  // so 
  const [isLoading, setLoading] = useState(false);

  // this is for deletion
  const [AllGuides, setAllGuides] = useState<Guide[]>([])
  const [AllAssigncandidates, setAllAssigncandidates] = useState<Guides_ToAssign[]>([])
  const [AllAssigned, setAllAssigned] = useState<Assigned_Guide[]>([])
  const [AllColorCandidates, setAllColorCandidates] = useState<ColorCandidate[]>([])

  const maxIndex = useRef<number>(0)
 
  useEffect(() => {
    if (!(gridRef.current && gridRef.current.api)) { return }
    getColumnStorage().then(({ colState }: GuidesStoreColumns) => {
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

  const onClearFilterButtonClick = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setFilterModel(null);
      gridRef.current.api.setGridOption("quickFilterText", "")
    }
    const filterInput = document.getElementById("filter-text-box") as HTMLInputElement;
    if (filterInput) {
      filterInput.value = "";
    }
  }, []);



  const onAddRowToolBarClick = useCallback(() => {
    gridRef.current?.api.applyTransaction({
      add: [
        {
          Guideid: maxIndex.current + 1,
          ReligiousSector: "יהודי",
          Documents: "",
          PoliceApproval: "",
          Aggrement: "",
        },
      ],
      addIndex: 0
    });
    maxIndex.current = maxIndex.current+1
    rowCount.current++
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
  }, []);
  const ValueFormatWhatsApp = useCallback((params) => {
    const { FirstName } = params.data;
    return `${FirstName}`;
  }, []);

  const ValueFormatAssigned = useCallback((params) => {
    return params?.data?.isAssigned
  }, []);

  const ValueGetterAssigned = useCallback((params) => {
    return params?.data?.isAssigned ? "נציג" : "לא נציג"
  }, []);





  const ProfCellRenderer = useCallback((props: ICellRendererParams<Guide>) =>

    <div className="max-w-[150px] max-h-[50px] overflow-y-hidden whitespace-nowrap text-ellipsis hover:text-clip truncate  hover:overflow-x-auto hover:whitespace-nowra">
      {props.data.Professions}

    </div>, [])

  const valueFormatCellPhone = useCallback((params) => {
    const { CellPhone }: { CellPhone: string } = params.data
    // Remove the country code (+972) and hyphens (-) and zeros at the start.
    const formattedPhone = CellPhone?.replace('+972', '')
      .replace(/[-\s]/g, '')
      .replace(/^0/, '');
    return formattedPhone

  }, [])

  /**
   TODO:  Since the data we use is an array of objects and since javascript passes variables by reference, by modifing the useState array, we also modifty the original array.
          We can perhaps simpify alot of stuff later by using this fact.
          For example, in this case, even though our rowData is useState, because we pass the original object to other components,
          by using node.setDataValue we update the internal ag grid array, which refrences the rowData object from useState, which references
          the original object, changing the same object inside the components as well.

   */

  const GetDefaultDefinitions = useCallback((model, cities, religions, professions, professions_model, instructors, areas, status) => {

    var coldef: Object[] = model[0].map((value: any, index: any) => {

      if (value === "Guideid") {
        return {
          field: value,
          headerName: model[1][index],
          cellEditor: "agTextCellEditor",
          rowDrag: false,
          checkboxSelection: true,
          headerCheckboxSelection: true,
          headerCheckboxSelectionFilteredOnly: true,
          headerCheckboxSelectionCurrentPageOnly: true,
          lockVisible: true,
        };
      }
      if (value === "FirstName") {
        return {
          field: value,
          headerName: model[1][index],
          editable: true,
          cellEditor: NamePhoneCellEditor,
          cellEditorParams: {
            AllGuides: instructors
          },
          cellRenderer: NamePhoneCellRenderer,
          cellRendererParams: {
            AllGuides: instructors
          },
          filter: "CustomFilter",
          singleClickEdit: true
        }

      }
      if (value === "Status") {
        return {
          field: value,
          headerName: model[1][index],
          editable: true,
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: status,
            valueListMaxWidth: 120,
          },
          filter: "CustomFilter",
          singleClickEdit: true
        };
      }
      if (value === "City") {
        return {
          field: value,
          headerName: model[1][index],
          editable: true,
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: cities,
            valueListMaxWidth: 120,
          },
          filter: "CustomFilter",
          singleClickEdit: true
        };
      }
      if (value === "Area") {
        return {
          field: value,
          headerName: model[1][index],
          editable: true,
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: areas // I am speed running... fix this later
          },
          filter: "CustomFilter",
          singleClickEdit: true
        };

      }
      if (value === "ReligiousSector") {
        return {
          field: value,
          headerName: model[1][index],
          editable: true,
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: religions,
          },
          filter: "CustomFilter",
          singleClickEdit: true
        };
      }
      if (
        value === "Documents" ||
        value === "PoliceApproval" ||
        value === "Insurance" ||
        value === "Aggrement" ||
        value === "CV" || value === "Other_Documents"
      ) {
        return {
          field: value,
          headerName: model[1][index],
          editable: true,
          cellRenderer: "CustomLinkDrive",
          cellRendererParams: {
            GoogleFunctions: AuthenticateActivate,
          },
          cellEditor: "agTextCellEditor",
        };
      }
      if (value === "Professions") {
        return {
          field: "Professions",
          headerName: "מקצועות",
          editable: true,
          singleClickEdit: true,
          cellEditor: ChooseProfessions,
          cellRenderer: ProfCellRenderer,
        }
      }
      // we are not using the database one... this is just for model ordering.
      if (value === "WhatsApp") {
        return {
          field: "WhatsAppField",
          hide: true,
          headerName: 'וואטסאפ',
          editable: false,
          cellRenderer: CustomWhatsAppRenderer,
          valueGetter: ValueFormatWhatsApp,
          filter: "CustomFilter",
        }
      }
      if (value === "CellPhone") {
        return {
          field: value,
          headerName: model[1][index],
          editable: true,
          cellEditor: "agTextCellEditor",
          filter: "CustomFilter",
          valueGetter: valueFormatCellPhone,
          singleClickEdit: true
        };


      }
      if (value === "isAssigned") {
        return {
          field: value,
          headerName: model[1][index],
          editable: false,
          cellEditor: "agTextCellEditor",
          filter: "CustomFilter",
          valueFormatter: ValueFormatAssigned,
        };

      }

      return {
        field: value,
        headerName: model[1][index],
        editable: true,
        cellEditor: "agTextCellEditor",
        filter: "CustomFilter",
        singleClickEdit: true
      };
    });



    return coldef
  }, [AuthenticateActivate, ProfCellRenderer, ValueFormatAssigned, ValueFormatWhatsApp, valueFormatCellPhone])
  
  
  const onGridReady = async (params) => {
    getFromStorage().then(async ({ Guides, Cities, Areas, Religion, Professions, ProfessionsTablemodel, Tablemodel, GuidesStatuses, ColorCandidates, Candidates, AssignedGuides }: Required<DataType>) => {
      
      // ----------- תיקון: הבטחת רשימת ערים עדכנית -----------
      // אנו מגדירים משתנה חדש שיתחיל מה-Cache אבל יתעדכן מהשרת
      let currentCities = Cities;

      try {
        // משיכת רשימת הערים העדכנית ביותר מהשרת
        const freshCities = await getAllCities();
        if (freshCities && freshCities.length > 0) {
            currentCities = freshCities;
            // אופציונלי: עדכון ה-Cache כדי שהפעם הבאה תהיה מהירה יותר
            updateStorage({ Cities: freshCities });
        }
      } catch (e) {
        console.warn("Could not fetch fresh cities, using cache", e);
      }
      // --------------------------------------------------------

      if (Guides && currentCities && Areas && Religion && Professions && ProfessionsTablemodel && Tablemodel && GuidesStatuses && ColorCandidates && Candidates && AssignedGuides) {
        // שימוש ב-currentCities במקום ב-Cities מהסטורג'
        const colDef = GetDefaultDefinitions(Tablemodel, currentCities.map((val) => val.CityName), Religion.map((val) => val.ReligionName), Professions, ProfessionsTablemodel, Guides, Areas.map((val) => val.AreaName), GuidesStatuses.map((val) => val.StatusName))
        if (Guides.length == 0) {
          params.api.hideOverlay();
        }
        setRowData(Guides);
        setColDefs(colDef);

        rowCount.current = Guides.length; // new row will be +1
        dataRowCount.current = Guides.length;

        setAllGuides(Guides)
        setAllAssigncandidates(Candidates)
        setAllAssigned(AssignedGuides)
        setAllColorCandidates(ColorCandidates)
        maxIndex.current = Guides.length > 0 ? Math.max(...Guides.map((guide) => guide.Guideid)):0


      } else {
        Promise.all([
          getAllGuides(),
          getAllCities(),
          getAllReligionSectors(),
          getAllProfessions(),
          getModelFields("Profession"),
          getModelFields("Guide"),
          getAllDistricts(),
          getAllStatuses("Guides"),
          getAllCandidates(),
          getAllAssignedInstructors(),
          getAllColorCandidates(),
           

        ]).then(([guides, cities, religions, professions, professions_model, model, areas, statuses, candidates, assigned, colorcandidates]) => {

          var coldef = GetDefaultDefinitions(model, cities.map((val) => val.CityName), religions.map((val) => val.ReligionName), professions, professions_model, guides, areas.map((val) => val.AreaName), statuses.map((val) => val.StatusName))

          setRowData(guides);
          setColDefs(coldef);
          rowCount.current = guides.length;
          dataRowCount.current = guides.length;

          setAllGuides(guides)
          setAllAssigncandidates(candidates)
          setAllAssigned(assigned)
          setAllColorCandidates(colorcandidates)
            maxIndex.current = guides.length > 0 ? Math.max(...guides.map((guide)=>guide.Guideid)):0

          updateStorage({ Guides: guides, Cities: cities, Religion: religions, Professions: professions, ProfessionsTablemodel: professions_model, Areas: areas, GuidesStatuses: statuses, Tablemodel: model })

        });

      }
    })




  };

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {

    modifiedRowRef.current = event.data
    if (event.oldValue === event.newValue) {
      return;
    }
    if (!InTheMiddleOfAddingRows) {
      updateInstructorsColumn(
        event.column.getColId(),
        event.newValue,
        event.data.Guideid
      ).then(() => {


        // TODO: add validation for columns

        // update cache. O(N) ... maybe slow for large database, need to see when we update.
        //TODO: check efficiency.
        if (typeof window !== "undefined") {
          const future_data: Guide[] = [];
          gridRef.current.api.forEachNode((node: any) => {
            future_data.push(node.data);
          });

          updateStorage({ Guides: future_data })


        }
      })

    }


  }, [InTheMiddleOfAddingRows]);

  const onCellEditingStopped = (event: CellEditingStoppedEvent) => {


  };

  const onFilterTextBoxChanged = useCallback(() => {
    gridRef.current?.api.setGridOption(
      "quickFilterText",
      (document.getElementById("filter-text-box") as HTMLInputElement).value
    );
  }, []);




  const handleClose = () => {
    setOpen(false);
    setDialogType("");
    setDialogMessage("");
  };

  const validateCellphone = (cellphone: string, numbers: string[]) => {
    // Check if the cellphone contains only digits
    let isNumeric = /^\d+$/.test(cellphone);
    if (!isNumeric) {
      return false;
    }

    // Check the length based on whether it starts with '0' or not
    if (cellphone.startsWith("0")) {
      return cellphone.length === 10;
    } else {
      return cellphone.length === 9;
    }


  };

  const validateFields = useCallback((rowData: object, rowIndex, numbers) => {
    console.log("numbers: ", numbers);
    if (!rowData.hasOwnProperty("FirstName")) {
      setDialogType("validationError");
      setDialogMessage(`אנא מלא שם פרטי בשורה ${rowIndex}`);
      setOpen(true);
      return false;
    }

    const cellphone = rowData["CellPhone"]
    if (!rowData.hasOwnProperty("CellPhone")) {
      setDialogType("validationError");
      setDialogMessage(`אנא מלא טלפון בשורה ${rowIndex}`);
      setOpen(true);
      return false;
    } else if (!validateCellphone(cellphone, numbers)) {
      setDialogType("validationError");
      setDialogMessage(`מספר טלפון לא תקין בשורה ${rowIndex}`);
      setOpen(true);
      return false;
    } else if (numbers.includes(cellphone)) {
      console.log("cellphone: ", cellphone);
      setDialogType("validationError");
      setDialogMessage(`מספר טלפון קיים בשורה ${rowIndex}`);
      setOpen(true);
      return false;
    }

    return true;
  }, []);


  const onSaveChangeButtonClick = useCallback(() => {
    gridRef.current.api.stopEditing();
    const colAmount: number = rowCount.current - dataRowCount.current;

    var future_data: Guide[] = [];
    var newly_added: Guide[] = [];
    var count = 0;

    const phoneNumbers = []
    gridRef.current.api.forEachNode((node) => {
      if (node.data?.CellPhone !== modifiedRowRef.current?.CellPhone) {
        phoneNumbers.push(node.data.CellPhone)
      }

    })

    gridRef.current.api.forEachNode((node: any) => {
      future_data.push(node.data);
      // only if it is a new row that is not in the database look at it.
      if (count < rowCount.current - dataRowCount.current) {
        newly_added.push(node.data);
      }

      count++;
    });

    future_data = future_data.sort((arg1, arg2) => arg1.Guideid - arg2.Guideid)

    maxIndex.current = future_data.length > 0 ? Math.max(...future_data.map((guide) => guide.Guideid)):0

    // for (let i = 0; i < n; i++) {
    //   if (!validateFields(newly_added[i], rowCount.current + i, phoneNumbers)) {
    //     return;
    //   }
    // }
    setDialogType("success");
    setDialogMessage("מדריכים נוספו בהצלחה");
    setOpen(true);
    // only in this table i have created a field that does not exist in the real table.
    // i think i am using the field, search for text and see.
    newly_added = newly_added.map((res) => { delete res['WhatsAppField']; return res }).sort((arg1, arg2) => arg1.Guideid - arg2.Guideid)
    setRowData((data) => [...data, ...newly_added])
    // we need to update the professions here, else if we visited Assign page before the professions
    // will be outdated.
    addInstructorsRows(newly_added).then((professions) => {

      updateStorage({ Guides: future_data, Professions: professions })

    })
    // update the Row count in the database and hide the buttons.
    dataRowCount.current = rowCount.current;
    const element: any = document.getElementById("savechangesbutton");
    if (element !== null) {
      element.style.display = "none";
    }
    const element_2: any = document.getElementById("cancelchangesbutton");
    if (element_2 !== null) {
      element_2.style.display = "none";
    }
    // no longer in adding rows mode.

    SetInTheMiddleOfAddingRows(false);
    gridRef.current.api.deselectAll()
    setAmount(0)

  }, []);

  const onCancelChangeButtonClick = useCallback(() => {
    const prev_data: Guide[] = [];
    var count = 0
    gridRef.current.api.forEachNode((node: any) => {
      // Right now, a new row is added at the top and forEachNode goes through the order that appears in the table.
      if (count >= rowCount.current - dataRowCount.current) {
        prev_data.push(node.data);
      }
      count++;
    });
  maxIndex.current = prev_data.length > 0 ? Math.max(...prev_data.map((guide) => guide.Guideid)):0
    
    setRowData(prev_data)
  
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
    gridRef.current.api.deselectAll()
    setAmount(0)
  }, []);

  const onSaveDeletions = useCallback(() => {
    const ids: number[] = gridRef.current.api
      .getSelectedRows()
      .map((val: Guide) => val.Guideid);

    // this is what will remain after the deletion.
    const updated_data: Guide[] = [];


    // what are the ids in big schoolstable that are not deleted - we need that to reorder the table.
    let id_range: number[] = []
    for (let index = 1; index <= dataRowCount.current; index++) {
      if (ids.includes(index)) {
        continue
      }
      id_range.push(index)
    }
    let index = 0
    gridRef.current.api.forEachNode((node: any) => {
      if (!ids.includes(node.data.Guideid)) {

        updated_data.push(node.data);
      }
    });
     maxIndex.current = updated_data.length > 0 ? Math.max(...updated_data.map((guide) => guide.Guideid)):0
    setRowData(updated_data)
    setLoading(true)
    const remaining_assigned = AllAssigned.filter((guide) => !!!ids.includes(guide.Guideid))
    const remaining_Colorcandidates = AllColorCandidates.filter((guide) => !!!ids.includes(guide.Guideid))
    const remaining_AssignCandidates = AllAssigncandidates.filter((guide) => !!!ids.includes(guide.Guideid))
    Promise.all([updateStorage({ Guides: updated_data, Candidates: remaining_AssignCandidates, AssignedGuides: remaining_assigned, ColorCandidates: remaining_Colorcandidates }), deleteGuidesCascading(ids, id_range).then((_) => {
      setLoading(false)
    })
    ])

    // update the amount of rows
    dataRowCount.current -= ids.length;
    rowCount.current -= ids.length;
    // update the checked amount.
    setAmount(0);

    gridRef.current.api.deselectAll()
    // hide delete button.
    const element: any = document.getElementById("savedeletions");
    if (element !== null) {
      element.style.display = "none";
    }
  }, [AllAssigncandidates, AllAssigned, AllColorCandidates]);

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

  const isRowSelectable = (rowNode: any) => !InTheMiddleOfAddingRows;

  const components = useMemo(
    () => ({
      CustomLinkDrive: (props) => <CustomLinkDrive {...props} AuthenticateActivate={AuthenticateActivate} type={"Guide"} />,
      CustomMultiSelectCellRenderer: CustomMultiSelectCell,
      CustomMultiSelect: CustomMultiSelectCellEdit,
      CustomFilter: CustomFilter,
      CustomChooseProfessions: ChooseProfessions,
      whatsAppRenderer: CustomWhatsAppRenderer,
      ProfCellRenderer: ProfCellRenderer
    }),
    [AuthenticateActivate, ProfCellRenderer]
  );


  const CustomNoRowsOverlay = useCallback(() => {
    const Name = "לא זוהו נתונים"
    return (
      <div className="ag-overlay-no-rows-center text-blue-300">
        <span> {Name} </span>
      </div>
    );
  }, [])
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
        id="SchoolNavBar"
        className="bg-[#12242E] fill-[#ffffff] opacity-[1.40e+7%]  flex-row-reverse"
      >
        <LoadingOverlay />
        <Redirect type={'Guides'} ScopeType={'Drive'} />
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
            className="hover:bg-[#253d37]  rounded mr-1 ml-1"
            onClick={onAddRowToolBarClick}
          >
            <FcAddRow className="w-[37px] h-[37px]" />
          </button>
        </OverlayTrigger>

        <button
          id="cancelchangesbutton"
          onClick={onCancelChangeButtonClick}
          className="hover:bg-slate-500 bg-slate-600 rounded mr-[100px] text-white border-solid hidden "
        >
          בטל שינויים
        </button>

        <button
          id="savechangesbutton"
          onClick={onSaveChangeButtonClick}
          className="hover:bg-rose-700 bg-rose-800 rounded mr-[50px] text-white  border-solid hidden "
        >
          שמור שינויים{" "}
        </button>

        <button
          id="savedeletions"
          onClick={onSaveDeletions}
          className="hover:bg-green-700 bg-green-800 rounded mr-[50px] text-white  border-solid hidden  "
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
          className={theme === "dark-theme" ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
          style={{ width: "100%", height: "1000px" }}
        >
          <AgGridReact
            noRowsOverlayComponent={CustomNoRowsOverlay}
            ref={gridRef}
            rowData={rowData}
            columnDefs={colDefinition}
            onCellKeyDown={onCellKeyDown}
            enableRtl={true}
            onGridReady={onGridReady}
            onCellValueChanged={onCellValueChanged}
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
            suppressRowTransform={true}
            onColumnResized={onColumnResized}
            onColumnMoved={onColumnMoved}
            suppressMenuHide={true}
            onCellEditingStopped={onCellEditingStopped}
            pagination={true}
            paginationPageSize={25}
          />
        </div>
      </Suspense>
      <Dialog open={open} onClose={handleClose}>
        {dialogType === "validationError" && (
          <>
            <DialogTitle>{"Input Error"}</DialogTitle>
            <DialogContent>
              <DialogContentText>{dialogMessage}</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Close</Button>
            </DialogActions>
          </>
        )}
        {dialogType === "success" && (
          <>
            <DialogTitle>{"Success"}</DialogTitle>
            <DialogContent>
              <DialogContentText>{dialogMessage}</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
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