import { sendMessageViaWhatsApp } from "@/db/whatsapprequests"
import { Guide, Guides_ToAssign } from "@prisma/client"
import { GridApi } from "ag-grid-community"
import { useCallback, useMemo, useState } from "react"


type Data = {
Inner_SelectedRows:Guide[],
  LeftGridApi: GridApi<Guide>,
}

const SendMessagesBox = ({Inner_SelectedRows,LeftGridApi}:Data) => {

const [inputValue , setInputValue] = useState("")

const onClick = useCallback(()=>{
  
  var promises = []
  if(Inner_SelectedRows) {
      for (const guide of Inner_SelectedRows) {
       const phone:string = guide.CellPhone
         promises.push(sendMessageViaWhatsApp(inputValue,undefined,undefined,phone,"972",undefined))
        
      }
  }
   
     Promise.all([...promises]).then((results)=> {
     console.log(results) 
     
     LeftGridApi.deselectAll()
  })


},[Inner_SelectedRows, LeftGridApi, inputValue])

const ButtonTitle = useMemo(()=>"שלח הודעה למועמדים",[])
return ( 

 <div className="relative">
      
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)} // Update state on text change
        placeholder="רשום הודעה"
        rows={4}
        className="border border-gray-300 rounded-lg p-2 w-54 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Button that triggers onClick */}
      <button className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-1 px-1 border-b-4 border-blue-700 hover:border-blue-500 rounded text-sm" onClick={onClick}>{ButtonTitle}</button>
    </div>
    
)

}

export default SendMessagesBox
