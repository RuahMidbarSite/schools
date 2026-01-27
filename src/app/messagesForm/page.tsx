/* eslint-disable react-hooks/exhaustive-deps */
"use client";
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

  const handlePatternChange = (selected: any) => {
    if (selected === null) {
      clearPattern();
      return;
    }
    setSelectedOption(selected);
    const selectedObject = patterns.find(option => option.PatternId === selected.value);
    if (selectedObject) {
      setPatternTitle(selectedObject.Caption)
      setMsg1(selectedObject.Message1)
      setMsg2(selectedObject.Message2)
      setFileName(selectedObject.File);
      setSelectedPattern(patterns.find(pattern => pattern.PatternId === selected.value));
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
      let fileName = "";
      if (addedFile !== null) {
        fileName = addedFile.name;
      }
      setFileName(fileName);
      const id = patterns.length + 1;
      Promise.all([addPattern(id, patternTitle, msg1, msg2, fileName), savePatternFile(id, addedFile)]).then(([new_pattern, add_file_result]) => {
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
      <Container fluid className="formGrid text-end bg-transparent">
        <Row className="borderedColumns flex-row-reverse">
          <Col className="square border border-dark custom-col">
            <Row className="mb-3 justify-content-end">
              <Col><h4>תוכן ההודעה</h4></Col>
            </Row>
            <Row className="mb-3">
              <Col><Button variant="info" onClick={addPatternHandler}>{pageText.addMessagePattern}</Button></Col>
            </Row>
            <Row className="mb-3">
              <Col><InputGroup className="mb-3">
                <Form.Control placeholder={patternTitle} style={{ direction: "rtl", textAlign: "right" }} onBlur={(e) => { setPatternTitle(e.target.value); }} />
              </InputGroup></Col>
            </Row>
            <Row className="mb-3">
              <Col>
                <Select options={options} value={selectedOption} onChange={handlePatternChange} placeholder="..בחר תבנית הודעות" isClearable />
                <br></br>
                <Button onClick={handleDeletePattern}>{pageText.deleteMessagePattern}</Button>
              </Col>
            </Row>
            <Row className="mb-3">
              <Form.Group as={Col} controlId="formMsgText1">
                <Form.Label>{pageText.msgTextLabel}</Form.Label>
                <Form.Control as="textarea" rows={5} value={msg1} style={{ direction: "rtl", textAlign: "right" }} onChange={(e) => setMsg1(e.target.value)} />
              </Form.Group>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formMsgText2">
                  <Form.Label>{pageText.msgFileLabel}</Form.Label>
                  <input type="file" id="fileInput" onChange={handleFileChange} style={{ display: 'none' }} />
                  <br></br>
                  <Button className="file-input-button" onClick={() => document.getElementById('fileInput')?.click()}>
                    {fileName ? fileName : "..בחר קובץ"}
                  </Button>
                </Form.Group>
              </Row>
              <Row className="mb-3"></Row>
              <Form.Group as={Col} controlId="formMsgText3">
                <Form.Label>{pageText.msgTextLabel}</Form.Label>
                <Form.Control as="textarea" rows={5} value={msg2} style={{ direction: "rtl", textAlign: "right" }} onChange={(e) => { setMsg2(e.target.value); }} />
              </Form.Group>
            </Row>
            <Row>
              <Col>
                <Button variant="danger" onClick={() => { }}>{pageText.testButton}</Button>
              </Col>
            </Row>
          </Col>

          <Col className="square border border-dark">
            <Form>
              <Row className="mb-3"><Col><h2>בחר בתי ספר</h2></Col></Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formSchoolAmount">
                  <Form.Label>{pageText.schoolAmountLabel}</Form.Label>
                  <Form.Control type="number" value={schoolAmount} onChange={handleSchoolAmountChange} step={5} />
                  {schoolAmountError ? <p className="errorMessage">{pageText.schoolAmountError}</p> : null}
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formSchoolStatuses">
                  <Form.Label>{pageText.schoolStatusesLabel}</Form.Label>
                  <MultiSelectSearchBar selected={selectedSchoolStatuses} setSelected={handleSchoolStatusesSelectionChange} options={SchoolStatuses} placeholder="" labelKey={searchBarLabelKey} />
                  <Form.Text className="text-muted">{pageText.noneChosenNote}</Form.Text>
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>שלבי חינוך</Form.Label>
                  <MultiSelectSearchBar selected={selectedEductionStages} setSelected={handleStagesSelectionChange} options={stages} placeholder="" labelKey={searchBarLabelKey} />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>מגזרים</Form.Label>
                  <MultiSelectSearchBar selected={selectedSectors} setSelected={handleSectorSelectionChange} options={sectors} placeholder="" labelKey={searchBarLabelKey} />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>סוגים</Form.Label>
                  <MultiSelectSearchBar selected={selectedTypes} setSelected={handleTypeSelectionChange} options={schoolTypes} placeholder="" labelKey={searchBarLabelKey} />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>ערים</Form.Label>
                  <MultiSelectSearchBar selected={selectedCities} setSelected={handleCitySelectionChange} options={Cities} placeholder="" labelKey={searchBarLabelKey} />
                </Form.Group>
              </Row>
            </Form>
          </Col>

          <Col className="square border border-dark">
            <Form>
              <Row className="mb-3"><Col><h2>{pageText.chooseContacts}</h2></Col></Row>
              <Row className="mb-3"><Col><b>{pageText.setPriority}</b></Col></Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formContactIsRep">
                  <Form.Label>{pageText.contactIsRepLabel}</Form.Label>
                  <Form.Check inline type="radio" label={pageText.yes} name="isRepRadios" id="isRepRadios1" onClick={() => handleIsRepChange(true)} checked={isRep === true} />
                  <Form.Check inline type="radio" label={pageText.no} name="isRepRadios" id="isRepRadios2" onClick={() => handleIsRepChange(false)} checked={isRep === false} />
                  <Form.Check inline type="radio" label={pageText.both} name="isRepRadios" id="isRepRadios3" onClick={() => handleIsRepChange(null)} checked={isRep === null} />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>תפקידים</Form.Label>
                  <MultiSelectSearchBar selected={selectedRoles} setSelected={handleRoleSelectionChange} options={roles} placeholder="" labelKey={searchBarLabelKey} />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNewStatus">
                  <Form.Label>סטטוסים של אנשי קשר</Form.Label>
                  <MultiSelectSearchBar selected={selectedContactStatuses} setSelected={handleContactStatusesSelectionChange} options={ContactStatuses} placeholder="" labelKey={searchBarLabelKey} />
                </Form.Group>
              </Row>
            </Form>
            <Row className="mb-3"><Col></Col></Row>
            <Row className="mb-3"><Col><Button variant="primary" onClick={() => { }}>{pageText.addPriority}</Button></Col></Row>
            <Row className="mb-3">
              <Col>
                <Button variant="primary" onClick={async () => {
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
                }}>
                  {pageText.chooseContacts}
                </Button>
              </Col>
            </Row>

            <Row className="mb-3">
              <Form.Group as={Col} controlId="formNewStatus">
                <Form.Label>בחר סטטוס</Form.Label>
                <CreatableSelect value={newStatus} onChange={handleStatusChange} options={statusesOptions} isClearable placeholder="..בחר סטטוס או הקלד חדש" />
              </Form.Group>
            </Row>
            <Row className="mb-3">
              <Col style={{ display: "flex", gap: "10px" }}>
                {/* === כפתור שליחה מעודכן === */}
                <Button
                  variant="primary"
                  disabled={isSending}
onClick={async () => {
  console.log("\n=== 🚀 תחילת תהליך שליחה ===");
  
  // ✅ בדיקה ישירה מול השרת במקום שימוש ב-qrCodeRef שנמחק
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
  }               setNewStatusError(false);
                    // איפוס State של React
                    setSendingStats({ success: 0, missing: 0, error: 0 });
                    
                    let localSuccessCount = 0;
                    let localErrorCount = 0;
                    let localMissingCount = 0;

                    shouldStopRef.current = false; 
                    setIsSending(true); 

                    console.log("\n=== 🚀 Starting Batch Send ===");
// ========================================


                    // 👇 קוד חדש 1: הכנה - טעינת הנתונים המקומיים פעם אחת בהתחלה
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
                    // 👆 סוף קוד חדש 1

                    if (filteredContacts.length === 0) {
                      alert("לא נבחרו אנשי קשר לשליחה");
                      setIsSending(false);
                      return;
                    }

                    // קבלת הסטטוס
                    let statusToUse = "";
                    if (newStatus && typeof newStatus === 'object' && 'value' in newStatus) {
                      statusToUse = (newStatus as any).value;
                    } else if (typeof newStatus === 'string') {
                      statusToUse = newStatus;
                    }

                    // הוספת סטטוס חדש אם לא קיים
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

                    // === 🛠️ ביטול מנגנון סינון כפילויות לצורך בדיקות ===
                    // לוקחים את כל אנשי הקשר שיש להם טלפון, גם אם המספר חוזר על עצמו
                    const contactsToSend = filteredContacts.filter(contact => 
                        contact.Cellphone && contact.Cellphone.trim() !== ""
                    );
                    
                    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

                    console.log(`📤 Sending to ${contactsToSend.length} contacts (including duplicates for testing)...`);
                    
                    // הדפסת לוג ברור עם פירוט IsRepresentative
                    console.table(contactsToSend.map(c => ({ 
                        Name: `${c.FirstName} ${c.LastName}`, 
                        Phone: c.Cellphone,
                        Role: c.Role,
                        SchoolID: c.SchoolId || c.Schoolid,
                        IsRep: c.IsRepresentative || c.IsRepresentive || c.isRepresentative // בדיקה למה נבחר
                    })));

                    // שליחת הודעות - הלולאה הראשית
                    for (const [index, contact] of contactsToSend.entries()) {

                      // 🛑 בדיקת עצירה בתחילת כל איטרציה
                      if (shouldStopRef.current) {
                        console.log("🛑 Sending Process Stopped by User");
                        alert(`התהליך נעצר על ידי המשתמש.\nנשלחו ${index} הודעות מתוך ${contactsToSend.length}.`);
                        break;
                      }

                      const phone = contact.Cellphone;

                      if (!phone || phone.trim() === "") {
                        setSendingStats(prev => ({ ...prev, missing: prev.missing + 1 }));
                        localMissingCount++; // עדכון מונה מקומי
                        await updateContactsStatus("להשיב", [contact.Contactid]);
                        continue;
                      }

                      try {
                        const personalizedMsg1 = replaceMessageVariables(msg1, contact);
                        const personalizedMsg2 = replaceMessageVariables(msg2, contact);

                        console.log(`📨 [${index + 1}/${contactsToSend.length}] Sending to ${contact.FirstName} (${phone})...`);

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
                          
                          // עדכון גם ב-State (עבור התצוגה למעלה) וגם במשתנה מקומי (עבור האלרט)
                          setSendingStats(prev => ({ ...prev, success: prev.success + 1 }));
                          localSuccessCount++; 

                          if (statusToUse) {
                            // 1. עדכון בשרת (Contacts)
                            await updateContactsStatus(statusToUse, [contact.Contactid]);

                             // 👇 קוד חדש 2: עדכון Storage מיידי (מדמה את השרת)
                             try {
                                // מציאת איש הקשר ברשימה המקומית ועדכון הסטטוס שלו
                                const contactIndex = localContactsList.findIndex((c: any) => c.Contactid === contact.Contactid);
                                if (contactIndex !== -1) {
                                    // עדכון הסטטוס בזיכרון
                                    localContactsList[contactIndex].Status = statusToUse;
                                    localContactsList[contactIndex].status = statusToUse; // גיבוי למקרה של רגישות לאותיות

                                    // שמירה חזרה ל-Storage - זה מה שגורם לטבלה להתעדכן מייד!
                                    if (currentStorageData) {
                                        await updateStorage({ 
                                            ...currentStorageData, 
                                            schoolsContacts: localContactsList 
                                        });
                                    }
                                }
                            } catch (err) {
                                console.error("Error updating local storage immediately:", err);
                            }
                            // 👆 סוף קוד חדש 2

                            const isRep = contact.IsRepresentative === true ||
                              contact.IsRepresentive === true ||
                              contact.isRepresentative === true ||
                              contact.IsRep === true;

                            if (isRep) {
                              const rawSchoolId = contact.Schoolid || contact.SchoolId;

                              if (rawSchoolId) {
                                const schoolIdNum = Number(rawSchoolId);
                                // 2. עדכון בשרת (School)
                                await updateSchoolStatus(statusToUse, [schoolIdNum]);

                                // 3.  עדכון ויזואלי מיידי בטבלה (AgGrid) 
                               if (gridRef.current && gridRef.current.api) {
  const rowNode = gridRef.current.api.getRowNode(String(schoolIdNum));
  if (rowNode) {
    // א. עדכון ויזואלי מיידי ב-Grid
    rowNode.setDataValue('Status', statusToUse);
    try {
            // 1. שליפת הנתונים הנוכחיים מה-Storage
            const currentData = await getFromStorage();
            
            if (currentData && currentData.Schools) {
                // 2. יצירת רשימת בתי ספר מעודכנת שבה רק הסטטוס של ביה"ס הנוכחי משתנה
                const updatedSchools = currentData.Schools.map((s: any) => 
                    Number(s.Schoolid) === schoolIdNum ? { ...s, Status: statusToUse } : s
                );

                // 3. שמירה חזרה ל-Storage (זה מה שיגרום ל-SchoolTable להתעדכן מיידית)
                await updateStorage({ 
                    ...currentData, 
                    Schools: updatedSchools 
                });
            }
        } catch (err) {
            console.error("שגיאה בעדכון הסטורג':", err);
        }
    // ב. עדכון ה-State של React (הכרחי כדי שהשינוי לא ייעלם)
    setRowData((currentRows: any[]) => 
      currentRows.map(row => 
        String(row.Schoolid) === String(schoolIdNum) ? { ...row, Status: statusToUse } : row
      )
    );

    // ג. רענון ויזואלי
    gridRef.current.api.flashCells({ rowNodes: [rowNode] });
gridRef.current.api.refreshCells({ rowNodes: [rowNode], columns: ['Status', 'status', 'סטטוס'], force: true });
                  }
                }

                // --- עדכון ה-STORAGE המרכזי כדי לסנכרן את עמוד בתי ספר ---
                try {
                  const currentData = await getFromStorage();
                  if (currentData && currentData.Schools) {
                    const updatedSchools = currentData.Schools.map((s: any) => 
                      String(s.Schoolid) === String(contact.Schoolid || contact.SchoolId) 
                        ? { ...s, Status: statusToUse } 
                        : s
                    );
                    await updateStorage({ ...currentData, Schools: updatedSchools });
                  }
                } catch (e) {
                  console.error("Storage update failed", e);
                }
                // -------------------------------------------------------

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

                      // המתנה אקראית - רק אם לא הגענו לסוף וגם לא עצרנו
                      if (index < contactsToSend.length - 1 && !shouldStopRef.current) {
                       // המתנה של בין 1 ל-3 שניות בלבד (בנוסף ל-30 שניות של השרת)
                        const delay = Math.floor(Math.random() * (3000 - 1000 + 1) + 1000);
                        console.log(`⏳ Waiting ${(delay / 1000).toFixed(1)}s (Client) + Server Sync Time...`);
                        await sleep(delay);
                      }
                    } // סוף לולאה

                    // סיום התהליך
                    setIsSending(false);

                    // 👇 קוד חדש 3: הסרת סנכרון כפול בסוף והשארת הודעת סיום בלבד
                    if (!shouldStopRef.current) {
                      alert(`תהליך השליחה הסתיים.\nהצלחות: ${localSuccessCount}`);
                    }
                    // 👆 סוף קוד חדש 3
                  }}>
                  {isSending ? "שולח..." : pageText.sendMessages}
                </Button>

                {/* === כפתור עצירה חדש === */}
                {isSending && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (window.confirm("האם אתה בטוח שברצונך לעצור את השליחה?")) {
                        shouldStopRef.current = true;
                      }
                    }}
                  >
                    עצור שליחה ⏹️
                  </Button>
                )}
              </Col>
            </Row>
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
          </Col>
        </Row>
        <Suspense>
          <div id="grid-1" className="ag-theme-quartz-dark " style={{ width: "100%", height: "1000px" }}>
            <AgGridReact ref={gridRef} rowData={rowData} columnDefs={colDefs} enableRtl={true} onGridReady={onGridReady} getRowId={(params) => String(params.data.Schoolid)} />
          </div>
        </Suspense>
      </Container>
    </>
  );
}