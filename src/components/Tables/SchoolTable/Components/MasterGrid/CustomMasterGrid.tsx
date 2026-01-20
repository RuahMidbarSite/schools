import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "ag-grid-community/styles/ag-grid.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { GetRowIdParams, GridApi } from "ag-grid-community";
import SmallContactsTable from "@/components/Tables/SmallContactsTable/SmallContactsTable"
import { School, SchoolsContact } from "@prisma/client";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import { ThemeContext } from "@/context/Theme/Theme";
import { CustomSelect } from "@/components/Tables/GeneralFiles/Select/CustomSelect";
import CustomFilter from "@/components/Tables/GeneralFiles/Filters/CustomFilter";
import RepresentiveComponent, { RepresentiveRef } from "@/components/Tables/GeneralFiles/GoogleContacts/ContactsRepComponent";
import { updateSchoolsColumn } from "@/db/schoolrequests";

interface MasterGridRendererProps extends CustomCellRendererProps<School> {
  UpdateContactComponent: any;
  GoogleFunctions: any;
  deleteContact?: (data: any[]) => Promise<void>;
}

export const CustomMasterGrid = ({ UpdateContactComponent, GoogleFunctions, deleteContact, ...props }: MasterGridRendererProps) => {
  const { theme } = useContext(ThemeContext);
  
  const schoolApi = useRef<GridApi>(null);
  const InnerSchoolApi = useRef<GridApi>(null);
  const AllContacts = useRef<SchoolsContact[]>([]);
  
  const row = useMemo(() => [props.data], [props.data]);
  
  const [expanded, setExpanded] = useState(props.node.expanded);

  const coldefs = useMemo(() => {
    return props.api.getColumnDefs().map((column) => {
      
      if (column["field"] === "Schoolid") {
        return { 
            ...column, 
            cellRendererParams: { 
                grid_expanded: true, 
                father_expanded_node_set: (boolean) => props.node.setExpanded(boolean), 
                father_redrawRows: () => props.api.redrawRows(), 
                father_node_set_row_height: (number) => (props.node.setRowHeight(number)) 
            } 
        }
      }

      if (column["field"] === "Representive") {
        return {
            ...column,
            cellRendererParams: {
                ...(column.cellRendererParams || {}),
                GoogleFunctions: GoogleFunctions
            }
        }
      }

      return column;
    });
  }, [props.api, props.node, GoogleFunctions]);

  useEffect(() => {
    return () => {
      if (AllContacts.current) {
          UpdateContactComponent(AllContacts.current);
      }
    };
  }, [UpdateContactComponent]);

  const components = useMemo(
    () => ({
      CustomSelect: CustomSelect,
      CustomFilter: CustomFilter,
      RepresentiveComponent: RepresentiveComponent,
    }),
    []
  );

  const onCellValueChanged = useCallback((event) => {
    updateSchoolsColumn(
      event.column.getColId(),
      event.newValue,
      event.data.Schoolid
    );
  }, []);

  const getRowId = useCallback(
    (params: GetRowIdParams<any>) => params.data.Schoolid,
    []
  );

  return (
    <div className="relative">
      <div
        id={"gridmaster-".concat(String(props.data.Schoolid))}
        className={theme === "dark-theme" ? "ag-theme-quartz-dark" : "ag-theme-quartz overflow-visible"}
        // 👇 שינוי: גובה קבוע של 60px (42 לשורה + 18 לגלילה)
        style={{ width: "100%", height: "60px" }}
      >
        <AgGridReact
          // 👇 מחקנו את domLayout="autoHeight" שגרם לרווח הענק
          rowData={row}
          columnDefs={coldefs}
          headerHeight={0}
          singleClickEdit={true}
          enableRtl={true}
          suppressRowTransform={true}
          suppressMenuHide={true}
          components={components}
          onGridReady={(params) => schoolApi.current = params.api}
          onCellValueChanged={onCellValueChanged}
          getRowId={getRowId}
          // 👇 מוודא שהפס גלילה יופיע רק כשבאמת צריך
          scrollbarWidth={8} 
        />

        <div
          id={"gridmastercontacts-".concat(String(props.data.Schoolid))}
          className={theme === "dark-theme" ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
          style={{ width: "100%", height: "500px", position: "relative" }}
        >
          <SmallContactsTable 
            SchoolID={props.data.Schoolid} 
            SchoolApi={schoolApi} 
            setAllSchoolContacts={AllContacts}
            GoogleFunctions={GoogleFunctions}
            deleteContact={deleteContact}
          />
        </div>
      </div>
    </div>
  );
};