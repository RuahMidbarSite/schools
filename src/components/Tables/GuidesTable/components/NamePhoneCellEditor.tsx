import { getProgramWithId } from "@/db/programsRequests";
import { Guide, Program } from "@prisma/client";
import { ICellEditorParams, ICellRendererParams } from "ag-grid-community";
import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { MdInsertLink } from "react-icons/md";

interface NamePhoneCellEditor extends ICellEditorParams<Guide> {
    AllGuides: Guide[]

}


export const NamePhoneCellEditor = forwardRef(({ AllGuides, ...props }: NamePhoneCellEditor, ref: any) => {
    const [CellPhone, setCellPhone] = useState<string>(props.data?.CellPhone || "")
    const [Name, setName] = useState<string>(props.data?.FirstName || "")

    const inputRefName = useRef<HTMLInputElement>(null);
    const inputRefPhone = useRef<HTMLInputElement>(null);
    
    // חשיפת מתודות ל-ag-Grid דרך imperative handle
    React.useImperativeHandle(ref, () => ({
        getValue: () => {
            // עדכון מלא של השורה כאשר העורך נסגר חיצונית
            const nameValue = inputRefName.current?.value || Name;
            const phoneValue = inputRefPhone.current?.value || CellPhone;
            
            const updatedData = {
                ...props.node.data,
                FirstName: nameValue,
                CellPhone: phoneValue
            };
            
            // שימוש ב-applyTransaction לעדכון
            props.api.applyTransaction({ 
                update: [updatedData] 
            });
            
            // החזרת הערך של השדה הנוכחי (FirstName)
            return nameValue;
        },
        isCancelAfterEnd: () => {
            // לא לבטל את העריכה אחרי סיום
            return false;
        }
    }));
    
    useEffect(() => {
        const getData = async () => {
            if (!AllGuides || !props.data) return;

            const guide: Guide = AllGuides.find((guide) => guide.Guideid === props.data.Guideid)

            if (guide) {
                setCellPhone(guide?.CellPhone || "")
                setName(guide?.FirstName || "")
            }
        }
        getData()

    }, [AllGuides, props])

    const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nameValue = inputRefName.current?.value || "";
        const phoneValue = inputRefPhone.current?.value || "";

        console.log("🔵 Editor onSubmit called");
        console.log("📝 Name value:", nameValue);
        console.log("📱 Phone value:", phoneValue);

        // עדכון הנתונים בשורה הנוכחית
        const updatedData = {
            ...props.node.data,
            FirstName: nameValue,
            CellPhone: phoneValue
        };

        console.log("🗂️ Updated data:", updatedData);

        // שימוש ב-applyTransaction לעדכון
        props.api.applyTransaction({ 
            update: [updatedData] 
        });

        console.log("✅ Transaction applied");

        // סגירת העורך
        props.api.stopEditing();

    }, [props.node, props.api])


    const onInvalid = useCallback((event: React.FormEvent<HTMLInputElement>, name: string) => {
        if (event.currentTarget) {
            if (name === "Name") {
                event.currentTarget.setCustomValidity("חסר שם")
            }
            else {
                event.currentTarget.setCustomValidity("חסר טלפון")
            }
        }

    }, [])
    
    const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, name: string) => {
        // איפוס הודעת השגיאה המותאמת אישית
        event.currentTarget.setCustomValidity("");
        
        if (name === "Name") {
            setName(event.target.value)
        }
        else {
            setCellPhone(event.target.value)
        }
    }, [])

    // פונקציה למניעת העברת אירועי מקלדת ל-ag-Grid
    const onKeyDown = useCallback((event: React.KeyboardEvent) => {
        event.stopPropagation();
    }, [])

    const getCell = useCallback(() => {
        return (
            <form 
                className="max-w-sm mx-auto overflow-visible absolute bg-white w-[300px] z-10 shadow-lg border border-gray-200 rounded-lg p-4" 
                onSubmit={onSubmit}
                onKeyDown={onKeyDown}
            >
                <div className="mb-5">
                    <label htmlFor="Name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">שם פרטי</label>
                    <input 
                        ref={inputRefName} 
                        onChange={(event) => onChange(event, "Name")} 
                        onInvalid={(event) => onInvalid(event, "Name")} 
                        type="text"
                        value={Name}
                        id="ProgramName" 
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" 
                        required 
                    />
                </div>
                <div className="mb-5">
                    <label htmlFor="CellPhone" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">טלפון</label>
                    <input 
                        ref={inputRefPhone} 
                        onChange={(event) => onChange(event, "CellPhone")} 
                        onInvalid={(event) => onInvalid(event, "CellPhone")} 
                        value={CellPhone}
                        type="text"
                        id="CellPhone" 
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" 
                        placeholder="טלפון" 
                        required 
                    />
                </div>
                <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">שמור</button>
            </form>

        )

    }, [CellPhone, Name, onChange, onInvalid, onSubmit, onKeyDown])

    return getCell()

})

NamePhoneCellEditor.displayName = "NamePhoneCellEditor"