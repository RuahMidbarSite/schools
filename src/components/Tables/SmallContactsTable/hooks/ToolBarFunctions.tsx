import { addContactRows, deleteContactsRows, deleteContactsRowsMini, updateContactColumn } from "@/db/contactsRequests";
import { SchoolsContact } from "@prisma/client";
import { RowNode } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { MutableRefObject, useCallback } from "react";
import { updateStorage } from "../Storage/SmallContactsDataStorage";
import RepresentiveComponent, { RepresentiveRef } from "../../GeneralFiles/GoogleContacts/ContactsRepComponent";



const useToolBarFunctions = (gridRef: MutableRefObject<AgGridReact<any>>, rowCount, dataRowCount, SetInTheMiddleOfAddingRows, validateFields, setDialogType, setDialogMessage, setOpen, setAmount, SchoolID, checkedAmount, AllContacts: SchoolsContact[], setRowData, setAllContacts, allContactsCount, SchoolApi, setAllSchoolContacts, setLoading, rowData, maxIndex) => {

  const onAddRowToolBarClick = useCallback(() => {
    gridRef.current?.api.applyTransaction({
      add: [
        {
          Contactid: maxIndex.current + 1,
          Role: "מנהל" + "\\" + "ת",
          IsRepresentive: false,
          Schoolid: SchoolID
        },
      ],
      // if you change this you need to also re-order how you check the nodes.
      addIndex: 0
    });
    maxIndex.current = maxIndex.current + 1
    rowCount.current++;
    allContactsCount.current++;

    SetInTheMiddleOfAddingRows(true);
    //activate( and therfore show) the update button and cancel button
    const element: any = document.getElementById("savechangesbutton-minicontacts".concat(' ', SchoolID));
    if (element !== null) {
      element.style.display = "block";
    }
    const element_2: any = document.getElementById("cancelchangesbutton-minicontacts".concat(' ', SchoolID));
    if (element_2 !== null) {
      element_2.style.display = "block";
    }
  }, [SchoolID, SetInTheMiddleOfAddingRows, allContactsCount, gridRef, maxIndex, rowCount]);
  const onCancelChangeButtonClick = useCallback(() => {



    let all_data: SchoolsContact[] = []

    gridRef.current.api.forEachNode((node: any) => {
      all_data.push(node.data)
    });
    let data_sorted = all_data.sort((arg1, arg2) => arg1.Contactid - arg2.Contactid)
    let prev_data = data_sorted.filter((entry, index) => index < dataRowCount.current)

    maxIndex.current = prev_data.length > 0 ? Math.max(...prev_data.map((contact) => contact.Contactid)) : 0

    setRowData(prev_data)

    // update so that there is no more rows unaccounted for in the database.
    rowCount.current = dataRowCount.current;
    allContactsCount.current = AllContacts?.length
    // hide the buttons.
    const element: any = document.getElementById("savechangesbutton-minicontacts".concat(' ', SchoolID));
    if (element !== null) {
      element.style.display = "none";
    }
    const element_2: any = document.getElementById("cancelchangesbutton-minicontacts".concat(' ', SchoolID));
    if (element_2 !== null) {
      element_2.style.display = "none";
    }

    SetInTheMiddleOfAddingRows(false);
  }, [gridRef, maxIndex, setRowData, rowCount, dataRowCount, allContactsCount, AllContacts?.length, SchoolID, SetInTheMiddleOfAddingRows]);

  const onSaveDeletions = useCallback((event) => {
    const ids: number[] = gridRef.current.api
      .getSelectedRows()
      .map((val: SchoolsContact) => val.Contactid);


    let table_data: SchoolsContact[] = []

    let after_deletion: SchoolsContact[] = []


    gridRef.current.api.forEachNode((node: any) => {
      table_data.push(node.data);
    });
    // 1. filter from all contacts what remains and their unique id - cellphone
    let filtered = AllContacts.filter((contact) => !!!ids.includes(contact.Contactid))
    let table_info = table_data.map((contact) => contact.Cellphone)

    let filtered_mapped = filtered

    //3 . What remains on the screen 
    let filtered_remained = filtered_mapped.filter((contact, index) => table_info.includes(contact.Cellphone))
    // 4. update what we see
    setAllContacts(filtered_mapped)
    setRowData(filtered_remained)

    maxIndex.current = filtered_mapped.length > 0 ? Math.max(...filtered_mapped.map((contact) => contact.Contactid)) : 0

    // 5. updates the contacts
    updateStorage({ schoolsContacts: filtered_mapped })

    //6. if one of the deleted rows was the represe ntive, we delete what is shown.
    const contact: SchoolsContact | undefined = gridRef.current.api
      .getSelectedRows().find((res: SchoolsContact) => res.IsRepresentive === true)
    if (contact) {
      const firstRowNode = SchoolApi.current.getDisplayedRowAtIndex(0);
      if (firstRowNode) {
        const params = { columns: ['Representive'], rowNodes: [firstRowNode] };
        const instances = SchoolApi.current.getCellRendererInstances(params);
        const cellRendererInstance: RepresentiveRef = instances[0] as RepresentiveRef

        cellRendererInstance.updateValue(undefined)

      }

    }
    //Test: Should change AllSchoolscontacts in MasterGrid which will set test when umnounted,
    // which should activate the use effect for Test in schooltable, which will update the contact component
    // with updated schoolsContacts.
    setAllSchoolContacts.current = filtered_mapped
    // this part is to update the shown datagrid, not the one when we retract the mastergrid.
    const coldefs = SchoolApi.current.getColumnDefs().map((column) => {
      if (column["field"] === "Representive") {
        return { ...column, cellRenderer: RepresentiveComponent, cellRendererParams: { AllContacts: [...filtered_mapped] } }
      }

      return column
    })
    SchoolApi.current.setGridOption("columnDefs", coldefs)

    setLoading(true)
    //6. delete what we need to delete
    deleteContactsRows(ids, filtered, filtered.map((contact) => contact.Contactid)).then((_) => {
      setLoading(false)
    })

    //7. update the amount of rows
    dataRowCount.current = filtered_remained.length
    rowCount.current = filtered_remained.length
    allContactsCount.current = filtered_mapped.length

    // update the checked amount.
    setAmount(0);
    gridRef.current.api.deselectAll()

    // if we deleted the representive, make it empty


    // hide delete button.
    const element: any = document.getElementById("savedeletions-mini".concat(' ', SchoolID));
    if (element !== null) {
      element.style.display = "none";
    }


  }, [AllContacts, SchoolApi, SchoolID, allContactsCount, maxIndex, dataRowCount, gridRef, rowCount, setAllContacts, setAllSchoolContacts, setAmount, setRowData, setLoading]);

  const onSaveChangeButtonClick = useCallback(() => {
    gridRef.current.api.stopEditing();


    let future_data: SchoolsContact[] = [];
    let newly_added: SchoolsContact[] = [];

    gridRef.current.api.forEachNode((node: any) => {
      future_data.push(node.data);
    });
    // handle the general case of any sorting
    let sorted_data: SchoolsContact[] = future_data.sort((arg1, arg2) => arg1.Contactid - arg2.Contactid)

    newly_added = sorted_data.filter((entry, index) => index >= dataRowCount.current)



    // validation

    let n = newly_added.length;
    for (let i = 0; i < n; i++) {
      if (!validateFields(newly_added[i], i)) {
        return;
      }
    }

    setDialogType("success");
    setDialogMessage("אנשי קשר נוספו בהצלחה");
    setOpen(true);


    // add the rows after validation
    addContactRows(newly_added);
    dataRowCount.current += newly_added.length

    const find_if_new_rep = newly_added.find((contact: SchoolsContact) => contact.IsRepresentive === true)
    if (find_if_new_rep) {
      const firstRowNode = SchoolApi.current.getDisplayedRowAtIndex(0);
      const params = { columns: ['Representive'], rowNodes: [firstRowNode] };
      const instances = SchoolApi.current.getCellRendererInstances(params);
      const cellRendererInstance: RepresentiveRef = instances[0] as RepresentiveRef

      cellRendererInstance.updateValue(find_if_new_rep)

      let other_rows_data: SchoolsContact[] = [...rowData, ...newly_added]
      let indexes = other_rows_data.map((val) => val.Contactid)
      const allContactsFiltered = AllContacts.filter((contact) => !indexes.includes(contact.Contactid))
      other_rows_data = other_rows_data.map((contact) => {
        const allContactsEntry = AllContacts.findIndex((cont) => cont.Contactid === contact.Contactid)

        let new_contact = { ...contact }
        // if it is the old contact
        if (new_contact.IsRepresentive === true && find_if_new_rep.Contactid !== new_contact.Contactid) {
          updateContactColumn(
            "IsRepresentive",
            false,
            new_contact.Contactid
          );
        }
        if (new_contact.Contactid === find_if_new_rep.Contactid) {
          new_contact['IsRepresentive'] = true
        } else {
          new_contact['IsRepresentive'] = false
        }
        AllContacts[allContactsEntry] = new_contact
        return new_contact

      })
      const newContacts = [...allContactsFiltered, ...other_rows_data].sort((arg1: SchoolsContact, arg2: SchoolsContact) => arg1.Contactid - arg2.Contactid)
      setAllContacts(newContacts)
      setAllSchoolContacts.current = newContacts
      setRowData(other_rows_data.sort((arg1, arg2) => arg1.Contactid - arg2.Contactid))
      updateStorage({ schoolsContacts: newContacts })
    } else {
      let updated_data: SchoolsContact[] = [...rowData, ...newly_added]
      let indexes = updated_data.map((val) => val.Contactid)
      const allContactsFiltered = AllContacts.filter((contact) => !indexes.includes(contact.Contactid))

      setRowData([...updated_data].sort((arg1, arg2) => arg1.Contactid - arg2.Contactid))

      const updatedAllContacts = [...allContactsFiltered, ...updated_data].sort((arg1, arg2) => arg1.Contactid - arg2.Contactid)
      maxIndex.current = updatedAllContacts.length > 0 ? Math.max(...updatedAllContacts.map((contact) => contact.Contactid)) : 0
      setAllContacts([...updatedAllContacts])
      setAllSchoolContacts.current = updatedAllContacts
      updateStorage({ schoolsContacts: updatedAllContacts })
    }



    // no longer in adding rows mode.
    SetInTheMiddleOfAddingRows(false);

    gridRef.current.api.deselectAll()
    const element: any = document.getElementById("savechangesbutton-minicontacts".concat(' ', SchoolID));
    if (element !== null) {
      element.style.display = "none";
    }
    const element_2: any = document.getElementById("cancelchangesbutton-minicontacts".concat(' ', SchoolID));
    if (element_2 !== null) {
      element_2.style.display = "none";
    }


    const google_new_contacts_event: any = { type: "New_Contacts", data: newly_added, targets: newly_added.map((val) => val.Contactid) }
    gridRef.current.api.dispatchEvent(google_new_contacts_event)







  }, [AllContacts, SchoolApi, SchoolID, SetInTheMiddleOfAddingRows, dataRowCount, gridRef, maxIndex, rowData, setAllContacts, setAllSchoolContacts, setDialogMessage, setDialogType, setOpen, setRowData, validateFields]);

  const onFilterTextBoxChanged = useCallback(() => {
    gridRef.current?.api.setGridOption(
      "quickFilterText",
      (document.getElementById("filter-text-box-mini".concat(' ', SchoolID)) as HTMLInputElement).value
    );
  }, [SchoolID, gridRef]);
  const onClearFilterButtonClick = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setFilterModel(null);
      gridRef.current.api.setGridOption("quickFilterText", "")
    }
    const filterInput = document.getElementById("filter-text-box-mini".concat(' ', SchoolID)) as HTMLInputElement;
    if (filterInput) {
      filterInput.value = "";
    }
  }, [SchoolID, gridRef]);

  const DeleteCheckedAmountText = useCallback(() => { const T = "מחק " + checkedAmount + " שורות"; return T }, [checkedAmount])


  return { onClearFilterButtonClick: onClearFilterButtonClick, onAddRowToolBarClick: onAddRowToolBarClick, onSaveChangeButtonClick: onSaveChangeButtonClick, onCancelChangeButtonClick: onCancelChangeButtonClick, onSaveDeletions: onSaveDeletions, onFilterTextBoxChanged: onFilterTextBoxChanged, DeleteCheckedAmountText: DeleteCheckedAmountText }

}

export default useToolBarFunctions