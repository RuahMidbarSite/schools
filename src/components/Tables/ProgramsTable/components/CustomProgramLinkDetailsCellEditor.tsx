import { getProgramWithId } from "@/db/programsRequests";
import { Program } from "@prisma/client";
import { ICellEditorParams, ICellRendererParams } from "ag-grid-community";
import React, { forwardRef, useCallback, useEffect, useRef, useState, useImperativeHandle } from "react"; 
import { MdInsertLink } from "react-icons/md";

// הגדרת ה-Props עם האפשרות החדשה שהוספנו בטבלה הראשית
interface CustomCellEditorParams extends ICellEditorParams<Program> {
  allowEmptyLink?: boolean;
}

// eslint-disable-next-line react/display-name
export const ProgramLinkDetailsCellEditor = forwardRef((props: CustomCellEditorParams, ref: any) => {
  // משתמשים בערכים הקיימים מה-props.data אם קיימים
  const [Link, setLink] = useState<string>(props.data.ProgramLink || "")
  const [ProgramName, setProgramName] = useState<string>(props.data.ProgramName || "")
  
  // Confirmed מציין רק שהמשתמש לחץ על 'שמור' בטופס
  const [Confirm, setConfirm] = useState(false)
  
  const programNameInputRef = useRef<HTMLInputElement>(null);

  const allowEmptyLink = props.allowEmptyLink ?? false;

  useEffect(() => {
    // אנו משתמשים בנתונים שהועברו
    if (props.data.ProgramName) {
        setProgramName(props.data.ProgramName);
    }
    if (props.data.ProgramLink) {
        setLink(props.data.ProgramLink);
    }
  }, [props.data.ProgramName, props.data.ProgramLink])


  const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault() 
    
    // ולידציה בסיסית: שם התוכנית חייב להיות מוזן
    if (ProgramName === '') {
        alert("שם התוכנית הוא שדה חובה.");
        return;
    }
    
    // עדכון ה-Row Node ישירות - זה מה שמאפשר ל-onCellEditingStopped למשוך את הנתונים
    props.node.setDataValue("ProgramName", ProgramName);
    props.node.setDataValue("ProgramLink", Link); 

    setConfirm(true)
    
    // עצור את העריכה באופן יזום לאחר שמירה מוצלחת
    props.api.stopEditing();

  }, [Link, ProgramName, props.node, props.api])


  const onInvalid = useCallback((event: React.FormEvent<HTMLInputElement>, name: string) => {
    if (event.currentTarget) {
      if (name === "Name") {
        event.currentTarget.setCustomValidity("חסר שם")
      }
    }
  }, []) 
  
  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, name: string) => {
    event.target.setCustomValidity(''); 
    
    if (name === "Name") {
      setProgramName(event.target.value)
    }
    else {
      setLink(event.target.value)
    }
  }, [])
  
  
  // --------------------------------------------------------------------------
  // חשיפת פונקציות AG Grid נדרשות
  // --------------------------------------------------------------------------
  useImperativeHandle(ref, () => {
    return {
      // getValue נדרשת: מחזירה את הערך ש-AG Grid ישתמש בו לשדה Plan
      getValue() {
        return ProgramName; 
      },
      // לאחר שה-DOM של העורך הוצג, מתמקד בשדה שם התוכנית
      afterGuiAttached() {
        programNameInputRef.current?.focus();
      },
      isCancelAfterEnd() {
        return false;
      }
    };
  });
  // --------------------------------------------------------------------------
  
  const getCell = useCallback(() => {

    return (
        <form className="max-w-sm mx-auto overflow-visible absolute bg-white w-[300px]" onSubmit={onSubmit} >
          <div className="mb-5">
            <label htmlFor="ProgramName" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">שם תוכנית</label>
            <input 
              ref={programNameInputRef} 
              onChange={(event) => onChange(event, "Name")} 
              onInvalid={(event) => onInvalid(event, "Name")} 
              type="ProgramName" 
              value={ProgramName} // שימוש ב-value
              id="ProgramName" 
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" 
              placeholder="ניו מדיה" 
              required // נשאר חובה (שם התוכנית)
            />
          </div>
          <div className="mb-5">
            <label htmlFor="DriveLink" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">לינק לתוכנית</label>
            <input 
              onChange={(event) => onChange(event, "Link")} 
              onInvalid={(event) => onInvalid(event, "Link")} 
              value={Link} // שימוש ב-value
              type="DriveLink" 
              id="DriveLink" 
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" 
              // *** חשוב לוודא שמאפיין required אינו מופיע כאן ***
            />
          </div>
          <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">שמור</button>
        </form>

      )

  }, [Link, ProgramName, onChange, onInvalid, onSubmit])

  return getCell()

})