import { updateSchoolsColumn } from "@/db/schoolrequests";
import { School } from "@prisma/client";
import { CellEditingStartedEvent, CellValueChangedEvent, ICellRenderer, RowSelectedEvent, SelectionChangedEvent } from "ag-grid-community";
import { useCallback } from "react";
import { updateStorage } from "../Storage/SchoolDataStorage";
import { RepresentiveRef } from "../../GeneralFiles/GoogleContacts/ContactsRepComponent";



const useGridEvents = (gridRef, InTheMiddleOfAddingRows, checkedAmount, setAmount) => {


  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<School>) => {
      if (event.oldValue === event.newValue) {
        return;
      }
      if (!InTheMiddleOfAddingRows) {
        updateSchoolsColumn(
          event.column.getColId(),
          event.newValue,
          event.data.Schoolid
        );

        const future_data: School[] = [];
        gridRef.current.api.forEachNode((node: any) => {
          if (node.data) {
            future_data.push(node.data);
          }
        });

        updateStorage({ Schools: future_data.sort((arg1, arg2) => arg1.Schoolid - arg2.Schoolid) })

      }
    },
    [InTheMiddleOfAddingRows, gridRef]
  );

  const onCellEditingStarted = (event: CellEditingStartedEvent) => {




  };

  const onRowSelected = useCallback(
    (event: RowSelectedEvent) => {

    },
    []
  );

  const onSelectionChange = useCallback(
    (event: SelectionChangedEvent) => {
      // hide or show the delete button
      const selectedRowsAmount: number = event.api.getSelectedRows().length
      setAmount(selectedRowsAmount)
      const element: any = document.getElementById("savedeletions");
      if (element !== null) {
        selectedRowsAmount > 0 && !InTheMiddleOfAddingRows
          ? (element.style.display = "block")
          : (element.style.display = "none");
      }
    },
    [InTheMiddleOfAddingRows, setAmount]
  );
  const isRowSelectable = useCallback(
    (rowNode: any) => {
      return !InTheMiddleOfAddingRows;
    },
    [InTheMiddleOfAddingRows]
  );



  return { onCellValueChanged: onCellValueChanged, onCellEditingStarted: onCellEditingStarted, onRowSelected: onRowSelected, onSelectionChange: onSelectionChange, isRowSelectable: isRowSelectable }



}

export default useGridEvents