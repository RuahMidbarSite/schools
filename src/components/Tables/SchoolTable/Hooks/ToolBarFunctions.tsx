"use client"
import { addSchoolsRows, updateSchoolRows, getSchoolsPrograms, updateSchoolRowsCascading } from "@/db/schoolrequests";
import { Program, School, SchoolsContact } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
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
    gridRef.current.api.forEachNode((node: any) => {
      future_data.push(node.data);
      // only if it is a new row that is not in the database look at it.
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

    // update the Row count in the database and hide the buttons.
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
    // no longer in adding rows mode.
    SetInTheMiddleOfAddingRows(false);
    setRowData((data) => [...data, ...newly_added].sort((arg1: School, arg2) => arg1.Schoolid - arg2.Schoolid))


    maxIndex.current = future_data.length >0 ? Math.max(...future_data.map((school) => school.Schoolid)):0

    // update cached values rows. 
    updateStorage({ Schools: future_data.sort((arg1, arg2) => arg1.Schoolid - arg2.Schoolid) })

    gridRef.current.api.deselectAll()
  }, [SetInTheMiddleOfAddingRows, dataRowCount, gridRef, maxIndex, rowCount, setDialogMessage, setDialogType, setOpen, setRowData, validateFields]);

  const onCancelChangeButtonClick = useCallback(() => {
    const prev_data: School[] = [];
    var count = 0;
    gridRef.current.api.forEachNode((node: any) => {
      // Right now, a new row is added at the top and forEachNode goes through the order that appears in the table.
      if (count >= rowCount.current - dataRowCount.current) {
        prev_data.push(node.data);
      }
      count++;
    });
    maxIndex.current = prev_data.length >0 ? Math.max(...prev_data.map((school) => school.Schoolid)):0
    setRowData(prev_data)

    // Update the row count to match the database state
    rowCount.current = dataRowCount.current;

    // Hide the buttons
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

  const onSaveDeletions = useCallback(() => {
    const ids: number[] = gridRef.current.api
      .getSelectedRows()
      .map((val: School) => val.Schoolid);
    // this is what will remain after the deletion.
    const updated_data: School[] = [];


    // what are the ids in big schoolstable that are not deleted - we need that to reorder the table.
    let id_range: number[] = []
    for (let index = 1; index <= dataRowCount.current; index++) {
      if (ids.includes(index)) {
        continue
      }
      id_range.push(index)
    }

    let index = 0
    gridRef.current.api.forEachNode((node: any) => {

      if (!ids.includes(node.data.Schoolid)) {
        updated_data.push(node.data);

      }
    });

    setRowData(updated_data)

    maxIndex.current = updated_data.length > 0 ? Math.max(...updated_data.map((school) => school.Schoolid)):0
    // update the amount of rows
    dataRowCount.current -= ids.length;
    rowCount.current -= ids.length;
    // update the checked amount.
    setAmount(0);


    // hide delete button.
    const element: any = document.getElementById("savedeletions");
    if (element !== null) {
      element.style.display = "none";
    }

    const remainining_contacts = (AllContacts as SchoolsContact[]).filter((contact) => !ids.includes(contact.Contactid))
    const remaining_programs = (AllPrograms as Program[]).filter((program) => !ids.includes(program.Schoolid))

    setAllContacts(remainining_contacts)
    setAllPrograms(remaining_programs)

    setLoading(true)
    const start = performance.now();
    Promise.all([updateStorage({ Schools: updated_data, Programs: remaining_programs, schoolsContacts: remainining_contacts }), updateSchoolRowsCascading(ids, id_range, AllPrograms, AllContacts).then(() => {


    })]).then((_) => {
      setLoading(false)
      const end = performance.now();
      console.log(`Execution time updating schools: ${end - start} milliseconds`);
    })

    gridRef.current.api.deselectAll()
    // update cached values rows.

  }, [AllContacts, AllPrograms, dataRowCount, gridRef, maxIndex, rowCount, setAllContacts, setAllPrograms, setAmount, setLoading, setRowData]);


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
    // activate( and therfore show) the update button and cancel button
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
    const schoolIds = []
    selectedNodes.forEach((node) => {
      schoolIds.push(node.data.Schoolid)
    })
    let updated_data = []
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
        // pop-blocked lmao.
      }

      return
    })



  }, [gridRef]);

  return { onFilterTextBoxChanged: onFilterTextBoxChanged, onSaveChangeButtonClick: onSaveChangeButtonClick, onCancelChangeButtonClick: onCancelChangeButtonClick, onSaveDeletions: onSaveDeletions, onClearFilterButtonClick: onClearFilterButtonClick, onAddRowToolBarClick: onAddRowToolBarClick, onDisplayProgramsClicked: onDisplayProgramsClicked }
}

export default useToolBarFunctions