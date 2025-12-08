"use client"
import {SchoolsContact } from "@prisma/client"
import { ColDef } from "ag-grid-community"
import {StoreAuthContact} from '@/offlineStorage/authStorage'
import { authResult } from "@/util/Google/typeDefs"
import { OAuthTokenResponseGoogle } from "@/app/googleCallback/page"

export interface AuthContactsStore {
/** This is a result of oauth2 */
authResult:OAuthTokenResponseGoogle
/** the timestamp is seconds from year 1970 */
timeStamp:number  

}
// this is to get the keys of the interface
const defaultObject:AuthContactsStore = {
authResult:null,
timeStamp:null
}
 
   const updateStorage = async (data:AuthContactsStore):Promise<void> => {
     const keys = Object.keys(data)
     let promises = []
     for(const key of keys) {
      const promise = StoreAuthContact.setItem(key, data[key])
      promises.push(promise)      
      
    }
       return Promise.all([...promises]).then((response)=>{ console.log("updated succesfully.")})
     
   }
  const getFromStorage = async ():Promise<AuthContactsStore> => {
   const keys = Object.keys(defaultObject)
   let promises = []
   for(const key of keys) {
      // null coaelscing so if null it will become undefined (for convenient ifs)
      const promise = StoreAuthContact.getItem(key).then((res:string)=>({[key]: res?? undefined}))
  
      promises.push(promise)      

   }
  return Promise.all([...promises]).then((results)=> {
        
        let returned_obj = Object.assign({}, ...results);
        return returned_obj

   })
  

 }
export {updateStorage,getFromStorage }
 