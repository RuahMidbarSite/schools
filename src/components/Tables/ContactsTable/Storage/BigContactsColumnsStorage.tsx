"use client"

import { ColDef, ColumnState } from "ag-grid-community"
import {StoreBigContactsColumns} from '@/offlineStorage/bigContactsStorage'

export interface BigContactsStoreColumns {
colState:ColumnState[],

}
// this is to get the keys of the interface
const defaultObject:BigContactsStoreColumns = {
colState:[],
}
 
   const updateStorage = async (data:BigContactsStoreColumns):Promise<void> => {
     const keys = Object.keys(data)
     let promises = []
     for(const key of keys) {
      const promise = StoreBigContactsColumns.setItem(key, data[key])
      promises.push(promise)      
      
    }
       return Promise.all([...promises]).then((response)=>{ console.log("updated succesfully.")})
     
   }
  const getFromStorage = async ():Promise<BigContactsStoreColumns> => {
   const keys = Object.keys(defaultObject)
   let promises = []
   for(const key of keys) {
      // null coaelscing so if null it will become undefined (for convenient ifs)
      const promise = StoreBigContactsColumns.getItem(key).then((res:string)=>({[key]: res?? undefined}))
  
      promises.push(promise)      

   }
  return Promise.all([...promises]).then((results)=> {
        
        let returned_obj = Object.assign({}, ...results);
        return returned_obj

   })
  

 }

    export {updateStorage,getFromStorage}

