import { StoreGuidesData } from "@/offlineStorage/guidesStorage"
import { StoreMessagesData } from "@/offlineStorage/messagesStorage"
import { StorePaymentsData } from "@/offlineStorage/paymentsStorage"
import { StoreProgramsData } from "@/offlineStorage/programsStorage"
import { defaultObjectMap, GuidesDep, GuidesStorePossibleOptionsForColumn, MessagesStorePossibleOptionsForColumn, OfflineStorage, PaymentStorePossibleOptionsForColumn, StoreDataMap } from "@/offlineStorage/storage"
import { Guide, Payments, PendingPayments, Program, School, SchoolsContact } from "@prisma/client"
import { ColDef } from "ag-grid-community"

export interface MessagesRowData {
  Schools?: School[],
  schoolsContacts?: SchoolsContact[]
  /** This is from ag grid so that we map it. */
  Tablemodel?: any[],
}

export interface MessagesColDefinition {
  colDef: ColDef<Program>[]
}

export type DataType = (MessagesStorePossibleOptionsForColumn & MessagesRowData)

const defaultObject = defaultObjectMap.get('Messages')

// 🆕 מערכת גרסאות לזיהוי שינויים
const CACHE_VERSION_KEY = 'MessagesDataVersion'

// 🆕 פונקציה לעדכון מספר הגרסה
const incrementVersion = async (): Promise<number> => {
  try {
    const currentVersion = await StoreMessagesData.getItem(CACHE_VERSION_KEY) as number || 0
    const newVersion = currentVersion + 1
    await StoreMessagesData.setItem(CACHE_VERSION_KEY, newVersion)
    console.log(`📊 Cache version updated: ${currentVersion} → ${newVersion}`)
    return newVersion
  } catch (error) {
    console.error("❌ Error incrementing version:", error)
    return 0
  }
}

// 🆕 פונקציה לקבלת מספר הגרסה
export const getCacheVersion = async (): Promise<number> => {
  try {
    const version = await StoreMessagesData.getItem(CACHE_VERSION_KEY) as number
    return version || 0
  } catch (error) {
    console.error("❌ Error getting cache version:", error)
    return 0
  }
}

const handlePlacement = (data: DataType, store: LocalForage, dep_tables_fields: string[], this_update_tables_field: string[]) => {
  // יישום לעתיד
}

const handleMap: Map<OfflineStorage, any> = new Map()

// ✅ תיקון: בדיקה אם Handler קיים
const updateDeps = async (data: (DataType)) => {
  let promises = []
  for (const dep of GuidesDep) {
    const Handler = handleMap.get(dep)
    
    // ✅ בדיקה אם Handler קיים לפני קריאה
    if (!Handler || typeof Handler !== 'function') {
      console.warn(`Handler for ${dep} is not defined, skipping...`)
      continue
    }
    
    const Store = StoreDataMap.get(dep)
    const default_object = defaultObjectMap.get(dep)
    const dep_tables_fields = default_object ? Object.keys(default_object) : []
    const this_update_tables_fields = Object.keys(data)
    let promise_array = Handler(data, Store, dep_tables_fields, this_update_tables_fields)
    promises.push(promise_array)
  }
  return promises
}

// ✅ פונקציה משופרת לעדכון Storage
const updateStorage = async (data: DataType): Promise<void> => {
  console.log("💾 updateStorage called with keys:", Object.keys(data))
  
  const keys = Object.keys(data)
  let promises = []
  let dep_promises = updateDeps(data)
  
  // שמירת הנתונים ב-LocalForage
  for (const key of keys) {
    const promise = StoreMessagesData.setItem(key, data[key])
    promises.push(promise)
  }
  
  return Promise.all([dep_promises, ...promises]).then(async (response) => { 
    console.log("✅ Storage updated successfully")
    
    // עדכון מספר הגרסה
    const newVersion = await incrementVersion()
    
    // שידור אירוע מותאם אישית לכל הדפים/קומפוננטות
    if (typeof window !== 'undefined') {
      console.log("📡 DISPATCHING storageUpdated event...");
      console.log("📦 Keys being dispatched:", Object.keys(data));
      console.log("🔢 Version:", newVersion);
      
      window.dispatchEvent(new CustomEvent('storageUpdated', { 
        detail: { 
          keys: Object.keys(data),
          version: newVersion,
          timestamp: Date.now()
        } 
      }))
      
      console.log("✅ Event dispatched successfully!");
      
      // 🔍 בדיקה: האם יש מאזינים?
      setTimeout(() => {
        console.log("⏰ 2 seconds after dispatch - did any listener respond?");
      }, 2000);
    }
  })
}

const getFromStorage = async (): Promise<DataType> => {
  const keys = Object.keys(defaultObject)
  let promises = []
  
  for (const key of keys) {
    // null coalescing so if null it will become undefined (for convenient ifs)
    const promise = StoreMessagesData.getItem(key).then((res: string) => ({ [key]: res ?? undefined }))
    promises.push(promise)
  }
  
  return Promise.all([...promises]).then(async (results) => {
    let returned_obj = Object.assign({}, ...results)
    const version = await getCacheVersion()
    console.log("📖 Loaded from storage, version:", version)
    return returned_obj
  })
}

const getFromStorageWithKey = async (SchoolID: number): Promise<DataType> => {
  const keys = Object.keys(defaultObject)
  let promises = []
  
  for (const key of keys) {
    // null coalescing so if null it will become undefined (for convenient ifs)
    const promise = StorePaymentsData.getItem(`${key}-${SchoolID}`).then((res: string) => ({ [key]: res ?? undefined }))
    promises.push(promise)
  }
  
  return Promise.all([...promises]).then((results) => {
    let returned_obj = Object.assign({}, ...results)
    return returned_obj
  })
}

// 🆕 ניקוי מלא של ה-Storage (לצורך debugging)
export const clearStorage = async (): Promise<void> => {
  try {
    await StoreMessagesData.clear()
    console.log("🗑️ Storage cleared completely")
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('storageCleared'))
    }
  } catch (error) {
    console.error("❌ Error clearing storage:", error)
  }
}

// 🆕 Hook מותאם אישית לשימוש בקומפוננטות React
export const useStorageSync = (onUpdate?: (keys: string[], version: number) => void) => {
  // ניתן להשתמש בזה בקומפוננטות כדי להאזין לשינויים
  if (typeof window === 'undefined') return
  
  const handleStorageUpdate = (event: Event) => {
    const customEvent = event as CustomEvent
    const { keys, version } = customEvent.detail
    
    console.log("🔔 Storage updated from another component:", keys, "version:", version)
    
    if (onUpdate) {
      onUpdate(keys, version)
    }
  }
  
  const handleStorageCleared = () => {
    console.log("🔔 Storage was cleared")
    if (onUpdate) {
      onUpdate(['ALL'], 0)
    }
  }
  
  // רישום מאזינים
  window.addEventListener('storageUpdated', handleStorageUpdate)
  window.addEventListener('storageCleared', handleStorageCleared)
  
  // ניקוי
  return () => {
    window.removeEventListener('storageUpdated', handleStorageUpdate)
    window.removeEventListener('storageCleared', handleStorageCleared)
  }
}

export { updateStorage, getFromStorage, getFromStorageWithKey }