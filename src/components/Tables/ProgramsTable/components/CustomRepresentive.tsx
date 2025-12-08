
import { getContact, getContactBySchoolID } from "@/db/contactsRequests"
import { Program, School, SchoolsContact } from "@prisma/client"
import { ICellRendererParams } from "ag-grid-community"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react"

interface ContactRepresentive extends ICellRendererParams<Program> {
 AllContacts:SchoolsContact[],
 AllSchools:School[]
}

export interface ContactRepresentiveRef {
  updateValue: (Contact: SchoolsContact) => void;
  refresh: (params: ContactRepresentive) => boolean;  // Include refresh with CustomRep
}
export const RepresentiveComponent = forwardRef<ContactRepresentiveRef, ContactRepresentive>(({  AllContacts,AllSchools, api, value, column, node, ...props }, ref) => {
      const [SchoolID, setSchoolID] = useState(props.data?.Schoolid)
      const [Link, setLink] = useState(null)
      const [Name,setName] = useState(null)

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
 
  const updateContact = useCallback((Contact:SchoolsContact)=>{
      if (Contact) {
        const contact_name = create_name(Contact)
       setName(contact_name)
      const formatted_cellPhone = Contact.Cellphone.replace('+972', '').replace(/[-\s]/g, '');
      const link = `whatsapp://send/?phone=972${formatted_cellPhone}`;
      setLink(link)
    } else {
      setName(null)
      setLink(null)
    }
},[create_name])
    // this on load

  useEffect(() => {
    if (AllContacts&& AllSchools && Name===null) {
       const school:School = AllSchools.find((school)=>school.Schoolid===SchoolID)
       const contact:SchoolsContact = AllContacts.find((contact)=>contact.Schoolid===school?.Schoolid && contact?.IsRepresentive === true)
       updateContact(contact)

    }

  }, [AllContacts, AllSchools, SchoolID, props.data.Schoolid, updateContact,Name])


    // Method to update the value
  const updateValue = (Contact: SchoolsContact) => {
    updateContact(Contact)


  };
  // Refresh method
  const refresh = (params: ContactRepresentive): boolean => {
    if(params.data.Schoolid !== SchoolID) {
           const contact:SchoolsContact = AllContacts.find((contact)=>contact.Schoolid===params.data.Schoolid && contact?.IsRepresentive === true)
       setSchoolID(params.data.Schoolid)
       updateContact(contact)
     }
    // Logic to refresh the component
    console.log('Refresh called with params:', params);
    return true; // Return true or false based on the refresh logic
  };

  // Use imperative handle to expose methods to parent
  useImperativeHandle(ref, () => ({
    updateValue,
    refresh,
  }));

  return (
    <a
          href={Link}
          className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline"
        > {Name} </a>
   
      )

 })
RepresentiveComponent.displayName="RepresentiveComponentFromPrograms"
  
export default RepresentiveComponent
