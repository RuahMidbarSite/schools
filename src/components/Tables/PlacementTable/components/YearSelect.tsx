"use client"

import { useYear } from "@/context/YearContext"
import { Guide, Program, Years } from "@prisma/client"
import { GridApi } from "ag-grid-community"
import { useCallback, useEffect, useMemo, useState } from "react"
import Select from 'react-select'


type yearData = {
  placeholder: string,


  AllYears: Years[],
  setFilterYear: any
}

const YearSelect = ({ placeholder, AllYears, setFilterYear }: yearData) => {
  const [Year, setYear] = useState<{ label: string, value: any }>()
  const [Values, setValues] = useState([]);
  const [Loaded, setLoaded] = useState(false)

  const selectedYear= useYear().selectedYear

  const defaultValue = useMemo(() => ({ label: selectedYear ? selectedYear : "הכל", value: selectedYear ? selectedYear : undefined }), [selectedYear])
  
  useEffect(() => {
   if(selectedYear) {
          setFilterYear({label:selectedYear,value:selectedYear})
 }

    if (AllYears) {
      setValues([...AllYears?.map((val) => ({ label: val.YearName, value: val.YearName })),{label:"הכל",value:undefined}])

    }


  }, [AllYears, selectedYear, setFilterYear])


  const onChange = useCallback((newValue: { label: string, value: any }) => {

    setYear(newValue)
    setFilterYear(newValue)

  }, [setFilterYear])


  return (
     

    <div className="w-[200px] ">
      <Select isRtl={true} placeholder={placeholder} options={Values} onChange={onChange}
        defaultValue={defaultValue} value={Year} menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        styles={{
          menu: (provided) => ({
            ...provided,
            zIndex: 1, // Set your desired z-index
          }),
        }} />
    </div>


  )


}

export default YearSelect