/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { ThemeContext } from "@/context/Theme/Theme"; // הוסף את השורה הזו
import React, { ChangeEvent, Suspense, useRef } from "react";
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Button, Col, Container, Form, InputGroup, Row } from "react-bootstrap";
import { useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation"; 
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
  addSchoolStatuses,
  getMessagePatterns,
  addPattern,
  deletePattern,
  updateContactsStatus,
  updateSchoolStatus, 
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
import "ag-grid-community/styles/ag-theme-quartz.css";
import { title } from "process";
import { deletePatternFile, savePatternFile, sendMessageViaWhatsApp } from "@/db/whatsapprequests";
import { DataType, getFromStorage, updateStorage } from "@/components/Tables/Messages/Storage/MessagesDataStorage";
import { updateStorage as updateSchoolStorage } from "@/components/Tables/SchoolTable/Storage/SchoolDataStorage";
import { MessageMonitor } from "./MessageMonitor";
import { getSmartMessageDelay, formatDelayMessage, estimateRemainingTime } from './utils/delayUtils';

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
  const router = useRouter(); 
  const { theme } = useContext(ThemeContext);
  const gridRef: any = useRef(null);

  const [isSending, setIsSending] = useState(false); 
  const shouldStopRef = useRef(false); 

  const [rowData, setRowData]: any = useState("");
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

  const [SchoolStatuses, setSchoolStatuses] = useState<any[]>([]);
  const [ContactStatuses, setContactStatuses] = useState<any[]>([]);

  const [schoolTypes, setSchoolTypes] = useState([]);
  const [msgStatuses, setMsgStatuses] = useState([]);

  const [msg1, setMsg1] = useState("");
  const [msg2, setMsg2] = useState("");
  const [addedFile, setAddedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  // ברירת מחדל: נציגים בלבד (true)
  const [isRep, setIsRep] = useState<boolean | null>(true); 

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
  const [newStatus, setNewStatus] = useState<any>("");
  const [schoolAmount, setSchoolAmount] = useState(0);
  const [showMonitor, setShowMonitor] = useState(false);
  const [delayHistory, setDelayHistory] = useState<{delay: number, type: string}[]>([]);
  const [estimatedFinish, setEstimatedFinish] = useState("");
  const [schoolAmountError, setSchoolAmountError] = useState(false);
  const [newStatusError, setNewStatusError] = useState(false);
  const [sendingStats, setSendingStats] = useState({ success: 0, missing: 0, error: 0 });
  const [oneTime, updateOneTime] = useState(0);
  
  // Ref לסטטוס הנבחר כדי שהגריד יראה אותו בזמן אמת
  const newStatusRef = useRef(newStatus);
  useEffect(() => {
    newStatusRef.current = newStatus;
  }, [newStatus]);

  const dataRowCount = useRef(0);
  const rowCount = useRef(0);
// במקום:



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
          const cities = citiesData.map((city: { CityName: any }) => city.CityName);
          const sectors = sectorsData.map((sector: { ReligionName: any }) => sector.ReligionName);
          const roles = rolesData.map((role: { RoleName: any }) => role.RoleName);

          const statuses = ContactsStatuses.map((val) => val.StatusName)
          const stages = stagesData.map((stage: { StageName: any }) => stage.StageName);

          const transformedStatuses = statuses.map(status => ({ value: status, label: status }));
          const schoolTypes = schoolTypesData.map((schoolType: { TypeName: any }) => schoolType.TypeName);

          setCities(cities);
          setSectors(sectors);
          setRoles(roles);
          setSchoolStatuses(SchoolStatuses?.map((val) => val.StatusName) || []);
          setContactStatuses(statuses || []);
          setStatusesOptions(transformedStatuses);
          setStages(stages);

        // שמירת כל התבניות ב-State
setPatterns(messagePatternsData);

// סינון: מציגים רק מה ששייך לשיווק או ללא הגדרה (General/Marketing)
const marketingPatterns = messagePatternsData.filter(p => p.MessageContext !== "Placement");

const formattedOptions = marketingPatterns.map(option => ({ 
  value: option.PatternId, 
  label: option.Caption 
}));
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

            const cities = citiesData.map((city: { CityName: any }) => city.CityName);
            const sectors = sectorsData.map((sector: { ReligionName: any }) => sector.ReligionName);
            const roles = rolesData.map((role: { RoleName: any }) => role.RoleName);

            const statuses = ContactStatuses.map((val) => val.StatusName)
            const stages = stagesData.map((stage: { StageName: any }) => stage.StageName);

            const transformedStatuses = statuses.map(status => ({ value: status, label: status }));
            const schoolTypes = schoolTypesData.map((schoolType: { TypeName: any }) => schoolType.TypeName);

            setCities(cities);
            setSectors(sectors);
            setRoles(roles);
            
            setSchoolStatuses(SchoolStatuses ? SchoolStatuses.map((val) => val.StatusName) : []);
            setContactStatuses(statuses || []);
            setStatusesOptions(transformedStatuses);
            setStages(stages);

            setPatterns(messagePatternsData);

// סינון תבניות שיווק בלבד עבור דף זה
const filteredForMarketing = messagePatternsData.filter(p => p.MessageContext !== "Placement");

const formattedOptions = filteredForMarketing.map(option => ({ 
  value: option.PatternId, 
  label: option.Caption 
}));
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
    // 1. הגדרת מיפוי רוחב עמודות קבועות
    const columnWidths: { [key: string]: number } = {
      "מזהה": 70,
      "שם בית ספר": 180,
      "שלב חינוך": 110,
      "מגזר": 110,
      "סוג": 90,
      "עיר": 110,
      "סמל": 90,
      "נציג": 140,
      "סטטוס": 120,
      "תאריך": 110,
      "Representative ID": 130,
      "Remarks": 150,
      "טלפון נייד": 140
    };

    const getPhoneValue = (params: any, contactsList: any[]) => {
      if (!contactsList || contactsList.length === 0 || !params.data) return "";
      const data = params.data;
      const repId = data.RepresentiveID || data.RepresentativeId || data.RepId || data.ContactId; 

      if (repId) {
        const match = contactsList.find(c => String(c.Contactid) === String(repId));
        if (match) return match.Cellphone || match.Phone || "";
      }

      const repName = data.Representive || data.Representative || data.Name;
      const schoolId = data.Schoolid || data.SchoolId;

      if (repName && schoolId) {
        const schoolContacts = contactsList.filter(c => String(c.SchoolId || c.Schoolid) === String(schoolId));
        const match = schoolContacts.find(c => {
            const fullName = `${c.FirstName || ""} ${c.LastName || ""}`.trim();
            return fullName === String(repName).trim();
        });
        if (match) return match.Cellphone || match.Phone || "";
      }
      return "";
    };

    // שליפה מה-Storage
    getFromStorage().then(({ Schools, Religion, Cities, schoolsContacts, Tablemodel }: DataType) => {
      if (Schools && Religion && Cities && schoolsContacts && Tablemodel) {
        setRowData(Schools);
        setSchools(Schools);
        setSelectedSchools(Schools);
        rowCount.current = Schools.length;
        dataRowCount.current = Schools.length;

        const colDefsBuilder: any[] = Tablemodel[0]?.map((value: any, index: any) => {
          const headerName = Tablemodel[1][index];
          let colDef: any = {
            field: value,
            headerName: headerName,
            editable: true,
            filter: true,
            width: columnWidths[headerName] || 120,
            suppressSizeToFit: true 
          };

          if (headerName === "סטטוס") {
             colDef.cellStyle = (params: any) => {
                const statusValue = newStatusRef.current?.value || newStatusRef.current;
                if (params.value && String(params.value) === String(statusValue)) {
                     return { backgroundColor: '#198754', color: 'white', fontWeight: 'bold' };
                }
                return null;
             };
          }
          return colDef;
        }) || [];

        colDefsBuilder.push({
          field: "CalculatedPhone",
          headerName: "טלפון נייד",
          valueGetter: (params) => getPhoneValue(params, schoolsContacts),
          width: 140,
          suppressSizeToFit: true
        });

        setColDefs(colDefsBuilder);

      } else {
        // שליפה מהשרת במקרה שאין ב-Storage
        Promise.all([
            getAllSchools(), 
            getAllReligionSectors(), 
            getAllCities(), 
            getAllContacts(), 
            getModelFields("School")
        ]).then(([schoolsData, religionData, citiesData, contactsData, modelData]) => {
            setRowData(schoolsData);
            setSchools(schoolsData);
            setSelectedSchools(schoolsData);
            rowCount.current = schoolsData.length;
            dataRowCount.current = schoolsData.length;

            const colDefsBuilder: any[] = modelData[0]?.map((value: any, index: any) => {
                const headerName = modelData[1][index];
                let colDef: any = {
                    field: value, 
                    headerName: headerName, 
                    editable: true, 
                    filter: true,
                    width: columnWidths[headerName] || 120,
                    suppressSizeToFit: true
                };

                if (headerName === "סטטוס") {
                    colDef.cellStyle = (params: any) => {
                        const statusValue = newStatusRef.current?.value || newStatusRef.current;
                        if (params.value && String(params.value) === String(statusValue)) {
                             return { backgroundColor: '#198754', color: 'white', fontWeight: 'bold' };
                        }
                        return null;
                    };
                 }
                return colDef;
            }) || [];

            colDefsBuilder.push({
                field: "CalculatedPhone",
                headerName: "טלפון נייד",
                valueGetter: (params) => getPhoneValue(params, contactsData),
                width: 140,
                suppressSizeToFit: true
            });

            setColDefs(colDefsBuilder);
        });
      }
    });
  };

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
  };

  const handleCitySelectionChange = (selected: string[]) => { setSelectedCities(selected); };
  const handleSectorSelectionChange = (selected: string[]) => { setSelectedSectors(selected); filterSchools(); };
  const handleRoleSelectionChange = (selected: React.SetStateAction<never[]>) => { setSelectedRoles(selected); };
  const handleStagesSelectionChange = (selected: React.SetStateAction<never[]>) => { setSelectedEductionStages(selected); };
  const handleStatusChange = (selectedStatus) => { setNewStatus(selectedStatus); };
  const handleContactStatusesSelectionChange = (selected: string[]) => { setSelectedContactStatuses(selected); };
  const handleSchoolStatusesSelectionChange = (selected: React.SetStateAction<never[]>) => { setSelectedSchoolStatuses(selected); };

  const handlePatternChange = async (selected: any) => {
    if (selected === null) {
      clearPattern();
      return;
    }
    setSelectedOption(selected);
    const selectedObject = patterns.find(option => option.PatternId === selected.value);
    
    if (selectedObject) {
      setPatternTitle(selectedObject.Caption);
      setMsg1(selectedObject.Message1);
      setMsg2(selectedObject.Message2);
      setFileName(selectedObject.File);
      setSelectedPattern(selectedObject);

      // --- לוגיקת טעינת הקובץ מחדש ---
      if (selectedObject.File) {
        try {
          // נתיב הקובץ בשרת - וודא שהנתיב תואם להגדרות ה-BackEnd שלך
          const fileUrl = `/api/uploads/${selectedObject.PatternId}_${selectedObject.File}`;
          
          const response = await fetch(fileUrl);
          if (response.ok) {
            const blob = await response.blob();
            // המרה חזרה לאובייקט File כדי שהשליחה תזהה אותו
            const file = new File([blob], selectedObject.File, { type: blob.type });
            setAddedFile(file);
            console.log("✅ הקובץ נטען בהצלחה מהשרת");
          } else {
            console.error("❌ לא ניתן היה למשוך את הקובץ מהשרת");
            setAddedFile(null);
          }
        } catch (error) {
          console.error("Error fetching pattern file:", error);
          setAddedFile(null);
        }
      } else {
        setAddedFile(null);
      }
      // -------------------------------
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
    if (patternTitle === "") {
      alert("יש להזין כותרת לתבנית");
      return;
    }

    let fileName = addedFile ? addedFile.name : "";
    setFileName(fileName);

    // --- תיקון: חישוב ID חדש על בסיס הערך הגבוה ביותר הקיים ---
    const maxId = patterns.length > 0 
      ? Math.max(...patterns.map(p => p.PatternId || 0)) 
      : 0;
    const nextId = maxId + 1;
    // --------------------------------------------------------

    try {
      // 1. שמירה בבסיס הנתונים עם ה-ID הייחודי החדש
      const new_pattern = await addPattern(nextId, patternTitle, msg1, msg2, fileName);

      // 2. שמירת הקובץ הפיזי בשרת הווצאפ
      if (addedFile) {
        await savePatternFile(new_pattern.PatternId || nextId, addedFile);
      }

      // 3. עדכון הסטורג' המקומי (פותר את הצורך במחיקה ידנית)
      const currentData = await getFromStorage();
      const updatedPatterns = [...(currentData.messagePatterns || []), new_pattern];
      await updateStorage({
        ...currentData,
        messagePatterns: updatedPatterns
      });

 // 4. עדכון התצוגה (UI) בזמן אמת - עם סינון נוסחי שיבוץ
setPatterns(updatedPatterns);

const filteredForUI = updatedPatterns.filter(p => p.MessageContext !== "Placement");

setOptions(filteredForUI.map(p => ({ 
  value: p.PatternId, 
  label: p.Caption 
})));

      clearPattern();
      alert("התבנית נשמרה וסונכרנה בהצלחה! ✅");
    } catch (error) {
      console.error("❌ שגיאה בשמירת התבנית:", error);
      alert("שגיאה: ייתכן והמזהה כבר קיים. נסה שוב.");
    }
  };

  const handleDeletePattern = async () => {
    if (!selectedPattern) {
      alert("אנא בחר תבנית למחיקה");
      return;
    }

    if (window.confirm(`האם אתה בטוח שברצונך למחוק את התבנית: ${selectedPattern.Caption}?`)) {
      try {
        // 1. מחיקה מה-DB ומהשרת (קובץ)
        await Promise.all([
          deletePattern(selectedPattern.PatternId),
          deletePatternFile(selectedPattern.PatternId)
        ]);

        // 2. עדכון הסטורג' המקומי (IndexedDB) - כדי שלא תצטרך למחוק סטורג' ידנית
        const currentData = await getFromStorage();
        const updatedPatterns = (currentData.messagePatterns || []).filter(
          (p: any) => p.PatternId !== selectedPattern.PatternId
        );
        
        await updateStorage({
          ...currentData,
          messagePatterns: updatedPatterns
        });

        // 3. עדכון ה-UI בזמן אמת
        setPatterns(updatedPatterns);
        setOptions(updatedPatterns.map(p => ({ value: p.PatternId, label: p.Caption })));
        
        clearPattern();
        alert("התבנית נמחקה בהצלחה! 🗑️");
      } catch (error) {
        console.error("Error deleting pattern:", error);
        alert("שגיאה במחיקת התבנית");
      }
    }
  };
  const handleIsRepChange = (value) => { setIsRep(value); };

  const handleSchoolAmountChange = (e) => {
    const value = Number(e.target.value);
    if (value >= 0) {
      setSchoolAmount(value);
      setSelectedSchools(rowData.slice(0, value));
    }
  };

  const handleTypeSelectionChange = (selected: string[]) => { setSelectedTypes(selected); filterSchools(); };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAddedFile(e.target.files[0]);
      setFileName(e.target.files[0].name)
    }
  };

  const replaceMessageVariables = (message: string, contact: any): string => {
    if (!message) return message;
    let result = message.replace(/{name}/gi, contact.FirstName || "");
    return result;
  };
 return (
    <>
      <Container fluid className="p-4" style={{ direction: 'rtl' }}>
        <Row className="g-4"> {/* g-4 מוסיף רווח חכם בין הכרטיסים */}
          <Col lg={4} md={12}>
            <div className="custom-card h-100">
              {/* כותרת הכרטיס */}
              <div className="custom-card-header bg-gradient-to-l from-teal-50 to-white text-teal-800 border-b border-teal-100">
                <h4>✍️ תוכן ההודעה</h4>
              </div>
              
              <div className="custom-card-body d-flex flex-column gap-3">
                {/* כפתור הוספה */}
                <button className="custom-btn custom-btn-info w-100 justify-content-center" onClick={addPatternHandler}>
                  {pageText.addMessagePattern}
                </button>

                <InputGroup>
                  <Form.Control 
                    className="custom-input" 
                    placeholder={patternTitle} 
                    style={{ direction: "rtl", textAlign: "right" }} 
                    onBlur={(e) => { setPatternTitle(e.target.value); }} 
                  />
                </InputGroup>

                <div>
                  <Select options={options} value={selectedOption} onChange={handlePatternChange} placeholder="..בחר תבנית הודעות" isClearable className="mb-2" />
                  <button className="custom-btn custom-btn-danger custom-btn-sm" onClick={handleDeletePattern}>
                    {pageText.deleteMessagePattern}
                  </button>
                </div>

                <Form.Group controlId="formMsgText1">
                  <Form.Label>{pageText.msgTextLabel}</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    className="custom-textarea" 
                    rows={5} 
                    value={msg1} 
                    style={{ direction: "rtl", textAlign: "right" }} 
                    onChange={(e) => setMsg1(e.target.value)} 
                  />
                </Form.Group>

                <Form.Group controlId="formMsgText2">
                  <Form.Label>{pageText.msgFileLabel}</Form.Label>
                  <input type="file" id="fileInput" onChange={handleFileChange} style={{ display: 'none' }} />
                  <button className="custom-btn custom-btn-secondary w-100" onClick={() => document.getElementById('fileInput')?.click()}>
                    {fileName ? `📎 ${fileName}` : "📂 בחר קובץ.."}
                  </button>
                </Form.Group>

                <Form.Group controlId="formMsgText3">
                  <Form.Label>הודעה משלימה</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    className="custom-textarea" 
                    rows={5} 
                    value={msg2} 
                    style={{ direction: "rtl", textAlign: "right" }} 
                    onChange={(e) => { setMsg2(e.target.value); }} 
                  />
                </Form.Group>

                <button className="custom-btn custom-btn-ghost w-100" onClick={() => { }}>
                  🧪 {pageText.testButton}
                </button>
              </div>
            </div>
          </Col>

          
          <Col lg={4} md={12}>
            <div className="custom-card h-100">
              <div className="custom-card-header bg-gradient-to-l from-indigo-50 to-white text-indigo-800 border-b border-indigo-100">
                <h4>🏫 בחר בתי ספר</h4>
              </div>
              <div className="custom-card-body d-flex flex-column gap-3">
                <Form>
                  <Form.Group className="mb-3" controlId="formSchoolAmount">
                    <Form.Label>{pageText.schoolAmountLabel}</Form.Label>
                    <Form.Control 
                      type="number" 
                      className="custom-input" 
                      value={schoolAmount} 
                      onChange={handleSchoolAmountChange} 
                      step={5} 
                    />
                    {schoolAmountError && <p className="text-danger small">{pageText.schoolAmountError}</p>}
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>{pageText.schoolStatusesLabel}</Form.Label>
                    <MultiSelectSearchBar selected={selectedSchoolStatuses} setSelected={handleSchoolStatusesSelectionChange} options={SchoolStatuses} placeholder="" labelKey={searchBarLabelKey} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>שלבי חינוך</Form.Label>
                    <MultiSelectSearchBar selected={selectedEductionStages} setSelected={handleStagesSelectionChange} options={stages} placeholder="" labelKey={searchBarLabelKey} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>מגזרים</Form.Label>
                    <MultiSelectSearchBar selected={selectedSectors} setSelected={handleSectorSelectionChange} options={sectors} placeholder="" labelKey={searchBarLabelKey} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>סוגים</Form.Label>
                    <MultiSelectSearchBar selected={selectedTypes} setSelected={handleTypeSelectionChange} options={schoolTypes} placeholder="" labelKey={searchBarLabelKey} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>ערים</Form.Label>
                    <MultiSelectSearchBar selected={selectedCities} setSelected={handleCitySelectionChange} options={Cities} placeholder="" labelKey={searchBarLabelKey} />
                  </Form.Group>
                </Form>
              </div>
            </div>
          </Col>

          <Col lg={4} md={12}>
            <div className="custom-card h-100">
              <div className="custom-card-header bg-gradient-to-l from-orange-50 to-white text-orange-800 border-b border-orange-100">
                <h4>👥 בחר אנשי קשר</h4>
              </div>

              <div className="custom-card-body d-flex flex-column gap-3">
                <Form>
                  {/* אזור בחירת נציג - מעוצב */}
                  <div className="bg-slate-50 p-3 rounded border mb-3">
                    <Form.Label className="fw-bold mb-2">{pageText.contactIsRepLabel}</Form.Label>
                    <div className="d-flex gap-3">
                      <Form.Check inline type="radio" label={pageText.yes} name="isRepRadios" id="isRepRadios1" onClick={() => handleIsRepChange(true)} checked={isRep === true} />
                      <Form.Check inline type="radio" label={pageText.no} name="isRepRadios" id="isRepRadios2" onClick={() => handleIsRepChange(false)} checked={isRep === false} />
                      <Form.Check inline type="radio" label={pageText.both} name="isRepRadios" id="isRepRadios3" onClick={() => handleIsRepChange(null)} checked={isRep === null} />
                    </div>
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label>תפקידים</Form.Label>
                    <MultiSelectSearchBar selected={selectedRoles} setSelected={handleRoleSelectionChange} options={roles} placeholder="" labelKey={searchBarLabelKey} />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>סטטוסים של אנשי קשר</Form.Label>
                    <MultiSelectSearchBar selected={selectedContactStatuses} setSelected={handleContactStatusesSelectionChange} options={ContactStatuses} placeholder="" labelKey={searchBarLabelKey} />
                  </Form.Group>
                </Form>

                {/* כפתור בחירת אנשי קשר */}
                <button
                  className="custom-btn custom-btn-primary w-100 justify-content-center mt-2 shadow-sm"
                  onClick={async () => {
                    console.log("\n=== 📋 בחירת אנשי קשר מבתי ספר מסוננים ===");
                    if (selectedSchools.length === 0) {
                      alert("אנא בחר בתי ספר תחילה (השתמש בסינון או בכמות)");
                      return;
                    }

                    const selectedSchoolsIds = selectedSchools.map((school: { Schoolid: any }) => school.Schoolid);
                    const allContacts = await selectContacts(selectedSchoolsIds);
                    setSelectedContacts(allContacts);

                    const filtered = allContacts.filter((contact: any) => {
                      const contactIsRep = contact.IsRepresentative === true ||
                        contact.isRepresentative === true ||
                        contact.IsRepresentive === true ||
                        contact.IsRep === true;
                      const repMatch = isRep === null ||
                        (isRep === true && contactIsRep) ||
                        (isRep === false && !contactIsRep);
                      const roleMatch = selectedRoles.length === 0 || selectedRoles.includes(contact.Role);
                      const statusMatch = selectedContactStatuses.length === 0 ||
                        selectedContactStatuses.includes(contact.Status);
                      return repMatch && roleMatch && statusMatch;
                    });

                    setFilteredContacts(filtered);
                    setMsgStatuses([]);
                    setRowData(selectedSchools);

                    const resultMsg = `נמצאו ${filtered.length} אנשי קשר מתוך ${allContacts.length}\nבתי ספר: ${selectedSchools.length}\nנציג: ${isRep === null ? "הכל" : (isRep ? "רק נציגים" : "לא נציגים")}\nתפקידים: ${selectedRoles.length === 0 ? "הכל" : selectedRoles.length}\nסטטוסים: ${selectedContactStatuses.length === 0 ? "הכל" : selectedContactStatuses.length}`.trim();
                    alert(resultMsg);
                  }}
                >
                  👥 {pageText.chooseContacts}
                </button>

                <hr className="my-2" />

                <Form.Group className="mb-3">
                  <Form.Label>עדכון סטטוס לאחר שליחה</Form.Label>
                  <CreatableSelect value={newStatus} onChange={handleStatusChange} options={statusesOptions} isClearable placeholder="..בחר סטטוס או הקלד חדש" />
                </Form.Group>

                <div className="d-flex flex-column gap-2 mt-auto">
                  {/* כפתור שליחה ראשי ומשודרג */}
                  <button
                    className={`custom-btn custom-btn-success custom-btn-lg w-100 justify-content-center shadow-lg ${isSending ? 'opacity-75' : ''}`}
                    disabled={isSending}
                    onClick={async () => {
                      console.log("\n=== 🚀 תחילת תהליך שליחה ===");
                      
                      try {
                        console.log("🔍 בודק חיבור ל-WhatsApp...");
                        const statusRes = await fetch('http://localhost:3994/status');
                        const statusData = await statusRes.json();
                        
                        if (!statusData.connected) {
                          console.log("❌ לא מחובר ל-WhatsApp");
                          alert("נדרש חיבור ל-WhatsApp כדי לשלוח הודעות.\nאנא וודא שהאינדיקטור בסרגל העליון ירוק.");
                          setIsSending(false);
                          return;
                        }
                        console.log("✅ WhatsApp מחובר - ממשיך בשליחה");
                      } catch (err) {
                        console.error("❌ שגיאה בתקשורת עם השרת:", err);
                        alert("שגיאה בתקשורת עם שרת ה-WhatsApp. וודא שהוא פועל.");
                        setIsSending(false);
                        return;
                      }

                      setNewStatusError(false);
                      setSendingStats({ success: 0, missing: 0, error: 0 });
                      
                      let localSuccessCount = 0;
                      let localErrorCount = 0;
                      let localMissingCount = 0;

                      shouldStopRef.current = false; 
                      setIsSending(true); 

                      console.log("\n=== 🚀 Starting Batch Send ===");

                      let currentStorageData: any = null;
                      let localContactsList: any[] = [];
                      try {
                        currentStorageData = await getFromStorage();
                        if (currentStorageData && currentStorageData.schoolsContacts) {
                          localContactsList = currentStorageData.schoolsContacts;
                        }
                      } catch (e) {
                        console.error("Failed to load initial storage", e);
                      }

                      if (filteredContacts.length === 0) {
                        alert("לא נבחרו אנשי קשר לשליחה");
                        setIsSending(false);
                        return;
                      }

                      let statusToUse = "";
                      if (newStatus && typeof newStatus === 'object' && 'value' in newStatus) {
                        statusToUse = (newStatus as any).value;
                      } else if (typeof newStatus === 'string') {
                        statusToUse = newStatus;
                      }

                      if (statusToUse) {
                        if (!ContactStatuses.includes(statusToUse)) {
                          await addContactStatuses(statusToUse);
                          setContactStatuses(prev => [...prev, statusToUse]);
                        }
                        if (!SchoolStatuses.includes(statusToUse)) {
                          await addSchoolStatuses(statusToUse);
                          setSchoolStatuses(prev => [...prev, statusToUse]);
                        }
                      }

                      const contactsToSend = filteredContacts.filter(contact => 
                          contact.Cellphone && contact.Cellphone.trim() !== ""
                      );
                      
                      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

                      console.log(`📤 Sending to ${contactsToSend.length} contacts...`);
                      
                      for (const [index, contact] of contactsToSend.entries()) {
                        if (shouldStopRef.current) {
                          console.log("🛑 Sending Process Stopped by User");
                          alert(`התהליך נעצר על ידי המשתמש.\nנשלחו ${index} הודעות מתוך ${contactsToSend.length}.`);
                          break;
                        }

                        const phone = contact.Cellphone;

                        if (!phone || phone.trim() === "") {
                          setSendingStats(prev => ({ ...prev, missing: prev.missing + 1 }));
                          localMissingCount++;
                          await updateContactsStatus("להשיב", [contact.Contactid]);
                          continue;
                        }

                        try {
                          const personalizedMsg1 = replaceMessageVariables(msg1, contact);
                          const personalizedMsg2 = replaceMessageVariables(msg2, contact);

                          console.log(`📨 [${index + 1}/${contactsToSend.length}] Sending to ${contact.FirstName}...`);

                          const result = await sendMessageViaWhatsApp(
                            personalizedMsg1, 
                            personalizedMsg2, 
                            addedFile, 
                            phone, 
                            "972", 
                            selectedPattern?.PatternId
                          );

                          if (result.success) {
                            console.log(`✅ Sent successfully to ${contact.FirstName}`);
                            setSendingStats(prev => ({ ...prev, success: prev.success + 1 }));
                            localSuccessCount++; 

                            if (statusToUse) {
                              await updateContactsStatus(statusToUse, [contact.Contactid]);

                              try {
                                  const contactIndex = localContactsList.findIndex((c: any) => c.Contactid === contact.Contactid);
                                  if (contactIndex !== -1) {
                                      localContactsList[contactIndex].Status = statusToUse;
                                      localContactsList[contactIndex].status = statusToUse;
                                      if (currentStorageData) {
                                          await updateStorage({ 
                                              ...currentStorageData, 
                                              schoolsContacts: localContactsList 
                                          });
                                      }
                                  }
                              } catch (err) {
                                  console.error("Error updating local storage:", err);
                              }

                              const isRep = contact.IsRepresentative === true ||
                                contact.IsRepresentive === true ||
                                contact.isRepresentative === true ||
                                contact.IsRep === true;

                              if (isRep) {
                                const rawSchoolId = contact.Schoolid || contact.SchoolId;
                                if (rawSchoolId) {
                                  const schoolIdNum = Number(rawSchoolId);
                                  await updateSchoolStatus(statusToUse, [schoolIdNum]);

                                  if (gridRef.current && gridRef.current.api) {
                                    const rowNode = gridRef.current.api.getRowNode(String(schoolIdNum));
                                    if (rowNode) {
                                      rowNode.setDataValue('Status', statusToUse);
                                      try {
                                          const currentData = await getFromStorage();
                                          if (currentData && currentData.Schools) {
                                              const updatedSchools = currentData.Schools.map((s: any) => 
                                                  Number(s.Schoolid) === schoolIdNum ? { ...s, Status: statusToUse } : s
                                              );
                                              await updateStorage({ ...currentData, Schools: updatedSchools });
                                          }
                                      } catch (err) { console.error("Error updating storage:", err); }
                                      
                                      setRowData((currentRows: any[]) => 
                                        currentRows.map(row => 
                                          String(row.Schoolid) === String(schoolIdNum) ? { ...row, Status: statusToUse } : row
                                        )
                                      );
                                      gridRef.current.api.flashCells({ rowNodes: [rowNode] });
                                      gridRef.current.api.refreshCells({ rowNodes: [rowNode], columns: ['Status', 'status', 'סטטוס'], force: true });
                                    }
                                  }

                                  try {
                                    const currentData = await getFromStorage();
                                    if (currentData && currentData.Schools) {
                                      const updatedSchools = currentData.Schools.map((s: any) => 
                                        String(s.Schoolid) === String(contact.Schoolid || contact.SchoolId) 
                                          ? { ...s, Status: statusToUse } : s
                                      );
                                      await updateStorage({ ...currentData, Schools: updatedSchools });
                                    }
                                  } catch (e) { console.error("Storage update failed", e); }
                                }
                              }
                            }
                          } else {
                            console.log(`❌ Failed to send to ${contact.FirstName}`);
                            setSendingStats(prev => ({ ...prev, error: prev.error + 1 }));
                            localErrorCount++;
                            await updateContactsStatus("שגוי", [contact.Contactid]);
                          }
                        } catch (error) {
                          console.error(`❌ Error sending to ${contact.FirstName}:`, error);
                          setSendingStats(prev => ({ ...prev, error: prev.error + 1 }));
                          localErrorCount++;
                        }

                        if (index < contactsToSend.length - 1 && !shouldStopRef.current) {
                          const startTime = Date.now();
                          const delayMs = getSmartMessageDelay(contactsToSend.length, index);
                          const timeRemaining = estimateRemainingTime(contactsToSend.length, index);
                          setEstimatedFinish(timeRemaining);
                          await sleep(delayMs);
                          const actualDelaySec = Math.round((Date.now() - startTime) / 1000);
                          let type = "normal";
                          if (actualDelaySec > 25) type = "coffee";
                          else if ((index + 1) % 10 === 0) type = "milestone";
                          setDelayHistory(prev => [...prev, { delay: actualDelaySec, type }]);
                        }
                      } 

                      setIsSending(false);

                      if (!shouldStopRef.current) {
                        alert(`תהליך השליחה הסתיים.\nהצלחות: ${localSuccessCount}`);
                      }
                    }}
                  >
                    {isSending ? "🚀 שולח הודעות..." : `📤 ${pageText.sendMessages}`}
                  </button>

                  {/* כפתור עצירה - מופיע רק בזמן שליחה */}
                  {isSending && (
                    <button
                      className="custom-btn custom-btn-danger w-100 justify-content-center"
                      onClick={() => {
                        if (window.confirm("האם אתה בטוח שברצונך לעצור את השליחה?")) {
                          shouldStopRef.current = true;
                        }
                      }}
                    >
                      🛑 עצור שליחה
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Col>
        </Row>
        <Row className="mt-4 mb-2">
          <Col>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6', direction: 'rtl' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><strong>בתי ספר שנבחרו:</strong><span style={{ fontSize: '1.1em' }}>{selectedSchools.length}</span></div>
              <div style={{ width: '1px', height: '20px', background: '#ccc' }}></div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'green' }}><strong>נשלחו בהצלחה:</strong><span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{sendingStats.success}</span></div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#d63384' }}><strong>חסר טלפון ("להשיג"):</strong><span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{sendingStats.missing}</span></div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'red' }}><strong>תקלות ("שגוי"):</strong><span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{sendingStats.error}</span></div>
            </div>
            {/* כפתור ורכיב ניטור זמנים */}
            <div className="mt-2 d-flex flex-column align-items-center">
              <Button variant="outline-secondary" size="sm" onClick={() => setShowMonitor(!showMonitor)}>
                {showMonitor ? "הסתר ניטור זמנים 📊" : "הצג ניטור זמנים 📊"}
              </Button>
              
              {showMonitor && (
                <div style={{ width: '100%' }}>
                  <MessageMonitor history={delayHistory} isSending={isSending} />
                </div>
              )}
            </div>
          </Col>
        </Row>
        <Suspense>
          <div 
  id="grid-1" 
  className={theme === "dark-theme" ? "ag-theme-quartz-dark" : "ag-theme-quartz"} 
  style={{ width: "100%", height: "1000px" }}
>
            <AgGridReact ref={gridRef} rowData={rowData} columnDefs={colDefs} enableRtl={true} onGridReady={onGridReady} getRowId={(params) => String(params.data.Schoolid)} />
          </div>
        </Suspense>
      </Container>
    </>
  );
}