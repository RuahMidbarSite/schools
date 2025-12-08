"use client"

import localforage from 'localforage';
import { OfflineStorage } from './storage';


const StoreProgramsData = localforage.createInstance({
name:"Programs",
storeName:"ProgramsData"
})

const StoreProgramsColumns = localforage.createInstance({
name:"Programs",
storeName:"ProgramsColumns"
})
    
export {StoreProgramsData,StoreProgramsColumns}