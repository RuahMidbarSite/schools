"use client";
import { DefaultDataStore } from '@/offlineStorage/defaultsStorage';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const StatusContext = createContext({ defaultStatus: undefined, changeStatus:undefined });

export const StatusProvider = ({ children }) => {
    const [defaultStatus, setDefaultStatus] = useState(undefined); // Initially set to null

    useEffect(() => {
        // Check if there is a saved year in localStorage
        DefaultDataStore.getItem('defaultStatus').then((res) => {
           
          setDefaultStatus(res??undefined)
            
        })

    }, []); // This runs only once, when the component mounts
      
     
  const changeStatus = useCallback((status:string|undefined) =>{
      setDefaultStatus(status) 
 },[])
 
  useEffect(()=>{
    DefaultDataStore.setItem('defaultStatus',defaultStatus)

  },[defaultStatus])
    return (
        <StatusContext.Provider value={{ defaultStatus, changeStatus }}>
            {children}
        </StatusContext.Provider>
    );
};

// Custom hook to use the year context
export const useStatus = () => useContext(StatusContext);
