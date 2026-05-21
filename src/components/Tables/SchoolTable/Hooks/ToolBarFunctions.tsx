"use client"
import { addSchoolsRows, updateSchoolRows, getSchoolsPrograms, updateSchoolRowsCascading } from "@/db/schoolrequests";
import { Program, School, SchoolsContact } from "@prisma/client";
import { useCallback } from "react";
import { DataType, getFromStorageWithKey, updateStorage } from "../Storage/SchoolDataStorage";

const useToolBarFunctions = (gridRef, rowCount, dataRowCount, validateFields, setDialogType, setDialogMessage, setOpen, SetInTheMiddleOfAddingRows, setAmount, openedProgramWindow, setLoading, setRowData, AllContacts, setAllContacts, AllPrograms, setAllPrograms, maxIndex): { onFilterTextBoxChanged: any, onSaveChangeButtonClick: any, onCancelChangeButtonClick: any, onSaveDeletions: any, onClearFilterButtonClick: any, onAddRowToolBarClick: any, onDisplayProgramsClicked: any, onExportToCsvClick: any } => {

  const onFilterTextBoxChanged = useCallback(() => {
    gridRef.current?.api.setGridOption(
      "quickFilterText",
      (document.getElementById("filter-text-box") as HTMLInputElement).value
    );
  }, [gridRef]);

  const onSaveChangeButtonClick = useCallback(async () => {
    gridRef.current.api.stopEditing();

    const future_data: School[] = [];
    const newly_added: School[] = [];
    var count = 0;
    
    // איסוף כל הנתונים הקיימים בגריד
    gridRef.current.api.forEachNode((node: any) => {
      future_data.push(node.data);
      // בדיקה אם זו שורה חדשה שטרם נשמרה
      if (count < rowCount.current - dataRowCount.current) {
        newly_added.push(node.data);
      }
      count++;
    });

    let n = newly_added.length;
    for (let i = 0; i < n; i++) {
      if (!validateFields(newly_added[i], rowCount.current + i)) {
        return;
      }
    }

    // 🚀 שלב 1: עדכון מיידי ב-UI ו-Storage (לפני השרת!)
    const sortedData = future_data.sort((arg1, arg2) => arg1.Schoolid - arg2.Schoolid);
    
    // עדכון UI
    setRowData(sortedData);
    
    // עדכון Storage מיידית
    await updateStorage({ Schools: sortedData });
    
    // עדכון מונים
    dataRowCount.current = rowCount.current;
    maxIndex.current = future_data.length > 0 ? Math.max(...future_data.map((school) => school.Schoolid)) : 0;
    
    // הסתרת כפתורים
    const element: any = document.getElementById("savechangesbutton-school");
    if (element !== null) {
      element.style.display = "none";
    }
    const element_2: any = document.getElementById("cancelchangesbutton-school");
    if (element_2 !== null) {
      element_2.style.display = "none";
    }
    
    SetInTheMiddleOfAddingRows(false);
    gridRef.current.api.deselectAll();
    
    // 🚀 שלב 2: שליחה לשרת ברקע (אסינכרוני)
    try {
      await addSchoolsRows(newly_added);
      
      // הצלחה - הצג הודעה
      setDialogType('success');
      setDialogMessage("בתי ספר נוספו בהצלחה");
      setOpen(true);
      
    } catch (error) {
      console.error("Error saving to server:", error);
      
      // כשל בשרת - החזר למצב קודם
      setDialogType('error');
      setDialogMessage("שגיאה בשמירה לשרת. הנתונים נשמרו מקומית בלבד.");
      setOpen(true);
      
      // אופציונלי: החזרה למצב קודם
      // const prev_data = sortedData.filter(school => !newly_added.some(n => n.Schoolid === school.Schoolid));
      // setRowData(prev_data);
      // await updateStorage({ Schools: prev_data });
    }
    
  }, [SetInTheMiddleOfAddingRows, dataRowCount, gridRef, maxIndex, rowCount, setDialogMessage, setDialogType, setOpen, setRowData, validateFields]);

  const onCancelChangeButtonClick = useCallback(() => {
    const prev_data: School[] = [];
    var count = 0;
    gridRef.current.api.forEachNode((node: any) => {
      if (count >= rowCount.current - dataRowCount.current) {
        prev_data.push(node.data);
      }
      count++;
    });
    maxIndex.current = prev_data.length > 0 ? Math.max(...prev_data.map((school) => school.Schoolid)) : 0
    setRowData(prev_data)

    rowCount.current = dataRowCount.current;

    const element: any = document.getElementById("savechangesbutton-school");
    if (element !== null) {
      element.style.display = "none";
    }
    const element_2: any = document.getElementById(
      "cancelchangesbutton-school"
    );
    if (element_2 !== null) {
      element_2.style.display = "none";
    }

    SetInTheMiddleOfAddingRows(false);
  }, [SetInTheMiddleOfAddingRows, dataRowCount, gridRef, maxIndex, rowCount, setRowData]);

  // --- פונקציה משופרת למחיקה עם עדכון מיידי ---
  const onSaveDeletions = useCallback(async () => {
    // 1. התחלת שעון חול מיד בהתחלה
    setLoading(true);

    try {
      const selectedNodes = gridRef.current.api.getSelectedNodes();
      const ids: number[] = selectedNodes.map((val: any) => val.data.Schoolid);

      if (ids.length === 0) {
        setLoading(false);
        return;
      }

      // איסוף כל הנתונים הנוכחיים מהגריד
      const allCurrentData: School[] = [];
      gridRef.current.api.forEachNode((node: any) => {
         allCurrentData.push(node.data);
      });

      // יצירת הרשימה המעודכנת (ללא המחוקים)
      const updated_data = allCurrentData.filter(school => !ids.includes(school.Schoolid));

      // חישוב id_range
      let id_range: number[] = []
      for (let index = 1; index <= dataRowCount.current; index++) {
        if (ids.includes(index)) {
          continue
        }
        id_range.push(index)
      }

      // 🚀 עדכון מיידי ב-UI ו-Storage (לפני השרת!)
      
      // עדכון UI
      setRowData(updated_data);
      
      // עדכון מונים
      maxIndex.current = updated_data.length > 0 ? Math.max(...updated_data.map((school) => school.Schoolid)) : 0;
      dataRowCount.current -= ids.length;
      rowCount.current -= ids.length;
      setAmount(0);

      // הסתרת כפתור המחיקה
      const element: any = document.getElementById("savedeletions");
      if (element !== null) {
        element.style.display = "none";
      }

      // עדכון רשימות מקושרות
      const remaining_contacts = (AllContacts as SchoolsContact[]).filter((contact) => !ids.includes(contact.Contactid))
      const remaining_programs = (AllPrograms as Program[]).filter((program) => !ids.includes(program.Schoolid))

      setAllContacts(remaining_contacts)
      setAllPrograms(remaining_programs)

      // עדכון Storage מיידית
      await updateStorage({ 
        Schools: updated_data, 
        Programs: remaining_programs, 
        schoolsContacts: remaining_contacts 
      });

      gridRef.current.api.deselectAll();

      // 🚀 שליחה לשרת ברקע
      const start = performance.now();
      
      try {
        await updateSchoolRowsCascading(ids, id_range, AllPrograms, AllContacts);
        
        const end = performance.now();
        console.log(`✅ Execution time updating schools: ${end - start} milliseconds`);
        
      } catch (serverError) {
        console.error("Server update failed (but local update succeeded):", serverError);
        
        // הצג אזהרה אבל אל תחזיר את הנתונים
        setDialogType('warning');
        setDialogMessage("הנתונים נמחקו מקומית. שגיאה בסנכרון עם השרת.");
        setOpen(true);
      }

    } catch (error) {
      console.error("Error deleting schools:", error);
      setDialogType('error');
      setDialogMessage("אירעה שגיאה בעת מחיקת בתי הספר.");
      setOpen(true);
    } finally {
      // חובה: עצירת שעון החול בכל מקרה
      setLoading(false);
    }

  }, [AllContacts, AllPrograms, dataRowCount, gridRef, maxIndex, rowCount, setAllContacts, setAllPrograms, setAmount, setLoading, setRowData, setDialogMessage, setDialogType, setOpen]);


  const onClearFilterButtonClick = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setFilterModel(null);
      gridRef.current.api.setQuickFilter("");
    }
    const filterInput = document.getElementById("filter-text-box") as HTMLInputElement;
    if (filterInput) {
      filterInput.value = "";
    }
  }, [gridRef]);

  const onAddRowToolBarClick = useCallback(() => {
    gridRef.current?.api.applyTransaction({
      add: [
        {
          Schoolid: maxIndex.current + 1,
          ReligiousSector: "יהודי",
          SchoolType: "רגיל",
        },
      ],
      addIndex: 0,
    });

    maxIndex.current = maxIndex.current + 1

    rowCount.current++
    SetInTheMiddleOfAddingRows(true);
    const element: any = document.getElementById("savechangesbutton-school");
    if (element !== null) {
      element.style.display = "block";
    }
    const element_2: any = document.getElementById(
      "cancelchangesbutton-school"
    );
    if (element_2 !== null) {
      element_2.display = "block";
    }
  }, [SetInTheMiddleOfAddingRows, gridRef, maxIndex, rowCount]);

  const onDisplayProgramsClicked = useCallback(async () => {
    const selectedNodes = gridRef.current.api.getSelectedNodes()
    if (!selectedNodes) {
      return
    }
    const schoolIds: any[] = []
    selectedNodes.forEach((node: any) => {
      schoolIds.push(node.data.Schoolid)
    })
    let updated_data: any[] = []
    gridRef.current.api.forEachNode((node: any) => {
      updated_data.push(node.data)
    });

    getSchoolsPrograms(schoolIds).then((programs) => {
      updateStorage({ Schools: updated_data, chosenPrograms: programs })
      const ids = encodeURIComponent(JSON.stringify({
        ids: schoolIds,
      }));
      let new_window = window.open(`/ProgramPopUp?ids=${ids}`, '_blank', 'width=800,height=600')
    if (gridRef) { gridRef.current.api.deselectAll() }
    if (new_window === null) {
      // pop-blocked
    }
    return
  })
}, [gridRef]);

const onExportToCsvClick = useCallback(() => {
  if (gridRef.current && gridRef.current.api) {
    gridRef.current.api.exportDataAsCsv({
      fileName: 'schools_export.csv',
    });
  }
}, [gridRef]);

return { onFilterTextBoxChanged, onSaveChangeButtonClick, onCancelChangeButtonClick, onSaveDeletions, onClearFilterButtonClick, onAddRowToolBarClick, onDisplayProgramsClicked, onExportToCsvClick }
}

export default useToolBarFunctions