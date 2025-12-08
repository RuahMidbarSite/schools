
"use client"

import localforage from 'localforage';


const StoreSmallContactsData = localforage.createInstance({
  name: "SmallContacts",
  storeName   : 'SmallContacts'
});
const StoreSmallContactsColumns = localforage.createInstance({
  name: "SmallContacts",
  storeName   : 'SmallContactsDataColumns'
});

export {StoreSmallContactsData,StoreSmallContactsColumns}