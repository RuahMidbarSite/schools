/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { ChangeEvent, Suspense, useRef } from "react";
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Button, Col, Container, Form, InputGroup, Row } from "react-bootstrap";
import { useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation"; // ✅ ייבוא חשוב לרענון הדף
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
  updateSchoolStatus, // ✅ וודא שזה מיובא
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
  const router = useRouter(); // ✅ שימוש ב-Router
  const qrCodeRef = useRef(null);
  const gridRef: any = useRef(null);

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

  // ✅ אתחול כמערך ריק למניעת קריסה
  const [SchoolStatuses, setSchoolStatuses] = useState<any[]>([]);
  const [ContactStatuses, setContactStatuses] = useState<any[]>([]);

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
  const [newStatus, setNewStatus] = useState<any>("");
  const [schoolAmount, setSchoolAmount] = useState(0);
  const [schoolAmountError, setSchoolAmountError] = useState(false);
  const [newStatusError, setNewStatusError] = useState(false);
  const [sendingStats, setSendingStats] = useState({ success: 0, missing: 0, error: 0 });
  const [oneTime, updateOneTime] = useState(0);
  
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
          // הגנה מפני undefined
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
            
            // הגנה מפני undefined גם כאן
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

        colDefs.push({
          field: "RepresentivePhone",
          headerName: "טלפון נייד",
          valueGetter: (params) => {
            const repId = params.data.RepresentiveID || params.data.RepresentativeId || params.data.RepresentiveId;
            if (repId && schoolsContacts) {
              const matchById = schoolsContacts.find(c => String(c.Contactid) === String(repId));
              if (matchById) {
                return matchById.Cellphone || matchById.Phone || "";
              }
            }
            const repName = params.data.Representive;
            const currentSchoolId = params.data.Schoolid;
            if (!repName || !schoolsContacts) return "";
            const relevantContacts = schoolsContacts.filter(c =>
              c.SchoolId === currentSchoolId || c.Schoolid === currentSchoolId
            );
            const searchPool = relevantContacts.length > 0 ? relevantContacts : schoolsContacts;
            const cleanRepName = repName.trim();
            const contact = searchPool.find(c => {
              const contactFullName = `${c.FirstName || ""} ${c.LastName || ""}`.trim();
              const nameParts = cleanRepName.split(" ");
              const firstNameMatch = nameParts[0] === c.FirstName;
              return (
                contactFullName === cleanRepName ||
                (contactFullName.length > 2 && cleanRepName.includes(contactFullName)) ||
                (cleanRepName.length > 2 && contactFullName.includes(cleanRepName)) ||
                (firstNameMatch && cleanRepName.includes(c.Role || "---"))
              );
            });
            return contact ? (contact.Cellphone || contact.Phone || "") : "";
          },
          filter: true,
        });
        setColDefs(colDefs);
      } else {
        Promise.all([getAllSchools(), getAllReligionSectors(), getAllCities(), getAllContacts(), getModelFields("School")]).then((
          [schools, religion, cities, schoolsContacts, model]
        ) => {
          const schoolRows = schools
          rowCount.current = schoolRows.length;
          dataRowCount.current = schoolRows.length;
          setRowData(schools);
          setSchools(schools);
          setSelectedSchools(schools)

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

          colDefs.push({
            field: "RepresentivePhone",
            headerName: "טלפון נייד",
            valueGetter: (params) => {
              const repName = params.data.Representive;
              const currentSchoolId = params.data.Schoolid;
              if (!repName || !schoolsContacts) return "";
              const relevantContacts = schoolsContacts.filter(c =>
                c.SchoolId === currentSchoolId || c.Schoolid === currentSchoolId
              );
              const searchPool = relevantContacts.length > 0 ? relevantContacts : schoolsContacts;
              const cleanRepName = repName.trim();
              const contact = searchPool.find(c => {
                const contactFullName = `${c.FirstName || ""} ${c.LastName || ""}`.trim();
                return (
                  contactFullName === cleanRepName ||
                  (contactFullName.length > 2 && cleanRepName.includes(contactFullName)) ||
                  (cleanRepName.length > 2 && contactFullName.includes(cleanRepName))
                );
              });
              return contact ? (contact.Cellphone || contact.Phone || "") : "";
            },
            filter: true,
          });
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
              <Col>
                <Button variant="primary" onClick={async () => {
    setNewStatusError(false);
    setSendingStats({ success: 0, missing: 0, error: 0 });
    console.log("\n=== 🚀 Starting Batch Send ===");
    
    if (filteredContacts.length === 0) { 
      alert("לא נבחרו אנשי קשר לשליחה"); 
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

    // סינון אנשי קשר ייחודיים
    const uniqueContacts = new Map();
    for (const contact of filteredContacts) {
      const phone = contact.Cellphone;
      if (phone && phone.trim() !== "") { 
        if (!uniqueContacts.has(phone)) { 
          uniqueContacts.set(phone, contact); 
        } 
      }
    }
    const contactsToSend = Array.from(uniqueContacts.values());
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    console.log(`📤 Sending to ${contactsToSend.length} unique contacts...`);
    
    // שליחת הודעות
    for (const [index, contact] of contactsToSend.entries()) {
      const phone = contact.Cellphone;
      
      if (!phone || phone.trim() === "") { 
        setSendingStats(prev => ({ ...prev, missing: prev.missing + 1 })); 
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
          setSendingStats(prev => ({ ...prev, success: prev.success + 1 }));
          
          if (statusToUse) {
            // עדכן סטטוס איש קשר
            await updateContactsStatus(statusToUse, [contact.Contactid]);
            
            // עדכן סטטוס בית ספר אם זה נציג
            const isRep = contact.IsRepresentative === true || 
                         contact.IsRepresentive === true || 
                         contact.isRepresentative === true || 
                         contact.IsRep === true;
            
            if (isRep) {
              const rawSchoolId = contact.Schoolid || 
                                 contact.SchoolId || 
                                 contact.schoolid || 
                                 contact.schoolId;
              
              if (rawSchoolId) {
                const schoolIdNum = Number(rawSchoolId);
                console.log(`🏫 Updating School ID: ${schoolIdNum} to status: ${statusToUse}`);
                await updateSchoolStatus(statusToUse, [schoolIdNum]);
              }
            }
          }
        } else { 
          console.log(`❌ Failed to send to ${contact.FirstName}`);
          setSendingStats(prev => ({ ...prev, error: prev.error + 1 })); 
          await updateContactsStatus("שגוי", [contact.Contactid]); 
        }
      } catch (error) { 
        console.error(`❌ Error sending to ${contact.FirstName}:`, error);
        setSendingStats(prev => ({ ...prev, error: prev.error + 1 })); 
      }
      
      // המתנה אקראית בין הודעות
      if (index < contactsToSend.length - 1) { 
        const delay = Math.floor(Math.random() * (12000 - 5000 + 1) + 5000);
        console.log(`⏳ Waiting ${(delay/1000).toFixed(1)}s before next message...`);
        await sleep(delay); 
      }
    }

    // ✅ סנכרון מלא עם Storage
    console.log("\n🔄 Syncing all data from server...");
    console.log("⏰ Time:", new Date().toISOString());
    
    try {
      // שלב 1: טען נתונים טריים מהשרת
      console.log("📡 Fetching fresh data from server...");
      const [freshSchools, freshContacts] = await Promise.all([
        getAllSchools(),
        getAllContacts()
      ]);

      console.log(`📊 Fetched ${freshSchools.length} schools, ${freshContacts.length} contacts`);

      // שלב 2: עדכן את ה-Storage
      console.log("💾 Updating LocalForage storage...");
      await updateStorage({ 
        Schools: freshSchools,
        schoolsContacts: freshContacts
      });
      
      console.log("✅ Storage updated successfully!");
      // 🔍 בדיקה 1: האם ה-Storage באמת התעדכן?
console.log("🔍 VERIFICATION: Checking if Storage was updated...");
const verifyStorage = await getFromStorage();
console.log("📦 Storage Schools count:", verifyStorage.Schools?.length);
console.log("📦 Storage Contacts count:", verifyStorage.schoolsContacts?.length);
console.log("📦 First school status:", verifyStorage.Schools?.[0]?.Status);
console.log("📦 First contact status:", verifyStorage.schoolsContacts?.[0]?.Status);
      // שלב 3: עדכן את ה-state המקומי של הדף הזה
      setSchools(freshSchools);
      setRowData(freshSchools);
      
      // שלב 4: עדכן את AgGrid אם קיים
      if (gridRef.current?.api) {
        gridRef.current.api.setGridOption('rowData', freshSchools);
        gridRef.current.api.refreshCells({ force: true });
      }
      
      // שלב 5: רענן גם את הסטטוסים
      console.log("📋 Updating statuses...");
      const [updatedSchoolStatuses, updatedContactStatuses] = await Promise.all([
        getAllStatuses("Schools"),
        getAllStatuses("Contacts")
      ]);
      
      await updateStorage({
        SchoolStatuses: updatedSchoolStatuses,
        ContactsStatuses: updatedContactStatuses
      });
      
      setSchoolStatuses(updatedSchoolStatuses?.map(s => s.StatusName) || []);
      setContactStatuses(updatedContactStatuses?.map(s => s.StatusName) || []);
      
      console.log("✅ All data synced successfully!");
      console.log("⏰ Time:", new Date().toISOString());
      
    } catch (e) {
      console.error("❌ Failed to sync storage:", e);
      alert("השליחה הסתיימה, אבל היתה בעיה בעדכון הנתונים. אנא רענן את הדף.");
      return;
    }

    // הצגת סיכום
    const summary = `
תהליך השליחה הסתיים בהצלחה!

✅ נשלחו בהצלחה: ${sendingStats.success}
⚠️ חסר טלפון: ${sendingStats.missing}
❌ תקלות: ${sendingStats.error}

כל הנתונים סונכרנו והדפים האחרים יתעדכנו אוטומטית!
    `.trim();
    
    alert(summary);
    console.log("\n" + summary);
    
}}>
  {pageText.sendMessages}
</Button>
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