import { BigContactsStoreData, DataType as DataTypeBigContacts } from "@/components/Tables/ContactsTable/Storage/BigContactsDataStorage"
import { DataType as DataTypeSchool } from "@/components/Tables/SchoolTable/Storage/SchoolDataStorage"
import { DataType as DataTypeSmallContacts, SmallContactsStoreData } from "@/components/Tables/SmallContactsTable/Storage/SmallContactsDataStorage"
import { Areas, Assigned_Guide, Cities, ColorCandidate, Colors, Distances, EducationStage, Guide, Guides_ToAssign, MessagePattern, Orders, Payments, ProductTypes, Profession, Program, ReligionSector, Role, School, SchoolsContact, SchoolTypes,  StatusContacts, StatusGuides, StatusPrograms, StatusSchools, Years } from "@prisma/client"
import { ColDef } from "ag-grid-community"
import localforage from "localforage"
import { StoreSchoolData } from "./schoolStorage"
import { StoreBigContactsData } from "./bigContactsStorage"
import { StoreSmallContactsData } from "./smallContactsStorage"
import Year from "react-datepicker/dist/year"
import { DataType as DataTypePrograms} from "@/components/Tables/ProgramsTable/Storage/ProgramsDataStorage"
import { StoreProgramsData } from "./programsStorage"
import { StoreGuidesData } from "./guidesStorage"
import { DataType as DataTypeGuides } from "@/components/Tables/GuidesTable/Storage/GuidesDataStorage"
import { DataType as DataTypePricing } from "@/components/Tables/PricingTable/Storage/PricingDataStorage"
import { StorePaymentsData } from "./paymentsStorage"
import { DataType as DataTypeSettings } from "@/components/SettingsPage/Storage/Storage/SettingsDataStorage"
import { StoreSettingsData } from "./settingsStorage"
import { StorePlacementData } from "./placementStorage"
import { DataType as DataTypePlacement } from "@/components/Tables/PlacementTable/Storage/PlacementDataStorage"
import { DataType as DataTypeMessages } from "@/components/Tables/Messages/Storage/MessagesDataStorage"
import { StoreMessagesData } from "./messagesStorage"


export type OfflineStorage = "School"|"BigContacts"|"SmallContacts"|"Programs"|"Payments"|"Guides"|"Payments"|"Placement"|"Pricing" | "Settings" | "Messages"

/** This is the storages you need to update after updating the table */
export const SchoolDep:OfflineStorage[] = ["BigContacts","Programs", "Messages","Payments"]
/** This is the storages you need to update after updating the table */
export const BigContactsDep:OfflineStorage[] = ["SmallContacts", "Messages","Payments"]
/** This is the storages you need to update after updating the table */
export const SmallContactsDep:OfflineStorage[] = ["BigContacts","SmallContacts","Programs","School","Payments"]
/** This is the storages you need to update after updating the table */
export const ProgramsDep:OfflineStorage[] = ["Placement", "Payments"]

export const GuidesDep:OfflineStorage[] = ["Placement"]

export const PaymentsDep:OfflineStorage[] = ["School","BigContacts","SmallContacts"]
//"Placement" as well
export const SettingsDep:OfflineStorage[]= ["School","BigContacts","SmallContacts","Programs","Guides","Payments","Placement", "Messages"]

export const MessagesDep:OfflineStorage[] = []
// in programs you can see what guides are assigned to the program.
export const PlacementDep:OfflineStorage[]= ["Programs"]



export type SchoolStorePossibleOptionsForColumn = 

     {Religion?:ReligionSector[],Cities?:Cities[],SchoolStatuses?:StatusSchools[],Stages?:EducationStage[],SchoolTypes?:SchoolTypes[],schoolsContacts?:SchoolsContact[],chosenPrograms?:Program[]}
  /** SchoolsContactsCount is the number of contacts in total. We need that to add new rows. 
   We dont need schools because we are inside a school at the time.
*/

export type SmallContactsStorePossibleOptionsForColumn = 
  {Role?:Role[],Schools?:School[],ContactsStatuses?:StatusContacts[]}

export type BigContactsStorePossibleOptionsForColumn = 
  {Role?:Role[],Schools?:School[],ContactsStatuses?:StatusContacts[]}

export type ProgramsStorePossibleOptionsForColumn =
 {Programs?:Program[],Schools?:School[],Cities?:Cities[],ProgramsStatuses?:StatusPrograms[],Areas?:Areas[],Years?:Years[],schoolsContacts?: SchoolsContact[],ProductTypes?:ProductTypes[],AssignedGuides?:Assigned_Guide[],Guides?:Guide[],Orders?:Orders[]}

export type GuidesStorePossibleOptionsForColumn = 
 {Cities?:Cities[],Religion?:ReligionSector[],Professions?:Profession[],Areas?:Areas[],GuidesStatuses?:StatusGuides[]}

export type PaymentStorePossibleOptionsForColumn = 
{Programs?:Program[],Schools?:School[],schoolsContacts?: SchoolsContact[],Years?:Years[]}

export type SettingsStorePossibleOptionsForColumn = 
{Role?:Role[], Years?:Years[], ProductTypes?:ProductTypes[],SchoolTypes?:SchoolTypes[],Stages?:EducationStage[],Religion?:ReligionSector[],Areas?:Areas[],Cities?:Cities[],ContactsStatuses?:StatusContacts[],ProgramsStatuses?:StatusPrograms[],SchoolStatuses?:StatusSchools[],GuidesStatuses?:StatusGuides[],Distances?:Distances[], Orders?:Orders[] }

export type PlacementsStorePossibleOptionsForColumn = 
{Professions?:Profession[],Guides?:Guide[],Programs?:Program[],Candidates?:Guides_ToAssign[],Colors?:Colors[],
ColorCandidates?:ColorCandidate[],Cities?:Cities[],Schools?:School[],schoolsContacts?: SchoolsContact[],Years?:Years[],Distances?:Distances[],
ProgramsStatuses?:StatusPrograms[],AssignedGuides?:Assigned_Guide[],Areas?:Areas[]
}
export type MessagesStorePossibleOptionsForColumn = 
{ 
Cities?:Cities[],Religion?:ReligionSector[],Role?:Role[],ContactsStatuses?:StatusContacts[],SchoolStatuses?:StatusSchools[],
Stages?:EducationStage[],messagePatterns?:MessagePattern[],SchoolTypes?:SchoolTypes[]
}



/** This is easy way in settings to find what is the field for the table. */
export const MapFromTableToField:Map<string,string> = new Map()
MapFromTableToField.set('Role','Role')
MapFromTableToField.set('Programs','Programs')
MapFromTableToField.set('ProductTypes','ProductTypes')
MapFromTableToField.set('SchoolTypes','SchoolTypes')
MapFromTableToField.set('EducationStage','Stages')
MapFromTableToField.set('ReligionSector','Religion')
MapFromTableToField.set('School','Schools')
MapFromTableToField.set('SchoolsContact','schoolsContacts')
MapFromTableToField.set('Years','Years')
MapFromTableToField.set('Areas','Areas')
MapFromTableToField.set('Status','Statuses')
MapFromTableToField.set('Profession','Professions')
MapFromTableToField.set('Cities','Cities')
MapFromTableToField.set('Distances','Distances')
MapFromTableToField.set('Orders','Orders')
MapFromTableToField.set('Guides_ToAssign','Candidates')
MapFromTableToField.set('Colors','Colors')
MapFromTableToField.set('ColorCandidate','ColorCandidates')
MapFromTableToField.set('Assigned_Guide','AssignedGuides')
MapFromTableToField.set('MessagePattern','messagePatterns')
MapFromTableToField.set('StatusContacts','ContactsStatuses')
MapFromTableToField.set('StatusSchools','SchoolStatuses')
MapFromTableToField.set('StatusGuides','GuidesStatuses')
MapFromTableToField.set('StatusPrograms','ProgramsStatuses')







type Defaults = DataTypeSchool | DataTypeSmallContacts |  DataTypeBigContacts | DataTypePrograms | DataTypeGuides | DataTypePricing | DataTypeSettings | DataTypeMessages
/** We want all the possible field in each object */
const defaultObjectSchool:Required<DataTypeSchool>= {
  Schools:[],
  Tablemodel:[],
  Religion:[],
  Cities:[],
  SchoolStatuses:[],
  schoolsContacts:[],
  SchoolTypes:[],
  Stages:[],
chosenPrograms:[],
Programs:[]
}

const defaultObjectSmallContacts:Required<DataTypeSmallContacts>= {
schoolsContacts:[],
Tablemodel:[],
Role:[],
ContactsStatuses:[],
Schools:[],
}

 const defaultObjectBigContacts:Required<DataTypeBigContacts>= {
schoolsContacts:[],
Tablemodel:[],
Role:[],
Schools:[],
ContactsStatuses:[]

}

const defaultObjectPrograms:Required<DataTypePrograms> = {
Programs:[],
Schools:[],
Tablemodel:[],
Cities:[],
ProgramsStatuses:[],
Areas:[],
Years:[],
schoolsContacts:[],
ProductTypes:[],
AssignedGuides:[],
Guides:[],
Orders:[],
ColorCandidates:[],
Candidates:[],
}

const defaultObjectGuides:Required<DataTypeGuides> = {
Cities:[],
Areas:[],
Religion:[],
Professions:[],
ProfessionsTablemodel:[],
Tablemodel:[],
GuidesStatuses:[],
Guides:[],
AssignedGuides:[],
ColorCandidates:[],
Candidates:[]
}

const defaultObjectPrices:Required<DataTypePricing> = {
Programs:[],
Payments:[],
PendingPayments:[],
Schools: [],
schoolsContacts:[],
Years:[],
Tablemodel:[],
}

const defaultObjectSettings:Required<DataTypeSettings> = {
Role:[],
Years:[],
ProductTypes:[],
SchoolTypes:[],
Stages:[],
Religion:[],
Areas:[],
Cities:[],
SchoolStatuses:[],
ProgramsStatuses:[],
ContactsStatuses:[],
GuidesStatuses:[],
Distances:[],
Orders:[]
}

export const defaultPlacementObject: Required<DataTypePlacement> = {
  Professions: [],
  Guides: [],
  Programs: [],
  Candidates: [],
  Colors: [],
  ColorCandidates: [],
  Cities: [],
  Schools: [],
  schoolsContacts: [],
  Years: [],
  Distances: [],
  ProgramsStatuses: [],
  AssignedGuides: [],
 Tablemodel:[],
 Filters:[],
Areas:[]
 
};

export const defaultMessagesObject:Required<DataTypeMessages> = {
  Cities: [],
  Religion: [],
  Role: [],
  SchoolStatuses: [], 
  ContactsStatuses:[],
  Stages: [],
  messagePatterns: [],
  SchoolTypes: [],
  Schools: [],
  schoolsContacts: [],
  Tablemodel: []
}

export var defaultObjectMap:Map<OfflineStorage,Defaults> = new Map()
defaultObjectMap.set('School',defaultObjectSchool)
defaultObjectMap.set('BigContacts',defaultObjectBigContacts)
defaultObjectMap.set('SmallContacts',defaultObjectSmallContacts)
defaultObjectMap.set('Programs',defaultObjectPrograms)
defaultObjectMap.set('Guides',defaultObjectGuides)
defaultObjectMap.set('Payments',defaultObjectPrices)
defaultObjectMap.set('Settings',defaultObjectSettings)
defaultObjectMap.set('Placement',defaultPlacementObject)
defaultObjectMap.set('Messages',defaultMessagesObject)
export var StoreDataMap:Map<OfflineStorage,LocalForage> = new Map()
StoreDataMap.set('School',StoreSchoolData)
StoreDataMap.set('BigContacts',StoreBigContactsData)
StoreDataMap.set('SmallContacts',StoreSmallContactsData)  
StoreDataMap.set('Programs',StoreProgramsData)
StoreDataMap.set('Guides',StoreGuidesData)
StoreDataMap.set('Settings',StoreSettingsData)
StoreDataMap.set('Placement',StorePlacementData)
StoreDataMap.set('Messages',StoreMessagesData)
StoreDataMap.set('Payments',StorePaymentsData)


export const ignoreFields = ["Tablemodel","rowData"]

//type BigContactsStoreDataDeps

//type BigContactsColumnsDataDeps

//type SmallContactsColumnsDataDeps

//type SmallContactsColumnsDataDeps




