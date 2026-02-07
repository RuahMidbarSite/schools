import { Guide } from "@prisma/client";
import { ICellEditorParams } from "ag-grid-community";
import React, { forwardRef, useCallback, useRef, useState, useEffect } from "react";

interface NamePhoneEditorProps extends ICellEditorParams<Guide> {
    AllGuides: Guide[]
}

export const NamePhoneEditor = forwardRef(({ AllGuides, ...props }: NamePhoneEditorProps, ref: any) => {
    const [name, setName] = useState<string>(props.data?.FirstName || "");
    const [cellPhone, setCellPhone] = useState<string>(props.data?.CellPhone || "");

    const nameInputRef = useRef<HTMLInputElement>(null);
    const phoneInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isCancelledRef = useRef<boolean>(false);
    
    // *** פוקוס אוטומטי כשהקומפוננטה נטענת ***
    useEffect(() => {
        const timer = setTimeout(() => {
            if (nameInputRef.current) {
                nameInputRef.current.focus();
                nameInputRef.current.select();
            }
        }, 0);
        return () => clearTimeout(timer);
    }, []);
    
    const saveAndClose = useCallback(() => {
        // עדכון הטלפון רק אם זו שורה קיימת (יש GuideID) ויש שינוי
        if (props.data?.Guideid && cellPhone !== (props.data?.CellPhone || "")) {
            props.node.setDataValue('CellPhone', cellPhone);
        }
        // false = שמור את השינויים (הערך החדש של name יוחזר מ-getValue)
        props.api.stopEditing(false);
    }, [cellPhone, props.api, props.node, props.data]);
    
    const cancelAndClose = useCallback(() => {
        isCancelledRef.current = true;
        // true = בטל את השינויים
        props.api.stopEditing(true);
    }, [props.api]);

  React.useImperativeHandle(ref, () => ({
        getValue: () => {
            // אם בוטל, החזר את הערך המקורי
            if (isCancelledRef.current) {
                return props.data?.FirstName || "";
            }
            return name;
        },
        
        isCancelBeforeStart: () => {
            return false;
        },

        afterGuiAttached: () => {
            // *** לא צריך יותר - ה-useEffect עושה את העבודה ***
        }
    }));
    
    const handleNameKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            phoneInputRef.current?.focus();
            phoneInputRef.current?.select();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation();
            saveAndClose();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            cancelAndClose();
        }
    }, [saveAndClose, cancelAndClose]);

    const handlePhoneKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            event.stopPropagation();
            
            if (event.shiftKey) {
                // Shift+Tab -> חזור לשדה השם
                nameInputRef.current?.focus();
                nameInputRef.current?.select();
            } else {
                // Tab רגיל -> שמור וסגור
                saveAndClose();
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation();
            saveAndClose();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            cancelAndClose();
        }
    }, [saveAndClose, cancelAndClose]);

   // מניעת פעולות ברירת מחדל של AG Grid
useEffect(() => {
    const handleContainerKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
            e.stopPropagation();
        }
    };

    const container = containerRef.current;
    if (container) {
        container.addEventListener('keydown', handleContainerKeyDown, true);
    }

    return () => {
        if (container) {
            container.removeEventListener('keydown', handleContainerKeyDown, true);
        }
    };
}, []);

    return (
        <div 
            ref={containerRef}
            className="flex flex-col gap-1 p-2 bg-white border border-blue-500 rounded shadow-lg min-w-[300px]"
            style={{ 
                position: 'absolute',
                zIndex: 1000,
                top: '0',
                right: '0'
            }}
        >
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium min-w-[60px] text-right">שם פרטי:</label>
                <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    placeholder="הזן שם"
                />
            </div>
            
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium min-w-[60px] text-right">טלפון:</label>
                <input
                    ref={phoneInputRef}
                    type="text"
                    value={cellPhone}
                    onChange={(e) => setCellPhone(e.target.value)}
                    onKeyDown={handlePhoneKeyDown}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    placeholder="הזן מספר טלפון"
                />
            </div>
            
            <div className="flex justify-end gap-2 mt-1">
                <button
                    type="button"
                    onClick={cancelAndClose}
                    onMouseDown={(e) => e.preventDefault()}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                >
                    ביטול
                </button>
                <button
                    type="button"
                    onClick={saveAndClose}
                    onMouseDown={(e) => e.preventDefault()}
                    className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
                >
                    שמור
                </button>
            </div>
        </div>
    );
});

NamePhoneEditor.displayName = "NamePhoneEditor";