"use client"
import {SchoolsContact } from "@prisma/client"
import { ColDef } from "ag-grid-community"
import {StoreAuthDrivePrograms} from '@/offlineStorage/authStorage'
import { authResult } from "@/util/Google/typeDefs"
import { OAuthTokenResponseGoogle } from "@/app/googleCallback/page"

export interface AuthDriveStore {
/** This is a result of oauth2 */
authResult:OAuthTokenResponseGoogle
/** the timestamp is seconds from year 1970 */
timeStamp:number 

}
// this is to get the keys of the interface
const defaultObject:AuthDriveStore = {
authResult:null,
timeStamp:null
}
 
   const updateStorage = async (data:AuthDriveStore):Promise<void> => {
     const keys = Object.keys(data)
     let promises = []
     for(const key of keys) {
      const promise = StoreAuthDrivePrograms.setItem(key, data[key])
      promises.push(promise)      
      
    }
       return Promise.all([...promises]).then((response)=>{ console.log("updated succesfully.")})
     
   }
  const getFromStorage = async ():Promise<AuthDriveStore> => {
   const keys = Object.keys(defaultObject)
   let promises = []
   for(const key of keys) {
      // null coaelscing so if null it will become undefined (for convenient ifs)
      const promise = StoreAuthDrivePrograms.getItem(key).then((res:string)=>({[key]: res?? undefined}))
  
      promises.push(promise)      

   }
  return Promise.all([...promises]).then((results)=> {
        
        let returned_obj = Object.assign({}, ...results);
        return returned_obj

   })
  

 }

    export {updateStorage,getFromStorage}

