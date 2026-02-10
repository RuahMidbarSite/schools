"use client";
import { School, Guide, Assigned_Guide, Profession, Areas, ReligionSector, StatusGuides, Guides_ToAssign, ColorCandidate } from "@prisma/client";
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
import "ag-grid-community/styles/ag-theme-quartz.css";

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

import Select from "react-select"; 

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
  getAllProfessionTypes,
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
//import { NamePhoneCellEditor } from "./components/NamePhoneCellEditor";
import { NamePhoneCellRenderer } from "./components/NamePhoneCellRenderer";
import { getAssignedInstructores } from "@/db/programsRequests";
import { GoogleDriveAuthStatus } from "@/components/GoogleDriveAuthStatus";
import { NamePhoneEditor } from "./components/NamePhoneEditor";

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
const [ProfessionTypes, setProfessionTypes] = useState<any[]>([])
  const maxIndex = useRef<number>(0)
  const originalMaxIndex = useRef<number>(0) // לשמור את המקסימום המקורי לפני הוספת שורות חדשות
 
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

 useEffect(() => {
    // עדכן את ה-column definitions כשה-ProfessionTypes משתנה
    if (colDefinition && ProfessionTypes && ProfessionTypes.length > 0 && gridRef.current?.api) {
      
      // המר את ProfessionTypes לפורמט הנכון: { label, value }[]
      const formattedProfessions = ProfessionTypes.map(prof => ({
        label: prof.ProfessionName,
        value: prof.FieldName || prof.ProfessionName
      }));
      
      console.log('🔍 Formatted professions:', formattedProfessions); // לבדיקה
      
      const updatedColDefs = colDefinition.map(col => {
        if (col.field === 'Professions') {
          return {
            ...col,
            cellEditorParams: {
              professionsList: formattedProfessions
            }
          };
        }
        return col;
      });
      
      setColDefs(updatedColDefs);
      gridRef.current.api.setGridOption('columnDefs', updatedColDefs);
    }
  }, [ProfessionTypes]);
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
    onClearFilterButtonClick();

    gridRef.current?.api.applyColumnState({
      state: [
        { colId: 'Guideid', sort: 'desc' }
      ],
      defaultState: { sort: null } 
    });

    if (!InTheMiddleOfAddingRows) {
      originalMaxIndex.current = maxIndex.current;
    }

    const newId = maxIndex.current + 1;

    gridRef.current?.api.applyTransaction({
      add: [{
          Guideid: newId,
          ReligiousSector: "יהודי",
          Documents: "",
          PoliceApproval: "",
          Aggrement: "",
        }],
      addIndex: 0
    });
    
    maxIndex.current = newId;
    rowCount.current++;
    SetInTheMiddleOfAddingRows(true);
    
    const element: any = document.getElementById("savechangesbutton");
    if (element) element.style.display = "block";
    const element_2: any = document.getElementById("cancelchangesbutton");
    if (element_2) element_2.style.display = "block";

    // --- התיקון כאן ---
    setTimeout(() => {
       gridRef.current?.api.paginationGoToFirstPage();
       gridRef.current?.api.ensureIndexVisible(0);
       
       // הגדרת פוקוס רשמי לפני תחילת עריכה - מעלים קווים אדומים ועובד יציב
       gridRef.current?.api.setFocusedCell(0, 'FirstName');
       gridRef.current?.api.startEditingCell({
         rowIndex: 0,
         colKey: 'FirstName'
       });
    }, 200);

  }, [onClearFilterButtonClick, InTheMiddleOfAddingRows]);

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
    const formattedPhone = CellPhone?.replace('+972', '')
      .replace(/[-\s]/g, '')
      .replace(/^0/, '');
    return formattedPhone

  }, [])

  const GetDefaultDefinitions = useCallback((model, cities, religions, professions, professions_model, instructors, areas, status) => {

    // === 🛠️ הגדרת רוחב עמודות מהודקת (Fine-Tuning V3) ===
    
    // 1. עמודות שמתרחבות (Flex)
    // הערות מקבלת משקל עצום כדי לקחת את כל השאריות
    const columnFlex: { [key: string]: number } = {
        Remarks: 12,        // 🔥 המלך החדש של הטבלה
        Professions: 3,     
        default: 1
    };

    // 2. רוחב קבוע (Fixed Pixels) - צמצום אגרסיבי לפי צילומי המסך
    const columnFixedWidths: { [key: string]: number } = {
        // מזהים וצ'קבוקסים
        Guideid: 90,
        isAssigned: 60,     
        
        // פרטים אישיים - צומצמו למינימום
        FirstName: 75,      // שם פרטי
        LastName: 75,       // משפחה
        CellPhone: 90,      // טלפון (צפוף)
        City: 150,           // יישוב
        Area: 150,           // אזור
        
        // עמודות קטנות
        Status: 55,         // סטטוס
        HourlyPrice: 45,    // מחיר (ממש צפוף)
        ReligiousSector: 65,// מגזר
        Gender: 50,
        
        // אייקונים ומסמכים - צמצום נוסף
        CV: 55,             // קוח
        Documents: 70,      // מסמכים
        PoliceApproval: 65, // אישור משטרה
        Insurance: 45,      // ביטוח
        Aggrement: 70,      // הסכם
        Other_Documents: 70,// תעודות
        
        BirthDate: 90,
        Tz: 90,
        Email: 120
    };

    const minWidths: { [key: string]: number } = {
        Remarks: 150, 
        Professions: 100,
        default: 40
    };

    var coldef: Object[] = model[0].map((value: any, index: any) => {

      // חישוב רוחב
      const fixedWidth = columnFixedWidths[value];
      const flexVal = fixedWidth ? undefined : (columnFlex[value] || columnFlex["default"]);
      const minW = minWidths[value] || minWidths["default"];

      // הגדרות בסיס
      let baseColDef = {
        field: value,
        headerName: model[1][index],
        editable: true,
        filter: "CustomFilter",
        singleClickEdit: true,
        resizable: true,           
        suppressSizeToFit: true,   
        width: fixedWidth,
        flex: flexVal,
        minWidth: minW
      };

      if (value === "Guideid") {
        return {
          ...baseColDef,
          cellEditor: "agTextCellEditor",
          rowDrag: false,
          checkboxSelection: true,
          headerCheckboxSelection: true,
          headerCheckboxSelectionFilteredOnly: true,
          headerCheckboxSelectionCurrentPageOnly: true,
          lockVisible: true,
          pinned: 'right', 
          lockPosition: true,
          width: 90,       
          flex: undefined
        };
      }
      if (value === "FirstName") {
        return {
          ...baseColDef,
          singleClickEdit: true,
          cellEditor: NamePhoneEditor,
          cellEditorParams: {
            AllGuides: instructors
          },
          cellRenderer: (params: any) => {
            if (!params.value) return "";
            
            // עיבוד מספר טלפון ל-WhatsApp
            let phone = params.data?.CellPhone?.replace(/\D/g, '') || "";
            if (phone.startsWith('0')) {
              phone = '972' + phone.substring(1);
            }
            const whatsappUrl = `whatsapp://send?phone=${phone}`;

            return (
              <div className="flex items-center w-full h-full px-1">
                <a 
                  href={whatsappUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(whatsappUrl, '_blank');
                  }}
                  style={{ 
                    textDecoration: "underline", 
                    color: "#2563eb", 
                    cursor: "pointer" 
                  }}
                >
                  {params.value}
                </a>
              </div>
            );
          }
        };
      }
      if (value === "Status") {
        return {
          ...baseColDef,
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: status,
            valueListMaxWidth: 120,
          },
        };
      }
      if (value === "City") {
        return {
          ...baseColDef,
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: cities,
            valueListMaxWidth: 120,
          },
        };
      }
      if (value === "Area") {
        return {
          ...baseColDef,
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: areas 
          },
        };

      }
      if (value === "ReligiousSector") {
        return {
          ...baseColDef,
          cellEditor: CustomSelectCellEditor,
          cellEditorParams: {
            values: religions,
          },
        };
      }
     if (value === "CV") {
        return {
          ...baseColDef,
          cellRenderer: "CustomLinkDrive",
          cellRendererParams: {
            GoogleFunctions: AuthenticateActivate,
            customDisplayText: "קוח" 
          },
          editable: false, // זה המפתח: מונע פתיחת עריכה
        };
      }
      // כנ"ל לגבי שאר המסמכים...
      if (
        value === "Documents" ||
        value === "PoliceApproval" ||
        value === "Insurance" ||
        value === "Aggrement" ||
        value === "Other_Documents"
      ) {
        return {
          ...baseColDef,
          cellRenderer: "CustomLinkDrive",
          cellRendererParams: {
            GoogleFunctions: AuthenticateActivate,
          },
          cellEditor: "agTextCellEditor",
          editable: false, 
        };
      }
      if (value === "Professions") {
        return {
          ...baseColDef,
          headerName: "מקצועות",
          cellEditor: ChooseProfessions,
          cellEditorParams: {                    //  הוסף שורה זו
            professionsList: ProfessionTypes     //  הוסף שורה זו
          },                                      //  הוסף שורה זו
          cellRenderer: ProfCellRenderer,
        }
      }
      
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
          ...baseColDef,
          cellEditor: "agTextCellEditor",
          valueGetter: valueFormatCellPhone,
        };
      }
      if (value === "isAssigned") {
        return {
          ...baseColDef,
          editable: false,
          cellEditor: "agTextCellEditor",
          valueFormatter: ValueFormatAssigned,
        };
      }

      return baseColDef;
    });

    return coldef
  }, [AuthenticateActivate, ProfCellRenderer, ValueFormatAssigned, ValueFormatWhatsApp, valueFormatCellPhone])
  
  
  const onGridReady = async (params) => {
    getFromStorage().then(async ({ Guides, Cities, Areas, Religion, Professions, ProfessionsTablemodel, Tablemodel, GuidesStatuses, ColorCandidates, Candidates, AssignedGuides }: Required<DataType>) => {
      
      let currentCities = Cities;

      try {
        const freshCities = await getAllCities();
        if (freshCities && freshCities.length > 0) {
            currentCities = freshCities;
            updateStorage({ Cities: freshCities });
        }
      } catch (e) {
        console.warn("Could not fetch fresh cities, using cache", e);
      }

      if (Guides && currentCities && Areas && Religion && Professions && ProfessionsTablemodel && Tablemodel && GuidesStatuses && ColorCandidates && Candidates && AssignedGuides) {
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
        setProfessionTypes(Professions)
        maxIndex.current = Guides.length > 0 ? Math.max(...Guides.map((guide) => guide.Guideid)):0


      } else {
        Promise.all([
          getAllGuides(),
          getAllCities(),
          getAllReligionSectors(),
          getAllProfessionTypes(),
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
          setProfessionTypes(professions)
            maxIndex.current = guides.length > 0 ? Math.max(...guides.map((guide)=>guide.Guideid)):0

          updateStorage({ Guides: guides, Cities: cities, Religion: religions, Professions: professions, ProfessionsTablemodel: professions_model, Areas: areas, GuidesStatuses: statuses, Tablemodel: model })

        });

      }
    })




  };
  const getRowId = useCallback((params: GetRowIdParams) => {
      return String(params.data.Guideid);
    }, []);

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
  modifiedRowRef.current = event.data;
  
  if (event.oldValue === event.newValue) {
    return;
  }

  // בדיקה אם השדה המעודכן הוא טלפון
  if (event.column.getColId() === "CellPhone") {
    const newPhone = event.newValue;
    const currentRowId = event.data.Guideid;
    
    // בדיקת פורמט טלפון
    if (newPhone && !validateCellphone(newPhone, [])) {
      setDialogType("validationError");
      setDialogMessage("מספר טלפון לא תקין");
      setOpen(true);
      
      // החזרת הערך הישן ישירות ב-data בלי לעורר event
      setTimeout(() => {
        event.data.CellPhone = event.oldValue;
        gridRef.current.api.refreshCells({
          rowNodes: [event.node],
          columns: ['CellPhone'],
          force: true
        });
      }, 0);
      return;
    }
    
    // בדיקת כפילות
    let isDuplicate = false;
    gridRef.current.api.forEachNode((node) => {
      if (node.data.Guideid !== currentRowId && 
          node.data.CellPhone === newPhone) {
        isDuplicate = true;
      }
    });
    
    if (isDuplicate) {
      setDialogType("validationError");
      setDialogMessage("מספר טלפון זה כבר קיים במערכת");
      setOpen(true);
      
      // החזרת הערך הישן ישירות ב-data בלי לעורר event
      setTimeout(() => {
        event.data.CellPhone = event.oldValue;
        gridRef.current.api.refreshCells({
          rowNodes: [event.node],
          columns: ['CellPhone'],
          force: true
        });
      }, 0);
      return;
    }
  }

if (!InTheMiddleOfAddingRows && event.data.Guideid && event.newValue !== event.oldValue) {
    updateInstructorsColumn(
      event.column.getColId(),
      event.newValue,
      event.data.Guideid
    ).then(() => {
      if (typeof window !== "undefined") {
        const future_data: Guide[] = [];
        gridRef.current.api.forEachNode((node: any) => {
          future_data.push(node.data);
        });
        updateStorage({ Guides: future_data });
      }
    });
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

const validateCellphone = (cellphone: any, numbers: string[]) => {
    if (cellphone === null || cellphone === undefined || cellphone === "") return false;

    const phoneStr = String(cellphone).replace(/\D/g, ''); 
    if (phoneStr.length === 0) return false;

    const len = phoneStr.length;
    // אישור מפורש ל-9 (עמרי), 10 או 12 ספרות
    return len === 9 || len === 10 || len === 12;
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
  
  const phoneNumbers = new Set<string>();
  const newRowsPhones: string[] = [];
  let hasError = false;
  
  // איסוף כל מספרי הטלפון הקיימים
  gridRef.current.api.forEachNode((node, index) => {
    // זיהוי שורות חדשות לפי Guideid שגדול מהמקסימום המקורי
    const isNewRow = node.data.Guideid > originalMaxIndex.current;
    
    if (isNewRow) {
      // שורה חדשה
      const phone = node.data.CellPhone;
      
      // בדיקת שדות חובה
      if (!node.data.FirstName) {
        setDialogType("validationError");
        setDialogMessage(`אנא מלא שם פרטי בשורה ${node.data.Guideid}`);
        setOpen(true);
        hasError = true;
        return;
      }
      
      if (!phone) {
        setDialogType("validationError");
        setDialogMessage(`אנא מלא טלפון בשורה ${node.data.Guideid}`);
        setOpen(true);
        hasError = true;
        return;
      }
      
      // בדיקת פורמט
      if (!validateCellphone(phone, [])) {
        setDialogType("validationError");
        setDialogMessage(`מספר טלפון לא תקין בשורה ${node.data.Guideid}`);
        setOpen(true);
        hasError = true;
        return;
      }
      
      newRowsPhones.push(phone);
    } else {
      // שורה קיימת
      if (node.data.CellPhone) {
        phoneNumbers.add(node.data.CellPhone);
      }
    }
  });
  
  if (hasError) return;
  
  // בדיקת כפילות בין השורות החדשות לקיימות
  for (let i = 0; i < newRowsPhones.length; i++) {
    const phone = newRowsPhones[i];
    
    if (phoneNumbers.has(phone)) {
      setDialogType("validationError");
      setDialogMessage(`מספר טלפון ${phone} כבר קיים במערכת`);
      setOpen(true);
      return;
    }
    
    // בדיקת כפילות בתוך השורות החדשות עצמן
    if (newRowsPhones.indexOf(phone) !== i) {
      setDialogType("validationError");
      setDialogMessage(`מספר טלפון ${phone} מופיע יותר מפעם אחת`);
      setOpen(true);
      return;
    }
  }
  
  // אם הכל תקין, המשך עם השמירה
  const future_data: Guide[] = [];
  const newly_added: Guide[] = [];
  
  gridRef.current.api.forEachNode((node: any) => {
    future_data.push(node.data);
    // זיהוי שורות חדשות לפי Guideid
    if (node.data.Guideid > originalMaxIndex.current) {
      newly_added.push(node.data);
    }
  });
  
  future_data.sort((arg1, arg2) => arg1.Guideid - arg2.Guideid);
  maxIndex.current = future_data.length > 0 ? 
    Math.max(...future_data.map((guide) => guide.Guideid)) : 0;
  
  setDialogType("success");
  setDialogMessage("מדריכים נוספו בהצלחה");
  setOpen(true);
  
  const cleanNewlyAdded = newly_added
    .map((res) => { delete res['WhatsAppField']; return res; })
    .sort((arg1, arg2) => arg1.Guideid - arg2.Guideid);
  
  setRowData((data) => [...data, ...cleanNewlyAdded]);
  
  addInstructorsRows(cleanNewlyAdded).then((professions) => {
    updateStorage({ Guides: future_data, Professions: professions });
  });
  
  dataRowCount.current = rowCount.current;
  
  const saveBtn = document.getElementById("savechangesbutton");
  const cancelBtn = document.getElementById("cancelchangesbutton");
  if (saveBtn) saveBtn.style.display = "none";
  if (cancelBtn) cancelBtn.style.display = "none";
  
    gridRef.current.api.deselectAll();
  setAmount(0);
}, []);

  const onCancelChangeButtonClick = useCallback(() => {
    gridRef.current.api.stopEditing(true); // true = cancel
    SetInTheMiddleOfAddingRows(false);
    const prev_data: Guide[] = [];
    
    gridRef.current.api.forEachNode((node: any) => {
      // שמור רק שורות קיימות (לא חדשות)
      if (node.data.Guideid <= originalMaxIndex.current) {
        prev_data.push(node.data);
      }
    });
    
    maxIndex.current = prev_data.length > 0 ? Math.max(...prev_data.map((guide) => guide.Guideid)) : 0;
    
    setRowData(prev_data)
  
    rowCount.current = dataRowCount.current;

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

    const updated_data: Guide[] = [];

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

    dataRowCount.current -= ids.length;
    rowCount.current -= ids.length;
    setAmount(0);

    gridRef.current.api.deselectAll()
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
      // החזרנו את זה למצב המקורי והתקין:
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
    
    // אם אנחנו כבר במצב עריכה, אל תתערב באירועי מקלדת כדי לא להפריע ל-Editor
    if (event.api.getEditingCells().length > 0) return;

    const keysToHandle = ["Tab", "Enter", "ArrowLeft", "ArrowRight"];
    
    if (keysToHandle.includes(keyboardEvent.key)) {
      keyboardEvent.stopPropagation();
      keyboardEvent.preventDefault();

      const currentNode = event.api.getDisplayedRowAtIndex(event.rowIndex);
      const displayedColumns = event.api.getAllDisplayedColumns();
      const currentColumnIndex = displayedColumns.findIndex(
        col => col?.getColId() === event.column?.getColId()
      );

      let nextCell = null;
      const isColumnEditable = (colDef, node) => {
        if (typeof colDef.editable === 'function') return colDef.editable(node);
        return !!colDef.editable;
      };

      for (let i = currentColumnIndex + 1; i < displayedColumns.length; i++) {
        const colDef = displayedColumns[i].getColDef();
        if (isColumnEditable(colDef, currentNode) || colDef.cellRenderer) {
          nextCell = { rowIndex: event.rowIndex, column: displayedColumns[i] };
          break;
        }
      }

      if (nextCell) {
        event.api.stopEditing();
        event.api.setFocusedCell(nextCell.rowIndex, nextCell.column.getColId());
        
        const nextColDef = nextCell.column.getColDef();
        if (!nextColDef.cellRenderer) {
          event.api.startEditingCell({
            rowIndex: nextCell.rowIndex,
            colKey: nextCell.column.getColId(),
          });
        }
      }
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

  const checkDriveStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/google-drive/check-status?type=guides');
      if (!response.ok) {
        return { isConnected: false };
      }
      return await response.json();
    } catch (error) {
      console.error("Error checking Drive status:", error);
      return { isConnected: false };
    }
  }, []);

  const onDisconnectDrive = useCallback(async () => {
    try {
      await fetch('/api/google-drive/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'guides' }),
      });
    } catch (error) {
      console.error("Error disconnecting Drive:", error);
    }
  }, []);
  
  return (
    <>
     <Navbar
  id="SchoolNavBar"
  className="fill-[#ffffff] flex-row-reverse"
  suppressHydrationWarning
  style={{
    background: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    minHeight: '64px',
    borderBottom: '1px solid rgba(203, 213, 225, 0.3)'
  }}
>
  <LoadingOverlay />
  
 <div suppressHydrationWarning><Redirect type={'Guides'} ScopeType={'Drive'} /></div>
  
  
  <OverlayTrigger
    placement={"top"}
    overlay={<Tooltip className="absolute">ביטול סינון</Tooltip>}
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

  <div className="mr-auto bg-[#E6E6FA] rounded-md p-1 flex items-center" suppressHydrationWarning>
    <GoogleDriveAuthStatus 
      type="Guides"
      checkAuthStatus={checkDriveStatus}
      onDisconnect={onDisconnectDrive}
    />
  </div>
</Navbar>
      <Suspense>
        <div
          id="grid-1"
          className={theme === "dark-theme" ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
          style={{ width: "100%", height: "1000px" }}
        >
          <AgGridReact
            getRowId={getRowId}
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