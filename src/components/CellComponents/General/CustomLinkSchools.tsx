import { School, SchoolsContact } from "@prisma/client";
import { ICellRendererParams } from "ag-grid-community";
import { useState } from "react";



const CustomLinkContacts = ({data,...props}:ICellRendererParams<SchoolsContact>)=> {
  const [value,setValue] = useState(props.value)
  
  return  <a
          href={`mailto:${props.value}`}
          target="_blank"
          className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline"
        >
             {props.value}
        </a>
}

export default CustomLinkContacts