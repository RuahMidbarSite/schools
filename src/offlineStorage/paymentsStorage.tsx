"use client"

import localforage from 'localforage';


const StorePaymentsData = localforage.createInstance({
name:"Payments",
storeName:"PaymentsData"
})

const StoreStorePaymentsDataColumns = localforage.createInstance({
name:"Payments",
storeName:"PaymentsColumns"
})

export {StorePaymentsData,StoreStorePaymentsDataColumns}