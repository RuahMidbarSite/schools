import { updateSchoolsColumn } from "@/db/schoolrequests";
import { School } from "@prisma/client";
import { CellEditingStartedEvent, CellValueChangedEvent, ICellRenderer, RowSelectedEvent, SelectionChangedEvent } from "ag-grid-community";
import { useCallback } from "react";
import { updateStorage } from "../Storage/SchoolDataStorage";
import { RepresentiveRef } from "../../GeneralFiles/GoogleContacts/ContactsRepComponent";



const useGridEvents = (gridRef, InTheMiddleOfAddingRows, checkedAmount, setAmount) => {


  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<School>) => {
      console.log("💥 [GridEvents] Master onCellValueChanged fired!", {
        field: event.column?.getColId(),
        old: event.oldValue,
        new: event.newValue
      });

      if (event.oldValue === event.newValue) {
        return;
      }
      if (!InTheMiddleOfAddingRows) {
        let finalValue = event.newValue;

        // טיפול בהוספת תווית השנה בפורמט דו-ספרתי לעמודת ההערות
        if (event.column.getColId() === "Remarks" && finalValue) {
          const currentYear = String(new Date().getFullYear()).slice(-2);
          const yearTag = `[${currentYear}]`;
          
          if (!String(finalValue).includes(yearTag)) {
            finalValue = `${yearTag} ${finalValue}`;
            event.data.Remarks = finalValue;
            event.api.refreshCells({ rowNodes: [event.node], columns: ["Remarks"] });
          }
        }

        updateSchoolsColumn(
          event.column.getColId(),
          finalValue,
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