import { Guide } from "@prisma/client";
import { ICellRendererParams } from "ag-grid-community";
import { useCallback, useState } from "react";



export const SimpleLink = (params:ICellRendererParams<Guide>) => {
   const [Link,setLink] = useState(params.data.CV)
   const [Name,setName] = useState(params.data.FirstName)

   const returnLink = useCallback(() => {
       if(Link && Name) {
            return (
    <a href={Link} className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline hover:cursor-pointer" target='_blank'>{Name}</a>
   )
         }else {
           return <div></div>
     }
   },[Link, Name])
    
   return (
     returnLink()
   )







}