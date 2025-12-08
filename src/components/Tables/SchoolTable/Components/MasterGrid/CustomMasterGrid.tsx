import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
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
  UpdateContactComponent: any

}

export const CustomMasterGrid = ({ UpdateContactComponent, ...props }: MasterGridRendererProps) => {
  const schoolApi = useRef<GridApi>(null)
  const InnerSchoolApi = useRef<GridApi>(null)
  const row: School[] = [props.data]
  const AllContacts = useRef<SchoolsContact[]>([])

  const coldefs = props.api.getColumnDefs().map((column) => {
    if (column["field"] === "Schoolid") {
      return { ...column, cellRendererParams: { grid_expanded: true, father_expanded_node_set: (boolean) => props.node.setExpanded(boolean), father_redrawRows: () => props.api.redrawRows(), father_node_set_row_height: (number) => (props.node.setRowHeight(number)) } }
    }
    return column
  })

  const { node, value } = props;
  const [expanded, setExpanded] = useState(node.expanded);
  const { theme } = useContext(ThemeContext)

  

  useEffect(() => {

    return () => {

      UpdateContactComponent(AllContacts!.current)

    };


  }, [AllContacts, UpdateContactComponent]);


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


  }, [])

  const getRowId = useCallback(
    (params: GetRowIdParams<any>) => params.data.Schoolid,
    []
  );
  return (
    <div className="relative">



      {/* Top Ag-Grid */}
      <div
        id={"gridmaster-".concat(String(props.data.Schoolid))}
        className={theme === "dark-theme" ? "ag-theme-quartz-dark" : "ag-theme-quartz overflow-visible"}
        style={{ width: "100%", height: "100px" }}
      >
        <AgGridReact

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
          getRowId={ getRowId}
        />

        <div
          id={"gridmastercontacts-".concat(String(props.data.Schoolid))}
          className={theme === "dark-theme" ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
          style={{ width: "100%", height: "500px", position: "relative" }}
        >
          <SmallContactsTable SchoolID={props.data.Schoolid} SchoolApi={schoolApi} setAllSchoolContacts={AllContacts} />
        </div>

      </div>
    </div>

  );
};


//   <div className="relative">
//   {/* Top Ag-Grid */}
//   <div
//     id={"gridmaster-".concat(String(props.data.Schoolid))}
//     className={theme === "dark-theme" ? "ag-theme-quartz-dark overflow-visible" : "ag-theme-quartz overflow-visible"}
//     style={{ width: "100%", height: "100px", zIndex: 5, overflow: "visible", position: "absolute" }}
//   >
//     <AgGridReact
//       rowData={row}
//       columnDefs={coldefs}
//       headerHeight={0}
//       singleClickEdit={true}
//       enableRtl={true}
//       suppressRowTransform={true}
//       suppressMenuHide={true}
//       components={components}
//     />
//   </div>

//   {/* Bottom Ag-Grid */}
//   <div
//     id={"gridmastercontacts-".concat(String(props.data.Schoolid))}
//     className={theme === "dark-theme" ? "ag-theme-quartz-dark" : "ag-theme-quartz"}
//     style={{ width: "100%", height: "500px", position: "relative", top: 50, zIndex: 1 }}
//   >
//     <SmallContactsTable SchoolID={props.data.Schoolid} SchoolApi={props.api} />
//   </div>
// </div>
