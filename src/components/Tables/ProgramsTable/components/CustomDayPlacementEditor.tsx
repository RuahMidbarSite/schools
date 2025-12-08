import { Program } from "@prisma/client";
import { ICellRendererParams } from "ag-grid-community";
import React from "react";
import {useCallback, useMemo } from "react"
import Select, { ActionMeta, OnChangeValue, StylesConfig } from "react-select";

// eslint-disable-next-line react/display-name
export const DayPlacementEditor =React.forwardRef((props:ICellRendererParams<Program>,ref:any)=> {

const defaultValues:any = useMemo(()=> {
  const r:string[] = props.data.ChosenDay?.split(",")
  return r? r.map((r)=>({label:r,value:r})): []
  

},[props.data.ChosenDay])
 
const Choices:any = useMemo(()=> {
   const days_avail = props.data.Days.split(',').map((val)=>({label:val,value:val}))
   return days_avail
},[props.data.Days])

const onChange = useCallback((event:{label:string,value:number}[])=>{
  const days:string[] = event.map((val)=>val.label)
  props.node.setDataValue("ChosenDay",days.join(','))

},[props.node])

return (
    <div className="absolute overflow-y-visible z-1 w-[200px]">
   <Select
     isMulti
     closeMenuOnSelect={false}
     className="basic-multi-select"
    classNamePrefix="select"
    placeholder="בחר יום"
      isRtl={true}
       classNames={{
              control: () => "rounded-md bg-[#4075be]",
              multiValueLabel: (data) =>
                `border-[white] border-[2px]  bg-[#4075be]  `,
              menuList: () => " ",
              menuPortal: () => " ",
              placeholder: () => "bg-[#4075be] ",
              multiValue: () => " ",
              option: () => "hover:bg-sky-700 bg-neutral-300 ",
              menu: () => "",
              container: () => "",
            }}
            menuPlacement={"auto"}
            menuPosition={"fixed"}
            menuPortalTarget={document.body}
         noOptionsMessage={() => null}
      //defaultValue={{value:School,label:School}}
      options={Choices} 
      defaultValue={defaultValues}
     // onMenuOpen={onMenuOpen}
      controlShouldRenderValue={true}
      isSearchable={true}
      onChange={onChange}
  />
  </div>


)


})