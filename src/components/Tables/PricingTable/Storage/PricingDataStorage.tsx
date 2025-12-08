import { StoreGuidesData } from "@/offlineStorage/guidesStorage"
import { StorePaymentsData } from "@/offlineStorage/paymentsStorage"
import { StoreProgramsData } from "@/offlineStorage/programsStorage"
import { defaultObjectMap, GuidesDep, GuidesStorePossibleOptionsForColumn, OfflineStorage, PaymentStorePossibleOptionsForColumn, StoreDataMap } from "@/offlineStorage/storage"
import { Guide, Payments, PendingPayments, Program } from "@prisma/client"
import { ColDef } from "ag-grid-community"





export interface PaymentsRowData {
PendingPayments?:PendingPayments[],
Payments?:Payments[],
/** This is from ag grid so that we map it. */
Tablemodel?:any[],
}

export interface PaymentsColDefinition {
colDef:ColDef<Program>[]
}


export type DataType = (PaymentStorePossibleOptionsForColumn & PaymentsRowData )
    const defaultObject = defaultObjectMap.get('Payments')
    const handlePlacement = (data: DataType, store: LocalForage, dep_tables_fields: string[], this_update_tables_field: string[]) => {
          
     }    

    const handleMap: Map<OfflineStorage, any> = new Map()
    handleMap.set('Placement', handlePlacement)

   const updateDeps = async (data: (DataType)) => {
   let promises = []
   for (const dep of GuidesDep) {
      const Handler = handleMap.get(dep)
      const Store = StoreDataMap.get(dep)
      const default_object = defaultObjectMap.get(dep)
      const dep_tables_fields = default_object? Object.keys(default_object):[]
      const this_update_tables_fields = Object.keys(data)
      let promise_array= Handler(data, Store, dep_tables_fields, this_update_tables_fields)
      promises.push(promise_array)
   }
    
   return promises
    



}


   const updateStorage = async (data:DataType):Promise<void> => {
     const keys = Object.keys(data)
     let promises = []
    let dep_promises = updateDeps(data)
     for(const key of keys) {
         const promise = StorePaymentsData.setItem(key, data[key])
         promises.push(promise)     
    }
       return Promise.all([dep_promises,...promises]).then((response)=>{ console.log("updated succesfully.")})
     
   }

   const getFromStorage = async ():Promise<DataType> => {
   const keys = Object.keys(defaultObject)
   let promises = []
   for(const key of keys) {
      // null coaelscing so if null it will become undefined (for convenient ifs)
      const promise = StorePaymentsData.getItem(key).then((res:string)=>({[key]: res?? undefined}))
  
      promises.push(promise)      

   }
  return Promise.all([...promises]).then((results)=> {
        
        let returned_obj = Object.assign({}, ...results);
        return returned_obj

   })
  

 }

   const getFromStorageWithKey = async (SchoolID:number):Promise<DataType> => {
   const keys = Object.keys(defaultObject)
   let promises = []
   for(const key of keys) {
      // null coaelscing so if null it will become undefined (for convenient ifs)
      const promise = StorePaymentsData.getItem(`${key}-${SchoolID}`).then((res:string)=>({[key]: res?? undefined}))
  
      promises.push(promise)      

   }
  return Promise.all([...promises]).then((results)=> {
        
        let returned_obj = Object.assign({}, ...results);
        return returned_obj

   })
  

 }

 export {updateStorage,getFromStorage,getFromStorageWithKey}