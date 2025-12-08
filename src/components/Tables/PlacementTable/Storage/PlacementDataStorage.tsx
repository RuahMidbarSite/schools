
import { StorePlacementData } from "@/offlineStorage/placementStorage"
import { StoreProgramsData } from "@/offlineStorage/programsStorage"
import { defaultObjectMap, ignoreFields, OfflineStorage, PlacementDep, PlacementsStorePossibleOptionsForColumn, ProgramsDep, ProgramsStorePossibleOptionsForColumn, StoreDataMap } from "@/offlineStorage/storage"
import { Program } from "@prisma/client"
import { ColDef } from "ag-grid-community"





export interface PlacementsRowData {

    /** This is from ag grid so that we map it. */
    Tablemodel?: any[],
}

 export interface PlacementFilter {
FilterProf?:{ eng_value: string, value: string, active: boolean }[],
FilterAreas?:{ eng_value: string, value: string, active: boolean }[],
ProgramID:number
}
export interface PlaceFilters {
 Filters?:PlacementFilter[]
}
export interface ProgramsColDefinition {
    colDef: ColDef<Program>[]
}

// remember to add to DataType the PlacementFilters types.
export type DataType = (PlacementsStorePossibleOptionsForColumn & PlacementsRowData & PlaceFilters )
const defaultObject = defaultObjectMap.get('Placement')
const handlePrograms = (data: DataType, store: LocalForage, dep_tables_fields: string[], this_update_tables_field: string[]) => {
    let promises = []
    for (var need_to_be_updated_if_changed of dep_tables_fields) {
        if (this_update_tables_field.includes(need_to_be_updated_if_changed) && !ignoreFields.includes(need_to_be_updated_if_changed)) {
            let promise = store.setItem(need_to_be_updated_if_changed, data[need_to_be_updated_if_changed]).then((res) => console.log(`Updated ${need_to_be_updated_if_changed} at ${store.config().storeName}`))
            promises.push(promise)
        }

    }
    return promises
}

const handleMap: Map<OfflineStorage, any> = new Map()
handleMap.set('Programs', handlePrograms)

const updateDeps = async (data: (DataType)) => {
    let promises = []
    for (const dep of PlacementDep) {
        const Handler = handleMap.get(dep)
        const Store = StoreDataMap.get(dep)
        const default_object = defaultObjectMap.get(dep)
        const dep_tables_fields = default_object ? Object.keys(default_object) : []
        const this_update_tables_fields = Object.keys(data)
        let promise_array = Handler(data, Store, dep_tables_fields, this_update_tables_fields)
        promises.push(promise_array)
    }

    return promises




}


const updateStorage = async (data: DataType): Promise<void> => {
    const keys = Object.keys(data)
    let promises = []
    let dep_promises = updateDeps(data)

    for (const key of keys) {
        const promise = StorePlacementData.setItem(key, data[key])
        promises.push(promise)
    }
    return Promise.all([dep_promises, ...promises]).then((response) => { console.log("updated succesfully.") })

}

const getFromStorage = async (): Promise<DataType> => {
    const keys = Object.keys(defaultObject)
    let promises = []
    for (const key of keys) {
        // null coaelscing so if null it will become undefined (for convenient ifs)
        const promise = StorePlacementData.getItem(key).then((res: string) => ({ [key]: res ?? undefined }))

        promises.push(promise)

    }
    return Promise.all([...promises]).then((results) => {

        let returned_obj = Object.assign({}, ...results);
        return returned_obj

    })


}

export { updateStorage, getFromStorage }