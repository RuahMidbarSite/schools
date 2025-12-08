import { updateContactColumn } from "@/db/contactsRequests";
import { SchoolsContact } from "@prisma/client";
import { CellEditingStartedEvent, CellValueChangedEvent, GetRowIdParams, IRowNode, RowClassParams, RowSelectedEvent, RowStyle, SelectionChangedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Dispatch, MutableRefObject, SetStateAction, useCallback } from "react";
import { updateStorage } from "../Storage/SmallContactsDataStorage";
import { RepresentiveRef } from "../../GeneralFiles/GoogleContacts/ContactsRepComponent";


const useGridEvents = (gridRef: MutableRefObject<AgGridReact<any>>, InTheMiddleOfAddingRows, setAmount, checkedAmount, SchoolApi, SchoolID, setAllContacts, AllContacts: SchoolsContact[], setAllSchoolContacts: any, setRowData: Dispatch<SetStateAction<SchoolsContact[] | undefined>>, rowData: SchoolsContact[]) => {

  const onCellValueChanged = useCallback(
    async (event: CellValueChangedEvent<SchoolsContact>) => {
      if (event.oldValue === event.newValue || InTheMiddleOfAddingRows) {

        return;
      }

      updateContactColumn(
        event.column.getColId(),
        event.newValue,
        event.data.Contactid
      );



      // this is used to update the contact at CustomLinkContact.tsx
      const google_update_event: any = { type: "Contact_Update", data: event }
      event.api.dispatchEvent(google_update_event)


      const future_data: SchoolsContact[] = [];
      let updated_contacts: SchoolsContact[] = []
      for (let contact of AllContacts) {
        if (contact.Contactid === event.data.Contactid && contact.Schoolid === event.data.Schoolid) {
          let new_contact: SchoolsContact = { ...contact, IsRepresentive: event.newValue }
          updated_contacts.push(new_contact)
        } else if (contact.Schoolid === event.data.Schoolid) {
          let new_contact: SchoolsContact = { ...contact, IsRepresentive: false }
          updated_contacts.push(new_contact)
        } else {
          updated_contacts.push(contact)
        }
      }
      // we are making sure not to use the updated values after this event
      // for example, if we made a rep true, then it will be true in the node but want to handle it now before it is true
      let contacts_mini = rowData

      if (event.colDef.field === "IsRepresentive") {
        // the small contacts we create is always only the first row.
        const firstRowNode = SchoolApi.current.getDisplayedRowAtIndex(0);
        if (firstRowNode) {
          const params = { columns: ['Representive'], rowNodes: [firstRowNode] };
          const instances = SchoolApi.current.getCellRendererInstances(params);
          const cellRendererInstance: RepresentiveRef = instances[0] as RepresentiveRef

          const rep: SchoolsContact = contacts_mini.find((contact: SchoolsContact) => {
            if (event.data.Contactid === contact.Contactid && event.oldValue === true && event.newValue === false) {
              return true
            } else if (contact.IsRepresentive && contact.Contactid !== event.data.Contactid) {
              return true
            }
            return false

          })

          // if we made it so there are no contacts
          if (rep && rep.Contactid === event.data.Contactid) {
            cellRendererInstance.updateValue(undefined)
            const updated_contacts_row = rowData.map((contact) => {
              contact['IsRepresentive'] = false
              return contact
            })
            setRowData([...updated_contacts_row])

            // replace the reps
          } else if (rep && rep.Contactid !== event.data.Contactid) {
            cellRendererInstance.updateValue(event.data)
            const updated_contacts_row = rowData.map((contact) => {
              let new_contact = contact
              if (contact.Contactid == event.data.Contactid) {
                new_contact.IsRepresentive = true
                return new_contact

              } else {
                // we make sure the previous rep is not chosen
                if (new_contact.IsRepresentive) {
                  updateContactColumn(
                    event.column.getColId(),
                    false,
                    new_contact.Contactid
                  );
                }
                new_contact.IsRepresentive = false

                return new_contact
              }

            })

            setRowData([...updated_contacts_row])

          } else if (typeof rep === "undefined" && event.newValue === true) {
            cellRendererInstance.updateValue(event.data)
            const updated_contacts_row = rowData.map((contact) => {
              let new_contact = contact
              if (contact.Contactid === event.data.Contactid) {

                new_contact['IsRepresentive'] = true
                return new_contact
              } else {
                new_contact['IsRepresentive'] = false
                return new_contact
              }

            })
            setRowData([...updated_contacts_row])
            

          }



        }


      }
      else if (event.colDef.field === "FirstName" && event.data.IsRepresentive === true || event.colDef.field === "Role" && event.data.IsRepresentive === true) {
        const firstRowNode = SchoolApi.current.getDisplayedRowAtIndex(0);
        if (firstRowNode) {
          const params = { columns: ['Representive'], rowNodes: [firstRowNode] };
          const instances = SchoolApi.current.getCellRendererInstances(params);
          const cellRendererInstance: RepresentiveRef = instances[0] as RepresentiveRef

          const rep: SchoolsContact = contacts_mini.find((contact: SchoolsContact) => {
            if (contact.Contactid === event.data.Contactid) { return true }
            return false

          })
          if (rep) {
            cellRendererInstance.updateValue(rep)
          }

        }


        updateContactColumn(
          event.column.getColId(),
          event.newValue,
          event.data.Contactid
        );




      }
      //Test: Should change AllSchoolscontacts in MasterGrid which will set test when umnounted,
      // which should activate the use effect for Test in schooltable, which will update the contact component
      // with updated schoolsContacts.

      setAllSchoolContacts.current = updated_contacts
      updateStorage({ schoolsContacts: updated_contacts.sort((arg1, arg2) => arg1.Schoolid - arg2.Schoolid) })
    }, [InTheMiddleOfAddingRows, rowData, setAllSchoolContacts, AllContacts, SchoolApi, setRowData]
  );





  const onRowSelected = useCallback(
    (event: RowSelectedEvent) => {
      return
    },
    []
  );
  const onSelectionChange = useCallback(
    (event: SelectionChangedEvent) => {
      const selectedRowsAmount: number = event.api.getSelectedRows().length
      setAmount(selectedRowsAmount)
      // hide or show the delete button
      const element: any = document.getElementById("savedeletions-mini".concat(' ', SchoolID));
      if (element !== null) {
        event.api.getSelectedRows().length > 0 && !InTheMiddleOfAddingRows
          ? (element.style.display = "block")
          : (element.style.display = "none");
      }
    },
    [InTheMiddleOfAddingRows, SchoolID, setAmount]
  );
  const isRowSelectable = useCallback(
    (rowNode: any) => !InTheMiddleOfAddingRows,
    [InTheMiddleOfAddingRows]
  );

  const getRowId = useCallback(
    (params: GetRowIdParams<any>) => params.data.Contactid,
    []
  );
  return { onCellValueChanged: onCellValueChanged, onRowSelected: onRowSelected, onSelectionChange: onSelectionChange, isRowSelectable: isRowSelectable, getRowId: getRowId }


}

export default useGridEvents