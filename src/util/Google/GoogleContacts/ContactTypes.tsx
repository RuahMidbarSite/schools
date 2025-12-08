
// maybe later will add types when needed.

import { School, SchoolsContact } from "@prisma/client"

export type ContactData = {
name?:string,
cellPhone?:string
emailAddress?:string
}

export type UpdateContactData = {
 row?:SchoolsContact
 school?:School
}

//TODO: callback function needs to returns a state like in the picker in case of failure
// if exists already or not enough information etc..
export type UploadContactConfiguration = {
clientId: string;
developerKey: string;
 customScopes?: string[];
token?:string
 data?:ContactData,
callbackFunction?:(data:any)=> any
}
export type UpdateContactConfiguration = {
clientId: string;
developerKey: string;
 customScopes?: string[];
token?:string
 data?:UpdateContactData,
callbackFunction?:(data:any)=> any
}



export type DeleteContactConfiguration = {
clientId: string;
developerKey: string;
 customScopes?: string[];
token?:string
 data?:UpdateContactData,
callbackFunction?:(data:any)=> any
}
export type onlyAuth = {
clientId: string;
developerKey: string;
customScopes?: string[];
token?:string
}
export const defaultuploadConfiguration: UploadContactConfiguration = {
  clientId: "",
  developerKey: "",
  
};

export enum callBackState {
Success,
AlreadyExists,
NotEnoughInformation

}

export type callBackdata = {
resourceName:string,
state:callBackState,
errtext?:string

}

export type Connection =  {
resourceName:string,
etag:string,
names:string[]
phoneNumbers:string[]
}

// need to add more information later...
export type People= {
 connections:Connection[],
totalItems:number,
totalPeople:number


}