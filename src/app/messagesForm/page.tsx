/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { ChangeEvent, Suspense, useRef } from "react";
import Select, { components } from 'react-select'; 
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
  const router = useRouter(); 
  const qrCodeRef = useRef(null);
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
  const [selectedPattern, setSelectedPattern] = useState<MessagePattern | undefined>(undefined);
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
    const columnFlex: { [key: string]: number } = {
        SchoolName: 2,
        Remarks: 1.5,
        CalculatedPhone: 1.3,
        Representive: 1.2,
        City: 1.2,
        Symbol: 0.8,
        RepresentativeID: 0.7,
        Date: 0.8,
        SchoolType: 0.9,
        ReligiousSector: 0.9,
        EducationStage: 0.9,
        Status: 1,
        default: 1
    };

    const minWidths: { [key: string]: number } = {
        SchoolName: 120,
        CalculatedPhone: 100,
        Remarks: 100,
        default: 60
    };

    const getPhoneValue = (params: any, contactsList: any[]) => {
      if (!contactsList || contactsList.length === 0 || !params.data) return "";
      const data = params.data;
      
      const repId = data.RepresentiveID || 
                    data.RepresentativeId || 
                    data.RepresentiveId || 
                    data.RepId || 
                    data.ContactId || 
                    data["Representative ID"] || 
                    data["Repres entive ID"]; 

      if (repId) {
        const match = contactsList.find(c => String(c.Contactid) === String(repId));
        if (match) {
          return match.Cellphone || match.Phone || match.cellphone || "";
        }
      }

      const repName = data.Representive || data.Representative || data.Name;
      const schoolId = data.Schoolid || data.SchoolId;

      if (repName && schoolId) {
        const schoolContacts = contactsList.filter(c => String(c.SchoolId || c.Schoolid) === String(schoolId));
        const match = schoolContacts.find(c => {
            const fullName = `${c.FirstName || ""} ${c.LastName || ""}`.trim();
            const cleanRepName = String(repName).trim();
            return fullName === cleanRepName || fullName.includes(cleanRepName) || cleanRepName.includes(fullName);
        });
        if (match) return match.Cellphone || match.Phone || "";
      }
      return "";
    };

    getFromStorage().then(({ Schools, Religion, Cities, schoolsContacts, Tablemodel }: DataType) => {
      if (Schools && Religion && Cities && schoolsContacts && Tablemodel) {
        setRowData(Schools);
        setSchools(Schools);
        setSelectedSchools(Schools);
        
        rowCount.current = Schools.length;
        dataRowCount.current = Schools.length;

        const colDefsBuilder: any[] = Tablemodel[0]?.map((value: any, index: any) => {
          const headerName = Tablemodel[1][index];
          const flexVal = columnFlex[value] || columnFlex["default"];
          const minW = minWidths[value] || minWidths["default"];

          let colDef: any = {
            field: value,
            headerName: headerName,
            editable: true,
            filter: true,
            flex: flexVal,
            minWidth: minW,
            resizable: true
          };

          if (value === "ReligiousSector") {
            colDef.cellEditor = "agSelectCellEditor";
            colDef.cellEditorParams = { values: Religion };
          }
          else if (value === "City") {
            colDef.cellEditor = "CustomSelect";
            colDef.cellEditorParams = { selectData: Cities.map((val) => ({ value: val, label: val })) };
            colDef.cellEditorPopup = true;
            colDef.cellEditorPopupPosition = "under";
          }
          else if (value === "Representive") {
            colDef.cellEditor = "CustomSelect";
            colDef.cellEditorParams = { selectData: schoolsContacts };
            colDef.cellEditorPopup = true;
            colDef.cellEditorPopupPosition = "under";
          }
          else if (value === "Schoolid") {
            colDef.cellEditor = "agTextCellEditor";
            colDef.rowDrag = true;
            colDef.pinned = 'right';
            colDef.lockPosition = true;
            colDef.width = 65;
            delete colDef.flex;
          }
          else {
             colDef.cellEditor = "agTextCellEditor";
          }

          if (headerName === "סטטוס" || value === "Status" || value === "status") {
             colDef.cellStyle = (params: any) => {
                const currentStatusObj = newStatusRef.current;
                const statusValue = (currentStatusObj && typeof currentStatusObj === 'object' && 'value' in currentStatusObj) 
                                    ? currentStatusObj.value 
                                    : currentStatusObj;
                
                if (params.value && statusValue && String(params.value) === String(statusValue)) {
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
          filter: true,
          flex: columnFlex["CalculatedPhone"],
          minWidth: minWidths["CalculatedPhone"],
          resizable: true
        });

        setColDefs(colDefsBuilder);

      } else {
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
                const flexVal = columnFlex[value] || columnFlex["default"];
                const minW = minWidths[value] || minWidths["default"];

                let colDef: any = {
                    field: value, 
                    headerName: headerName, 
                    editable: true, 
                    filter: true,
                    flex: flexVal,
                    minWidth: minW,
                    resizable: true
                };

                if (value === "ReligiousSector") {
                    colDef.cellEditor = "agSelectCellEditor";
                    colDef.cellEditorParams = { values: religionData };
                }
                else if (value === "City") {
                    colDef.cellEditor = "CustomSelect";
                    colDef.cellEditorParams = { selectData: citiesData.map((val: any) => ({ value: val.CityName, label: val.CityName })) };
                    colDef.cellEditorPopup = true;
                    colDef.cellEditorPopupPosition = "under";
                }
                else if (value === "Representive") {
                    colDef.cellEditor = "CustomSelect";
                    colDef.cellEditorParams = { selectData: contactsData };
                    colDef.cellEditorPopup = true;
                    colDef.cellEditorPopupPosition = "under";
                }
                else {
                    colDef.cellEditor = "agTextCellEditor";
                }

                if (headerName === "סטטוס" || value === "Status" || value === "status") {
                    colDef.cellStyle = (params: any) => {
                        const currentStatusObj = newStatusRef.current;
                        const statusValue = (currentStatusObj && typeof currentStatusObj === 'object' && 'value' in currentStatusObj) 
                                            ? currentStatusObj.value 
                                            : currentStatusObj;
                        
                        if (params.value && statusValue && String(params.value) === String(statusValue)) {
                             return { backgroundColor: '#198754', color: 'white', fontWeight: 'bold' };
                        }
                        return null;
                    };
                 }
                 
                 if (value === "Schoolid") {
                    colDef.rowDrag = true;
                    colDef.pinned = 'right';
                    colDef.lockPosition = true;
                    colDef.width = 65;
                    delete colDef.flex;
                 }

                return colDef;
            }) || [];

            colDefsBuilder.push({
                field: "CalculatedPhone",
                headerName: "טלפון נייד",
                valueGetter: (params) => getPhoneValue(params, contactsData),
                filter: true,
                flex: columnFlex["CalculatedPhone"],
                minWidth: minWidths["CalculatedPhone"],
                resizable: true
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
    setSelectedPattern(undefined);
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
      
      const maxId = patterns.reduce((max, p) => (p.PatternId > max ? p.PatternId : max), 0);
      const id = maxId + 1;

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
    if (!selectedPattern || !selectedOption) {
      alert("לא נבחרה תבנית למחיקה");
      return;
    }
    const idToDelete = selectedPattern.PatternId;
    const newOptions = options.filter(option => option.value !== idToDelete);
    const newPatterns = patterns.filter(pattern => pattern.PatternId !== idToDelete);

    Promise.all([deletePattern(idToDelete), deletePatternFile(idToDelete)]).then((res) => {
      console.log("Delete result:", res);
    }).catch((err) => {
      console.error("Error deleting pattern:", err);
    });

    setSelectedOption(null);
    setSelectedPattern(undefined);
    setOptions(newOptions);
    setPatterns(newPatterns);
    clearPattern();
  }

  const handleDeleteSpecificPattern = async (idToDelete: number, e: any) => {
    e.stopPropagation(); 
    if (!window.confirm("האם אתה בטוח שברצונך למחוק תבנית זו?")) return;

    try {
      await Promise.all([deletePattern(idToDelete), deletePatternFile(idToDelete)]);
    } catch (err) {
      console.error("Failed to delete pattern via X button", err);
    }

    const newOptions = options.filter(option => option.value !== idToDelete);
    const newPatterns = patterns.filter(pattern => pattern.PatternId !== idToDelete);

    setOptions(newOptions);
    setPatterns(newPatterns);

    if (selectedOption && selectedOption.value === idToDelete) {
      clearPattern();
    }
  };

  const CustomOption = (props: any) => {
    return (
      <components.Option {...props}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{props.label}</span>
          <span 
            onClick={(e) => handleDeleteSpecificPattern(props.data.value, e)}
            style={{ 
              cursor: 'pointer', 
              color: 'red', 
              fontWeight: 'bold', 
              marginLeft: '10px',
              padding: '0 5px'
            }}
            title="מחק תבנית"
          >
            ✕
          </span>
        </div>
      </components.Option>
    );
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
      console.log("📂 File selected:", e.target.files[0].name, e.target.files[0].size);
      setAddedFile(e.target.files[0]);
      setFileName(e.target.files[0].name)
    }
  };

  const replaceMessageVariables = (message: string, contact: any): string => {
    if (!message) return message;
    let result = message.replace(/{name}/gi, contact.FirstName || "");
    return result;
  };
  // ← כאן תוסיף את הפונקציה החדשה
const encodeFilename = (filename: string): string => {
  return Buffer.from(filename, 'utf8').toString('base64');
};
  return (
    <>
      <QrCode ref={qrCodeRef} />
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
                <Select 
                  options={options} 
                  value={selectedOption} 
                  onChange={handlePatternChange} 
                  placeholder="..בחר תבנית הודעות" 
                  isClearable
                  components={{ Option: CustomOption }} 
                />
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
                  {/* חיווי ויזואלי לגודל הקובץ לצורך דיבוג */}
                  {addedFile && <span style={{fontSize: '0.8em', color: 'gray'}}> ({Math.round(addedFile.size / 1024)} KB)</span>}
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
                    setNewStatusError(false);
                    setSendingStats({ success: 0, missing: 0, error: 0 });
                    
                    let localSuccessCount = 0;
                    let localErrorCount = 0;
                    let localMissingCount = 0;

                    shouldStopRef.current = false; 
                    setIsSending(true); 

                    console.log("\n=== 🚀 Starting Batch Send (FormData Fix + UI Sync) ===");

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

                    // קבלת הסטטוס
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
                    
                    // ========================================
// חלק 1: מצא את הלולאה בקובץ page.tsx
// ========================================

// חפש את השורה:
// for (const [index, contact] of contactsToSend.entries()) {

// החלף את כל התוכן של הלולאה (מהשורה הזו עד ה-} שסוגר אותה) בקוד הזה:

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

    // === 🔍 לוגים לדיבאג ===
    console.log(`\n[${index + 1}/${contactsToSend.length}] 📨 Sending to ${contact.FirstName}`);
    console.log("  Phone:", phone);
    console.log("  School ID:", contact.Schoolid || contact.SchoolId);
    console.log("  File?", addedFile ? `Yes: ${addedFile.name}` : "No");

    const formData = new FormData();
    formData.append("PhoneNumber", phone);
    formData.append("CountryCode", "972");
    formData.append("Message_1", personalizedMsg1);
    formData.append("Message_2", personalizedMsg2);

    if (selectedPattern?.PatternId) {
      formData.append("PatternID", selectedPattern.PatternId.toString());
    }

    // 🎯 תיקון #1: שליחת הקובץ עם שם מקודד ב-Base64
if (addedFile && addedFile.size > 0) {
  console.log("  🔎 Attaching file:", addedFile.name);
  formData.append("file", addedFile, addedFile.name);
  // שליחת שם הקובץ מקודד ב-Base64 כדי לשמור תווים עבריים
  formData.append("FileNameBase64", encodeFilename(addedFile.name));
}

    const result = await sendMessageViaWhatsApp(formData);
    console.log("  Result:", result.success ? "✅ Success" : "❌ Failed");

    if (result.success) {
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
          console.error("  ❌ Storage update error:", err);
        }

        const rawSchoolId = contact.Schoolid || contact.SchoolId;

        if (rawSchoolId) {
          const schoolIdNum = Number(rawSchoolId);
          console.log("  🏫 Updating school", schoolIdNum, "to status:", statusToUse);
          
          await updateSchoolStatus(statusToUse, [schoolIdNum]);

          // 🎯 תיקון #2: עדכון הגריד - גרסה פשוטה שעובדת
          if (gridRef.current?.api) {
            const rowNode = gridRef.current.api.getRowNode(String(schoolIdNum));
            console.log("  🎨 Grid rowNode found?", !!rowNode);
            
            if (rowNode) {
              // עדכון הנתונים
              rowNode.setDataValue('Status', statusToUse);
              rowNode.setDataValue('status', statusToUse);
              
              // הבהוב
              gridRef.current.api.flashCells({ 
                rowNodes: [rowNode],
                columns: ['Status', 'status']
              });
              
              console.log("  ✅ Grid updated");
            } else {
              console.log("  ⚠️ Grid rowNode NOT found for ID:", schoolIdNum);
            }
          }
        }
      }
    } else {
      console.log("  ❌ Send failed:", result.error);
      setSendingStats(prev => ({ ...prev, error: prev.error + 1 }));
      localErrorCount++;
      await updateContactsStatus("שגוי", [contact.Contactid]);
    }
  } catch (error) {
    console.error(`  ❌ Exception:`, error);
    setSendingStats(prev => ({ ...prev, error: prev.error + 1 }));
    localErrorCount++;
  }

  if (index < contactsToSend.length - 1 && !shouldStopRef.current) {
    const delay = Math.floor(Math.random() * (3000 - 1000 + 1) + 1000);
    console.log(`  ⏳ Waiting ${(delay / 1000).toFixed(1)}s...\n`);
    await sleep(delay);
  }
}

                    setIsSending(false);

                    if (!shouldStopRef.current) {
                      alert(`תהליך השליחה הסתיים.\nהצלחות: ${localSuccessCount}`);
                    }
                  }}>
                  {isSending ? "שולח..." : pageText.sendMessages}
                </Button>

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