"use client"

import localforage from 'localforage';


const StoreSchoolData = localforage.createInstance({
  name: "School",
  storeName   : 'SchoolData'
  
});

const StoreSchoolColumns = localforage.createInstance({
  name: "School",
  storeName   : 'SchoolColumns'
  
});




export {StoreSchoolData,StoreSchoolColumns}