"use client";
import { ProgramPricing} from "@prisma/client"; // look at this type to know the fields in the table.
import {
  useState,
  useRef,
  useContext
} from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
import "ag-grid-community/styles/ag-grid.css";
import "bootstrap/dist/css/bootstrap.min.css";
import {
   getPricingData
} from "@/db/generalrequests";
import {
   getModelFields
} from "@/db/generalrequests"

import {

  SizeColumnsToContentStrategy,
} from "ag-grid-community";
import { ThemeContext } from "@/context/Theme/Theme";




export default  function PricingTable() {

 
   const gridApiRef = useRef(null);

    // Row Data: The data to be displayed.
  const [rowData, setRowData]: any = useState("");

  // Column Definitions: Defines & controls grid columns.
  const [colDefs, setColDefs]: any = useState("");

  const autoSizeStrategy: SizeColumnsToContentStrategy = {
   type: "fitCellContents",
 };
   const {theme} = useContext(ThemeContext)

  const CustomNoRowsOverlay =useCallback(() => {
  return (
    <div className="ag-overlay-no-rows-center">
      <span>Custom no rows message, please add data!</span>
    </div>
  );
},[])
  

   const onGridReady = async () => { 
      const Pricing = await getPricingData();
      const PricingRows = Object.entries(Pricing)?.map((val) => val[1]);
      console.log("PricingRows", PricingRows);
      const model: any = await getModelFields("ProgramPricing");
      console.log("Pricing model", model);

      const colDef = [
         ...model[0]?.map((value: any, index: any) => ({
            field: value,
            headerName: model[1][index],
            editable: true,
            cellEditor: "agSelectCellEditor",
            
         })),
       ];
       
       setColDefs(colDef);
       setRowData(PricingRows)
   }
   
   return (
      <div
         className={theme==="dark-theme"?"ag-theme-quartz-dark":"ag-theme-quartz"}
         style={{ width: "100%", height: "1000px" }}
      >
         <AgGridReact
             noRowsOverlayComponent={ CustomNoRowsOverlay}
            ref={gridApiRef}
            rowData={rowData}
            columnDefs={colDefs}
            rowSelection="multiple"
            enableRtl={true}
            onGridReady={onGridReady}
            autoSizeStrategy={autoSizeStrategy}
         />
      </div>
    );

}

function useCallback(arg0: () => import("react").JSX.Element, arg1: undefined[]) {
   throw new Error("Function not implemented.");
}
