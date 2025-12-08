"use client"
import { getContact, getSchoolContacts, updateContactColumn } from "@/db/contactsRequests";
import { updateSchoolsColumn } from "@/db/schoolrequests";
import { School, SchoolsContact } from "@prisma/client";
import { CellValueChangedEvent, ICellRendererParams, IRowNode } from "ag-grid-community";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { updateStorage } from "../../SchoolTable/Storage/SchoolDataStorage";


interface CustomRep extends ICellRendererParams<School> {
  AllContacts: SchoolsContact[]
  setContacts:undefined|any

}
// Define the interface for the exposed methods
export interface RepresentiveRef {
  updateValue: (Contact: SchoolsContact) => void;
  refresh: (params: CustomRep) => boolean;  // Include refresh with CustomRep
  updateContacts:(Contacts:SchoolsContact[])=>void;
}

const RepresentiveComponent = forwardRef<RepresentiveRef, CustomRep>(({ setContacts,api, value, column, node, ...props }, ref) => {

  const [AllContacts, setAllContacts] = useState<SchoolsContact[]>(props.AllContacts)
  const [ListenerActivated, setListenerActivated] = useState(false)

  const cellPhone = useRef(null)

  // const [Updated , setUpdated] = useState(false)
  const [Link, setLink] = useState(null)
  const [ContactName, setContactName] = useState(null)
  const [currentContact, setCurrentContact] = useState<SchoolsContact>()

  const [cellValue, setCellValue] =  useState(null);
  const create_name = useCallback((contact: SchoolsContact) => {

    const { FirstName, LastName, Role } = contact;

    // Create an array to hold non-null values
    const parts = [];

    // Check each variable and push to the array if it's not null
    if (FirstName) parts.push(FirstName);
    if (Role) parts.push(Role);

    // Join the parts with a space and check if there are any values
    const result = parts.length > 0 ? parts.join(' ') : 'Unknown';

    return result;
  }, [])

  const Event_UpdateContact = useCallback((contact: SchoolsContact) => {
    if (contact) {
      const contact_name = create_name(contact)
      setContactName(contact_name)
      const formatted_cellPhone = contact.Cellphone.replace('+972', '').replace(/[-\s]/g, '');
      const link = `whatsapp://send/?phone=972${formatted_cellPhone}`;
      setLink(link)
      setCurrentContact(contact)
      
        const schoolNode: IRowNode<School> = api.getRowNode(props.data.Schoolid.toString()) 
        props.setValue(contact_name)
       if(schoolNode) { 
              schoolNode.setDataValue("Representive", contact_name)
       schoolNode.setDataValue("RepresentiveID", contact.Contactid)
        }
     

    }



  }, [create_name, props,api])
  // Method to update the value
  const updateValue = (Contact: SchoolsContact) => {

    if (Contact) {
      Event_UpdateContact(Contact)
    } else {
      setContactName(null)
      setLink(null)
      setCurrentContact(null)
    }


  };

  // Refresh method
  const refresh = (params: CustomRep): boolean => {
    if(ContactName !== params.value) {
       setContactName(params.value)
       return true
 }
    // Logic to refresh the component
    console.log('Refresh called with params:', params);
    return true // Return true or false based on the refresh logic
  };
  
 const updateContacts = (params:SchoolsContact[]) => {
   if(AllContacts !== params) {
           setAllContacts(params)
           if(setContacts) {
            setContacts(params)
        }
       }
 }
  // Use imperative handle to expose methods to parent
  useImperativeHandle(ref, () => ({
    updateValue,
    refresh,
    updateContacts
  }));






  // this on load
  useEffect(() => {
    if (AllContacts && ContactName === null && AllContacts.length > 0) {
      const contact = AllContacts.find((res) => res.IsRepresentive === true && res.Schoolid === props.data.Schoolid)
      Event_UpdateContact(contact)

    }



  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])



  // // this is activated when updating the rep from small contacts table.
  // useEffect(() => {
  //   // as in, we had a contact and now we don't
  //   if (typeof currentContact === "undefined" && ContactName !== null) {
  //     setLink(null)
  //     setContactName(null)

  //   } else {
  //     UpdatedContact(currentContact)

  //   }



  // }, [currentContact, UpdatedContact, ContactName, api])

  //  // since cellphone is not rendered, if i use state with cellphone it will not be updated by the time the function is called.
  const updatedRep = useCallback(async (event: { type: string, data: CellValueChangedEvent<SchoolsContact> }) => {
    const event_data: CellValueChangedEvent<SchoolsContact> = event.data

    // we only care if it is component for the row we are looking at.
    if (event_data.data.Schoolid !== props.data.Schoolid) { return }
    // this means that we need to change what is on the screen.  

    if (event_data.oldValue === true && event_data.newValue === false) {
      // -1 = not rep
      updateSchoolsColumn("RepresentiveID", -1, props.data.Schoolid)
      updateSchoolsColumn("Representive", "", props.data.Schoolid)
      const schoolNode: IRowNode<School> = api.getRowNode(props.data.Schoolid.toString())
      schoolNode.setDataValue("RepresentiveID", -1)
      schoolNode.setDataValue("Representive", "")
      setCurrentContact(undefined)
    }
    // in this case, we 1. Need to delete the old contact representive, 2. Update the contact
    else if (event.data.oldValue === false && event_data.newValue === true) {
      updateSchoolsColumn("RepresentiveID", event_data.data.Contactid, props.data.Schoolid)
      const name = create_name(event.data.data)
      updateSchoolsColumn("Representive", name, props.data.Schoolid)
      //const name = create_name(event.data)
      const schoolNode: IRowNode<School> = api.getRowNode(props.data.Schoolid.toString())
      schoolNode.setDataValue("RepresentiveID", event_data.data.Contactid)
      schoolNode.setDataValue("Representive", name)
      let new_list: SchoolsContact[] = []
      for (const contact of AllContacts) {
        if (contact.Contactid === event_data.data.Contactid) {
          new_list.push(event_data.data)
        } else {
          new_list.push(contact)
        }
      }
      setCurrentContact(event_data.data)
      updateStorage({ schoolsContacts: new_list })
    }


  }, [api, props.data.Schoolid, create_name, AllContacts])



  return (

    <a href={Link} target="_blank"> {ContactName}</a>

  )

})
RepresentiveComponent.displayName = "RepresentiveComponent"

export default RepresentiveComponent

function setCellValue(newValue: any) {
  throw new Error("Function not implemented.");
}
