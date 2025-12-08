"use client"

import localforage from 'localforage';

const StoreMessagesData = localforage.createInstance({
  name: "Messages",
  storeName   : 'Messages'
});


export {StoreMessagesData}