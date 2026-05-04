"use client";
import { StatusBadgeRenderer } from "../../GeneralFiles/Renderers/StatusBadgeRenderer"; // שים לב לנתיב
import { School, ReligionSector, Cities, SchoolsContact, EducationStage, SchoolTypes, StatusSchools } from "@prisma/client";
import {
  useState,
  useRef,
  useCallback,
  memo,
  useMemo,
  useEffect,
  Suspense,
  useReducer,
} from "react";
import { AgGridReact } from "ag-grid-react";
import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import {
  getAllSchools,
  getContacts,
  getSchools,
} from "@/db/schoolrequests";

import {
  GridReadyEvent,

} from "ag-grid-community";

import { getAllCities, getAllReligionSectors, getAllSchoolsTypes, getAllStatuses, getEducationStages, getModelFields, getSchoolTypes } from "@/db/generalrequests";
import {
  columnsDefinition,
  schoolsData,
} from "@/util/cache/cachetypes";
import { getAllContacts } from "@/db/contactsRequests";
import { DataType, getFromStorage, SchoolStoreRowData, updateStorage } from "../Storage/SchoolDataStorage";
import useUpdateCacheColumn from "./UpdateCacheColumn";
import CustomSelectCellEditor from "@/components/CustomSelect/CustomSelectCellEditor";
import ExpandMasterGridComponent from "../Components/MasterGrid/ExpandMasterGrid";
import { getPrograms } from "@/db/programsRequests";

const useGridFunctions = (CustomDateCellEditor, valueFormatterDate, setColDefs, setRowData, rowCount, dataRowCount, setAllContacts, setAllPrograms, maxIndex): { GetDefaultDefinitions: any, onGridReady: any } => {

  const { UpdateColumnsAfterCache } = useUpdateCacheColumn()

  const GetDefaultDefinitions = useCallback(
    ([religion_sectors, cities, model, edustages, statuses, contacts, schoolTypes]: [ReligionSector[], Cities[], any, EducationStage[], StatusSchools[], SchoolsContact[], SchoolTypes[]]) => {

      var colDe: columnsDefinition = model[0]?.map((value: any, index: any) => {
        if (value === "ReligiousSector") {
          return {
            field: value,
            headerName: model[1][index],
            width: 100,
            editable: true,
            cellEditor: CustomSelectCellEditor,
            cellEditorParams: {
              values: religion_sectors.map((val) => val.ReligionName),
            },
            filter: "CustomFilter",
          };
        }
        if (value === "City") {
          return {
            field: value,
            headerName: model[1][index],
            width: 100,
            editable: true,
            cellEditor: CustomSelectCellEditor,
            cellEditorParams: {
              values: cities.map((val) => val.CityName),
              valueListMaxWidth: 120
            },
            filter: "CustomFilter",
          };
        }
        if (value === "Status") {
          return {
            field: value,
            headerName: model[1][index],
            width: 120, // הורחב פי 1.5 מ-80 ל-120
            editable: true,
            cellEditor: CustomSelectCellEditor,
            cellEditorParams: {
              values: statuses.map((val) => val.StatusName),
              valueListMaxWidth: 120
            },
            filter: "CustomFilter",
            cellRenderer: StatusBadgeRenderer,
            cellStyle: { display: 'flex', alignItems: 'center' }  
          };
        }
        if (value === "Schoolid") {
          return {
            field: value,
            headerName: model[1][index],
            width: 100,
            cellRenderer: ExpandMasterGridComponent,
            cellRendererParams: {
              grid_expanded: false,
            },
            cellEditor: "agTextCellEditor",
            rowDrag: false,
            filter: false,
            checkboxSelection: true,
            headerCheckboxSelection: true,
            headerCheckboxSelectionFilteredOnly: true,
            headerCheckboxSelectionCurrentPageOnly: true,
            lockVisible: true,
            sortable: true,
          };
        }
      if (value === "EducationStage") {
          return {
            field: value,
            headerName: model[1][index],
            width: 130, // הרחבתי קצת ל-130
            editable: true,
            cellEditor: CustomSelectCellEditor,
            singleClickEdit: true,
            cellEditorParams: {
              values: edustages.map((val) => val.StageName),
              valueListMaxWidth: 120
            },
            filter: "CustomFilter",
            
            // 👇 השינויים החדשים:
            cellRenderer: StatusBadgeRenderer,
            cellStyle: { display: 'flex', alignItems: 'center' } // במקום padding:0
          }
        }
        if (value === "SchoolType") {
          return {
            field: value,
            headerName: model[1][index],
            width: 100,
            editable: true,
            cellEditor: CustomSelectCellEditor,
            singleClickEdit: true,
            cellEditorParams: {
              values: schoolTypes.map((val) => val.TypeName),
              valueListMaxWidth: 120
            },
            filter: "CustomFilter",
          }
        }
        if (value === "Representive") {
          return {
            field: value,
            headerName: model[1][index],
            width: 160,
            editable: false,
            cellRenderer: "RepresentiveComponent",
            cellRendererParams: {
              AllContacts: contacts,
            },
            filter: "CustomFilter",
            cellEditorPopup: true,
            cellEditorPopupPosition: "under",
          };
        }
        if (value === "RepresentiveID") {
          return {
            field: value,
            hide: true,
            headerName: model[1][index],
            editable: false,
            cellEditor: "agSelectCellEditor",
          }
        }
        if (value === "Date") {
          return {
            field: value,
            headerName: model[1][index],
            width: 220,
            editable: true,
            singleClickEdit: true,
            cellDataType: 'date',
            cellEditor: CustomDateCellEditor,
            valueFormatter: valueFormatterDate,
            filter: "CustomFilter",
          }
        }
     if (value === "Remarks") {
          return {
            field: value,
            headerName: "הערות",
            width: 250,
            editable: true,
            cellEditor: "agTextCellEditor", // נשאר עורך רגיל של שורה אחת
            filter: "CustomFilter",
            tooltipValueGetter: (params: any) => params.value, // נשאר הטולטיפ שביקשת
            cellRenderer: (params: any) => {
              if (!params.value) return "";
              
              // זיהוי תבנית של שנתון דו-ספרתי בתוך סוגריים מרובעים (כמו [26]) בתחילת הטקסט
              const match = String(params.value).match(/^\[(\d{2})\]\s*(.*)$/);
              if (match) {
                const year = match[1];
                const text = match[2];
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "100%", width: "100%" }}>
                    <span style={{
                      backgroundColor: "#e2e8f0", 
                      color: "#334155", 
                      padding: "2px 6px", 
                      borderRadius: "6px", 
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      border: "1px solid #cbd5e1",
                      lineHeight: "1",
                      flexShrink: 0 // מונע מהבאדג' להתכווץ כשהטקסט ארוך
                    }}>
                      {year}
                    </span>
                    <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", display: "block" }}>
                      {text}
                    </span>
                  </div>
                );
              }
              // אם אין תווית שנתון, מציג את הטקסט רגיל אבל דואג שהשלוש נקודות יעבדו
              return (
                <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", display: "block", width: "100%" }}>
                  {params.value}
                </span>
              );
            }
          }
        }

        return {
          field: value,
          headerName: model[1][index],
          width: 150,
          editable: true,
          cellEditor: "agTextCellEditor",
          filter: "CustomFilter",
        };
      });

      return colDe;
    },
    [CustomDateCellEditor, valueFormatterDate]
  );

  const getAllData = useCallback(() => {
    return Promise.all([getAllSchools(), getAllReligionSectors(), getAllCities(), getModelFields("School"), getEducationStages(), getAllStatuses("Schools"), getAllContacts(), getAllSchoolsTypes(), getPrograms()])
  }, [])

  // 🔧 תיקון: תמיד שלוף מבסיס הנתונים במקום מ-Storage
  const onGridReady = async (event: GridReadyEvent) => {
    console.log("📊 GridInitialize: Fetching fresh data from database...");
    
    getAllData().then(
      ([schools, religion_sectors, cities, model, edustages, statuses, contacts, schoolTypes, programs]) => {
        console.log(`✅ Loaded ${schools.length} schools from database`);
        
        rowCount.current = schools.length;
        dataRowCount.current = schools.length;
        var colDef = GetDefaultDefinitions([religion_sectors, cities, model, edustages, statuses, contacts, schoolTypes]);

        setColDefs(colDef);
        setRowData(schools);
        setAllContacts(contacts)
        setAllPrograms(programs)
        maxIndex.current = schools.length > 0 ? Math.max(...schools?.map((val) => val.Schoolid)):0
        
        // עדכן את ה-Storage עם הנתונים העדכניים מבסיס הנתונים
        updateStorage({ 
          Schools: schools, 
          Religion: religion_sectors, 
          Cities: cities, 
          SchoolStatuses: statuses, 
          Stages: edustages, 
          SchoolTypes: schoolTypes, 
          schoolsContacts: contacts, 
          Tablemodel: model, 
          Programs: programs 
        }).then((res) => console.log('✅ Storage updated with fresh data from database'))
      }
    );
  };

  return { GetDefaultDefinitions: GetDefaultDefinitions, onGridReady: onGridReady }
}

export default useGridFunctions