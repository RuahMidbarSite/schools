"use client";
import { DefaultDataStore } from '@/offlineStorage/defaultsStorage';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';



export const YearContext = createContext<{ selectedYear: string; changeYear: (year: string | undefined) => void }>({ 
    selectedYear: undefined, 
    changeYear: undefined 
});

export const YearProvider = ({ children }) => {

    const [selectedYear, setSelectedYear] = useState<string>(undefined); 

    useEffect(() => {
   
        DefaultDataStore.getItem<string>('selectedYear').then((res) => {

            setSelectedYear(res ?? undefined);
        });
    }, []); 

    const changeYear = useCallback((year: string | undefined) => {
        setSelectedYear(year ?? undefined); 
    }, []);
 
  useEffect(()=>{
    DefaultDataStore.setItem('selectedYear',selectedYear)

  },[selectedYear])
    return (
        <YearContext.Provider value={{ selectedYear, changeYear }}>
            {children}
        </YearContext.Provider>
    );
};

// Custom hook to use the year context
export const useYear = () => useContext(YearContext);
