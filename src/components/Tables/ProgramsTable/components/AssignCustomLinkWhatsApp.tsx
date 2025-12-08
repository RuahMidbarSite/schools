import { Guide } from "@prisma/client";
import { ICellRendererParams } from "ag-grid-community";


//TODO: 
// 1. Make sure it works before changing to link
// 2. Add Option to delete assigned guide
// 3. Impelement in database.

export const AssignCustomLinkWhatsApp = (props:ICellRendererParams<Guide>) => {


 return (<a className="font-medium text-blue-600 no-underline dark:text-blue-500 hover:underline" href={`whatsapp://send/?phone=972${props.data?.CellPhone}`} target="_blank">{props.data.LastName? props.data.FirstName?.concat('-',props.data.LastName):props.data.FirstName}</a>)

}