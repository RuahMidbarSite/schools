"use client"

import { ColDef, ColumnState } from "ag-grid-community"
import {StoreGuidesColumns} from '@/offlineStorage/guidesStorage'

export interface PaymentsStoreColumns {
colState:ColumnState[],

}
// this is to get the keys of the interface
const defaultObject:PaymentsStoreColumns = {
colState:[],
}
 
   const updateStorage = async (data:PaymentsStoreColumns):Promise<void> => {
     const keys = Object.keys(data)
     let promises = []
     for(const key of keys) {
      const promise = StoreGuidesColumns.setItem(key, data[key])
      promises.push(promise)      
      
    }
       return Promise.all([...promises]).then((response)=>{ console.log("updated succesfully.")})
     
   }
  const getFromStorage = async ():Promise<PaymentsStoreColumns> => {
   const keys = Object.keys(defaultObject)
   let promises = []
   for(const key of keys) {
      // null coaelscing so if null it will become undefined (for convenient ifs)
      const promise = StoreGuidesColumns.getItem(key).then((res:string)=>({[key]: res?? undefined}))
  
      promises.push(promise)      

   }
  return Promise.all([...promises]).then((results)=> {
        
        let returned_obj = Object.assign({}, ...results);
        return returned_obj

   })
  

 }

    export {updateStorage,getFromStorage}