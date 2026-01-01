"use client"
import { DeleteCitiesDitances } from '@/db/distancesRequests';
import { Cities, Distances } from '@prisma/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InputActionMeta } from 'react-select';
import Select from 'react-select/async';
import { updateStorage } from '../Storage/Storage/SettingsDataStorage';

// תיקון: הגדרת הטיפוס כוללת כעת את Distances
type CityTypeSelectProps = {
    Cities: Cities[],
    Distances: Distances[],
    setCities: any
}

export const SelectDeleteCities = ({ setCities, Cities, Distances }: CityTypeSelectProps) => {
    const [AllData, setAllData] = useState<Cities[]>()
    const [AllOptions, setAllOptions] = useState<{ value: number, label: string }[]>()
    const [currentOptions, setCurrentOptions] = useState<{ value: number, label: string }[]>()
    const [isLoading, setLoading] = useState<boolean>(true)
    const [inputValue, setInputValue] = useState<string>('')
    const [Key, setKey] = useState<number>(0)
    const [Open, setOpen] = useState<boolean>(false)
    const [Focus, setFocus] = useState<boolean>(false)
    const selectRef = useRef<any>(null); 
    const [selectedOptions, setSelectedOptions] = useState<{ value: number, label: string }[]>([])

    useEffect(() => {
        const updateOptions = async () => {
            if (Cities) {
                const map = Cities?.map((val) => ({
                    value: val.CityCode,
                    label: val.CityName,
                }))
                setAllData(Cities)
                setAllOptions(map)
                setCurrentOptions(map)
                setLoading(false)
            }
        }
        updateOptions()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Cities])

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
            const filtered_options = AllOptions?.filter((val) => val.label.startsWith(newValue))
            setCurrentOptions(filtered_options)
            setKey(Key => Key + 1)
        }
    }, [AllOptions, Key])

    useEffect(() => {
        if (selectRef.current) {
            selectRef.current.focus();
        }
    }, [Key]);

    const onCityDeleteClick = useCallback(() => {
        if (selectedOptions.length > 0) {
            if (AllData) {
                DeleteCitiesDitances(AllData, selectedOptions, Distances).then(({ Distances, Cities }) => {
                    updateStorage({ Distances: Distances, Cities: Cities })
                    setSelectedOptions([]); 
                    setOpen(false);
                    setCities(Cities)
                })
            }
        }
    }, [AllData, Distances, selectedOptions, setCities])

    const handleChange = useCallback((selectedOption: any) => {
        setSelectedOptions(selectedOption)
    }, []);

    return (
        <div className="flex flex-row">
            <button onClick={onCityDeleteClick} className="bg-blue-900 hover:bg-slate-800 px-3 py-2 mr-2 z-[0] relative text-white border-none rounded cursor-pointer"> מחק ערים</button>
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
                        width: '300px', 
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