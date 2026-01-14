/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { ChangeEvent, Suspense, useRef } from "react";
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Button, Col, Container, Form, InputGroup, Row } from "react-bootstrap";
import { useState, useContext, useEffect } from "react";
import SchoolsTable from "@/components/Tables/SchoolTable/schooltable";
import { MessagePattern, StatusContacts, StatusSchools } from "@prisma/client";
import {
  getAllCities,
  getAllReligionSectors,
  getRoles,

  getEducationStages,
  getModelFields,
  TableType,
  addContactStatuses,
  getMessagePatterns,
  addPattern,
  deletePattern,
  updateContactsStatus,
  getSchoolTypes,
  getAllSchoolsTypes,
  getAllStatuses,
} from "@/db/generalrequests";
import { getSchools, selectSchools, getContacts, getSchoolsByIds, filterSchoolsByCities, getAllSchools } from "@/db/schoolrequests";
import { getAllContacts, selectContacts } from "@/db/contactsRequests";
import MultiSelectSearchBar from "@/components/multiselectsearchbar/MultiSelectSearchBar";
import pageText from "./messagesform-text.json";
import "./messagesForm.css";

import { SchoolsContact, School, ReligionSector, Cities } from "@prisma/client";
import { Console } from "console";
import { AgGridReact } from "ag-grid-react";
import { ICellRendererParams } from "ag-grid-community";

import "bootstrap/dist/css/bootstrap.min.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme
import { title } from "process";
import { deletePatternFile, savePatternFile, sendMessageViaWhatsApp } from "@/db/whatsapprequests";
import { DataType, getFromStorage, updateStorage } from "@/components/Tables/Messages/Storage/MessagesDataStorage";
import QrCode from "@/components/whatsapp/QrcodeComponent";





export type FilterOptions = {
  Filter: boolean,
  Cities?: String[],
  Sectors?: String[],
  EducationStage?: String[],
  SchoolStatus?: String[],
  SchoolTypes?: String[],
  ContactFilterOptions?: ContactFilterOptions

}

export type ContactFilterOptions = {
  IsRepresentive?: boolean | "Both"
  Roles?: String[],
  ContactStatus?: String[],
  Status?: String[]


}




export default function MessagesPage() {

  const qrCodeRef = useRef(null);
  const gridRef: any = useRef(null);

  // Row Data: The data to be displayed.
  const [rowData, setRowData]: any = useState("");

  // Column Definitions: Defines & controls grid columns.
  const [colDefs, setColDefs]: any = useState("");




  const searchBarLabelKey = (option: string) => option || "empty";

  const [selectedSchools, setSelectedSchools] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState<SchoolsContact[]>(
    []
  );
  const [filteredContacts, setFilteredContacts] = useState([]);

  const [schools, setSchools] = useState([]);
  const [Cities, setCities] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stages, setStages] = useState([]);

  const [statusesOptions, setStatusesOptions] = useState([]);

  const [SchoolStatuses,setSchoolStatuses]= useState<any[]>()
  const [ContactStatuses,setContactStatuses] = useState<any[]>()



  const [schoolTypes, setSchoolTypes] = useState([]);
  const [msgStatuses, setMsgStatuses] = useState([]);

  const [msg1, setMsg1] = useState("");
  const [msg2, setMsg2] = useState("");
  const [addedFile, setAddedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  const [isRep, setIsRep] = useState(null);

  const [selectedSectors, setSelectedSectors] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedEductionStages, setSelectedEductionStages] = useState([]);
  const [selectedContactStatuses, setSelectedContactStatuses] = useState([]);
  const [selectedSchoolStatuses, setSelectedSchoolStatuses] = useState([]);

  const [patterns, setPatterns] = useState<MessagePattern[]>([]);

  const [selectedPattern, setSelectedPattern] = useState<MessagePattern>();

  const [selectedOption, setSelectedOption] = useState<{ value: number; label: string } | null>(null);


  const [patternTitle, setPatternTitle] = useState("");

  const [options, setOptions] = useState<{ value: number; label: string }[]>([]);

  const [newStatus, setNewStatus] = useState("");

  const [schoolAmount, setSchoolAmount] = useState(0);

  const [schoolAmountError, setSchoolAmountError] = useState(false);
  const [newStatusError, setNewStatusError] = useState(false);

// הוסף שורה זו:
  const [sendingStats, setSendingStats] = useState({ success: 0, missing: 0, error: 0 });

  const [oneTime, updateOneTime] = useState(0);
  // this is used for adding new rows. using ref to prevent re-render.
  // dataRowCount is the current amount of rows in the database, rowCount is how many rows in the grid right now.
  const dataRowCount = useRef(0);
  const rowCount = useRef(0);


  useEffect(() => {

    const fetchData = () => {
      getFromStorage().then(({ Cities, Religion, Role, SchoolStatuses, ContactsStatuses, Stages, messagePatterns, SchoolTypes }: DataType) => {
        if (Cities && Religion && Role && SchoolStatuses && ContactsStatuses && Stages && messagePatterns && SchoolTypes) {
          const citiesData = Cities
          const sectorsData = Religion
          const rolesData = Role
          const schoolsStatusesData = SchoolStatuses
          const stagesData = Stages
          const messagePatternsData = messagePatterns
          const schoolTypesData = SchoolTypes
          const cities = citiesData.map(
            (city: { CityName: any }) => city.CityName
          );
          const sectors = sectorsData.map(
            (sector: { ReligionName: any }) => sector.ReligionName
          );
          const roles = rolesData.map(
            (role: { RoleName: any }) => role.RoleName);


          const statuses = ContactsStatuses.map((val) => val.StatusName)
          const stages = stagesData.map(
            (stage: { StageName: any }) => stage.StageName
          );

          const transformedStatuses = statuses.map(status => ({
            value: status,
            label: status
          }));

          const schoolTypes = schoolTypesData.map(
            (schoolType: { TypeName: any }) => schoolType.TypeName
          )


          setCities(cities);
          setSectors(sectors);
          setRoles(roles);
          setSchoolStatuses(SchoolStatuses.map((val)=>val.StatusName))
          setContactStatuses(statuses);
          setStatusesOptions(transformedStatuses);
          setStages(stages);

          setPatterns(messagePatternsData);
          const formattedOptions = messagePatternsData.map(option => ({ value: option.PatternId, label: option.Caption }));
          setOptions(formattedOptions);
          setSchoolTypes(schoolTypes);

        } else {
          Promise.all([
            getAllCities(),
            getAllReligionSectors(),
            getRoles(),
            getAllStatuses("Schools"),
            getAllStatuses("Contacts"),
            getEducationStages(),
            getMessagePatterns(),
            getAllSchoolsTypes(),
          ]).then(([Cities, Religion, Role, SchoolStatuses, ContactStatuses, Stages, messagePatterns, SchoolTypes]) => {
            const citiesData = Cities
            const sectorsData = Religion
            const rolesData = Role
            const schoolsStatusesData = SchoolStatuses
            const stagesData = Stages
            const messagePatternsData = messagePatterns
            const schoolTypesData = SchoolTypes
            updateStorage({ Cities: Cities, Religion: Religion, Role: Role, SchoolStatuses: SchoolStatuses, ContactsStatuses: ContactStatuses, Stages: Stages, messagePatterns: messagePatterns, SchoolTypes: SchoolTypes })

            const cities = citiesData.map(
              (city: { CityName: any }) => city.CityName
            );
            const sectors = sectorsData.map(
              (sector: { ReligionName: any }) => sector.ReligionName
            );
            const roles = rolesData.map(
              (role: { RoleName: any }) => role.RoleName);


            const statuses = ContactStatuses.map((val) => val.StatusName)
            const stages = stagesData.map(
              (stage: { StageName: any }) => stage.StageName
            );

            const transformedStatuses = statuses.map(status => ({
              value: status,
              label: status
            }));

            const schoolTypes = schoolTypesData.map(
              (schoolType: { TypeName: any }) => schoolType.TypeName
            )


            setCities(cities);
            setSectors(sectors);
            setRoles(roles);
            setSchoolStatuses(SchoolStatuses.map((val)=>val.StatusName))
            setContactStatuses(statuses)
            setStatusesOptions(transformedStatuses);
            setStages(stages);

            setPatterns(messagePatternsData);
            const formattedOptions = messagePatternsData.map(option => ({ value: option.PatternId, label: option.Caption }));
            setOptions(formattedOptions);
            setSchoolTypes(schoolTypes);

           
          })
        }
      })

    }




    fetchData()

  }, [])


  useEffect(() => {
    console.log("selected cities: ", selectedCities);
    filterSchools();
  }, [selectedCities, selectedSectors, selectedEductionStages, selectedTypes, selectedSchoolStatuses]);

  useEffect(() => {
    if (selectedContacts.length > 0) {
      filterContacts();
    }
  }, [selectedContacts]);


  useEffect(() => {
    console.log("Patterns updated:", patterns);
  }, [patterns]);

  useEffect(() => {
    console.log("Options updated:", options);
  }, [options]);




  const onGridReady = async () => {
    getFromStorage().then(({ Schools, Religion, Cities, schoolsContacts, Tablemodel }: DataType) => {
      if (Schools && Religion && Cities && schoolsContacts && Tablemodel) {
        const schoolRows = Schools
        rowCount.current = schoolRows.length;
        dataRowCount.current = schoolRows.length;
        const model = Tablemodel
        const religion = Religion
        const cities = Cities
        setRowData(schoolRows);
        setSchools(schoolRows);
        setSelectedSchools(schoolRows)
        
        console.log("=== 🔍 CACHE DEBUG ===");
        console.log("📚 Schools:", schoolRows.length);
        console.log("👥 Contacts:", schoolsContacts?.length);
        console.log("🏫 First school Representive:", schoolRows[0]?.Representive);
        console.log("👤 First 3 contacts names:", schoolsContacts?.slice(0, 3).map(c => ({
          ContactName: c.ContactName,
          FirstName: c.FirstName,
          LastName: c.LastName,
          Cellphone: c.Cellphone
        })));
        
        var colDefs: any = model[0]?.map((value: any, index: any) => {
          if (value === "ReligiousSector") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              cellEditor: "agSelectCellEditor",
              cellEditorParams: {
                values: religion,
              },

              filter: true,
            };
          }
          if (value === "City") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              cellEditor: "CustomSelect",
              cellEditorParams: {
                selectData: cities.map((val) => ({ value: val, label: val })),
              },
              filter: true,
              cellEditorPopup: true,
              cellEditorPopupPosition: "under",
            };
          }
          // no edit here..
          if (value === "Schoolid") {
            return {
              field: value,
              headerName: model[1][index],
              cellEditor: "agTextCellEditor",
              rowDrag: true,
            };
          }

          if (value === "Representive") {
            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              cellEditor: "CustomSelect",
              cellEditorParams: {
                selectData: schoolsContacts,
              },
              filter: true,
              cellEditorPopup: true,
              cellEditorPopupPosition: "under",
            };
          }

          return {
            field: value,
            headerName: model[1][index],
            editable: true,
            cellEditor: "agTextCellEditor",
            filter: true,
          };
        });

        console.log("📊 Adding phone column...");

        // ✅ הוסף עמודת טלפון נייד של איש הקשר
        colDefs.push({
          field: "RepresentivePhone",
          headerName: "טלפון נייד",
              valueGetter: (params) => {
        // 1. בדיקה ישירה לפי ID (הכי אמין ומדויק)
        // אנחנו בודקים וריאציות שונות של שם השדה למקרה של שגיאת כתיב בדאטה
        const repId = params.data.RepresentiveID || params.data.RepresentativeId || params.data.RepresentiveId;

        if (repId && schoolsContacts) {
          // חיפוש איש הקשר עם ה-ID הזה בדיוק
          const matchById = schoolsContacts.find(c => String(c.Contactid) === String(repId));
          
          if (matchById) {
            console.log(`🎯 Found direct match by ID: ${repId}`);
            return matchById.Cellphone || matchById.Phone || "";
          }
  }

  // --- לוגיקת גיבוי (אם אין ID בשורה) ---
  
  const repName = params.data.Representive;
  const currentSchoolId = params.data.Schoolid;

  if (!repName || !schoolsContacts) return "";

  // סינון לפי בית ספר
  const relevantContacts = schoolsContacts.filter(c => 
    c.SchoolId === currentSchoolId || c.Schoolid === currentSchoolId
  );

  const searchPool = relevantContacts.length > 0 ? relevantContacts : schoolsContacts;
  const cleanRepName = repName.trim();

  // חיפוש לפי שם (כולל טיפול במקרה של תוספת תפקיד לשם)
  const contact = searchPool.find(c => {
    const contactFullName = `${c.FirstName || ""} ${c.LastName || ""}`.trim();
    
    // בדיקה מורחבת: האם המילים מהשם בטבלה קיימות בשם איש הקשר?
    // זה יעזור למצוא את "מריאנה" בתוך "מריאנה מנהלת"
    const nameParts = cleanRepName.split(" ");
    const firstNameMatch = nameParts[0] === c.FirstName;
    
    return (
        contactFullName === cleanRepName ||
        (contactFullName.length > 2 && cleanRepName.includes(contactFullName)) ||
        (cleanRepName.length > 2 && contactFullName.includes(cleanRepName)) ||
        // בדיקה מיוחדת: אם השם הפרטי זהה והשם בטבלה מכיל את התפקיד
        (firstNameMatch && cleanRepName.includes(c.Role || "---"))
    );
  });

  return contact ? (contact.Cellphone || contact.Phone || "") : "";
},
          filter: true,
        });

        console.log("✅ Phone column added");
        console.log("=== 🔍 END CACHE DEBUG ===");

        setColDefs(colDefs);
      } else {
        console.log("=== 🔍 SERVER DEBUG ===");
        Promise.all([getAllSchools(), getAllReligionSectors(), getAllCities(), getAllContacts(), getModelFields("School")]).then((
          [schools, religion, cities, schoolsContacts, model]
        ) => {

          const schoolRows = schools
          rowCount.current = schoolRows.length;
          dataRowCount.current = schoolRows.length;

          setRowData(schools);
          setSchools(schools);
          setSelectedSchools(schools)
          
          console.log("📚 Schools:", schoolRows.length);
          console.log("👥 Contacts:", schoolsContacts?.length);
          console.log("🏫 First school Representive:", schoolRows[0]?.Representive);
          console.log("👤 First 3 contacts names:", schoolsContacts?.slice(0, 3).map(c => ({
            ContactName: c.ContactName,
            FirstName: c.FirstName,
            LastName: c.LastName,
            Cellphone: c.Cellphone
          })));
          
          var colDefs: any = model[0]?.map((value: any, index: any) => {
            if (value === "ReligiousSector") {
              return {
                field: value,
                headerName: model[1][index],
                editable: true,
                cellEditor: "agSelectCellEditor",
                cellEditorParams: {
                  values: religion,
                },

                filter: true,
              };
            }
            if (value === "City") {
              return {
                field: value,
                headerName: model[1][index],
                editable: true,
                cellEditor: "CustomSelect",
                cellEditorParams: {
                  selectData: cities.map((val) => ({ value: val, label: val })),
                },
                filter: true,
                cellEditorPopup: true,
                cellEditorPopupPosition: "under",
              };
            }
            // no edit here..
            if (value === "Schoolid") {
              return {
                field: value,
                headerName: model[1][index],
                cellEditor: "agTextCellEditor",
                rowDrag: true,
              };
            }

            if (value === "Representive") {
              return {
                field: value,
                headerName: model[1][index],
                editable: true,
                cellEditor: "CustomSelect",
                cellEditorParams: {
                  selectData: schoolsContacts,
                },
                filter: true,
                cellEditorPopup: true,
                cellEditorPopupPosition: "under",
              };
            }

            return {
              field: value,
              headerName: model[1][index],
              editable: true,
              cellEditor: "agTextCellEditor",
              filter: true,
            };
          });

          console.log("📊 Adding phone column...");

          // ✅ הוסף עמודת טלפון נייד של איש הקשר
          colDefs.push({
            field: "RepresentivePhone",
            headerName: "טלפון נייד",
            valueGetter: (params) => {
  const repName = params.data.Representive;
  const currentSchoolId = params.data.Schoolid; // שליפת ה-ID של בית הספר

  // אם אין שם נציג או אין רשימת אנשי קשר, אין מה לחפש
  if (!repName || !schoolsContacts) return "";

  // שלב 1: סינון חכם לפי ID
  // אנחנו יוצרים רשימה קטנה רק של אנשי הקשר ששייכים לבית הספר הספציפי הזה
  // (הוספתי תמיכה גם ב-SchoolId וגם ב-Schoolid ליתר ביטחון, תלוי איך זה שמור בדאטה שלך)
  const relevantContacts = schoolsContacts.filter(c => 
    c.SchoolId === currentSchoolId || c.Schoolid === currentSchoolId
  );

  // מאגר החיפוש הסופי: משתמשים ברשימה המסוננת. 
  // רק אם היא ריקה (למשל, אין אנשי קשר משויכים ב-DB), נחפש בלית ברירה בכל הרשימה הכללית.
  const searchPool = relevantContacts.length > 0 ? relevantContacts : schoolsContacts;

  const cleanRepName = repName.trim();

  // שלב 2: מציאת האדם הנכון לפי השם
  const contact = searchPool.find(c => {
    // בניית השם המלא של איש הקשר הנוכחי לבדיקה
    const contactFullName = `${c.FirstName || ""} ${c.LastName || ""}`.trim();
    
    // בדיקה משולשת:
    // 1. האם השמות זהים בדיוק?
    // 2. האם השם בטבלה מכיל את שם איש הקשר? (למשל: "ישראל ישראלי - מנהל" מכיל את "ישראל ישראלי")
    // 3. האם שם איש הקשר מכיל את השם בטבלה?
    return (
        contactFullName === cleanRepName ||
        (contactFullName.length > 2 && cleanRepName.includes(contactFullName)) ||
        (cleanRepName.length > 2 && contactFullName.includes(cleanRepName))
    );
  });

  // החזרת התוצאה: טלפון נייד, ואם אין אז טלפון רגיל
  return contact ? (contact.Cellphone || contact.Phone || "") : "";
},
            filter: true,
          });

          console.log("✅ Phone column added");
          console.log("=== 🔍 END SERVER DEBUG ===");

          setColDefs(colDefs);
        })


      }
    })



  }

  const filterSchools = () => {
    const filteredSchools = schools.filter(school => {
      return (
        (selectedCities.includes(school.City) || selectedCities.length === 0) &&
        (selectedSectors.includes(school.ReligiousSector) || selectedSectors.length === 0) &&
        (selectedEductionStages.includes(school.EducationStage) || selectedEductionStages.length === 0) &&
        (selectedTypes.includes(school.SchoolType) || selectedTypes.length === 0) &&
        (selectedSchoolStatuses.includes(school.Status) || selectedSchoolStatuses.length === 0)
      );
    });
    setSelectedSchools(filteredSchools)
    console.log("selected schooles: ", filteredSchools);
    setRowData(filteredSchools);
  };

  const filterContacts = () => {
    const filteredContacts = selectedContacts.filter(contact => {
      return (
        (selectedContactStatuses.includes(contact.Status) || selectedContactStatuses.length === 0) &&
        (selectedRoles.includes(contact.Role) || selectedRoles.length === 0) &&
        (isRep === null || contact.IsRepresentive === isRep)
      );
    });
    setFilteredContacts(filteredContacts);
    console.log("selected contacts: ", filteredContacts);
  };


  const handleCitySelectionChange = (selected: string[]) => {
    setSelectedCities(selected);
  };

  const handleSectorSelectionChange = (
    selected: string[]
  ) => {
    setSelectedSectors(selected);
    filterSchools();
  };

  const handleRoleSelectionChange = (
    selected: React.SetStateAction<never[]>
  ) => {
    setSelectedRoles(selected);
    console.log("selectedRoles: ", selectedRoles);
  };

  const handleStagesSelectionChange = (
    selected: React.SetStateAction<never[]>
  ) => {
    setSelectedEductionStages(selected);
    console.log("selectedEductionStages: ", selectedEductionStages);
  };

  const handleStatusChange = (selectedStatus) => {
    setNewStatus(selectedStatus);
  };

  const handleContactStatusesSelectionChange = (
    selected: string[]
  ) => {
    setSelectedContactStatuses(selected);
    // filterContacts();
    console.log("selectedContactStatuses: ", selectedContactStatuses);
  };

  const handleSchoolStatusesSelectionChange = (
    selected: React.SetStateAction<never[]>
  ) => {
    setSelectedSchoolStatuses(selected);
    console.log("selectedSchoolStatuses: ", selectedSchoolStatuses);
  };

  const handlePatternChange = (selected: any) => {
    if (selected === null) {
      clearPattern();
      return;
    }
    setSelectedOption(selected);
    const selectedObject = patterns.find(option => option.PatternId === selected.value);
    // Accessing different columns
    if (selectedObject) {
      const Id = selectedObject.PatternId;
      const Caption = selectedObject.Caption;
      const Message1 = selectedObject.Message1;
      const Message2 = selectedObject.Message2;
      const file = selectedObject.File;


      setPatternTitle(Caption)
      setMsg1(Message1)
      setMsg2(Message2)
      setFileName(file);
      const chosenPattern = patterns.find(pattern => pattern.PatternId === selected.value);
      setSelectedPattern(chosenPattern);
    }
  };



  const clearPattern = () => {
    setPatternTitle("")
    setMsg1("");
    setMsg2("");
    setAddedFile(null);
    setSelectedPattern(null);
    setSelectedOption(null);
    setFileName("");
  }


  const addPatternHandler = async () => {
    if (patternTitle !== "") {
      console.log("addedFile: ", addedFile);
      let fileName = "";
      if (addedFile !== null) {
        fileName = addedFile.name;
      }
      setFileName(fileName);
      const id = patterns.length + 1;
      Promise.all([addPattern(id, patternTitle, msg1, msg2, fileName), savePatternFile(id, addedFile)]).then(([new_pattern, add_file_result]) => {
        console.log("new_pattern: ", new_pattern);
        console.log('add file result', add_file_result)
        setPatterns(prevPatterns => [...prevPatterns, new_pattern]);
        if (new_pattern.PatternId && new_pattern.Caption) {
          setOptions(prevOptions => [
            ...prevOptions,
            { value: new_pattern.PatternId, label: new_pattern.Caption }
          ]);
        }

      })

      clearPattern();
    } else {
      alert("יש להזין כותרת לתבנית");
    }
  };

  const handleDeletePattern = () => {
    const newOptions = options.filter(option => option != selectedOption)
    const newPatterns = patterns.filter(pattern => pattern != selectedPattern);
    Promise.all([deletePattern(selectedPattern.PatternId), deletePatternFile(selectedPattern.PatternId)]).then((res) => {
      console.log(res)

    })

    setSelectedOption(null);
    setSelectedPattern(null);
    setOptions(newOptions);
    setPatterns(newPatterns);
    clearPattern();
  }

  const handleIsRepChange = (value) => {
    setIsRep(value);
    // filterContacts();
  };

  const handleSchoolAmountChange = (e) => {
    const value = Number(e.target.value);
    if (value >= 0) {
      setSchoolAmount(value);
      setSelectedSchools(rowData.slice(0, value));
      console.log("number of schools is: ", selectedSchools.length)
    }
  };

  const handleTypeSelectionChange = (
    selected: string[]
  ) => {
    setSelectedTypes(selected);
    filterSchools();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAddedFile(e.target.files[0]);
      setFileName(e.target.files[0].name)
    }
  };

  return (
    <>
<QrCode ref={qrCodeRef}/>
      <Container fluid className="formGrid text-end bg-transparent">
        <Row className="borderedColumns flex-row-reverse">
          <Col className="square border border-dark custom-col">
            <Row className="mb-3 justify-content-end">
              <Col>
                <h4>תוכן ההודעה</h4>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <Button
                  variant="info"
                  onClick={addPatternHandler}
                >
                  {pageText.addMessagePattern}
                </Button>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
                <InputGroup className="mb-3">
                  <Form.Control
                    placeholder={patternTitle}
                    style={{ direction: "rtl", textAlign: "right" }}
                    onBlur={(e) => {
                      setPatternTitle(e.target.value);
                    }}
                  />
                </InputGroup>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col>
                <Select
                  options={options}
                  value={selectedOption}
                  onChange={handlePatternChange}
                  placeholder="..בחר תבנית הודעות"
                  isClearable
                />
                <br></br>
                <Button onClick={handleDeletePattern}>
                  {pageText.deleteMessagePattern}
                </Button>
              </Col>
            </Row>
            <Row className="mb-3">
              <Form.Group as={Col} controlId="formMsgText1">
                <Form.Label>{pageText.msgTextLabel}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={msg1}
                  style={{ direction: "rtl", textAlign: "right" }}
                  onChange={(e) => setMsg1(e.target.value)}
                />
              </Form.Group>

              <Row className="mb-3">
                <Form.Group as={Col} controlId="formMsgText2">
                  <Form.Label>{pageText.msgFileLabel}</Form.Label>

                  <input
                    type="file"
                    id="fileInput"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <br></br>
                  <Button
                    className="file-input-button" // Apply custom class
                    onClick={() => document.getElementById('fileInput')?.click()}
                  >
                    {fileName ? fileName : "..בחר קובץ"}
                  </Button>
                </Form.Group>
              </Row>
              <Row className="mb-3"></Row>
              <Form.Group as={Col} controlId="formMsgText3">
                <Form.Label>{pageText.msgTextLabel}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={msg2}
                  style={{ direction: "rtl", textAlign: "right" }}
                  onChange={(e) => {
                    setMsg2(e.target.value);
                  }}
                />
              </Form.Group>
            </Row>
<Row>
  <Col>
    <Button
      variant="danger"
      onClick={() => {
        (async () => {
          console.log("\n=== 🧪 TEST BUTTON CLICKED ===");
          console.log("⏰ Start time:", new Date().toISOString());
          
                  try {
            const testPhone = '526554868'; // ← בלי 0 בהתחלה!
            const countryCode = '972';
            
            console.log("📞 Target:", testPhone);
            console.log("💬 Message 1:", msg1 || "הודעת טסט");
            console.log("💬 Message 2:", msg2 || "empty");
            console.log("📎 File:", addedFile?.name || "no file");
            
            // Step 1: Check/Initialize connection (60 second timeout)
            console.log("\n=== Step 1: Checking Connection ===");
            if (!qrCodeRef.current) {
              alert("שגיאה: קומפוננט QR לא זמין");
              return;
            }

            console.log("🔌 Calling checkConnection...");
            const isConnected = await qrCodeRef.current.checkConnection();
            console.log("✅ Connection result:", isConnected);
            console.log("⏰ Time:", new Date().toISOString());
            
            if (!isConnected) {
              console.log("❌ Failed to connect");
              alert("נכשל בחיבור. נסה שוב.");
              return;
            }

            // Step 2: Wait additional time to ensure ready
            console.log("\n=== Step 2: Waiting for Full Readiness ===");
            console.log("⏳ Waiting 10 seconds to ensure client is ready...");
            await new Promise(resolve => setTimeout(resolve, 10000));
            console.log("✅ Wait complete");
            console.log("⏰ Time:", new Date().toISOString());

            // Step 3: Send message
            console.log("\n=== Step 3: Sending Message ===");
            const messageToSend = msg1 || "הודעת טסט מהמערכת 🎉";
            
            console.log("📤 Message:", messageToSend.substring(0, 50));
            
            const result = await sendMessageViaWhatsApp(
              messageToSend,
              msg2, 
              addedFile, 
              testPhone,
              countryCode,
              selectedPattern?.PatternId
            );
            
            console.log("📊 Send result:", result);
            console.log("⏰ Time:", new Date().toISOString());
            
            if (result.success) {
              alert(`✅ הודעת הטסט נשלחה בהצלחה!\nנשלח ל: ${testPhone}`);
              console.log("✅ Message sent successfully!");
            } else {
              const errorMsg = result.error || "שגיאה לא ידועה";
              alert(`❌ שגיאה בשליחה:\n${errorMsg}`);
              console.error("❌ Send failed:", errorMsg);
            }
            
            console.log("\n=== ✅ TEST COMPLETE ===");
            console.log("⏰ End time:", new Date().toISOString());
            
          } catch (error) {
            console.error("\n=== ❌ TEST ERROR ===");
            console.error("Error:", error);
            console.log("⏰ Error time:", new Date().toISOString());
            alert(`❌ שגיאה: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`);
          }
        })();
      }}
    >
      {pageText.testButton}
    </Button>
  </Col>
</Row>
          </Col>

          <Col className="square border border-dark">
            <Form>
              <Row className="mb-3">
                <Col>
                  <h2>בחר בתי ספר</h2>
                </Col>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formSchoolAmount">
                  <Form.Label>{pageText.schoolAmountLabel}</Form.Label>
                  <Form.Control
                    type="number"
                    value={schoolAmount}
                    onChange={handleSchoolAmountChange}
                    step={5}
                  />
                  {schoolAmountError ?
                    <p className="errorMessage">{pageText.schoolAmountError}</p> : null}
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formSchoolStatuses">
                  <Form.Label>{pageText.schoolStatusesLabel}</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedSchoolStatuses}
                    setSelected={handleSchoolStatusesSelectionChange}
                    options={SchoolStatuses}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                  <Form.Text className="text-muted">
                    {pageText.noneChosenNote}
                  </Form.Text>
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>שלבי חינוך</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedEductionStages}
                    setSelected={handleStagesSelectionChange}
                    options={stages}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>מגזרים</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedSectors}
                    setSelected={handleSectorSelectionChange}
                    options={sectors}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>סוגים</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedTypes}
                    setSelected={handleTypeSelectionChange}
                    options={schoolTypes}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>ערים</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedCities}
                    setSelected={handleCitySelectionChange}
                    options={Cities}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
            </Form>
          </Col>

          <Col className="square border border-dark">
            <Form>
              <Row className="mb-3">
                <Col>
                  <h2>{pageText.chooseContacts}</h2>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col>
                  <b>{pageText.setPriority}</b>
                </Col>
              </Row>

              <Row className="mb-3">
                <Form.Group as={Col} controlId="formContactIsRep">
                  <Form.Label>{pageText.contactIsRepLabel}</Form.Label>
                  <Form.Check
                    inline
                    type="radio"
                    label={pageText.yes}
                    name="isRepRadios"
                    id="isRepRadios1"
                    onClick={() => handleIsRepChange(true)}
                    checked={isRep === true}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label={pageText.no}
                    name="isRepRadios"
                    id="isRepRadios2"
                    onClick={() => handleIsRepChange(false)}
                    checked={isRep === false}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label={pageText.both}
                    name="isRepRadios"
                    id="isRepRadios3"
                    onClick={() => handleIsRepChange(null)}
                    checked={isRep === null}
                  />
                </Form.Group>
              </Row>

              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>תפקידים</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedRoles}
                    setSelected={handleRoleSelectionChange}
                    options={roles}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>סטטוסים של אנשי קשר</Form.Label>
                  <MultiSelectSearchBar
                    selected={selectedContactStatuses}
                    setSelected={handleContactStatusesSelectionChange}
                    options={ContactStatuses}
                    placeholder=""
                    labelKey={searchBarLabelKey}
                  />
                </Form.Group>
              </Row>
              {/* Other form elements... */}
            </Form>

            <Row className="mb-3">
              <Col></Col>
            </Row>
            <Row className="mb-3">
              <Col>
                <Button
                  variant="primary"
                  onClick={() => {

                  }}
                >
                  {pageText.addPriority}
                </Button>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col>
               <Button
  variant="primary"
  onClick={async () => {
    console.log("\n=== 🔍 בחירת אנשי קשר מבתי ספר מסוננים ===");
    
    // בדיקה: האם יש בתי ספר נבחרים?
    if (selectedSchools.length === 0) {
      alert("אנא בחר בתי ספר תחילה (השתמש בסינון או בכמות)");
      return;
    }
    
    console.log("📚 בתי ספר נבחרים:", selectedSchools.length);
    
    // שלב 1: קבל את מזהי בתי הספר שנבחרו/סוננו
    const selectedSchoolsIds = selectedSchools.map(
      (school: { Schoolid: any }) => school.Schoolid
    );
    
    // שלב 2: הבא את כל אנשי הקשר מבתי הספר האלה
    const allContacts = await selectContacts(selectedSchoolsIds);
    console.log("👥 סה\"כ אנשי קשר מבתי הספר:", allContacts.length);
    
    setSelectedContacts(allContacts);
    
    // שלב 3: סנן את אנשי הקשר לפי הקריטריונים שנבחרו
    const filtered = allContacts.filter((contact: any) => {
      
      // 🎯 סינון לפי נציג (ברירת מחדל: רק נציגים)
      // isRep = true → רק נציגים
      // isRep = false → רק לא נציגים  
      // isRep = null → הכל
      const repMatch = isRep === null || contact.IsRepresentive === isRep;
      
      // 📋 סינון לפי תפקיד (אם נבחרו תפקידים)
      const roleMatch = selectedRoles.length === 0 || 
                       selectedRoles.includes(contact.Role);
      
      // 📊 סינון לפי סטטוס איש קשר (אם נבחרו סטטוסים)
      const statusMatch = selectedContactStatuses.length === 0 || 
                         selectedContactStatuses.includes(contact.Status);
      
      return repMatch && roleMatch && statusMatch;
    });
    
    console.log("✅ אחרי סינון:", filtered.length);
    console.log("📊 קריטריוני סינון:");
    console.log("   - נציג:", isRep === null ? "הכל (שניהם)" : (isRep ? "רק נציגים ✓" : "לא נציגים"));
    console.log("   - תפקידים:", selectedRoles.length === 0 ? "הכל" : selectedRoles.join(", "));
    console.log("   - סטטוסים:", selectedContactStatuses.length === 0 ? "הכל" : selectedContactStatuses.join(", "));
    
    setFilteredContacts(filtered);
    setMsgStatuses([]);
     // ✅ עדכן גם את הטבלה להצגת בתי הספר המסוננים בלבד
    setRowData(selectedSchools);
    // הצג תוצאה
    const resultMsg = `
נמצאו ${filtered.length} אנשי קשר מתוך ${allContacts.length}

מבתי ספר: ${selectedSchools.length}
נציג: ${isRep === null ? "הכל" : (isRep ? "רק נציגים" : "לא נציגים")}
תפקידים: ${selectedRoles.length === 0 ? "הכל" : selectedRoles.length}
סטטוסים: ${selectedContactStatuses.length === 0 ? "הכל" : selectedContactStatuses.length}
    `.trim();
    
    alert(resultMsg);
  }}
>
  {pageText.chooseContacts}
</Button>
              </Col>
            </Row>

            <Row className="mb-3">
              <Form.Group as={Col} controlId="formNewStatus">
                <Form.Label>בחר סטטוס</Form.Label>
                <CreatableSelect
                  value={newStatus}
                  onChange={handleStatusChange}
                  options={statusesOptions}
                  isClearable
                  placeholder="..בחר סטטוס או הקלד חדש"
                />
              </Form.Group>
            </Row>
            <Row className="mb-3">
              <Col>
                <Button
                  variant="primary"
                  onClick={async () => {
                    setNewStatusError(false);
                    
                    // איפוס המונים בתחילת ריצה
                    setSendingStats({ success: 0, missing: 0, error: 0 });
                    
                    console.log("\n=== 🚀 Starting Batch Send with Live Stats ===");
                    
                    if (filteredContacts.length === 0) {
                        alert("לא נבחרו אנשי קשר לשליחה");
                        return;
                    }

                    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

                    // פונקציית עזר לעדכון הגריד
                    const updateGridRow = (contact: any, newStatus: string) => {
                        if (gridRef.current && gridRef.current.api) {
                            const updatedRow = { ...contact, Status: newStatus };
                            gridRef.current.api.applyTransaction({ update: [updatedRow] });
                        }
                    };

                    for (const [index, contact] of filteredContacts.entries()) {
                        const phone = contact.Cellphone;
                        const name = `${contact.FirstName} ${contact.LastName}`;
                        
                        console.log(`\n⏳ Processing ${index + 1}/${filteredContacts.length}: ${name}`);

                        // 1. בדיקה אם חסר טלפון
                        if (!phone || phone.trim() === "") {
                            setSendingStats(prev => ({ ...prev, missing: prev.missing + 1 }));
                            
                            await updateContactsStatus("להשיג", [contact.Contactid]); 
                            updateGridRow(contact, "להשיג");
                            continue; 
                        }

                        try {
                            // 2. ניסיון שליחה
                            const result = await sendMessageViaWhatsApp(
                                msg1, 
                                msg2, 
                                addedFile, 
                                phone, 
                                "972", 
                                selectedPattern?.PatternId
                            );

                            if (result.success) {
                                setSendingStats(prev => ({ ...prev, success: prev.success + 1 }));
                                
                                if (newStatus && newStatus['value']) {
                                    const statusToSet = newStatus['value'];
                                    await updateContactsStatus(statusToSet, [contact.Contactid]);
                                    updateGridRow(contact, statusToSet);
                                }
                                
                            } else {
                                setSendingStats(prev => ({ ...prev, error: prev.error + 1 }));
                                
                                await updateContactsStatus("שגוי", [contact.Contactid]);
                                updateGridRow(contact, "שגוי");
                            }

                        } catch (error) {
                            setSendingStats(prev => ({ ...prev, error: prev.error + 1 }));
                            
                            console.error("❌ Critical Error", error);
                            await updateContactsStatus("שגוי", [contact.Contactid]);
                            updateGridRow(contact, "שגוי");
                        }

                        // השהייה
                        if (index < filteredContacts.length - 1) {
                            const delay = Math.floor(Math.random() * (12000 - 5000 + 1) + 5000); 
                            await sleep(delay);
                        }
                    }

                    alert("תהליך השליחה הסתיים בהצלחה!");
                  }}
                >
                  {pageText.sendMessages}
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* --- התחלת הקוד החדש של לוח המחוונים (עיצוב שורה אחת) --- */}
        <Row className="mt-4 mb-2">
          <Col>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-around', 
              alignItems: 'center', // מיישר את הכל לאמצע הגובה
              background: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '8px', 
              border: '1px solid #dee2e6',
              direction: 'rtl'
            }}>
              
              {/* בתי ספר */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <strong>בתי ספר שנבחרו:</strong>
                <span style={{ fontSize: '1.1em' }}>{selectedSchools.length}</span>
              </div>

              <div style={{ width: '1px', height: '20px', background: '#ccc' }}></div>

              {/* נשלחו */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'green' }}>
                <strong>נשלחו בהצלחה:</strong>
                <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{sendingStats.success}</span>
              </div>

              {/* להשיג */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#d63384' }}>
                <strong>חסר טלפון ("להשיג"):</strong>
                <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{sendingStats.missing}</span>
              </div>

              {/* שגוי */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'red' }}>
                <strong>תקלות ("שגוי"):</strong>
                <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{sendingStats.error}</span>
              </div>

            </div>
          </Col>
        </Row>
        {/* --- סוף הקוד החדש --- */}
        <Suspense>
          <div
            id="grid-1"
            className="ag-theme-quartz-dark "
            style={{ width: "100%", height: "1000px" }}
          >

            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={colDefs}
              enableRtl={true}
              onGridReady={onGridReady}
            />
          </div>
        </Suspense>
      </Container>
    </>
  );
}