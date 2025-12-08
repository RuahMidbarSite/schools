"use client"

import { getAllProfessions, getModelFields } from "@/db/generalrequests"
import { Areas, Profession } from "@prisma/client"
import { GridApi } from "ag-grid-community"
import { useCallback, useEffect, useMemo, useState } from "react"
import { PlacementFilter, updateStorage } from "../Storage/PlacementDataStorage"

type Data = {
    RightApi?: GridApi | null
    Areas?: Areas[]
    setAreas?: any
    setFilter: any,
    CurrentProgram: { label: string, value: number },
    AllFilters: PlacementFilter[],
    setAllFilters,
    FilterProf: { eng_value: string, value: string, active: boolean }[],
    FilterAreas: { eng_value: string, value: string, active: boolean }[]
}
export const CustomFilterAreas = ({ Areas, FilterAreas, FilterProf, CurrentProgram, setFilter, RightApi, setAreas, AllFilters, setAllFilters, ...data }: Data) => {

    const [Filter, setInnerFilter] = useState<{ eng_value: string, value: string, active: boolean }[]>([])

    const [FilterAllButton, setFilterAllButton] = useState<Boolean>(false)

    const Choices: any = useMemo(() => {
        return Areas.map((area) => ({ label: area.AreaName, value: area.AreaName }))

    }, [Areas])


    useEffect(() => {
        const getAreas = async () => {
            let entry = AllFilters.find((filter) => filter.ProgramID === CurrentProgram.value)
            if (entry && entry.FilterAreas && entry.FilterAreas.length > 0) {
                setFilter(entry.FilterAreas)
                setInnerFilter(entry.FilterAreas)
            } else {
                setInnerFilter(Choices?.map((val, index) => ({ eng_value: val.value, value: val.label, active: false })))
                setFilter([])
            }
        }
        getAreas()

    }, [AllFilters, Choices, CurrentProgram, setFilter])


    const onClick = useCallback((val: { eng_value: string, value: string, active: boolean }) => {
        let new_filter = Filter
        for (let entry of Filter) {
            if (entry.active === val.active && entry.eng_value === val.eng_value) {
                entry.active = !val.active
            }

        }
        setInnerFilter(new_filter)
        setFilter(new_filter)

        let new_all_filters: typeof AllFilters = []
        let entry_find = AllFilters.find((res) => res.ProgramID === CurrentProgram.value)
        if (!entry_find) {
            new_all_filters.push({ FilterAreas: new_filter, FilterProf: FilterProf, ProgramID: CurrentProgram.value })

        }
        for (let filter of AllFilters) {
            if (filter.ProgramID === CurrentProgram.value) {
                filter.FilterAreas = new_filter
                new_all_filters.push(filter)
            } else {
                new_all_filters.push(filter)
            }

        }
        let sorted = new_all_filters.sort((arg1, arg2) => arg1.ProgramID - arg2.ProgramID)
        setAllFilters(sorted)
        updateStorage({ Filters: sorted })

        RightApi.onFilterChanged()

    }, [Filter, setFilter, AllFilters, setAllFilters, RightApi, CurrentProgram.value, FilterProf])
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
        if (!entry_find) {
            new_all_filters.push({ FilterAreas: new_filter, FilterProf: FilterProf, ProgramID: CurrentProgram.value })

        }
        for (let filter of AllFilters) {
            if (filter.ProgramID === CurrentProgram.value) {
                filter.FilterAreas = new_filter
                new_all_filters.push(filter)
            } else {
                new_all_filters.push(filter)
            }

        }
        let sorted = new_all_filters.sort((arg1, arg2) => arg1.ProgramID - arg2.ProgramID)
        setAllFilters(sorted)
        updateStorage({ Filters: sorted })
        RightApi.onFilterChanged()

    }, [setFilter, setAllFilters, RightApi, Filter, FilterAllButton, AllFilters, FilterProf, CurrentProgram])

    const All = useMemo(() => "כל האזורים", [])
    const getButtons = useCallback(() => {
        return (
            <div className="flex flex-row-reverse flex-wrap">
                <button onClick={(event) => onClickAll()} className={`${FilterAllButton === false ? 'bg-gray-600' : 'bg-red-200'} hover:bg-gray-300 text-white font-semibold px-2 border border-gray-400 rounded shadow`} key={"All_2"}> {All} </button>
                {Filter?.map((val: { eng_value: string, value: string, active: boolean }) => <button onClick={(event) => onClick(val)} className={`${val.active === false ? 'bg-gray-500' : 'bg-red-200'} hover:bg-gray-300 text-white font-semibold border border-gray-400 rounded shadow`} key={val.value}> {val.value} </button>)}


            </div>
        )
    }, [Filter, onClickAll, FilterAllButton, All, onClick])
    return getButtons()

}

export default CustomFilterAreas