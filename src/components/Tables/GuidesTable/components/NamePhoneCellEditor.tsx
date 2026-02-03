import { Guide } from "@prisma/client";
import { ICellEditorParams } from "ag-grid-community";
import React, { forwardRef, useCallback, useRef, useState } from "react";

interface NamePhoneCellEditorProps extends ICellEditorParams<Guide> {
    AllGuides: Guide[]
}

export const NamePhoneCellEditor = forwardRef(({ AllGuides, ...props }: NamePhoneCellEditorProps, ref: any) => {
    // אתחול ה-state פעם אחת בלבד מה-props.data
    const [cellPhone, setCellPhone] = useState<string>(props.data?.CellPhone || "");
    const [name, setName] = useState<string>(props.data?.FirstName || "");

    const inputRefName = useRef<HTMLInputElement>(null);
    const inputRefPhone = useRef<HTMLInputElement>(null);
    
    React.useImperativeHandle(ref, () => ({
        getValue: () => {
            // החזרת הערך הנוכחי של השם
            return inputRefName.current?.value || name;
        },
        
        // מונע ביטול עריכה בטעינה
        isCancelBeforeStart: () => {
            return false;
        },

        // נותן פוקוס לשדה השם מיד כשהעורך נפתח
        afterGuiAttached: () => {
            if (inputRefName.current) {
                inputRefName.current.focus();
                inputRefName.current.select();
            }
        }
    }));
    
    const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nameValue = inputRefName.current?.value?.trim() || "";
        const phoneValue = inputRefPhone.current?.value?.trim() || "";

        console.log("🔵 Editor onSubmit called");
        console.log("📝 Name value:", nameValue);
        console.log("📱 Phone value:", phoneValue);

        // וידוא שיש ערכים
        if (!nameValue || !phoneValue) {
            console.warn("⚠️ Missing required values");
            return;
        }

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

    }, [props.node, props.api]);

    const onInvalid = useCallback((event: React.FormEvent<HTMLInputElement>, fieldName: string) => {
        if (event.currentTarget) {
            if (fieldName === "Name") {
                event.currentTarget.setCustomValidity("חסר שם פרטי");
            } else {
                event.currentTarget.setCustomValidity("חסר מספר טלפון");
            }
        }
    }, []);
    
    const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        // איפוס הודעת השגיאה המותאמת אישית
        event.currentTarget.setCustomValidity("");
        
        const value = event.target.value;
        
        if (fieldName === "Name") {
            setName(value);
        } else {
            setCellPhone(value);
        }
    }, []);

    // טיפול במקלדת - מאפשר Tab, Enter, ESC
    const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLFormElement>) => {
        // ESC - ביטול עריכה
        if (event.key === 'Escape') {
            event.stopPropagation();
            props.api.stopEditing(true);
            return;
        }
        
        // Tab - מעבר בין שדות (לא עוצרים propagation)
        if (event.key === 'Tab') {
            // אל תעצור את ה-propagation - תן ל-Tab לעבוד טבעי
            return;
        }
        
        // Enter - שליחת טופס (לא עוצרים propagation)
        if (event.key === 'Enter') {
            return;
        }
        
        // חיצים - לא עוצרים כדי לאפשר תנועה בתוך השדה
        if (event.key.startsWith('Arrow')) {
            return;
        }
        
        // לכל השאר - עצור propagation כדי שag-Grid לא יתפוס
        event.stopPropagation();
    }, [props.api]);

    // טיפול נפרד ב-Tab בשדות
    const handleTabOnInput = useCallback((event: React.KeyboardEvent<HTMLInputElement>, isNameField: boolean) => {
        if (event.key === 'Tab') {
            event.preventDefault(); // עוצר את ההתנהגות הרגילה
            
            if (isNameField && !event.shiftKey) {
                // Tab בשדה השם (קדימה) -> עבור לטלפון
                inputRefPhone.current?.focus();
            } else if (!isNameField && event.shiftKey) {
                // Shift+Tab בשדה הטלפון (אחורה) -> עבור לשם
                inputRefName.current?.focus();
            }
        }
    }, []);

    return (
        <form 
            className="max-w-sm mx-auto overflow-visible absolute bg-white w-[300px] z-[9999] shadow-lg border border-gray-200 rounded-lg p-4" 
            onSubmit={onSubmit}
            onKeyDown={onKeyDown}
        >
            <div className="mb-5">
                <label 
                    htmlFor="Name" 
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    שם פרטי
                </label>
                <input 
                    ref={inputRefName} 
                    onChange={(event) => onChange(event, "Name")} 
                    onInvalid={(event) => onInvalid(event, "Name")}
                    onKeyDown={(event) => handleTabOnInput(event, true)}
                    type="text"
                    value={name}
                    id="Name" 
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" 
                    placeholder="שם פרטי"
                    required 
                    autoComplete="off"
                />
            </div>
            <div className="mb-5">
                <label 
                    htmlFor="CellPhone" 
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                    טלפון
                </label>
                <input 
                    ref={inputRefPhone} 
                    onChange={(event) => onChange(event, "CellPhone")} 
                    onInvalid={(event) => onInvalid(event, "CellPhone")}
                    onKeyDown={(event) => handleTabOnInput(event, false)}
                    value={cellPhone}
                    type="tel"
                    id="CellPhone" 
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" 
                    placeholder="מספר טלפון" 
                    required 
                    autoComplete="off"
                />
            </div>
            <button 
                type="submit" 
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
                שמור
            </button>
        </form>
    );
});

NamePhoneCellEditor.displayName = "NamePhoneCellEditor";