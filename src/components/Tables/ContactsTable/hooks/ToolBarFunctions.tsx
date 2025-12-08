import { addContactRows, deleteContactsRows } from "@/db/contactsRequests";
import { SchoolsContact } from "@prisma/client";
import { AgGridReact } from "ag-grid-react";
import { MutableRefObject, useCallback } from "react";
import { updateStorage } from "../Storage/BigContactsDataStorage";


const useToolBarFunctions = (gridRef: MutableRefObject<AgGridReact<any>>, rowCount, dataRowCount, SetInTheMiddleOfAddingRows, validateFields, setDialogType, setDialogMessage, setOpen, setAmount, modifiedRowRef,maxIndex) => {

  const onClearFilterButtonClick = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setFilterModel(null);
      gridRef.current.api.setGridOption("quickFilterText", "")
    }
    const filterInput = document.getElementById("filter-text-box") as HTMLInputElement;
    if (filterInput) {
      filterInput.value = "";
    }
  }, [gridRef]);

  const onFilterTextBoxChanged = useCallback(() => {
    gridRef.current?.api.setGridOption(
      "quickFilterText",
      (document.getElementById("filter-text-box") as HTMLInputElement).value
    );
  }, [gridRef]);

  const onAddRowToolBarClick = useCallback(() => {
    gridRef.current?.api.applyTransaction({
      add: [
        {
          Contactid: maxIndex.current + 1,
          Role: "מנהל" + "\\" + "ת",
          IsRepresentive: false,
        },
      ],
      addIndex: 0
    });
   maxIndex.current = maxIndex.current+1
    rowCount.current++;
    SetInTheMiddleOfAddingRows(true);
    // activate( and therfore show) the update button and cancel button
    const element: any = document.getElementById("savechangesbutton-contacts");
    if (element !== null) {
      element.style.display = "block";
    }
    const element_2: any = document.getElementById("cancelchangesbutton-contacts");
    if (element_2 !== null) {
      element_2.style.display = "block";
    }
  }, [SetInTheMiddleOfAddingRows, gridRef, maxIndex, rowCount]);

  const onSaveChangeButtonClick = useCallback(() => {
    gridRef.current.api.stopEditing();
    const colAmount: number = rowCount.current - dataRowCount.current;

    const current_data: SchoolsContact[] = [];
    const future_data: SchoolsContact[] = [];
    const newly_added: SchoolsContact[] = [];
    var count = 0;

    const phoneNumbers = []
    gridRef.current.api.forEachNode((node) => {
      if (node.data?.Cellphone !== modifiedRowRef.current?.Cellphone && node.data.Cellphone!=='') {
        phoneNumbers.push(node.data.Cellphone)
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

    let n = newly_added.length;

    for (let i = 0; i < n; i++) {
      if (!validateFields(newly_added[i], rowCount.current + i, phoneNumbers)) {
        return;
      }
    }
    setDialogType("success");
    setDialogMessage("אנשי קשר נוספו בהצלחה");
    setOpen(true);

    console.log("newly_added: ", newly_added);
    addContactRows(newly_added);

    // update the Row count in the database and hide the buttons.
    dataRowCount.current = rowCount.current;
    const element: any = document.getElementById("savechangesbutton-contacts");
    if (element !== null) {
      element.style.display = "none";
    }
    const element_2: any = document.getElementById("cancelchangesbutton-contacts");
    if (element_2 !== null) {
      element_2.style.display = "none";
    }
    // no longer in adding rows mode.
    SetInTheMiddleOfAddingRows(false);

    // Send Event so that the contact component will add the new google contact at GoogleContactComponent.tsx
    const google_new_contacts_event: any = { type: "New_Contacts", data: newly_added }
    gridRef.current.api.dispatchEvent(google_new_contacts_event)
    gridRef.current.api!.applyColumnState({
      state: [{ colId: "Contactid", sort: "asc" }],
      defaultState: { sort: null }
    })

      maxIndex.current =future_data.length > 0 ? Math.max(...future_data.map((contact)=>contact.Contactid)):0

    updateStorage({ schoolsContacts: future_data.sort((arg1, arg2) => arg1.Contactid - arg2.Contactid) })
    gridRef.current.api.deselectAll()
  }, [SetInTheMiddleOfAddingRows, dataRowCount, gridRef, modifiedRowRef,maxIndex, rowCount, setDialogMessage, setDialogType, setOpen, validateFields]);

  const onCancelChangeButtonClick = useCallback(() => {
    const prev_data: SchoolsContact[] = [];
    var count = 0
    gridRef.current.api.forEachNode((node: any) => {
      // Right now, a new row is added at the top and forEachNode goes through the order that appears in the table.
      if (count >= rowCount.current - dataRowCount.current) {
        prev_data.push(node.data);
      }
      count++;
    });
maxIndex.current = prev_data.length > 0 ? Math.max(...prev_data.map((contact)=>contact.Contactid)):0
    gridRef.current.api.setGridOption("rowData", prev_data)
    
    // update so that there is no more rows unaccounted for in the database.
    rowCount.current = dataRowCount.current;

    // hide the buttons.
    const element: any = document.getElementById("savechangesbutton-contacts");
    if (element !== null) {
      element.style.display = "none";
    }
    const element_2: any = document.getElementById("cancelchangesbutton-contacts");
    if (element_2 !== null) {
      element_2.style.display = "none";
    }

    SetInTheMiddleOfAddingRows(false);

  }, [SetInTheMiddleOfAddingRows, dataRowCount, gridRef, rowCount]);

  const onSaveDeletions = useCallback(() => {
    const ids: number[] = gridRef.current.api
      .getSelectedRows()
      .map((val: SchoolsContact) => val.Contactid);

    // this is what will remain after the deletion.
    const updated_data: SchoolsContact[] = [];

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
      if (!ids.includes(node.data.Contactid)) {
        const new_data: SchoolsContact = { ...node.data, Contactid: index + 1 }
        updated_data.push(new_data);
        index += 1
      }
    });
    
    gridRef.current.api.setGridOption("rowData", updated_data)
    maxIndex.current = Math.max(...updated_data.map((contact)=>contact.Contactid))
    deleteContactsRows(ids, updated_data, id_range);
    // update the amount of rows
    dataRowCount.current -= ids.length;
    rowCount.current -= ids.length;
    // update the checked amount.
    setAmount(0);
    // hide delete button.
    const element: any = document.getElementById("savedeletions");
    if (element !== null) {
      element.style.display = "none";
    }

    updateStorage({ schoolsContacts: updated_data.sort((arg1, arg2) => arg1.Contactid - arg2.Contactid) })
    gridRef.current.api.deselectAll()
  }, [dataRowCount, gridRef, rowCount, setAmount]);

  return { onClearFilterButtonClick: onClearFilterButtonClick, onAddRowToolBarClick: onAddRowToolBarClick, onSaveChangeButtonClick: onSaveChangeButtonClick, onCancelChangeButtonClick: onCancelChangeButtonClick, onSaveDeletions: onSaveDeletions, onFilterTextBoxChanged: onFilterTextBoxChanged }

}

export default useToolBarFunctions