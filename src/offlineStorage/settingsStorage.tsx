"use client"

import localforage from 'localforage';


const StoreSettingsData = localforage.createInstance({
name:"Settings",
storeName:"SettingsData"
})


export {StoreSettingsData}