"use client"

import { StatusContext, useStatus } from "@/context/StatusContext"
import { Guide, Program, StatusGuides, Years } from "@prisma/client"
import { GridApi } from "ag-grid-community"
import { useCallback, useEffect, useMemo, useState } from "react"
import Select from 'react-select'


type StatusData = {
placeholder:string,
AllStatuses:StatusGuides[],
setFilterStatus:any
}

const StatusSelect = ({placeholder ,AllStatuses,setFilterStatus}:StatusData) => {
const [Status, setStatus] = useState<{label:string, value:any}>()
const [Values, setValues] = useState([]); 
const [Loaded,setLoaded] = useState(false)

const defaultStatus = useStatus().defaultStatus
const defaultValue = useMemo(() => ({ label: defaultStatus ? defaultStatus : "הכל", value: defaultStatus ? defaultStatus : undefined }), [defaultStatus])

useEffect(()=>{
      if(defaultStatus) {
          setFilterStatus({label:defaultStatus,value:defaultStatus})
 }
   if(AllStatuses) {
        setValues([...AllStatuses?.map((val)=>({label:val.StatusName,value:val.StatusName})),{label:"הכל",value:undefined}])

  }
   

},[AllStatuses, defaultStatus, setFilterStatus])


const onChange = useCallback((newValue:{label:string, value:any})=> {
   
  setStatus(newValue)
  setFilterStatus(newValue)

},[setFilterStatus])


return (
   <div className="w-[200px] z-50">
  <Select defaultValue={defaultValue} value={Status}  isRtl={true} placeholder={placeholder} options={Values} onChange={onChange}   menuPortalTarget={typeof document!=='undefined'? document.body:null}
        styles={{
          menu: (provided) => ({
            ...provided,
            zIndex: 1, // Set your desired z-index
          }),
        }}/>
   </div>

 
)


}

export default StatusSelect