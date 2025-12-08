"use client"
import { AddCitiesDistances, getAllNewOptions } from '@/db/distancesRequests';
import { Cities, Distances } from '@prisma/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InputActionMeta } from 'react-select';
import Select from 'react-select/async';
import { updateStorage } from '../Storage/Storage/SettingsDataStorage';

type CityTypeSelect = {
    Cities: Cities[], 
    Distances:Distances[],
    setCities:any,
}


export const SelectNewCities = ({ Cities,Distances,setCities}: CityTypeSelect) => {
    const [AllData, setAllData] = useState<{ _id: number, "סמל ישוב": number, "תיאור ישוב": string }[]>()
    const [AllOptions, setAllOptions] = useState<{ value: number, label: string }[]>()
    const [currentOptions, setCurrentOptions] = useState<{ value: number, label: string }[]>()
    const [isLoading, setLoading] = useState<boolean>(true)
    const [inputValue, setInputValue] = useState<string>('')
    const [Key, setKey] = useState<number>(0)
    const [Open, setOpen] = useState<boolean>(false)
    const [Focus, setFocus] = useState<boolean>(false)
    const selectRef = useRef<any>(null); // Create a ref for the select component
    const [selectedOptions, setSelectedOptions] = useState<{ value: number, label: string }[]>([])

    // we don't use Cities as dep, else whenever we add a new city, this would render again.
    useEffect(() => {
        const updateOptions = async () => {
            if (Cities) {
                getAllNewOptions(Cities).then((res) => {
                  
                    const map = res?.map((val) => ({
                        value: Number(val['סמל ישוב']),
                        label: val['תיאור ישוב'],
                    }))
                    setAllData(res)
                    setAllOptions(map)
                    setCurrentOptions(map)
                    setLoading(false)
                })

            }

        }
        updateOptions()



        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])


    useEffect(() => {
        setOpen(true)
        setFocus(true)
    }, [Key])
    const onInputChange = useCallback((newValue: string, actionMeta: InputActionMeta): void => {
        setInputValue(newValue)
        if (newValue == '') {
            setCurrentOptions(AllOptions)

        }
        else {
            const filtered_options = AllOptions.filter((val) => val.label.startsWith(newValue))
            setCurrentOptions(filtered_options)

            setKey(Key => Key + 1)
        }

    }, [AllOptions])


    useEffect(() => {
        if (selectRef.current) {
            // this will make the user able to write instantly without needing to click again.
            selectRef.current.focus();
        }
    }, [Key]);

    const onCityUploadClick = useCallback(() => {
     if(selectedOptions.length > 0) {
        let dataIDs = selectedOptions.map((val)=>val.value) 
        let data = AllData.filter((val)=>dataIDs.includes(val['סמל ישוב']))
        AddCitiesDistances(Cities,data,Distances).then(({Distances,Cities})=> {
                updateStorage({Distances:Distances, Cities:Cities})
                setSelectedOptions([]); 
                setOpen(false);
                setCities(Cities)
                
          })

    }

    }, [AllData, Cities, Distances, selectedOptions, setCities])
    const handleChange = useCallback((selectedOption: { value: number, label: string }[] | null) => {
        setSelectedOptions(selectedOption)
    }, []);
 
    return (
        <div className="flex flex-row">
            <button onClick={onCityUploadClick} className="bg-blue-900 hover:bg-slate-800 px-3 py-2 mr-2 z-[0] relative text-white border-none rounded cursor-pointer"> הוסף ערים </button>
            <Select
                key={Key}
                isMulti
                isClearable={true}
                value={selectedOptions}
                closeMenuOnSelect={false}
                ref={selectRef}
                className="relative z-0"
                classNamePrefix="select"
                placeholder={"חפש עיר"}
                cacheOptions
                isSearchable={true}
                isLoading={isLoading}
                isRtl={true}
                options={AllOptions}
                defaultOptions={currentOptions}
                onInputChange={onInputChange}
                inputValue={inputValue}
                menuIsOpen={Open}
                openMenuOnFocus={Focus}
                onMenuClose={() => setOpen(false)}
                onMenuOpen={() => setOpen(true)}
                onChange={handleChange}
                styles={{
                    control: (provided) => ({
                        ...provided,
                        width: '300px', // Set the desired width for the selected option control
                    }),
                    menu: (provided) => ({
                        ...provided,
                        width: '300px',
                    }),
                    option: (provided, state) => ({
                        ...provided,
                        width: '300px',
                        backgroundColor: state.isFocused ? '#e8f0fe' : provided.backgroundColor,
                    }),
                }}
            />


        </div>
    )

}

