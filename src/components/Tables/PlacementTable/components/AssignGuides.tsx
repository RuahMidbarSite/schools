import { getAssignedInstructorsByProgramID, getGuidesById } from "@/db/instructorsrequest";
import { Assigned_Guide, Guide } from "@prisma/client";
import { GridApi } from "ag-grid-community";
import { useCallback, useEffect, useState } from "react";

type Data = {
  CurrentProgram: { label: string; value: number },
  LeftGridApi:GridApi<Guide>
 setChosenCandidate:React.Dispatch<React.SetStateAction<{guide:Guide}>>,
 setAllAssignedGuides:any,
setAllAssignedGuides_Details:any,

};

export const AssignGuides = (data:Data)=> {
const [currentProgram, _] = useState(data.CurrentProgram.value!=-1? data.CurrentProgram.value : undefined)


const onClick= useCallback((event,val:number)=>{
const rows:Guide[] = data.LeftGridApi.getSelectedRows()
 if(rows && rows.length >0) {
   // This affects CustomProgramModal.tsx default export
   data.setChosenCandidate({guide:rows[0]})
   
   
   
 }

},[data])
const getGui = useCallback(()=> {
 const Name ="שיבוץ"
 return <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={(event)=>onClick(event,0)} >{Name}</button> 
 

},[onClick])

return (
   getGui()
 
)



}