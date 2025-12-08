"use client"

import localforage from 'localforage';

const DefaultDataStore = localforage.createInstance({
  name: "Defaults",
  storeName   : 'Defaults'
});


export {DefaultDataStore}