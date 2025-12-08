"use client"

import localforage from 'localforage';

const StoreBigContactsData = localforage.createInstance({
  name: "BigContacts",
  storeName   : 'BigContactsData'
});

const StoreBigContactsColumns = localforage.createInstance({
  name: "BigContacts",
  storeName   : 'BigContactsDataColumns'
});
export {StoreBigContactsData,StoreBigContactsColumns}