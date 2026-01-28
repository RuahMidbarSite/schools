"use client"
import { Cities, EducationStage, Program, ReligionSector, School, SchoolsContact, SchoolTypes } from "@prisma/client"
import { ColDef } from "ag-grid-community"
import { StoreSchoolData } from '@/offlineStorage/schoolStorage'
import { defaultObjectMap, SchoolDep, SchoolStorePossibleOptionsForColumn, ignoreFields, StoreDataMap, OfflineStorage } from "@/offlineStorage/storage"
import { columnsDefinition } from "@/util/cache/cachetypes"

export interface SchoolStoreRowData {
   Schools?: School[],
   /** This is from ag grid so that we map it. */
   Tablemodel?: any[]
}

/** Not used in  Schools but can be updated from it by using delete. */
export interface SchoolsCascadingData {
   Programs?: Program[]
}

export interface SchoolStoreColDefinition {
   colDef: ColDef<School>[]
}



export type DataType = (SchoolStorePossibleOptionsForColumn & SchoolStoreRowData & SchoolsCascadingData)

const defaultObject = defaultObjectMap.get('School')

// 🆕 מערכת גרסאות לזיהוי שינויים
const CACHE_VERSION_KEY = 'SchoolDataVersion'

// 🆕 פונקציה לעדכון מספר הגרסה
const incrementVersion = async (): Promise<number> => {
  try {
    const currentVersion = await StoreSchoolData.getItem(CACHE_VERSION_KEY) as number || 0
    const newVersion = currentVersion + 1
    await StoreSchoolData.setItem(CACHE_VERSION_KEY, newVersion)
    console.log(`📊 School cache version updated: ${currentVersion} → ${newVersion}`)
    return newVersion
  } catch (error) {
    console.error("❌ Error incrementing version:", error)
    return 0
  }
}

// 🆕 פונקציה לקבלת מספר הגרסה
export const getCacheVersion = async (): Promise<number> => {
  try {
    const version = await StoreSchoolData.getItem(CACHE_VERSION_KEY) as number
    return version || 0
  } catch (error) {
    console.error("❌ Error getting cache version:", error)
    return 0
  }
}

const handleBigContacts = (data: DataType, store: LocalForage, dep_tables_fields: string[], this_update_tables_field: string[]) => {
   let promises = []
   for (var need_to_be_updated_if_changed of dep_tables_fields) {
      if (this_update_tables_field.includes(need_to_be_updated_if_changed) && !ignoreFields.includes(need_to_be_updated_if_changed)) {
         let promise = store.setItem(need_to_be_updated_if_changed, data[need_to_be_updated_if_changed]).then((res) => console.log(`Updated ${need_to_be_updated_if_changed} at ${store.config().storeName}`))
         promises.push(promise)
      }

   }
   return promises
}

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
const handleMessages = (data: DataType, store: LocalForage, dep_tables_fields: string[], this_update_tables_field: string[]) => {
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
handleMap.set('BigContacts', handleBigContacts)
handleMap.set('Programs', handlePrograms)
handleMap.set('Messages', handleMessages)
handleMap.set('Payments', handlePayments)
const updateDeps = async (data: (DataType)) => {
   let promises = []
   for (const dep of SchoolDep) {
      const Handler = handleMap.get(dep)
      const Store = StoreDataMap.get(dep)
      const dep_tables_fields = Object.keys(defaultObjectMap.get(dep))
      const this_update_tables_fields = Object.keys(data)
      let promise_array = Handler(data, Store, dep_tables_fields, this_update_tables_fields)
      promises.push(promise_array)
   }

   return promises




}

const updateStorage = async (data: DataType): Promise<void> => {
   console.log("💾 SchoolDataStorage: updateStorage called with keys:", Object.keys(data))
   
   const keys = Object.keys(data)
   let deps_promises = updateDeps(data)
   let promises = []
   for (const key of keys) {
      const promise = StoreSchoolData.setItem(key, data[key])
      promises.push(promise)
   }
   
   return Promise.all([deps_promises, ...promises]).then(async (response) => { 
      console.log("✅ SchoolDataStorage: updated successfully")
      
      // עדכון מספר הגרסה
      const newVersion = await incrementVersion()
      
      // שידור אירוע מותאם אישית לכל הדפים/קומפוננטות
      if (typeof window !== 'undefined') {
         console.log("📡 SchoolDataStorage: DISPATCHING storageUpdated event...")
         console.log("📦 Keys being dispatched:", Object.keys(data))
         console.log("📢 Version:", newVersion)
         
         window.dispatchEvent(new CustomEvent('storageUpdated', { 
            detail: { 
               keys: Object.keys(data),
               version: newVersion,
               timestamp: Date.now(),
               source: 'SchoolDataStorage'
            } 
         }))
         
         console.log("✅ Event dispatched successfully!")
      }
   })
}

const getFromStorage = async (): Promise<DataType> => {
   const keys = Object.keys(defaultObject).map((val) => val === "rowData" ? "Schools" : val)
   let promises = []
   for (const key of keys) {
      // null coaelscing so if null it will become undefined (for convenient ifs)
      const promise = StoreSchoolData.getItem(key).then((res: string) => ({ [key]: res ?? undefined }))

      promises.push(promise)

   }
   return Promise.all([...promises]).then((results) => {

      let returned_obj = Object.assign({}, ...results);
      return returned_obj

   })


}
const getFromStorageWithKey = async (key: Partial<keyof DataType>): Promise<Partial<DataType>> => {
   return StoreSchoolData.getItem(key).then((res: string) => ({ [key]: res ?? undefined }))

}

export { updateStorage, getFromStorage, getFromStorageWithKey }