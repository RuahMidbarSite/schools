
import { getContact, getContactBySchoolID } from "@/db/contactsRequests"
import { Program, School, SchoolsContact } from "@prisma/client"
import { ICellRendererParams } from "ag-grid-community"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react"

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
      const [Link, setLink] = useState<string | null>(null)
      const [Name,setName] = useState<string | null>(null)

    const create_name = useCallback((contact: SchoolsContact) => {

        const { FirstName, LastName, Role } = contact;

    // Create an array to hold non-null values
        const parts = [];

    // Check each variable and push to the array if it's not null
        if (FirstName) parts.push(FirstName);
        if (Role) parts.push(Role);
        return parts.length > 0 ? parts.join(' ') : 'Unknown';
  }, []) 
 
  const updateContact = useCallback((Contact: SchoolsContact | undefined) => {
      if (Contact) {
        const contact_name = create_name(Contact)
        setName(contact_name)
        // check if we have a phone number to create a WhatsApp link
        if (Contact.Cellphone) {
            const formatted_cellPhone = Contact.Cellphone.replace('+972', '').replace(/[-\s]/g, '');
            const link = `whatsapp://send/?phone=972${formatted_cellPhone}`;
            setLink(link)
        } else {
            setLink(null)
        }
    } else {
      setName(null)
      setLink(null)
    }
}, [create_name])

  const processValue = useCallback((cellValue: any, currentSchoolId: any) => {

    if (cellValue && typeof cellValue === 'string' && cellValue.trim() !== '') {// If the cell value is a non-empty string, try to extract contact info from it
        if (cellValue.includes('#')) {

            const parts = cellValue.split('#');
            const extractedName = parts[0].trim();
            setName(extractedName || "איש קשר"); //if there is only a phone number and no name, we can use the phone number as the name
            setLink(parts[1] || null);
        } else {
           const extractedName = cellValue.trim();
            setName(extractedName || "איש קשר");// also
            setLink(null);
        }
    } 
    else if (AllContacts) {// If the cell value is empty, try to find a contact from AllContacts based on the current SchoolID
        const contact = AllContacts.find((c) => c.Schoolid === currentSchoolId && c?.IsRepresentive === true);
        updateContact(contact);
    }
  }, [AllContacts, updateContact]);

  useEffect(() => {
    processValue(value, SchoolID);
  }, [value, SchoolID, processValue])


  const updateValue = (Contact: SchoolsContact) => {
    updateContact(Contact)
  };

  const refresh = (params: ContactRepresentive): boolean => {
    setSchoolID(params.data.Schoolid);
    processValue(params.value, params.data.Schoolid); 
    return true; 
  };

  useImperativeHandle(ref, () => ({
    updateValue,
    refresh,
  }));

  return (
    <a
      href={Link || "#"}
      className={`font-medium no-underline hover:underline ${Link ? 'text-blue-600 dark:text-blue-500' : 'text-gray-600 dark:text-gray-400 cursor-default'}`}
      onClick={(e) => { if (!Link) e.preventDefault(); }}
    > 
      {Name} 
    </a>
  )
})
RepresentiveComponent.displayName="RepresentiveComponentFromPrograms"
  
export default RepresentiveComponent
