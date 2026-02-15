"use client"

import { GridApi } from "ag-grid-community"
import { useCallback, useEffect, useMemo, useState } from "react"
import { PlacementFilter, updateStorage } from "../Storage/PlacementDataStorage"
import { Profession } from "@prisma/client" // Assuming this import exists based on your code

type Data = {
  RightApi?: GridApi | null
  Professions?: Profession[]
  setProfession?: any
  setFilter: any,
  CurrentProgram: { label: string, value: number },
  AllFilters: PlacementFilter[],
  setAllFilters: any, // Fixed type inference
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
      // 1. מקור האמת: תמיד בונים את הרשימה המלאה מה-DB (כאן נמצאת "זומבה")
      const rawProfessions = (data.Professions && data.Professions.length > 0)
        ? data.Professions.map(p => {
            const name = typeof p === 'string' ? p : (p.ProfessionName || p.label || p.name || "ללא שם");
            return { label: name, value: name };
          })
        : Choices; // גיבוי למקרה שה-DB ריק

      // סינון כפילויות
      const uniqueSource = rawProfessions.filter((v, i, a) => 
        a.findIndex(t => t.label === v.label) === i && v.label !== "ללא שם"
      );

      // 2. בדיקת הזיכרון: מה המשתמש סימן בפעם האחרונה?
      let savedEntry = AllFilters.find((filter) => filter.ProgramID === CurrentProgram.value);
      let savedFilterState = savedEntry ? savedEntry.FilterProf : [];

      // 3. המיזוג: לוקחים את כל המקצועות מה-DB + הסטטוס מהזיכרון
      const mergedFilter = uniqueSource.map((prof) => {
        // האם המקצוע הזה היה שמור בזיכרון?
        const savedProf = savedFilterState.find(s => s.value === prof.label);
        
        return { 
          eng_value: prof.value, 
          value: prof.label, 
          // אם כן - תשמור על הבחירה (active). אם זה מקצוע חדש (זומבה) - תתחיל כ-false.
          active: savedProf ? savedProf.active : false 
        };
      });

      // 4. עדכון התצוגה
      if (mergedFilter.length > 0) {
          setInnerFilter(mergedFilter);
          
          // עדכון הפילטר בפועל רק אם יש שמירה פעילה, כדי לא לדרוס סתם
          if (savedEntry && savedEntry.FilterProf && savedEntry.FilterProf.length > 0) {
             setFilter(mergedFilter);
          } else {
             setFilter([]); 
          }
      }
    };

    getProfessions();
  // התלות ב-data.Professions מבטיחה שברגע שהמידע מגיע מהשרת - הרשימה תתעדכן
  }, [CurrentProgram.value, data.Professions, Choices, AllFilters, setFilter]);

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

    if(RightApi) RightApi.onFilterChanged() // Added check for safety
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
    if(RightApi) RightApi.onFilterChanged()

  }, [setFilter, AllFilters, setAllFilters, RightApi, Filter, FilterAllButton, CurrentProgram.value, FilterAreas])

  const All = useMemo(() => "כל המקצועות", [])
  
  const getButtons = useCallback(() => {
    return (
      <div className="flex flex-row-reverse flex-wrap gap-1"> {/* Added gap-1 for spacing between elements if needed */}
        <button 
            onClick={(event) => onClickAll()} 
            className={`${FilterAllButton === false ? 'bg-gray-600' : 'bg-purple-600'} hover:bg-gray-500 text-white font-semibold px-2 py-1 border border-gray-400 rounded shadow transition-colors duration-200`} 
            key={"All_2"}
        > 
            {All} 
        </button>
        {Filter?.map((val: { eng_value: string, value: string, active: boolean }) => 
            <button 
                onClick={(event) => onClick(val)} 
                className={`${val.active === false ? 'bg-gray-500' : 'bg-purple-600'} hover:bg-gray-400 text-white font-semibold px-2 py-1 border border-gray-400 rounded shadow transition-colors duration-200`} 
                key={val.value}
            > 
                {val.value} 
            </button>
        )}
      </div>
    )
  }, [Filter, onClickAll, FilterAllButton, All, onClick])

  return getButtons()
}

export default CustomFilterProf