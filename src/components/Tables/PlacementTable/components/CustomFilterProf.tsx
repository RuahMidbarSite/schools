"use client"

import { getAllProfessions, getModelFields } from "@/db/generalrequests"
import { Profession } from "@prisma/client"
import { GridApi } from "ag-grid-community"
import { useCallback, useEffect, useMemo, useState } from "react"
import { PlacementFilter, updateStorage } from "../Storage/PlacementDataStorage"

type Data = {
  RightApi?: GridApi | null
  Professions?: Profession[]
  setProfession?: any
  setFilter: any,
  CurrentProgram: { label: string, value: number },
  AllFilters: PlacementFilter[],
  setAllFilters,
  FilterProf: { eng_value: string, value: string, active: boolean }[],
  FilterAreas: { eng_value: string, value: string, active: boolean }[]
}
export const CustomFilterProf = ({ FilterAreas, FilterProf, CurrentProgram, setFilter, RightApi, AllFilters, setAllFilters, ...data }: Data) => {

  const [Filter, setInnerFilter] = useState<typeof FilterProf>([])



  const [FilterAllButton, setFilterAllButton] = useState<boolean>(false)

  const Choices: any = useMemo(() => {
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
  }, [])


  useEffect(() => {

    const getProfessions = async () => {
       let entry = AllFilters.find((filter)=>filter.ProgramID===CurrentProgram.value)
       if(entry && entry.FilterProf && entry.FilterProf.length > 0) {
           setFilter(entry.FilterProf)
           setInnerFilter(entry.FilterProf)
     }else {
         setInnerFilter(Choices?.map((val, index) => ({ eng_value: val.value, value: val.label, active: false })))
      setFilter([])
    } 

     
    }
    getProfessions()

  }, [AllFilters, Choices, CurrentProgram, setFilter])


  const onClick = useCallback((val: { eng_value: string, value: string, active: boolean }) => {
    let new_filter = Filter
    for (let entry of Filter) {
      if (entry.active === val.active && entry.eng_value=== val.eng_value) {
        entry.active = !val.active
      }

    }
    setInnerFilter(new_filter)
    setFilter(new_filter)

    let new_all_filters: typeof AllFilters = []
    let entry_find = AllFilters.find((res) => res.ProgramID === CurrentProgram.value)
    if(!entry_find) {
     new_all_filters.push({FilterAreas:FilterAreas,FilterProf:new_filter,ProgramID:CurrentProgram.value})

   }
    for (let filter of AllFilters) {
      if (filter.ProgramID === CurrentProgram.value) {
        filter.FilterProf = new_filter
        new_all_filters.push(filter)
      } else {
        new_all_filters.push(filter)
      }

    }
    let sorted = new_all_filters.sort((arg1,arg2)=>arg1.ProgramID-arg2.ProgramID)
    setAllFilters(sorted)
    updateStorage({ Filters: sorted })



    RightApi.onFilterChanged()
  }, [AllFilters, CurrentProgram.value, Filter, FilterAreas, RightApi, setAllFilters, setFilter])

  const onClickAll = useCallback(() => {
    let new_filter = []
    for (let filter of Filter) {
      filter.active = !FilterAllButton
      new_filter.push(filter)
    }
    setInnerFilter(new_filter)
    setFilter(new_filter)

    setFilterAllButton(Button => !Button)

    let new_all_filters: typeof AllFilters = []
    let entry_find = AllFilters.find((res) => res.ProgramID === CurrentProgram.value)
    if(!entry_find) {
     new_all_filters.push({FilterAreas:FilterAreas,FilterProf:new_filter,ProgramID:CurrentProgram.value})

   }
    for (let filter of AllFilters) {
      if (filter.ProgramID === CurrentProgram.value) {
        filter.FilterProf = new_filter
        new_all_filters.push(filter)
      } else {
        new_all_filters.push(filter)
      }

    }
    let sorted = new_all_filters.sort((arg1,arg2)=>arg1.ProgramID-arg2.ProgramID)
    setAllFilters( sorted)
    updateStorage({ Filters:  sorted })
    RightApi.onFilterChanged()

  }, [setFilter, AllFilters, setAllFilters, RightApi, Filter, FilterAllButton, CurrentProgram.value, FilterAreas])

  const All = useMemo(() => "כל המקצועות", [])
  const getButtons = useCallback(() => {
    return (
      <div className="flex flex-row-reverse flex-wrap">
        <button onClick={(event) => onClickAll()} className={`${FilterAllButton === false ? 'bg-gray-600' : 'bg-red-200'} hover:bg-gray-300 text-white font-semibold px-2 border border-gray-400 rounded shadow`} key={"All_2"}> {All} </button>
        {Filter?.map((val: { eng_value: string, value: string, active: boolean }) => <button onClick={(event) => onClick(val)} className={`${val.active === false ? 'bg-gray-500' : 'bg-red-200'} hover:bg-gray-300 text-white font-semibold px-2 border border-gray-400 rounded shadow`} key={val.value}> {val.value} </button>)}


      </div>
    )
  }, [Filter, onClickAll, FilterAllButton, All, onClick])



  return getButtons()


}

export default CustomFilterProf