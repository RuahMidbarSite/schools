"use client"

import localforage from 'localforage';

const StorePlacementData = localforage.createInstance({
  name: "Placement",
  storeName   : 'PlacementData'
});

const StorePlacementColumns = localforage.createInstance({
  name: "Placement",
  storeName   : 'PlacementColumns'
});
export {StorePlacementData,StorePlacementColumns}