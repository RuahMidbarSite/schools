"use client"
import { AddCitiesDistances, getAllNewOptions } from '@/db/distancesRequests'; 
import { Cities } from '@prisma/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InputActionMeta } from 'react-select';
import Select from 'react-select/async';

type CityTypeSelect = {
    Cities: Cities[], 
    setCities: any, 
}

export const SelectNewCities = ({ Cities, setCities }: CityTypeSelect) => {
    // State לניהול הערים
    const [citiesState, setCitiesState] = useState<Cities[]>(Cities);
    
    // State לנתונים
    const [AllData, setAllData] = useState<{ _id: number, "סמל ישוב": number, "תיאור ישוב": string }[]>();
    const [AllOptions, setAllOptions] = useState<{ value: number, label: string }[]>();
    const [currentOptions, setCurrentOptions] = useState<{ value: number, label: string }[]>();
    
    // UI States
    const [isLoading, setLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // מנגנון למניעת לחיצות כפולות
    const [inputValue, setInputValue] = useState<string>('');
    const [Key, setKey] = useState<number>(0);
    const [Open, setOpen] = useState<boolean>(false);
    const [selectedOptions, setSelectedOptions] = useState<{ value: number, label: string }[]>([]);
    
    const selectRef = useRef<any>(null);

    // עדכון רשימת הערים כאשר הפרופס (Props) משתנים או אחרי הוספה
    useEffect(() => {
        if(Cities) {
            setCitiesState(Cities);
        }
    }, [Cities]);

    // טעינת רשימת ערים אפשריות (מסנן את מה שכבר קיים)
    useEffect(() => {
        const updateOptions = async () => {
            if (citiesState) {
                getAllNewOptions(citiesState).then((res) => {
                    const map = res?.map((val) => ({
                        value: Number(val['סמל ישוב']),
                        label: val['תיאור ישוב'],
                    }));
                    setAllData(res);
                    setAllOptions(map);
                    setCurrentOptions(map);
                    setLoading(false);
                });
            }
        };
        updateOptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [citiesState]); 

    useEffect(() => { setOpen(true); }, [Key]);

    const onInputChange = useCallback((newValue: string, actionMeta: InputActionMeta): void => {
        setInputValue(newValue);
        if (newValue === '') {
            setCurrentOptions(AllOptions);
        } else {
            const filtered_options = AllOptions?.filter((val) => val.label.startsWith(newValue));
            setCurrentOptions(filtered_options);
            setKey((prevKey) => prevKey + 1);
        }
    }, [AllOptions]);

    useEffect(() => {
        if (selectRef.current) selectRef.current.focus();
    }, [Key]);

    // --- הפונקציה המעודכנת למניעת כפילויות ---
    const onCityUploadClick = useCallback(async () => {
        // מניעת ריצה אם כבר מתבצעת שליחה או אם אין בחירה
        if (isSubmitting || selectedOptions.length === 0 || !AllData) return;

        setIsSubmitting(true); // נעילת הכפתור

        try {
            const dataIDs = selectedOptions.map((val) => val.value);
            
            // סינון כפול: מוודאים שהעיר לא קיימת כבר ב-State המקומי למקרה של חוסר סנכרון
            const existingIds = citiesState.map(c => c.CityCode);
            const citiesToAdd = AllData.filter((val) => 
                dataIDs.includes(val['סמל ישוב']) && !existingIds.includes(val['סמל ישוב'])
            );

            if (citiesToAdd.length === 0) {
                // אם הכל כבר קיים, רק מנקים את הבחירה
                setSelectedOptions([]);
                setOpen(false);
                return;
            }

            // שליחה לשרת
            const { Cities: updatedCities } = await AddCitiesDistances(citiesState, citiesToAdd, []);
            
            // עדכון ה-State
            if (setCities) setCities(updatedCities);
            setCitiesState(updatedCities);

            // איפוס
            setSelectedOptions([]);
            setOpen(false);

        } catch (error) {
            console.error("Failed to add cities:", error);
            alert("אירעה שגיאה בהוספת העיר");
        } finally {
            setIsSubmitting(false); // שחרור הכפתור בכל מקרה
        }

    }, [AllData, citiesState, selectedOptions, setCities, isSubmitting]);

    const handleChange = useCallback((selectedOption: { value: number, label: string }[] | null) => {
        setSelectedOptions(selectedOption || []);
    }, []);

    return (
        <div className="flex flex-row items-center gap-2">
            <button 
                onClick={onCityUploadClick} 
                className={`px-4 py-2 text-white rounded transition-colors h-[38px] ${
                    isSubmitting || selectedOptions.length === 0 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-900 hover:bg-slate-800 cursor-pointer'
                }`}
                disabled={isSubmitting || selectedOptions.length === 0}
            >
                {isSubmitting ? 'מוסיף...' : 'הוסף ערים'}
            </button>
            
            <div className="min-w-[300px]">
                <Select
                    key={Key}
                    isMulti
                    isClearable={true}
                    value={selectedOptions}
                    closeMenuOnSelect={false}
                    ref={selectRef}
                    classNamePrefix="select"
                    placeholder={"חפש עיר..."}
                    cacheOptions
                    isSearchable={true}
                    isLoading={isLoading}
                    isRtl={true}
                    options={AllOptions}
                    defaultOptions={currentOptions}
                    onInputChange={onInputChange}
                    inputValue={inputValue}
                    menuIsOpen={Open}
                    onMenuClose={() => setOpen(false)}
                    onMenuOpen={() => setOpen(true)}
                    onChange={handleChange}
                    styles={{
                        control: (provided) => ({ ...provided, minWidth: '300px' }),
                        menu: (provided) => ({ ...provided, width: '300px', zIndex: 9999 }),
                        option: (provided, state) => ({
                            ...provided,
                            backgroundColor: state.isFocused ? '#e8f0fe' : provided.backgroundColor,
                            color: 'black'
                        }),
                    }}
                />
            </div>
             <div className="text-gray-500 font-medium text-sm mr-auto">
                סה"כ ערים: {citiesState.length}
            </div>
        </div>
    );
};