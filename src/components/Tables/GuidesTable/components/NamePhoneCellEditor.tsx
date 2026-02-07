import { Guide } from "@prisma/client";
import { ICellEditorParams } from "ag-grid-community";
import React, { forwardRef, useCallback, useRef, useState } from "react";

interface NamePhoneCellEditorProps extends ICellEditorParams<Guide> {
    AllGuides: Guide[]
}

export const NamePhoneCellEditor = forwardRef(({ AllGuides, ...props }: NamePhoneCellEditorProps, ref: any) => {
    const [cellPhone, setCellPhone] = useState<string>(props.data?.CellPhone || "");
    const [name, setName] = useState<string>(props.data?.FirstName || "");

    const inputRefName = useRef<HTMLInputElement>(null);
    const inputRefPhone = useRef<HTMLInputElement>(null);
    
    React.useImperativeHandle(ref, () => ({
        getValue: () => {
            // הגנה: אם ה-input כבר לא קיים ב-DOM (בגלל ביטול), מחזירים את ה-state האחרון
            return inputRefName.current ? inputRefName.current.value : name;
        },
        
        isCancelBeforeStart: () => {
            return false;
        },

        afterGuiAttached: () => {
            // שימוש ב-requestAnimationFrame מבטיח פוקוס בדיוק כשהדפדפן מוכן
            requestAnimationFrame(() => {
                if (inputRefName.current) {
                    inputRefName.current.focus();
                    inputRefName.current.select();
                }
            });
        }
    }));
    
    const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nameValue = inputRefName.current?.value?.trim() || "";
        const phoneValue = inputRefPhone.current?.value?.trim() || "";

        if (!nameValue || !phoneValue) return;

        const updatedData = {
            ...props.node.data,
            FirstName: nameValue,
            CellPhone: phoneValue
        };

        props.api.applyTransaction({ update: [updatedData] });
        props.api.stopEditing();
    }, [props.node, props.api]);

    const onInvalid = useCallback((event: React.FormEvent<HTMLInputElement>, fieldName: string) => {
        if (event.currentTarget) {
            event.currentTarget.setCustomValidity(fieldName === "Name" ? "חסר שם פרטי" : "חסר מספר טלפון");
        }
    }, []);
    
    const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        event.currentTarget.setCustomValidity("");
        const value = event.target.value;
        if (fieldName === "Name") setName(value);
        else setCellPhone(value);
    }, []);

    const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLFormElement>) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            props.api.stopEditing(true);
            return;
        }
        if (event.key === 'Tab' || event.key === 'Enter' || event.key.startsWith('Arrow')) return;
        event.stopPropagation();
    }, [props.api]);

    const handleTabOnInput = useCallback((event: React.KeyboardEvent<HTMLInputElement>, isNameField: boolean) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            if (isNameField && !event.shiftKey) inputRefPhone.current?.focus();
            else if (!isNameField && event.shiftKey) inputRefName.current?.focus();
        }
    }, []);

    return (
        <form 
            className="max-w-sm mx-auto overflow-visible absolute bg-white w-[300px] z-[9999] shadow-lg border border-gray-200 rounded-lg p-4" 
            onSubmit={onSubmit}
            onKeyDown={onKeyDown}
        >
            <div className="mb-5">
                <label htmlFor="Name" className="block mb-2 text-sm font-medium text-gray-900">שם פרטי</label>
                <input 
                    ref={inputRefName} 
                    onChange={(event) => onChange(event, "Name")} 
                    onInvalid={(event) => onInvalid(event, "Name")}
                    onKeyDown={(event) => handleTabOnInput(event, true)}
                    type="text"
                    value={name}
                    id="Name" 
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" 
                    placeholder="שם פרטי"
                    required 
                    autoComplete="off"
                />
            </div>
            <div className="mb-5">
                <label htmlFor="CellPhone" className="block mb-2 text-sm font-medium text-gray-900">טלפון</label>
                <input 
                    ref={inputRefPhone} 
                    onChange={(event) => onChange(event, "CellPhone")} 
                    onInvalid={(event) => onInvalid(event, "CellPhone")}
                    onKeyDown={(event) => handleTabOnInput(event, false)}
                    value={cellPhone}
                    type="tel"
                    id="CellPhone" 
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" 
                    placeholder="מספר טלפון" 
                    required 
                    autoComplete="off"
                />
            </div>
            <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm w-full px-5 py-2.5">שמור</button>
        </form>
    );
});

NamePhoneCellEditor.displayName = "NamePhoneCellEditor";