import { updateContactColumn } from "@/db/contactsRequests";
import { SchoolsContact } from "@prisma/client";
import { CellEditingStartedEvent, CellValueChangedEvent, GetRowIdParams, RowClassParams, RowSelectedEvent, RowStyle, SelectionChangedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { MutableRefObject, useCallback } from "react";
import { updateStorage } from "../Storage/BigContactsDataStorage";


const useGridEvents = (gridRef:MutableRefObject<AgGridReact<any>>,InTheMiddleOfAddingRows,setAmount,checkedAmount,modifiedRowRef) => {

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<SchoolsContact>) => {
      modifiedRowRef.current = event.data;
      if (event.oldValue === event.newValue || InTheMiddleOfAddingRows) {

        return;
      }
      updateContactColumn(
        event.column.getColId(),
        event.newValue,
        event.data.Contactid
      );

      // if (smallTable && event.colDef.field === "IsRepresentive") {
      //   const updated_event: any = { type: "UpdatedRep", data: event };

      //   schoolGridRef.dispatchEvent(updated_event);
      // }
      // this is used to update the contact at CustomLinkContact.tsx
       const google_update_event:any = {type:"Contact_Update", data:event}
       event.api.dispatchEvent(google_update_event)

 
      const future_data: SchoolsContact[] = [];
      gridRef.current.api.forEachNode((node: any) => {
        future_data.push(node.data);
      });

      updateStorage({schoolsContacts:future_data.sort((arg1,arg2)=>arg1.Contactid-arg2.Contactid),})

    },
    [InTheMiddleOfAddingRows, gridRef, modifiedRowRef]
  );
  
  const onCellEditingStarted = (event: CellEditingStartedEvent) => { };

   const onRowSelected = useCallback(
    (event: RowSelectedEvent) => {
       return
    },
    []
  );


   const onSelectionChange = useCallback(
    (event: SelectionChangedEvent) => {
      // hide or show the delete button
       const selectedRowsAmount:number =event.api.getSelectedRows().length
      setAmount(selectedRowsAmount)
      const element: any = document.getElementById("savedeletions");
      if (element !== null) {
        event.api.getSelectedRows().length > 0 && !InTheMiddleOfAddingRows
          ? (element.style.display = "block")
          : (element.style.display = "none");
      }
    },
    [InTheMiddleOfAddingRows, setAmount]
  );

  
  const isRowSelectable = useCallback(
    (rowNode: any) => !InTheMiddleOfAddingRows,
    [InTheMiddleOfAddingRows]
  );

    const getRowStyles = useCallback(function getRowStyless(
    params: RowClassParams<any, any>
  ): RowStyle | undefined {
    if (params.node.expanded) {
      params.node.setRowHeight(325);
    } else if (!params.node.expanded && params.node.rowHeight === 325) {
      params.node.setRowHeight(40);
    }

    return {};
  },
    []);

  const getRowId = useCallback(
    (params: GetRowIdParams<any>) => params.data.Contactid,
    []
  );
  return {onCellValueChanged:onCellValueChanged,onCellEditingStarted:onCellEditingStarted,onRowSelected:onRowSelected,onSelectionChange:onSelectionChange,isRowSelectable:isRowSelectable,getRowStyles:getRowStyles,getRowId:getRowId, modifiedRowRef}
    

}

export default useGridEvents