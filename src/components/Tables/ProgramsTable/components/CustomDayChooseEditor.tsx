import { Program } from "@prisma/client";
import { ICellRendererParams } from "ag-grid-community";
import { useCallback, useMemo } from "react"
import Select, { ActionMeta, OnChangeValue, StylesConfig } from "react-select";


export const DayChooseEditor = (props:ICellRendererParams<Program>)=> {

const defaultValues:any = useCallback(()=> {
  const r:string[] = props.data.Days?.split(",")
  return r?.map((r)=>({label:r,value:r}))
  

},[props.data.Days])
 
const Choices:any = useMemo(()=> {
  
   return [{label:"א",value:"א"},{label:"ב",value:"ב"},{label:"ג",value:"ג"},{label:"ד",value:"ד"},{label:"ה",value:"ה"},{label:"ו",value:"ו"},{label:"ש",value:"ש"}] 
},[])

const onChange = useCallback((event:{label:string,value:number}[])=>{
  const days:string[] = event.map((val)=>val.label)
   props.node.setDataValue("Days",days.join(','))

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






}