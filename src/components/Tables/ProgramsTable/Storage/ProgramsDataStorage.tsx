import { StoreProgramsData } from "@/offlineStorage/programsStorage"
import { defaultObjectMap, ignoreFields, OfflineStorage, ProgramsDep, ProgramsStorePossibleOptionsForColumn, StoreDataMap } from "@/offlineStorage/storage"
import { Assigned_Guide, ColorCandidate, Guides_ToAssign, Program } from "@prisma/client"
import { ColDef } from "ag-grid-community"
// 👇 ייבוא הפונקציה החדשה מהקובץ הקודם
import { getAllProgramsData } from "@/db/programsRequests"; 

export interface ProgramsRowData {
   Programs: Program[],
   Tablemodel?: any[]
}

export interface ProgramsCascadingData{
    Candidates?:Guides_ToAssign[],
    ColorCandidates?:ColorCandidate[],
}

export interface ProgramsColDefinition {
   colDef: ColDef<Program>[]
}

export type DataType = (ProgramsStorePossibleOptionsForColumn & ProgramsRowData & ProgramsCascadingData)
const defaultObject = defaultObjectMap.get('Programs')

const handlePlacement = (data: DataType, store: LocalForage, dep_tables_fields: string[], this_update_tables_field: string[]) => {
   let promises = []
   for (var need_to_be_updated_if_changed of dep_tables_fields) {
      if (this_update_tables_field.includes(need_to_be_updated_if_changed) && !ignoreFields.includes(need_to_be_updated_if_changed)) {
         let promise = store.setItem(need_to_be_updated_if_changed, data[need_to_be_updated_if_changed]).then((res) => console.log(`Updated ${need_to_be_updated_if_changed} at ${store.config().storeName}`))
         promises.push(promise)
      }
   }
   return promises
}

const handlePayments = (data: DataType, store: LocalForage, dep_tables_fields: string[], this_update_tables_field: string[]) => {
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
handleMap.set('Placement', handlePlacement)
handleMap.set('Payments',handlePayments)

const updateDeps = async (data: (DataType)) => {
   let promises = []
   for (const dep of ProgramsDep) {
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
      const promise = StoreProgramsData.setItem(key, data[key])
      promises.push(promise)
   }
   return Promise.all([dep_promises, ...promises]).then((response) => { console.log("updated succesfully.") })
}

// 👇 הלוגיקה החדשה: אם הזיכרון ריק - הולך לשרת
const getFromStorage = async (): Promise<DataType> => {
   const keys = Object.keys(defaultObject)
   let promises = []
   
   for (const key of keys) {
      const promise = StoreProgramsData.getItem(key).then((res: string) => ({ [key]: res ?? undefined }))
      promises.push(promise)
   }

   return Promise.all([...promises]).then(async (results) => {
      let returned_obj: any = Object.assign({}, ...results);

      // בדיקה: אם אין תוכניות או שהמערך ריק
      if (!returned_obj.Programs || returned_obj.Programs.length === 0) {
          console.log("⚠️ Storage is empty. Fetching fresh data from Server...");
          
          const serverData = await getAllProgramsData();
          
          if (serverData) {
              console.log("✅ Data received from server. Updating storage...");
              await updateStorage(serverData as DataType);
              returned_obj = { ...returned_obj, ...serverData };
          } else {
             console.error("❌ Failed to fetch data from server.");
          }
      } else {
         console.log("✅ Loaded data from Local Storage cache.");
      }

      return returned_obj;
   })
}

export { updateStorage, getFromStorage }