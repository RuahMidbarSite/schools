"use client"

import localforage from 'localforage';


const StoreGuidesData = localforage.createInstance({
name:"Guides",
storeName:"GuidesData"
})

const StoreGuidesColumns = localforage.createInstance({
name:"Guides",
storeName:"GuidesColumns"
})
export {StoreGuidesData,StoreGuidesColumns}