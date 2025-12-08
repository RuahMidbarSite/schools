
import { Cities, ReligionSector, School, SchoolsContact } from '@prisma/client';
import { ColDef } from 'ag-grid-community';
export interface CustomComponentFunc {
   
    AggridFieldName:string
    ApplyArrOrString:string[]|"All"
    Func:any
    
}
export interface OtherComponentsObject {
     [key: string]: CustomComponentFunc;
}
 // Define a function that takes a generic type T
function assertType<T>(data: any): T {
  return data as T;
}

export type rowName = "GetSchools"|"GetContacts" | string
export type ColDefName = "colDefsSchool"|"colDefsContacts" | string
export type schoolsData = School[]
export type rowData =schoolsData| SchoolsContact[]

export type columnsDefinition = ColDef[]
