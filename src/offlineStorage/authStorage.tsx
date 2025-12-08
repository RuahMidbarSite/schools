"use client"

import localforage from 'localforage';


const StoreAuthContact = localforage.createInstance({
name:"Auth",
storeName:"Contacts"
})

const StoreAuthDrivePrograms = localforage.createInstance({
name:"Auth",
storeName:"Programs"
})

const StoreAuthDriveGuides = localforage.createInstance({
name:"Auth",
storeName:"Guides"
})
export {StoreAuthContact,StoreAuthDrivePrograms,StoreAuthDriveGuides}