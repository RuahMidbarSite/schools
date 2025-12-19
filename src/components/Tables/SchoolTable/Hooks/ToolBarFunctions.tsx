"use client"
import { addSchoolsRows, updateSchoolRows, getSchoolsPrograms, updateSchoolRowsCascading } from "@/db/schoolrequests";
import { Program, School, SchoolsContact } from "@prisma/client";
import { useCallback } from "react";
import { DataType, getFromStorageWithKey, updateStorage } from "../Storage/SchoolDataStorage";

const useToolBarFunctions = (gridRef, rowCount, dataRowCount, validateFields, setDialogType, setDialogMessage, setOpen, SetInTheMiddleOfAddingRows, setAmount, openedProgramWindow, setLoading, setRowData, AllContacts, setAllContacts, AllPrograms, setAllPrograms, maxIndex): { onFilterTextBoxChanged: any, onSaveChangeButtonClick: any, onCancelChangeButtonClick: any, onSaveDeletions: any, onClearFilterButtonClick: any, onAddRowToolBarClick: any, onDisplayProgramsClicked: any } => {

  const onFilterTextBoxChanged = useCallback(() => {
    gridRef.current?.api.setGridOption(
      "quickFilterText",
      (document.getElementById("filter-text-box") as HTMLInputElement).value
    );
  }, [gridRef]);

  const onSaveChangeButtonClick = useCallback(() => {
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

    setDialogType('success');
    setDialogMessage("בתי ספר נוספו בהצלחה");
    setOpen(true);

    addSchoolsRows(newly_added);

    // עדכון מונים והסתרת כפתורים
    dataRowCount.current = rowCount.current;
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
    
    // עדכון הנתונים בטבלה
    setRowData((data) => [...data, ...newly_added].sort((arg1: School, arg2) => arg1.Schoolid - arg2.Schoolid))

    maxIndex.current = future_data.length > 0 ? Math.max(...future_data.map((school) => school.Schoolid)) : 0

    updateStorage({ Schools: future_data.sort((arg1, arg2) => arg1.Schoolid - arg2.Schoolid) })

    gridRef.current.api.deselectAll()
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

  // --- הפונקציה המתוקנת למחיקה ---
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

      // איסוף כל הנתונים הנוכחיים מהגריד כדי לוודא שאין איבוד נתונים בגלל פילטרים
      const allCurrentData: School[] = [];
      gridRef.current.api.forEachNode((node: any) => {
         allCurrentData.push(node.data);
      });

      // יצירת הרשימה המעודכנת (ללא המחוקים)
      const updated_data = allCurrentData.filter(school => !ids.includes(school.Schoolid));

      // חישוב id_range לשימוש בקריסקיידינג (שמירה על הלוגיקה המקורית שלך)
      let id_range: number[] = []
      // שים לב: השימוש כאן הוא בלוגיקה המקורית שלך שמניחה שהמזהים הם עוקבים או קשורים לאינדקסים
      for (let index = 1; index <= dataRowCount.current; index++) {
        if (ids.includes(index)) {
          continue
        }
        id_range.push(index)
      }

      // עדכון ה-UI באופן מיידי
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

      // עדכון רשימות מקושרות (Contacts, Programs)
      const remainining_contacts = (AllContacts as SchoolsContact[]).filter((contact) => !ids.includes(contact.Contactid))
      const remaining_programs = (AllPrograms as Program[]).filter((program) => !ids.includes(program.Schoolid))

      setAllContacts(remainining_contacts)
      setAllPrograms(remaining_programs)

      // ביצוע הקריאות לשרת ולאחסון
      const start = performance.now();
      
      await Promise.all([
        updateStorage({ Schools: updated_data, Programs: remaining_programs, schoolsContacts: remainining_contacts }),
        updateSchoolRowsCascading(ids, id_range, AllPrograms, AllContacts)
      ]);

      const end = performance.now();
      console.log(`Execution time updating schools: ${end - start} milliseconds`);

      gridRef.current.api.deselectAll();

    } catch (error) {
      console.error("Error deleting schools:", error);
      setDialogType('error');
      setDialogMessage("אירעה שגיאה בעת מחיקת בתי הספר. אנא נסה שנית.");
      setOpen(true);
    } finally {
      // חובה: עצירת שעון החול בכל מקרה (הצלחה או כישלון)
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
      element_2.style.display = "block";
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

  return { onFilterTextBoxChanged, onSaveChangeButtonClick, onCancelChangeButtonClick, onSaveDeletions, onClearFilterButtonClick, onAddRowToolBarClick, onDisplayProgramsClicked }
}

export default useToolBarFunctions