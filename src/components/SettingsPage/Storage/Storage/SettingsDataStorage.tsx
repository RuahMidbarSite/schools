"use client"

import { defaultObjectMap, ignoreFields, OfflineStorage, SettingsDep, SettingsStorePossibleOptionsForColumn, StoreDataMap } from "@/offlineStorage/storage"
import { StoreSettingsData } from "@/offlineStorage/settingsStorage"

export interface SettingsStoreData {
   
}

export type DataType = SettingsStoreData & SettingsStorePossibleOptionsForColumn
// this is to get the keys of the interface

const defaultObject = defaultObjectMap.get('Settings')

const generalHandler = async (data: DataType, store: LocalForage, dep_tables_fields: string[], this_update_tables_field: string[]) => {
   let promises = []

   for (var need_to_be_updated_if_changed of dep_tables_fields) {
      if (this_update_tables_field.includes(need_to_be_updated_if_changed) && !ignoreFields.includes(need_to_be_updated_if_changed)) {
       
                let promise = store.setItem( need_to_be_updated_if_changed,data[need_to_be_updated_if_changed])
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

const handleMap: Map<OfflineStorage, any> = new Map()
handleMap.set('SmallContacts', generalHandler)
handleMap.set('BigContacts',generalHandler)
handleMap.set('Guides',generalHandler)
handleMap.set('Payments',generalHandler)
handleMap.set('Placement',generalHandler)
handleMap.set('Pricing',generalHandler)
handleMap.set('School',generalHandler)
handleMap.set('Programs',generalHandler)
handleMap.set('Messages',handleMessages)

const updateDeps = async (data: (DataType)) => {
   // 1. What tables are going to update as a result of school update?
   let promises = []
   // 2. What fields exist in related tables?
   for (const dep of SettingsDep) {
      const Handler = handleMap.get(dep)
      const Store = StoreDataMap.get(dep)

      const dep_tables_fields = Object.keys(defaultObjectMap?.get(dep))
      const this_update_tables_fields = Object.keys(data? data: {})
      let promise_array= Handler(data, Store, dep_tables_fields, this_update_tables_fields)
      promises.push(promise_array)
   }
    
   return promises
    



}

const updateStorage = async (data: DataType): Promise<void> => {
   const keys = Object.keys(data)
   let dep_promises = updateDeps(data)
   let promises = []
   for (const key of keys) {
      const promise = StoreSettingsData.setItem(key, data[key])
      promises.push(promise)

   }
   return Promise.all([dep_promises,...promises]).then((response) => { console.log("updated succesfully.") })

}
const getFromStorage = async (): Promise<DataType> => {
   const keys = Object.keys(defaultObject)
   let promises = []
   for (const key of keys) {
      // null coaelscing so if null it will become undefined (for convenient ifs)
      const promise = StoreSettingsData.getItem(key).then((res: string) => ({ [key]: res ?? undefined }))

      promises.push(promise)
      
   }
   return Promise.all([...promises]).then((results) => {

      let returned_obj = Object.assign({}, ...results);
      return returned_obj

   })

}





export { updateStorage, getFromStorage }

