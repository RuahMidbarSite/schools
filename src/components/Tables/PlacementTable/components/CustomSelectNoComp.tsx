"use client"
import { getPrograms } from '@/db/programsRequests';
import { Guide, Program } from '@prisma/client';
import { GridApi } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select'

type selectData = {
placeholder:string,
setProgram:any,
rightApi:GridApi<Guide>,
AllPrograms:Program[],
FilterYear:{ label: string, value: string },
FilterStatus:{label:string, value:string}
}

const CustomSelectNoComp = ({placeholder, setProgram,rightApi,AllPrograms,FilterYear,FilterStatus}:selectData) => {
 const [Values, setValues] = useState([]); 
 const [Loaded,setLoaded] = useState(false)

 useEffect(()=> {
   const LoadData = async (): Promise<any> => {
       if(!AllPrograms) { return}
        var list = [];
        if(AllPrograms.length == 0) {
          return
     }
      for (const program of AllPrograms) {
        if(FilterYear.value&& program.Year !== FilterYear.value || FilterStatus.value && program.Status!== FilterStatus.value) {continue}
        var name:string
        if(program.ProgramName) {
           name = program.ProgramName.concat(" -",program.SchoolName)
       }
           else {
           name = 'אין שם'.concat(" -",program.SchoolName)
         }
        
        const object_template = { value: program.Programid, label: name };
        list.push(object_template);
     }
      
      setValues([...list])

  };
   LoadData()


},[AllPrograms,FilterYear,FilterStatus])



const onChange = useCallback((newValue:{label:string, value:any})=> {
  setProgram({label:newValue.label, value:newValue.value})
  
},[setProgram])

const Message=useCallback(()=>{
    return (<div className="font-bold text-gray-600 text-xl">
          לא זוהו תוכניות בשנה הנוכחית
        </div>)
},[])

return (
   <div className="w-[200px]">
  <Select  isRtl={true} placeholder={placeholder} options={Values} onChange={onChange} noOptionsMessage={Message}   menuPortalTarget={typeof document!=='undefined'? document.body:null}
        styles={{
          menu: (provided) => ({
            ...provided,
            zIndex: 1, // Set your desired z-index
          }),
        }} />
   </div>

 
)






}
export default CustomSelectNoComp