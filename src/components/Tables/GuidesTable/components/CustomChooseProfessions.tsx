import { updateProfessions } from "@/db/instructorsrequest";
import { Guide, Program } from "@prisma/client";
import { ICellEditorParams } from "ag-grid-community";
import { forwardRef, useCallback, useMemo, useState } from "react"
import Select, { ActionMeta, OnChangeValue, StylesConfig } from "react-select";

// eslint-disable-next-line react/display-name
export const ChooseProfessions = forwardRef((props:ICellEditorParams<Guide>,ref:any)=> {
const Choices:any = useMemo(()=> {
    const categories = [
  { label: 'תיאטרון', value: 'Theater' },
  { label: 'שחמט', value: 'Chess' },
  { label: 'לחימה', value: 'Fighting' },
  { label: 'סטיילינג', value: 'Styling' },
  { label: 'קיימות', value: 'Sustainability' },
  { label: 'ניו מדיה', value: 'NewMedia' },
  { label: 'הייטק', value: 'HiTech' },
  { label: 'יוגה', value: 'Yoga' },
  { label: 'כתיבה', value: 'Writing' },
  { label: 'פיננסי', value: 'Finances' },
  { label: 'ספורט', value: 'Sports' },
  { label: 'קוסמות', value: 'Magic' },
  { label: 'כלבנות', value: 'Doghandling' },
  { label: 'רפואה', value: 'Medicine' },
  { label: 'מדע', value: 'Science' },
  { label: 'מחול', value: 'Dance' },
  { label: 'תקשורת', value: 'Communication' },
  { label: 'למידה', value: 'Studying' },
  { label: 'פסיכומטרי', value: 'Psychometric' },
  { label: 'חשיבה', value: 'Thoughts' },
  { label: 'להטוטנות', value: 'Juggling' },
  { label: 'חינוך מיני', value: 'SexEducation' },
  { label: 'טיפול', value: 'Treatment' },
  { label: 'מוסיקה', value: 'Music' },
  { label: 'ליווי', value: 'Escort' },
  { label: 'קולנוע', value: 'Cinema' },
  { label: 'נגרות', value: 'Woodwork' },
  { label: 'יזמות', value: 'Entrepreneurship' },
  { label: 'אנגלית', value: 'English' },
  { label: 'מתמטיקה', value: 'Mathematics' },
  { label: 'קאוצינג', value: 'Coaching' },
  { label: 'טלמרקטינג', value: 'Telemarketing' },
  { label: 'ייעוץ הוליסטי', value: 'HollisticCoaching' },
  { label: 'יהדות', value: 'Judaism' },
  { label: 'טיסה', value: 'Flight' },
  { label: 'מותאמת', value: 'Custom' },
  { label: 'מנהיגות', value: 'Leadership' }
];
   return categories
},[])

const defaultValues:any = useMemo(()=> {
  if(typeof props.data.Professions!==null) {
     if(props.data.Professions) {
            const r:string[] = props.data.Professions?.split(",")
     return r?.map((r)=>({label:r,value:Choices?.filter((val)=>val.label===r)[0]?.value}))
      }
   
        return null
}
  
},[Choices, props.data.Professions])
 
const onChange = useCallback((event:{label:string,value:string}[])=>{

   const prof:string[] = event.map((val)=>val.label)
   const eng:string[] = [...event.map((val)=>val.value)]
   if(prof.length > 0) {
         props.node.setDataValue("Professions",prof.join(','))
         //updateProfessions(eng,true,props.data.Guideid)
   }else {
         props.node.setDataValue("Professions",'')
     }


},[props.node])

return (
    <div className="absolute overflow-y-visible z-1 w-[200px] ">
   <Select
     isMulti
     closeMenuOnSelect={false}
     
     className="basic-multi-select"
    classNamePrefix="select"
    placeholder="בחר מקצועות"
      isRtl={true}
       classNames={{
              control: () => "  rounded-md bg-[#12242E]",
              multiValueLabel: (data) =>
                `border-[white] border-[2px]  bg-white  `,
              menuList: () => " ",
              menuPortal: () => " ",
              placeholder: () => "bg-[#4075be] ",
              multiValue: () => " ",
              option: () => "hover:bg-sky-700 bg-neutral-300  ",
              menu: () => "",
              container: () => "",
            }}
            menuPlacement={"auto"}
            menuPosition={"fixed"}
            menuPortalTarget={document.body}
         noOptionsMessage={() => null}
      //defaultValue={{value:School,label:School}}
      defaultMenuIsOpen={true}
      options={Choices} 
      defaultValue={defaultValues}
      controlShouldRenderValue={true}
      isSearchable={true}
      onChange={onChange} 
    
  />
  </div>


)






})